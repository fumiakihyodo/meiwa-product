# api/manufacturing/serializers.py

from rest_framework import serializers
from api.manufacturing.models import (
    ManufacturingItem,
    ProductionPlan,
    ProductionSchedule,
    Material,
    MaterialDeliverySchedule,
    ManufacturingMaterial,
)


# ===== ManufacturingItem Serializers =====

class ManufacturingItemListSerializer(serializers.ModelSerializer):
    """制作品一覧用シリアライザー"""
    product_number = serializers.CharField(
        source='product.product_number',
        read_only=True,
        default=None
    )
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True,
        default=None
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )
    production_plan_count = serializers.IntegerField(read_only=True)
    production_type_display = serializers.CharField(
        source='get_production_type_display',
        read_only=True
    )

    class Meta:
        model = ManufacturingItem
        fields = [
            'id', 'manufacturing_number', 'manufacturing_name',
            'production_type', 'production_type_display',
            'product', 'product_number', 'product_name',
            'unit', 'standard_production_time', 'is_active',
            'production_plan_count',
            'created_at', 'updated_at', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ManufacturingItemDetailSerializer(serializers.ModelSerializer):
    """制作品詳細用シリアライザー"""
    product_number = serializers.CharField(
        source='product.product_number',
        read_only=True,
        default=None
    )
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True,
        default=None
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )
    production_type_display = serializers.CharField(
        source='get_production_type_display',
        read_only=True
    )
    production_plans = serializers.SerializerMethodField()
    material_requirements = serializers.SerializerMethodField()

    class Meta:
        model = ManufacturingItem
        fields = [
            'id', 'manufacturing_number', 'manufacturing_name',
            'production_type', 'production_type_display',
            'product', 'product_number', 'product_name',
            'specification', 'unit', 'standard_production_time',
            'is_active', 'notes',
            'production_plans', 'material_requirements',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_production_plans(self, obj):
        """関連する生産計画を取得"""
        plans = obj.production_plans.all()[:10]  # 最新10件
        return ProductionPlanListSerializer(plans, many=True).data

    def get_material_requirements(self, obj):
        """必要材料を取得"""
        requirements = obj.material_requirements.all()
        return ManufacturingMaterialSerializer(requirements, many=True).data


class ManufacturingItemCreateUpdateSerializer(serializers.ModelSerializer):
    """制作品作成・更新用シリアライザー"""

    class Meta:
        model = ManufacturingItem
        fields = [
            'manufacturing_number', 'manufacturing_name',
            'production_type',
            'product', 'specification', 'unit',
            'standard_production_time', 'is_active', 'notes'
        ]
        extra_kwargs = {
            'manufacturing_number': {'required': True},
            'manufacturing_name': {'required': True},
        }

    def validate_manufacturing_number(self, value):
        """品番の重複チェック"""
        instance = self.instance
        if instance:
            if ManufacturingItem.objects.filter(manufacturing_number=value).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError("この品番は既に使用されています")
        else:
            if ManufacturingItem.objects.filter(manufacturing_number=value).exists():
                raise serializers.ValidationError("この品番は既に使用されています")
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# ===== ProductionSchedule Serializers =====

class ProductionScheduleListSerializer(serializers.ModelSerializer):
    """生産スケジュール一覧用シリアライザー"""
    plan_number = serializers.CharField(
        source='plan.plan_number',
        read_only=True
    )
    assigned_to_name = serializers.CharField(
        source='assigned_to.full_name',
        read_only=True,
        default=None
    )
    completion_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = ProductionSchedule
        fields = [
            'id', 'schedule_number', 'plan', 'plan_number',
            'quantity', 'completed_quantity', 'completion_rate',
            'started_at', 'finished_at',
            'actual_started_at', 'actual_finished_at',
            'status', 'assigned_to', 'assigned_to_name',
            'production_line', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'schedule_number', 'created_at', 'updated_at']


class ProductionScheduleDetailSerializer(serializers.ModelSerializer):
    """生産スケジュール詳細用シリアライザー"""
    plan_number = serializers.CharField(
        source='plan.plan_number',
        read_only=True
    )
    manufacturing_item_name = serializers.CharField(
        source='plan.manufacturing_item.manufacturing_name',
        read_only=True
    )
    assigned_to_name = serializers.CharField(
        source='assigned_to.full_name',
        read_only=True,
        default=None
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )
    completion_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = ProductionSchedule
        fields = [
            'id', 'schedule_number', 'plan', 'plan_number',
            'manufacturing_item_name',
            'quantity', 'completed_quantity', 'completion_rate',
            'started_at', 'finished_at',
            'actual_started_at', 'actual_finished_at',
            'status', 'assigned_to', 'assigned_to_name',
            'production_line', 'notes',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'schedule_number', 'created_at', 'updated_at', 'created_by']


class ProductionScheduleCreateUpdateSerializer(serializers.ModelSerializer):
    """生産スケジュール作成・更新用シリアライザー"""

    class Meta:
        model = ProductionSchedule
        fields = [
            'plan', 'quantity', 'completed_quantity',
            'started_at', 'finished_at',
            'actual_started_at', 'actual_finished_at',
            'status', 'assigned_to', 'production_line', 'notes'
        ]
        extra_kwargs = {
            'plan': {'required': True},
            'quantity': {'required': True},
        }

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# ===== ProductionPlan Serializers =====

class ProductionPlanListSerializer(serializers.ModelSerializer):
    """生産計画一覧用シリアライザー"""
    manufacturing_item_number = serializers.CharField(
        source='manufacturing_item.manufacturing_number',
        read_only=True
    )
    manufacturing_item_name = serializers.CharField(
        source='manufacturing_item.manufacturing_name',
        read_only=True
    )
    product_number = serializers.CharField(
        source='product.product_number',
        read_only=True,
        default=None
    )
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True,
        default=None
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )
    completion_rate = serializers.FloatField(read_only=True)
    schedule_count = serializers.IntegerField(read_only=True)
    remaining_quantity = serializers.IntegerField(read_only=True)

    class Meta:
        model = ProductionPlan
        fields = [
            'id', 'plan_number',
            'manufacturing_item', 'manufacturing_item_number', 'manufacturing_item_name',
            'product', 'product_number', 'product_name',
            'total_planned_quantity', 'completed_quantity', 'remaining_quantity',
            'completion_rate', 'schedule_count',
            'planned_start_date', 'planned_end_date',
            'actual_start_date', 'actual_end_date',
            'status', 'priority', 'notes',
            'created_at', 'updated_at', 'created_by_name'
        ]
        read_only_fields = ['id', 'plan_number', 'created_at', 'updated_at']


