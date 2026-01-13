# api/production_planning/apps.py

from django.apps import AppConfig


class ProductionPlanningConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.production_planning'
    verbose_name = '生産計画管理'
