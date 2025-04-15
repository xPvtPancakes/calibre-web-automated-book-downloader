#!/bin/bash
set -e

# Configure timezone
if [ "$TZ" ]; then
    echo "Setting timezone to $TZ"
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
fi

# Set UID if not set
if [ -z "$UID" ]; then
    UID=1000
fi

# Set GID if not set
if [ -z "$GID" ]; then
    GID=100
fi

if ! getent group "$GID" >/dev/null; then
    echo "Adding group $GID with name appuser"
    groupadd -g "$GID" appuser
fi

# Create user if it doesn't exist
if ! id -u "$UID" >/dev/null 2>&1; then
    echo "Adding user $UID with name appuser"
    useradd -u "$UID" -g "$GID" -d /app -s /sbin/nologin appuser
fi

# Get username for the UID (whether we just created it or it existed)
USERNAME=$(getent passwd "$UID" | cut -d: -f1)
echo "Username for UID $UID is $USERNAME"
# Ensure proper ownership of application directories
change_ownership() {
  folder=$1
  echo "Changing ownership of $folder to $USERNAME:$GID"
  chown -R "${UID}:${GID}" "${folder}" || echo "Failed to change ownership for ${folder}, continuing..."
}

change_ownership /app
change_ownership /var/log/cwa-book-downloader
change_ownership /cwa-book-ingest

# Set the command to run based on the environment
is_prod=$(echo "$APP_ENV" | tr '[:upper:]' '[:lower:]')
if [ "$is_prod" = "prod" ]; then 
    command="gunicorn -b 0.0.0.0:${FLASK_PORT:-8084} app:app"
else
    command="python3 app.py"
fi

echo "Making sure /tmp is mounted and has enough space"
df -h /tmp

# Hacky way to verify /tmp has at least 1MB of space and is writable/readable
echo "Verifying /tmp has enough space"
rm -f /tmp/test.cwa-bd
for i in {1..150000}; do printf "%04d\n" $i; done > /tmp/test.cwa-bd
sum=$(python3 -c "print(sum(int(l.strip()) for l in open('/tmp/test.cwa-bd').readlines()))")
[ "$sum" == 11250075000 ] && echo "Success: /tmp is writable" || (echo "Failure: /tmp is not writable" && exit 1)
rm /tmp/test.cwa-bd

echo "Running command: '$command' as '$USERNAME' in '$APP_ENV' mode"

exec sudo -E -u "$USERNAME" $command
