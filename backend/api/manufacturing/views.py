# api/manufacturing/views.py

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q, F

from api.manufacturing.models import (
    ManufacturingItem,
    ProductionPlan,
    ProductionSchedule,
    Material,
    MaterialDeliverySchedule,
    ManufacturingMaterial,
)
from api.manufacturing.serializers import (
    ManufacturingItemListSerializer,
    ManufacturingItemDetailSerializer,
    ManufacturingItemCreateUpdateSerializer,
    ProductionPlanListSerializer,
    ProductionPlanDetailSerializer,
    ProductionPlanCreateSerializer,
    ProductionPlanUpdateSerializer,
    ProductionScheduleListSerializer,
    ProductionScheduleDetailSerializer,
    ProductionScheduleCreateUpdateSerializer,
    MaterialListSerializer,
    MaterialDetailSerializer,
    MaterialCreateUpdateSerializer,
    MaterialDeliveryScheduleSerializer,
    MaterialDeliveryScheduleCreateUpdateSerializer,
    ManufacturingMaterialSerializer,
    ManufacturingMaterialCreateUpdateSerializer,
)


class ManufacturingItemViewSet(viewsets.ModelViewSet):
    """制作品ViewSet"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['manufacturing_number', 'manufacturing_name', 'specification']
    ordering_fields = ['manufacturing_number', 'manufacturing_name', 'created_at', 'updated_at']
    ordering = ['manufacturing_number']

    def get_queryset(self):
        queryset = ManufacturingItem.objects.all()
        # 生産計画数をアノテーション
        queryset = queryset.annotate(
            production_plan_count=Count('production_plans')
        )
        # 関連データを事前ロード
        queryset = queryset.select_related('product', 'created_by')

        # フィルタリング
        product = self.request.query_params.get('product', None)
        if product:
            queryset = queryset.filter(product_id=product)

        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ManufacturingItemListSerializer
        elif self.action == 'retrieve':
            return ManufacturingItemDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ManufacturingItemCreateUpdateSerializer
        return ManufacturingItemListSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """有効な制作品のみ取得"""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = ManufacturingItemListSerializer(queryset, many=True)
        return Response(serializer.data)


class ProductionPlanViewSet(viewsets.ModelViewSet):
    """生産計画ViewSet"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['plan_number', 'manufacturing_item__manufacturing_number', 'notes']
    ordering_fields = ['plan_number', 'priority', 'planned_start_date', 'created_at']
    ordering = ['priority', '-created_at']

    def get_queryset(self):
        queryset = ProductionPlan.objects.all()
        # 関連データを事前ロード
        queryset = queryset.select_related(
            'manufacturing_item', 'product', 'created_by'
        ).prefetch_related('schedules')

        # フィルタリング
        manufacturing_item = self.request.query_params.get('manufacturing_item', None)
        if manufacturing_item:
            queryset = queryset.filter(manufacturing_item_id=manufacturing_item)

        product = self.request.query_params.get('product', None)
        if product:
            queryset = queryset.filter(product_id=product)

        plan_status = self.request.query_params.get('status', None)
        if plan_status:
            queryset = queryset.filter(status=plan_status)

        priority = self.request.query_params.get('priority', None)
        if priority:
            queryset = queryset.filter(priority=priority)

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
        """進行中の生産計画を取得"""
        queryset = self.get_queryset().filter(
            status__in=['draft', 'planned', 'in_progress']
        )
        serializer = ProductionPlanListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def completed(self, request):
        """完了した生産計画を取得"""
        queryset = self.get_queryset().filter(status='completed')
        serializer = ProductionPlanListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_schedule(self, request, pk=None):
        """生産計画にスケジュールを追加"""
        plan = self.get_object()
        serializer = ProductionScheduleCreateUpdateSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(plan=plan, created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductionScheduleViewSet(viewsets.ModelViewSet):
    """生産スケジュールViewSet"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['schedule_number', 'notes']
    ordering_fields = ['schedule_number', 'started_at', 'finished_at', 'created_at']
    ordering = ['started_at', 'created_at']

    def get_queryset(self):
        queryset = ProductionSchedule.objects.all()
        # 関連データを事前ロード
        queryset = queryset.select_related(
            'plan', 'plan__manufacturing_item', 'assigned_to', 'created_by'
        )

        # フィルタリング
        plan = self.request.query_params.get('plan', None)
        if plan:
            queryset = queryset.filter(plan_id=plan)

        schedule_status = self.request.query_params.get('status', None)
        if schedule_status:
            queryset = queryset.filter(status=schedule_status)

        assigned_to = self.request.query_params.get('assigned_to', None)
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductionScheduleListSerializer
        elif self.action == 'retrieve':
            return ProductionScheduleDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductionScheduleCreateUpdateSerializer
        return ProductionScheduleListSerializer

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """製造開始"""
        schedule = self.get_object()
        if schedule.status != 'planned':
            return Response(
                {'error': 'このスケジュールは開始できません'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone
        schedule.status = 'in_progress'
        schedule.actual_started_at = timezone.now()
        schedule.save()

        serializer = ProductionScheduleDetailSerializer(schedule)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """製造完了"""
        schedule = self.get_object()
        if schedule.status != 'in_progress':
            return Response(
                {'error': 'このスケジュールは完了できません'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone
        completed_quantity = request.data.get('completed_quantity', schedule.quantity)
        schedule.status = 'completed'
        schedule.completed_quantity = completed_quantity
        schedule.actual_finished_at = timezone.now()
        schedule.save()

        serializer = ProductionScheduleDetailSerializer(schedule)
        return Response(serializer.data)


class MaterialViewSet(viewsets.ModelViewSet):
    """材料ViewSet"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['material_code', 'material_name', 'material_type', 'specification']
    ordering_fields = ['material_code', 'material_name', 'stock_quantity', 'created_at']
    ordering = ['material_code']

    def get_queryset(self):
        queryset = Material.objects.all()
        # 関連データを事前ロード
        queryset = queryset.select_related(
            'supplier_branch', 'supplier_branch__supplier', 'created_by'
        )

        # フィルタリング
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)

        supplier_branch = self.request.query_params.get('supplier_branch', None)
        if supplier_branch:
            queryset = queryset.filter(supplier_branch_id=supplier_branch)

        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # 在庫不足フィルター
        low_stock = self.request.query_params.get('low_stock', None)
        if low_stock and low_stock.lower() == 'true':
            queryset = queryset.filter(stock_quantity__lte=F('minimum_stock'))

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return MaterialListSerializer
        elif self.action == 'retrieve':
            return MaterialDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return MaterialCreateUpdateSerializer
        return MaterialListSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """有効な材料のみ取得"""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = MaterialListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """在庫不足の材料を取得"""
        queryset = self.get_queryset().filter(
            is_active=True,
            stock_quantity__lte=F('minimum_stock')
        )
        serializer = MaterialListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """在庫調整"""
        material = self.get_object()
        adjustment = request.data.get('adjustment', 0)
        reason = request.data.get('reason', '')

        try:
            adjustment = int(adjustment)
        except ValueError:
            return Response(
                {'error': '調整数量は整数で指定してください'},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_quantity = material.stock_quantity + adjustment
        if new_quantity < 0:
            return Response(
                {'error': '在庫数量が負の値になります'},
                status=status.HTTP_400_BAD_REQUEST
            )

        material.stock_quantity = new_quantity
        material.save(update_fields=['stock_quantity', 'updated_at'])

        serializer = MaterialDetailSerializer(material)
        return Response(serializer.data)


class MaterialDeliveryScheduleViewSet(viewsets.ModelViewSet):
    """材料納入予定ViewSet"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['material__material_code', 'material__material_name', 'order_reference']
    ordering_fields = ['scheduled_date', 'created_at']
    ordering = ['scheduled_date']

    def get_queryset(self):
        queryset = MaterialDeliverySchedule.objects.all()
        queryset = queryset.select_related('material', 'created_by')

        # フィルタリング
        material = self.request.query_params.get('material', None)
        if material:
            queryset = queryset.filter(material_id=material)

        delivery_status = self.request.query_params.get('status', None)
        if delivery_status:
            queryset = queryset.filter(status=delivery_status)

        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MaterialDeliveryScheduleCreateUpdateSerializer
        return MaterialDeliveryScheduleSerializer

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        """納入確認"""
        delivery = self.get_object()
        if delivery.status == 'received':
            return Response(
                {'error': 'この納入予定は既に受入済みです'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone
        actual_quantity = request.data.get('actual_quantity', delivery.quantity)

        try:
            actual_quantity = int(actual_quantity)
        except ValueError:
            return Response(
                {'error': '数量は整数で指定してください'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 納入予定を更新
        delivery.status = 'received'
        delivery.actual_date = timezone.now().date()
        delivery.actual_quantity = actual_quantity
        delivery.save()

        # 材料の在庫を更新
        material = delivery.material
        material.stock_quantity += actual_quantity
        material.save(update_fields=['stock_quantity', 'updated_at'])

        serializer = MaterialDeliveryScheduleSerializer(delivery)
        return Response(serializer.data)


class ManufacturingMaterialViewSet(viewsets.ModelViewSet):
    """制作品材料構成ViewSet"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = [
        'manufacturing_item__manufacturing_number',
        'material__material_code'
    ]

    def get_queryset(self):
        queryset = ManufacturingMaterial.objects.all()
        queryset = queryset.select_related(
            'manufacturing_item', 'material'
        )

        # フィルタリング
        manufacturing_item = self.request.query_params.get('manufacturing_item', None)
        if manufacturing_item:
            queryset = queryset.filter(manufacturing_item_id=manufacturing_item)

        material = self.request.query_params.get('material', None)
        if material:
            queryset = queryset.filter(material_id=material)

        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ManufacturingMaterialCreateUpdateSerializer
        return ManufacturingMaterialSerializer
