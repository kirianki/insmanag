# File: Dockerfile

FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt gunicorn

COPY . .

# <-- ADD THIS
# This command collects all static files from your Django apps
# (including the admin panel) into the STATIC_ROOT directory.
RUN python manage.py collectstatic --noinput

CMD ["gunicorn", "insurance_agency_project.wsgi:application", "--bind", "0.0.0.0:8001"]