class ProductionPlanDetailSerializer(serializers.ModelSerializer):
    """生産計画詳細用シリアライザー（スケジュール情報を含む）"""
    manufacturing_item_number = serializers.CharField(
        source='manufacturing_item.manufacturing_number',
        read_only=True
    )
    manufacturing_item_name = serializers.CharField(
        source='manufacturing_item.manufacturing_name',
        read_only=True
    )
    product_number = serializers.CharField(
        source='product.product_number',
        read_only=True,
        default=None
    )
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True,
        default=None
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )
    completion_rate = serializers.FloatField(read_only=True)
    schedule_count = serializers.IntegerField(read_only=True)
    remaining_quantity = serializers.IntegerField(read_only=True)
    total_scheduled_quantity = serializers.IntegerField(read_only=True)

    # ネストされたスケジュール情報
    schedules = ProductionScheduleListSerializer(many=True, read_only=True)

    class Meta:
        model = ProductionPlan
        fields = [
            'id', 'plan_number',
            'manufacturing_item', 'manufacturing_item_number', 'manufacturing_item_name',
            'product', 'product_number', 'product_name',
            'total_planned_quantity', 'completed_quantity', 'remaining_quantity',
            'total_scheduled_quantity', 'completion_rate', 'schedule_count',
            'planned_start_date', 'planned_end_date',
            'actual_start_date', 'actual_end_date',
            'status', 'priority', 'notes',
            'schedules',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'plan_number', 'created_at', 'updated_at', 'created_by']


