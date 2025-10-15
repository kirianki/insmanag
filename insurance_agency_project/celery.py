# insurance_agency_project/celery.py

import os
import json
from celery import Celery
from kombu.serialization import register
from apps.core.utils import CustomJSONEncoder

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'insurance_agency_project.settings')

app = Celery('insurance_agency_project')

# --- This is the corrected section ---
# Create an encoder function that INSTANTIATES our custom class.
def custom_json_encoder(obj):
    return json.dumps(obj, cls=CustomJSONEncoder)

# Register the new encoder function.
register(
    'custom_json', 
    custom_json_encoder,       # The ENCODER function +++ THIS IS THE FIX
    json.loads,                # The standard DECODER
    content_type='application/x-custom-json', 
    content_encoding='utf-8'
)

app.conf.update(
    accept_content=['application/json', 'application/x-custom-json'],
    task_serializer='custom_json',
    result_serializer='custom_json',
)
# --- End of correction ---

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()