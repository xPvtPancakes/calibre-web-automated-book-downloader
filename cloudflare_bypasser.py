import time
import requests
import threading
from urllib.parse import urlparse
from datetime import datetime
from env import MAX_RETRY, DEFAULT_SLEEP, DEBUG, LOG_DIR
from logger import setup_logger

FLARESOLVERR_URL = "http://localhost:8191"  # Adjust if running remotely

logger = setup_logger(__name__)
LOCKED = threading.Lock()
LAST_USED = None
TENTATIVE_CURRENT_URL = None

def check_flaresolverr_available(timeout=5):
    try:
        response = requests.get(f"{FLARESOLVERR_URL}/v1", timeout=timeout)
        if response.status_code == 200 and response.json().get("status") == "ok":
            logger.info("FlareSolverr is available.")
            return True
        else:
            logger.error("FlareSolverr responded, but with an unexpected status.")
    except requests.exceptions.RequestException as e:
        logger.error(f"Could not connect to FlareSolverr: {e}")
    return False

def _request_flaresolverr(url, max_retries=MAX_RETRY, timeout=60):
    session = requests.Session()
    payload = {
        "cmd": "request.get",
        "url": url,
        "maxTimeout": 30000  # FlareSolverr internal timeout in ms
    }

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[FlareSolverr] Fetching URL: {url} (Attempt {attempt}/{max_retries})")
            response = session.post(f"{FLARESOLVERR_URL}/v1", json=payload, timeout=timeout)
            response.raise_for_status()
            result = response.json()

            if result.get("status") == "ok":
                logger.info(f"[FlareSolverr] Successfully bypassed and fetched page.")
                return result["solution"]["response"]

            logger.warning(f"[FlareSolverr] Response error: {result}")
        except Exception as e:
            logger.error(f"[FlareSolverr] Exception: {e}")
            time.sleep(DEFAULT_SLEEP * attempt)

    raise RuntimeError(f"[FlareSolverr] Failed to fetch URL after {max_retries} attempts: {url}")


def get(url, retry=MAX_RETRY):
    global LAST_USED, TENTATIVE_CURRENT_URL
    with LOCKED:
        if not check_flaresolverr_available():
            raise ConnectionError("FlareSolverr is not running or not reachable.")
        TENTATIVE_CURRENT_URL = url
        html = _request_flaresolverr(url, retry)
        LAST_USED = time.time()
        return html


def _cleanup_loop():
    """Optional: In case you want to implement cleanup triggers or reset sessions."""
    while True:
        time.sleep(60)  # no-op placeholder
        # Could ping FlareSolverr or reset session if needed


def _init_cleanup_thread():
    cleanup_thread = threading.Thread(target=_cleanup_loop, daemon=True)
    cleanup_thread.start()


# Optional: initialize background maintenance
_init_cleanup_thread()