class ProductionPlanCreateSerializer(serializers.ModelSerializer):
    """生産計画作成用シリアライザー（スケジュールも同時作成可能）"""
    schedules = ProductionScheduleCreateUpdateSerializer(many=True, required=False)

    class Meta:
        model = ProductionPlan
        fields = [
            'manufacturing_item', 'product',
            'total_planned_quantity',
            'planned_start_date', 'planned_end_date',
            'status', 'priority', 'notes',
            'schedules'
        ]
        extra_kwargs = {
            'manufacturing_item': {'required': True},
            'total_planned_quantity': {'required': True},
        }

    def create(self, validated_data):
        schedules_data = validated_data.pop('schedules', [])
        request = self.context.get('request')

        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        plan = ProductionPlan.objects.create(**validated_data)

        # スケジュールを作成
        for schedule_data in schedules_data:
            schedule_data['plan'] = plan
            if request and hasattr(request, 'user'):
                schedule_data['created_by'] = request.user
            ProductionSchedule.objects.create(**schedule_data)

        return plan


class ProductionPlanUpdateSerializer(serializers.ModelSerializer):
    """生産計画更新用シリアライザー"""

    class Meta:
        model = ProductionPlan
        fields = [
            'manufacturing_item', 'product',
            'total_planned_quantity', 'completed_quantity',
            'planned_start_date', 'planned_end_date',
            'actual_start_date', 'actual_end_date',
            'status', 'priority', 'notes'
        ]


# ===== Material Serializers =====

