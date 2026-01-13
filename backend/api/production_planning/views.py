# api/production_planning/views.py
"""
生産計画管理用ビュー
国内/海外生産の分類とフィルタリングをサポート
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Count, Sum, Q, F

from api.manufacturing.models import (
    ManufacturingItem,
    ProductionPlan,
    ProductionSchedule,
)
from api.production_planning.serializers import (
    ProductionPlanningItemListSerializer,
    ProductionPlanningItemDetailSerializer,
    ProductionPlanListSerializer,
    ProductionPlanDetailSerializer,
    ProductionPlanCreateSerializer,
    ProductionPlanUpdateSerializer,
    ProductionScheduleSerializer,
    ProductionScheduleCreateSerializer,
    ProductionPlanStatisticsSerializer,
)


class DomesticProductionPlanViewSet(viewsets.ModelViewSet):
    """国内生産計画ViewSet"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'plan_number',
        'manufacturing_item__manufacturing_number',
        'manufacturing_item__manufacturing_name',
        'product__product_number',
        'product__product_name',
        'notes'
    ]
    ordering_fields = ['plan_number', 'priority', 'planned_start_date', 'created_at']
    ordering = ['priority', '-created_at']

    def get_queryset(self):
        queryset = ProductionPlan.objects.filter(
            manufacturing_item__production_type='domestic'
        )
        queryset = queryset.select_related(
            'manufacturing_item', 'product', 'created_by'
        ).prefetch_related('schedules')

        # フィルタリング
        plan_status = self.request.query_params.get('status', None)
        if plan_status:
            queryset = queryset.filter(status=plan_status)

        priority = self.request.query_params.get('priority', None)
        if priority:
            queryset = queryset.filter(priority=priority)

        product = self.request.query_params.get('product', None)
        if product:
            queryset = queryset.filter(product_id=product)

        manufacturing_item = self.request.query_params.get('manufacturing_item', None)
        if manufacturing_item:
            queryset = queryset.filter(manufacturing_item_id=manufacturing_item)

        # 製品品番による検索
        product_number = self.request.query_params.get('product_number', None)
        if product_number:
            queryset = queryset.filter(
                Q(product__product_number__icontains=product_number) |
                Q(manufacturing_item__manufacturing_number__icontains=product_number)
            )

        # 製品名による検索
        product_name = self.request.query_params.get('product_name', None)
        if product_name:
            queryset = queryset.filter(
                Q(product__product_name__icontains=product_name) |
                Q(manufacturing_item__manufacturing_name__icontains=product_name)
            )

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductionPlanListSerializer
        elif self.action == 'retrieve':
            return ProductionPlanDetailSerializer
        elif self.action == 'create':
            return ProductionPlanCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ProductionPlanUpdateSerializer
        return ProductionPlanListSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """進行中の国内生産計画を取得"""
        queryset = self.get_queryset().filter(
            status__in=['draft', 'planned', 'in_progress']
        )
        serializer = ProductionPlanListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def completed(self, request):
        """完了した国内生産計画を取得"""
        queryset = self.get_queryset().filter(status='completed')
        serializer = ProductionPlanListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """国内生産計画の統計情報を取得"""
        queryset = self.get_queryset()
        stats = {
            'production_type': 'domestic',
            'production_type_display': '国内生産',
            'total_plans': queryset.count(),
            'active_plans': queryset.filter(
                status__in=['draft', 'planned', 'in_progress']
            ).count(),
            'completed_plans': queryset.filter(status='completed').count(),
            'total_planned_quantity': queryset.aggregate(
                total=Sum('total_planned_quantity')
            )['total'] or 0,
            'total_completed_quantity': queryset.aggregate(
                total=Sum('completed_quantity')
            )['total'] or 0,
        }
        total = stats['total_planned_quantity']
        completed = stats['total_completed_quantity']
        stats['overall_completion_rate'] = round(
            (completed / total * 100) if total > 0 else 0, 1
        )
        serializer = ProductionPlanStatisticsSerializer(stats)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_schedule(self, request, pk=None):
        """生産計画にスケジュールを追加"""
        plan = self.get_object()
        serializer = ProductionScheduleCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(plan=plan, created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OverseasProductionPlanViewSet(viewsets.ModelViewSet):
    """海外生産計画ViewSet"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'plan_number',
        'manufacturing_item__manufacturing_number',
        'manufacturing_item__manufacturing_name',
        'product__product_number',
        'product__product_name',
        'notes'
    ]
    ordering_fields = ['plan_number', 'priority', 'planned_start_date', 'created_at']
    ordering = ['priority', '-created_at']

    def get_queryset(self):
        queryset = ProductionPlan.objects.filter(
            manufacturing_item__production_type='overseas'
        )
        queryset = queryset.select_related(
            'manufacturing_item', 'product', 'created_by'
        ).prefetch_related('schedules')

        # フィルタリング
        plan_status = self.request.query_params.get('status', None)
        if plan_status:
            queryset = queryset.filter(status=plan_status)

        priority = self.request.query_params.get('priority', None)
        if priority:
            queryset = queryset.filter(priority=priority)

        product = self.request.query_params.get('product', None)
        if product:
            queryset = queryset.filter(product_id=product)

        manufacturing_item = self.request.query_params.get('manufacturing_item', None)
        if manufacturing_item:
            queryset = queryset.filter(manufacturing_item_id=manufacturing_item)

        # 製品品番による検索
        product_number = self.request.query_params.get('product_number', None)
        if product_number:
            queryset = queryset.filter(
                Q(product__product_number__icontains=product_number) |
                Q(manufacturing_item__manufacturing_number__icontains=product_number)
            )

        # 製品名による検索
        product_name = self.request.query_params.get('product_name', None)
        if product_name:
            queryset = queryset.filter(
                Q(product__product_name__icontains=product_name) |
                Q(manufacturing_item__manufacturing_name__icontains=product_name)
            )

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductionPlanListSerializer
        elif self.action == 'retrieve':
            return ProductionPlanDetailSerializer
        elif self.action == 'create':
            return ProductionPlanCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ProductionPlanUpdateSerializer
        return ProductionPlanListSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """進行中の海外生産計画を取得"""
        queryset = self.get_queryset().filter(
            status__in=['draft', 'planned', 'in_progress']
        )
        serializer = ProductionPlanListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def completed(self, request):
        """完了した海外生産計画を取得"""
        queryset = self.get_queryset().filter(status='completed')
        serializer = ProductionPlanListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """海外生産計画の統計情報を取得"""
        queryset = self.get_queryset()
        stats = {
            'production_type': 'overseas',
            'production_type_display': '海外生産',
            'total_plans': queryset.count(),
            'active_plans': queryset.filter(
                status__in=['draft', 'planned', 'in_progress']
            ).count(),
            'completed_plans': queryset.filter(status='completed').count(),
            'total_planned_quantity': queryset.aggregate(
                total=Sum('total_planned_quantity')
            )['total'] or 0,
            'total_completed_quantity': queryset.aggregate(
                total=Sum('completed_quantity')
            )['total'] or 0,
        }
        total = stats['total_planned_quantity']
        completed = stats['total_completed_quantity']
        stats['overall_completion_rate'] = round(
            (completed / total * 100) if total > 0 else 0, 1
        )
        serializer = ProductionPlanStatisticsSerializer(stats)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_schedule(self, request, pk=None):
        """生産計画にスケジュールを追加"""
        plan = self.get_object()
        serializer = ProductionScheduleCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(plan=plan, created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DomesticManufacturingItemViewSet(viewsets.ModelViewSet):
    """国内生産用制作品ViewSet"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['manufacturing_number', 'manufacturing_name', 'specification']
    ordering_fields = ['manufacturing_number', 'manufacturing_name', 'created_at']
    ordering = ['manufacturing_number']

    def get_queryset(self):
        queryset = ManufacturingItem.objects.filter(production_type='domestic')
        queryset = queryset.annotate(
            active_plan_count=Count(
                'production_plans',
                filter=Q(production_plans__status__in=['draft', 'planned', 'in_progress'])
            ),
            total_planned_quantity=Sum('production_plans__total_planned_quantity')
        )
        queryset = queryset.select_related('product', 'created_by')

        # フィルタリング
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        product = self.request.query_params.get('product', None)
        if product:
            queryset = queryset.filter(product_id=product)

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductionPlanningItemListSerializer
        elif self.action == 'retrieve':
            return ProductionPlanningItemDetailSerializer
        return ProductionPlanningItemListSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """有効な国内制作品のみ取得"""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = ProductionPlanningItemListSerializer(queryset, many=True)
        return Response(serializer.data)


class OverseasManufacturingItemViewSet(viewsets.ModelViewSet):
    """海外生産用制作品ViewSet"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['manufacturing_number', 'manufacturing_name', 'specification']
    ordering_fields = ['manufacturing_number', 'manufacturing_name', 'created_at']
    ordering = ['manufacturing_number']

    def get_queryset(self):
        queryset = ManufacturingItem.objects.filter(production_type='overseas')
        queryset = queryset.annotate(
            active_plan_count=Count(
                'production_plans',
                filter=Q(production_plans__status__in=['draft', 'planned', 'in_progress'])
            ),
            total_planned_quantity=Sum('production_plans__total_planned_quantity')
        )
        queryset = queryset.select_related('product', 'created_by')

        # フィルタリング
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        product = self.request.query_params.get('product', None)
        if product:
            queryset = queryset.filter(product_id=product)

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductionPlanningItemListSerializer
        elif self.action == 'retrieve':
            return ProductionPlanningItemDetailSerializer
        return ProductionPlanningItemListSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """有効な海外制作品のみ取得"""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = ProductionPlanningItemListSerializer(queryset, many=True)
        return Response(serializer.data)


class ProductionPlanningOverviewView(APIView):
    """生産計画概要ビュー（国内/海外統合）"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """国内・海外生産計画の概要を取得"""
        # 国内生産統計
        domestic_plans = ProductionPlan.objects.filter(
            manufacturing_item__production_type='domestic'
        )
        domestic_stats = {
            'production_type': 'domestic',
            'production_type_display': '国内生産',
            'total_plans': domestic_plans.count(),
            'active_plans': domestic_plans.filter(
                status__in=['draft', 'planned', 'in_progress']
            ).count(),
            'completed_plans': domestic_plans.filter(status='completed').count(),
            'total_planned_quantity': domestic_plans.aggregate(
                total=Sum('total_planned_quantity')
            )['total'] or 0,
            'total_completed_quantity': domestic_plans.aggregate(
                total=Sum('completed_quantity')
            )['total'] or 0,
        }
        total = domestic_stats['total_planned_quantity']
        completed = domestic_stats['total_completed_quantity']
        domestic_stats['overall_completion_rate'] = round(
            (completed / total * 100) if total > 0 else 0, 1
        )

        # 海外生産統計
        overseas_plans = ProductionPlan.objects.filter(
            manufacturing_item__production_type='overseas'
        )
        overseas_stats = {
            'production_type': 'overseas',
            'production_type_display': '海外生産',
            'total_plans': overseas_plans.count(),
            'active_plans': overseas_plans.filter(
                status__in=['draft', 'planned', 'in_progress']
            ).count(),
            'completed_plans': overseas_plans.filter(status='completed').count(),
            'total_planned_quantity': overseas_plans.aggregate(
                total=Sum('total_planned_quantity')
            )['total'] or 0,
            'total_completed_quantity': overseas_plans.aggregate(
                total=Sum('completed_quantity')
            )['total'] or 0,
        }
        total = overseas_stats['total_planned_quantity']
        completed = overseas_stats['total_completed_quantity']
        overseas_stats['overall_completion_rate'] = round(
            (completed / total * 100) if total > 0 else 0, 1
        )

        # 最近の計画
        recent_domestic = ProductionPlan.objects.filter(
            manufacturing_item__production_type='domestic'
        ).select_related('manufacturing_item', 'product').order_by('-created_at')[:5]

        recent_overseas = ProductionPlan.objects.filter(
            manufacturing_item__production_type='overseas'
        ).select_related('manufacturing_item', 'product').order_by('-created_at')[:5]

        return Response({
            'domestic': {
                'statistics': domestic_stats,
                'recent_plans': ProductionPlanListSerializer(recent_domestic, many=True).data
            },
            'overseas': {
                'statistics': overseas_stats,
                'recent_plans': ProductionPlanListSerializer(recent_overseas, many=True).data
            }
        })
