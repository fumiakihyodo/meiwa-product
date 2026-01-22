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

        # 生産タイプフィルター（国内/海外/両方）
        production_type = self.request.query_params.get('production_type', None)
        if production_type:
            if production_type == 'domestic':
                # 国内生産品: domesticまたはboth
                queryset = queryset.filter(production_type__in=['domestic', 'both'])
            elif production_type == 'overseas':
                # 海外生産品: overseasまたはboth
                queryset = queryset.filter(production_type__in=['overseas', 'both'])
            else:
                # その他（exact match）
                queryset = queryset.filter(production_type=production_type)

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


class FinishedGoodsInventoryViewSet(viewsets.ViewSet):
    """製作品在庫ViewSet

    生産計画の完成数量を在庫として表示するビュー。
    既存のDBスキーマを活用し、新しいテーブルは作成しない。
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """製作品別の在庫一覧を取得"""
        from django.db.models import Sum
        from api.manufacturing.serializers import FinishedGoodsInventorySerializer

        # パラメータ取得
        product_id = request.query_params.get('product', None)
        search = request.query_params.get('search', None)
        include_records = request.query_params.get('include_records', 'false').lower() == 'true'

        # 有効な制作品を取得
        items = ManufacturingItem.objects.filter(is_active=True)
        if product_id:
            items = items.filter(product_id=product_id)
        if search:
            items = items.filter(
                Q(manufacturing_number__icontains=search) |
                Q(manufacturing_name__icontains=search)
            )
        items = items.select_related('product')

        # 各制作品の在庫情報を構築
        result = []
        for item in items:
            # この制作品の完了した生産計画を集計
            plans = ProductionPlan.objects.filter(
                manufacturing_item=item,
                status='completed',
                completed_quantity__gt=0
            ).select_related('product')

            total_quantity = plans.aggregate(
                total=Sum('completed_quantity')
            )['total'] or 0

            inventory_data = {
                'manufacturing_item_id': item.id,
                'manufacturing_number': item.manufacturing_number,
                'manufacturing_name': item.manufacturing_name,
                'product_id': item.product_id,
                'product_number': item.product.product_number if item.product else None,
                'product_name': item.product.product_name if item.product else None,
                'unit': item.unit,
                'total_quantity': total_quantity,
                'available_quantity': total_quantity,  # 簡略化のため全て出荷可能
                'reserved_quantity': 0,
                'quarantine_quantity': 0,
                'defective_quantity': 0,
            }

            # レコード詳細を含める場合
            if include_records:
                records = []
                for plan in plans:
                    records.append({
                        'id': plan.id,
                        'quantity': plan.completed_quantity,
                        'lot_number': plan.plan_number,
                        'storage_location': None,
                        'status': 'available',
                        'status_display': '出荷可能',
                        'plan_number': plan.plan_number,
                        'completed_at': plan.actual_end_date.isoformat() if plan.actual_end_date else None,
                        'notes': plan.notes,
                        'created_at': plan.created_at.isoformat(),
                        'created_by_name': plan.created_by.full_name if plan.created_by else None,
                    })
                inventory_data['inventory_records'] = records

            result.append(inventory_data)

        return Response(result)

    @action(detail=False, methods=['post'])
    def adjust(self, request):
        """在庫調整（生産計画の完成数量を更新）"""
        manufacturing_item_id = request.data.get('manufacturing_item_id')
        adjustment_type = request.data.get('adjustment_type')  # 'increase' or 'decrease'
        quantity = request.data.get('quantity', 0)
        reason = request.data.get('reason', 'correction')
        notes = request.data.get('notes', '')
        lot_number = request.data.get('lot_number', '')

        if not manufacturing_item_id:
            return Response(
                {'error': '製作品IDが必要です'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            quantity = int(quantity)
            if quantity <= 0:
                return Response(
                    {'error': '数量は正の整数で指定してください'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {'error': '数量は整数で指定してください'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            manufacturing_item = ManufacturingItem.objects.get(id=manufacturing_item_id)
        except ManufacturingItem.DoesNotExist:
            return Response(
                {'error': '製作品が見つかりません'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 調整用の生産計画を作成または更新
        from django.utils import timezone

        if adjustment_type == 'increase':
            # 新しい在庫を追加（調整用の生産計画を作成）
            plan = ProductionPlan.objects.create(
                manufacturing_item=manufacturing_item,
                product=manufacturing_item.product,
                total_planned_quantity=quantity,
                completed_quantity=quantity,
                status='completed',
                priority=99,  # 調整用は低優先度
                notes=f"[在庫調整-{reason}] {notes}".strip(),
                actual_end_date=timezone.now().date(),
                created_by=request.user
            )

            return Response({
                'message': f'{quantity}個の在庫を追加しました',
                'inventory': {
                    'id': plan.id,
                    'manufacturing_item': manufacturing_item.id,
                    'quantity': plan.completed_quantity,
                    'lot_number': plan.plan_number,
                },
                'quantity_before': 0,
                'quantity_after': quantity,
            })
        else:
            # 在庫を減らす（既存の計画の完成数量を調整）
            # 簡略化のため、調整用のマイナス計画は作成せず、警告を返す
            # 実際の実装では、より詳細な在庫管理テーブルが必要
            return Response({
                'message': '在庫減少は現在サポートされていません。生産計画から直接調整してください。',
            }, status=status.HTTP_501_NOT_IMPLEMENTED)

    @action(detail=False, methods=['get'])
    def adjustment_history(self, request):
        """在庫調整履歴を取得（調整用生産計画を一覧）"""
        manufacturing_item_id = request.query_params.get('manufacturing_item', None)
        limit = int(request.query_params.get('limit', 50))

        queryset = ProductionPlan.objects.filter(
            notes__startswith='[在庫調整'
        ).select_related('manufacturing_item', 'created_by')

        if manufacturing_item_id:
            queryset = queryset.filter(manufacturing_item_id=manufacturing_item_id)

        queryset = queryset.order_by('-created_at')[:limit]

        result = []
        for plan in queryset:
            result.append({
                'id': plan.id,
                'inventory_id': plan.id,
                'manufacturing_number': plan.manufacturing_item.manufacturing_number,
                'manufacturing_name': plan.manufacturing_item.manufacturing_name,
                'adjustment_type': 'increase',
                'adjustment_type_display': '増加',
                'quantity': plan.completed_quantity,
                'quantity_before': 0,
                'quantity_after': plan.completed_quantity,
                'reason': 'correction',
                'reason_display': '訂正',
                'lot_number': plan.plan_number,
                'notes': plan.notes,
                'created_at': plan.created_at.isoformat(),
                'created_by': plan.created_by_id,
                'created_by_name': plan.created_by.full_name if plan.created_by else None,
            })

        return Response(result)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """ダッシュボードデータを取得"""
        from django.db.models import Sum

        # 全制作品の在庫集計
        items = ManufacturingItem.objects.filter(is_active=True)
        total_items = items.count()

        plans = ProductionPlan.objects.filter(
            status='completed',
            completed_quantity__gt=0
        )

        total_quantity = plans.aggregate(
            total=Sum('completed_quantity')
        )['total'] or 0

        # 在庫なしの制作品
        items_with_stock = plans.values('manufacturing_item').distinct().count()

        return Response({
            'total_items': total_items,
            'total_quantity': total_quantity,
            'available_quantity': total_quantity,
            'reserved_quantity': 0,
            'low_stock_items': [],
            'recent_adjustments': [],
        })