class MaterialListSerializer(serializers.ModelSerializer):
    """材料一覧用シリアライザー"""
    supplier_branch_name = serializers.CharField(
        source='supplier_branch.branch_name',
        read_only=True,
        default=None
    )
    supplier_name = serializers.CharField(
        source='supplier_branch.supplier.company_name',
        read_only=True,
        default=None
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )
    is_low_stock = serializers.BooleanField(read_only=True)
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )

    class Meta:
        model = Material
        fields = [
            'id', 'material_code', 'material_name',
            'material_type', 'category', 'category_display',
            'unit', 'stock_quantity', 'minimum_stock', 'maximum_stock',
            'is_low_stock',
            'supplier_branch', 'supplier_branch_name', 'supplier_name',
            'unit_price', 'lead_time_days',
            'is_active',
            'created_at', 'updated_at', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MaterialDetailSerializer(serializers.ModelSerializer):
    """材料詳細用シリアライザー"""
    supplier_branch_name = serializers.CharField(
        source='supplier_branch.branch_name',
        read_only=True,
        default=None
    )
    supplier_name = serializers.CharField(
        source='supplier_branch.supplier.company_name',
        read_only=True,
        default=None
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )
    is_low_stock = serializers.BooleanField(read_only=True)
    is_over_stock = serializers.BooleanField(read_only=True)
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    delivery_schedules = serializers.SerializerMethodField()
    manufacturing_usages = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = [
            'id', 'material_code', 'material_name',
            'material_type', 'category', 'category_display',
            'specification', 'unit',
            'stock_quantity', 'minimum_stock', 'maximum_stock',
            'is_low_stock', 'is_over_stock',
            'supplier_branch', 'supplier_branch_name', 'supplier_name',
            'unit_price', 'lead_time_days',
            'is_active', 'notes',
            'delivery_schedules', 'manufacturing_usages',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_delivery_schedules(self, obj):
        """納入予定を取得"""
        schedules = obj.delivery_schedules.filter(
            status__in=['scheduled', 'ordered', 'in_transit']
        )[:10]
        return MaterialDeliveryScheduleSerializer(schedules, many=True).data

    def get_manufacturing_usages(self, obj):
        """使用される制作品を取得"""
        usages = obj.manufacturing_usages.all()
        return ManufacturingMaterialSerializer(usages, many=True).data


class MaterialCreateUpdateSerializer(serializers.ModelSerializer):
    """材料作成・更新用シリアライザー"""

    class Meta:
        model = Material
        fields = [
            'material_code', 'material_name',
            'material_type', 'category', 'specification', 'unit',
            'stock_quantity', 'minimum_stock', 'maximum_stock',
            'supplier_branch', 'unit_price', 'lead_time_days',
            'is_active', 'notes'
        ]
        extra_kwargs = {
            'material_code': {'required': True},
            'material_name': {'required': True},
        }

    def validate_material_code(self, value):
        """品番の重複チェック"""
        instance = self.instance
        if instance:
            if Material.objects.filter(material_code=value).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError("この品番は既に使用されています")
        else:
            if Material.objects.filter(material_code=value).exists():
                raise serializers.ValidationError("この品番は既に使用されています")
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# ===== MaterialDeliverySchedule Serializers =====

class MaterialDeliveryScheduleSerializer(serializers.ModelSerializer):
    """材料納入予定シリアライザー"""
    material_code = serializers.CharField(
        source='material.material_code',
        read_only=True
    )
    material_name = serializers.CharField(
        source='material.material_name',
        read_only=True
    )
    unit = serializers.CharField(
        source='material.unit',
        read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = MaterialDeliverySchedule
        fields = [
            'id', 'material', 'material_code', 'material_name', 'unit',
            'quantity', 'scheduled_date',
            'actual_date', 'actual_quantity',
            'status', 'status_display',
            'order_reference', 'notes',
            'created_at', 'updated_at', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MaterialDeliveryScheduleCreateUpdateSerializer(serializers.ModelSerializer):
    """材料納入予定作成・更新用シリアライザー"""

    class Meta:
        model = MaterialDeliverySchedule
        fields = [
            'material', 'quantity', 'scheduled_date',
            'actual_date', 'actual_quantity',
            'status', 'order_reference', 'notes'
        ]
        extra_kwargs = {
            'material': {'required': True},
            'quantity': {'required': True},
            'scheduled_date': {'required': True},
        }

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# ===== ManufacturingMaterial Serializers =====

class ManufacturingMaterialSerializer(serializers.ModelSerializer):
    """制作品材料構成シリアライザー"""
    manufacturing_item_number = serializers.CharField(
        source='manufacturing_item.manufacturing_number',
        read_only=True
    )
    manufacturing_item_name = serializers.CharField(
        source='manufacturing_item.manufacturing_name',
        read_only=True
    )
    material_code = serializers.CharField(
        source='material.material_code',
        read_only=True
    )
    material_name = serializers.CharField(
        source='material.material_name',
        read_only=True
    )
    material_unit = serializers.CharField(
        source='material.unit',
        read_only=True
    )
    material_stock_quantity = serializers.IntegerField(
        source='material.stock_quantity',
        read_only=True
    )

    class Meta:
        model = ManufacturingMaterial
        fields = [
            'id', 'manufacturing_item', 'manufacturing_item_number', 'manufacturing_item_name',
            'material', 'material_code', 'material_name', 'material_unit', 'material_stock_quantity',
            'quantity_required', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ManufacturingMaterialCreateUpdateSerializer(serializers.ModelSerializer):
    """制作品材料構成作成・更新用シリアライザー"""

    class Meta:
        model = ManufacturingMaterial
        fields = [
            'manufacturing_item', 'material', 'quantity_required', 'notes'
        ]
        extra_kwargs = {
            'manufacturing_item': {'required': True},
            'material': {'required': True},
            'quantity_required': {'required': True},
        }

    def validate(self, data):
        """重複チェック"""
        manufacturing_item = data.get('manufacturing_item')
        material = data.get('material')
        instance = self.instance

        if instance:
            exists = ManufacturingMaterial.objects.filter(
                manufacturing_item=manufacturing_item,
                material=material
            ).exclude(pk=instance.pk).exists()
        else:
            exists = ManufacturingMaterial.objects.filter(
                manufacturing_item=manufacturing_item,
                material=material
            ).exists()

        if exists:
            raise serializers.ValidationError(
                "この制作品と材料の組み合わせは既に登録されています"
            )

        return data
