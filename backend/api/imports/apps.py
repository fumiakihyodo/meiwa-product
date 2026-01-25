# api/imports/apps.py

from django.apps import AppConfig


class ImportsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.imports'
    verbose_name = '輸入管理'
