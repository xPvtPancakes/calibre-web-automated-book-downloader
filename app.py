"""Flask web application for book download service with URL rewrite support."""

import logging
import io, re, os
import sqlite3
from functools import wraps
from flask import Flask, request, jsonify, render_template, send_file, send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash
from werkzeug.wrappers import Response
from flask import url_for as flask_url_for
import typing

from logger import setup_logger
from config import _SUPPORTED_BOOK_LANGUAGE, BOOK_LANGUAGE
from env import FLASK_HOST, FLASK_PORT, APP_ENV, CWA_DB_PATH, DEBUG
import backend

from models import SearchFilters

logger = setup_logger(__name__)
app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app)  # type: ignore
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable caching
app.config['APPLICATION_ROOT'] = '/'

# Flask logger
app.logger.handlers = logger.handlers
app.logger.setLevel(logger.level)
# Also handle Werkzeug's logger
werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.handlers = logger.handlers
werkzeug_logger.setLevel(logger.level)

# Secret key (used for session cookies if needed later)
app.config.update(
    SECRET_KEY=os.urandom(64)
)


def authenticate() -> bool:
    """
    Validates Basic Auth credentials against the SQLite database.
    Raises RuntimeError if the database file is missing or cannot be accessed.
    """
    if not CWA_DB_PATH or not os.path.isfile(CWA_DB_PATH):
        logger.error(f"CWA_DB_PATH is missing or invalid: {CWA_DB_PATH}")
        raise RuntimeError("Authentication database not found or inaccessible.")

    if not request.authorization:
        return False  # Triggers 401 Unauthorized

    username = request.authorization.get("username")
    password = request.authorization.get("password")

    try:
        conn = sqlite3.connect(CWA_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT password FROM user WHERE name = ?", (username,))
        row = cur.fetchone()
        conn.close()

        if not row or not row[0] or not check_password_hash(row[0], password):
            logger.error("User not found or password check failed")
            return False

    except Exception as e:
        logger.error_trace(f"Authentication DB error: {e}")
        raise RuntimeError("Authentication system failure.")

    logger.info(f"Authentication successful for user {username}")
    return True


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            if not authenticate():
                return Response(
                    response="Unauthorized",
                    status=401,
                    headers={
                        "WWW-Authenticate": 'Basic realm="Calibre-Web-Automated-Book-Downloader"',
                    },
                )
        except RuntimeError as e:
            logger.error(f"Auth error: {e}")
            return Response("Internal Server Error - Authentication backend unavailable", 500)
        return f(*args, **kwargs)
    return decorated_function


def register_dual_routes(app: Flask) -> None:
    """
    Register each route both with and without the /request prefix.
    This function should be called after all routes are defined.
    """
    rules = list(app.url_map.iter_rules())
    for rule in rules:
        if rule.rule != '/request/' and rule.rule != '/request':
            base_rule = rule.rule[:-1] if rule.rule.endswith('/') else rule.rule
            if base_rule == '':
                app.add_url_rule('/request', f"root_request",
                                 view_func=app.view_functions[rule.endpoint],
                                 methods=rule.methods)
                app.add_url_rule('/request/', f"root_request_slash",
                                 view_func=app.view_functions[rule.endpoint],
                                 methods=rule.methods)
            else:
                app.add_url_rule(f"/request{base_rule}",
                                 f"{rule.endpoint}_request",
                                 view_func=app.view_functions[rule.endpoint],
                                 methods=rule.methods)
                app.add_url_rule(f"/request{base_rule}/",
                                 f"{rule.endpoint}_request_slash",
                                 view_func=app.view_functions[rule.endpoint],
                                 methods=rule.methods)
    app.jinja_env.globals['url_for'] = url_for_with_request


def url_for_with_request(endpoint: str, **values: typing.Any) -> str:
    if endpoint == 'static':
        url = flask_url_for(endpoint, **values)
        return f"/request{url}"
    return flask_url_for(endpoint, **values)


@app.route('/')
@login_required
def index() -> str:
    return render_template('index.html', book_languages=_SUPPORTED_BOOK_LANGUAGE, default_language=BOOK_LANGUAGE, debug=DEBUG)


@app.route('/favico<path:_>')
@app.route('/request/favico<path:_>')
@app.route('/request/static/favico<path:_>')
def favicon(_: typing.Any) -> Response:
    return send_from_directory(os.path.join(app.root_path, 'static', 'media'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')


from typing import Union, Tuple

if DEBUG:
    import subprocess
    import time
