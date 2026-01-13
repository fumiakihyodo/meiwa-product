# api/production_planning/urls.py
"""
生産計画管理用URLルーティング
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from api.production_planning.views import (
    DomesticProductionPlanViewSet,
    OverseasProductionPlanViewSet,
    DomesticManufacturingItemViewSet,
    OverseasManufacturingItemViewSet,
    ProductionPlanningOverviewView,
)

# ルーター設定
router = DefaultRouter()

# 国内生産計画
router.register(
    r'domestic/plans',
    DomesticProductionPlanViewSet,
    basename='domestic-production-plan'
)
router.register(
    r'domestic/items',
    DomesticManufacturingItemViewSet,
    basename='domestic-manufacturing-item'
)

# 海外生産計画
router.register(
    r'overseas/plans',
    OverseasProductionPlanViewSet,
    basename='overseas-production-plan'
)
router.register(
    r'overseas/items',
    OverseasManufacturingItemViewSet,
    basename='overseas-manufacturing-item'
)

app_name = 'production_planning'

urlpatterns = [
    # 概要ビュー（国内/海外統合）
    path('overview/', ProductionPlanningOverviewView.as_view(), name='overview'),
    # ルーターによるViewSet
    path('', include(router.urls)),
]
