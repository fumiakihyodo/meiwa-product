# api/manufacturing/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from api.manufacturing.views import (
    ManufacturingItemViewSet,
    ProductionPlanViewSet,
    ProductionScheduleViewSet,
    MaterialViewSet,
    MaterialDeliveryScheduleViewSet,
    ManufacturingMaterialViewSet,
    FinishedGoodsInventoryViewSet,
)

router = DefaultRouter()
router.register(r'items', ManufacturingItemViewSet, basename='manufacturing-item')
router.register(r'plans', ProductionPlanViewSet, basename='production-plan')
router.register(r'schedules', ProductionScheduleViewSet, basename='production-schedule')
router.register(r'materials', MaterialViewSet, basename='material')
router.register(r'material-deliveries', MaterialDeliveryScheduleViewSet, basename='material-delivery')
router.register(r'bom', ManufacturingMaterialViewSet, basename='manufacturing-material')
router.register(r'finished-goods-inventory', FinishedGoodsInventoryViewSet, basename='finished-goods-inventory')

urlpatterns = [
    path('', include(router.urls)),
]
