#!/bin/sh
# Container entrypoint on Fly: migrate, sync game content, then serve.
set -e
python manage.py migrate --noinput
python manage.py seed_data
exec gunicorn skycadet_project.wsgi:application --bind 0.0.0.0:8000 --workers 2 --access-logfile -
