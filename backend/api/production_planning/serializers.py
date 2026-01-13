# api/production_planning/serializers.py
"""
生産計画管理用シリアライザー
国内/海外生産の分類とフィルタリングをサポート
"""

from rest_framework import serializers
from api.manufacturing.models import (
    ManufacturingItem,
    ProductionPlan,
    ProductionSchedule,
)


# ===== 生産タイプ定義 =====

PRODUCTION_TYPE_CHOICES = [
    ('domestic', '国内生産'),
    ('overseas', '海外生産'),
]


# ===== 制作品シリアライザー（生産計画用） =====

class ProductionPlanningItemListSerializer(serializers.ModelSerializer):
    """制作品一覧用シリアライザー（生産計画管理向け）"""
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
    production_type_display = serializers.CharField(
        source='get_production_type_display',
        read_only=True
    )
    active_plan_count = serializers.IntegerField(read_only=True, default=0)
    total_planned_quantity = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ManufacturingItem
        fields = [
            'id', 'manufacturing_number', 'manufacturing_name',
            'production_type', 'production_type_display',
            'product', 'product_number', 'product_name',
            'unit', 'standard_production_time', 'is_active',
            'active_plan_count', 'total_planned_quantity',
            'created_at', 'updated_at'
        ]


class ProductionPlanningItemDetailSerializer(serializers.ModelSerializer):
    """制作品詳細用シリアライザー（生産計画管理向け）"""
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
    production_type_display = serializers.CharField(
        source='get_production_type_display',
        read_only=True
    )
    production_plans = serializers.SerializerMethodField()

    class Meta:
        model = ManufacturingItem
        fields = [
            'id', 'manufacturing_number', 'manufacturing_name',
            'production_type', 'production_type_display',
            'product', 'product_number', 'product_name',
            'specification', 'unit', 'standard_production_time',
            'is_active', 'notes',
            'production_plans',
            'created_at', 'updated_at'
        ]

    def get_production_plans(self, obj):
        """関連する生産計画（直近10件）"""
        plans = obj.production_plans.all()[:10]
        return ProductionPlanListSerializer(plans, many=True).data


# ===== 生産スケジュールシリアライザー =====

class ProductionScheduleSerializer(serializers.ModelSerializer):
    """生産スケジュールシリアライザー"""
    assigned_to_name = serializers.CharField(
        source='assigned_to.full_name',
        read_only=True,
        default=None
    )
    completion_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = ProductionSchedule
        fields = [
            'id', 'schedule_number',
            'quantity', 'completed_quantity', 'completion_rate',
            'started_at', 'finished_at',
            'actual_started_at', 'actual_finished_at',
            'status', 'assigned_to', 'assigned_to_name',
            'production_line', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'schedule_number', 'created_at', 'updated_at']


class ProductionScheduleCreateSerializer(serializers.ModelSerializer):
    """生産スケジュール作成用シリアライザー"""

    class Meta:
        model = ProductionSchedule
        fields = [
            'quantity', 'started_at', 'finished_at',
            'assigned_to', 'production_line', 'notes'
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# ===== 生産計画シリアライザー =====

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
    production_type = serializers.CharField(
        source='manufacturing_item.production_type',
        read_only=True
    )
    production_type_display = serializers.SerializerMethodField()
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
    completion_rate = serializers.FloatField(read_only=True)
    schedule_count = serializers.IntegerField(read_only=True)
    remaining_quantity = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = ProductionPlan
        fields = [
            'id', 'plan_number',
            'manufacturing_item', 'manufacturing_item_number', 'manufacturing_item_name',
            'production_type', 'production_type_display',
            'product', 'product_number', 'product_name',
            'total_planned_quantity', 'completed_quantity', 'remaining_quantity',
            'completion_rate', 'schedule_count',
            'planned_start_date', 'planned_end_date',
            'actual_start_date', 'actual_end_date',
            'status', 'status_display', 'priority', 'notes',
            'created_at', 'updated_at'
        ]

    def get_production_type_display(self, obj):
        if obj.manufacturing_item:
            return obj.manufacturing_item.get_production_type_display()
        return None


class ProductionPlanDetailSerializer(serializers.ModelSerializer):
    """生産計画詳細用シリアライザー"""
    manufacturing_item_number = serializers.CharField(
        source='manufacturing_item.manufacturing_number',
        read_only=True
    )
    manufacturing_item_name = serializers.CharField(
        source='manufacturing_item.manufacturing_name',
        read_only=True
    )
    production_type = serializers.CharField(
        source='manufacturing_item.production_type',
        read_only=True
    )
    production_type_display = serializers.SerializerMethodField()
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
    completion_rate = serializers.FloatField(read_only=True)
    schedule_count = serializers.IntegerField(read_only=True)
    remaining_quantity = serializers.IntegerField(read_only=True)
    total_scheduled_quantity = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )
    schedules = ProductionScheduleSerializer(many=True, read_only=True)

    class Meta:
        model = ProductionPlan
        fields = [
            'id', 'plan_number',
            'manufacturing_item', 'manufacturing_item_number', 'manufacturing_item_name',
            'production_type', 'production_type_display',
            'product', 'product_number', 'product_name',
            'total_planned_quantity', 'completed_quantity', 'remaining_quantity',
            'total_scheduled_quantity', 'completion_rate', 'schedule_count',
            'planned_start_date', 'planned_end_date',
            'actual_start_date', 'actual_end_date',
            'status', 'status_display', 'priority', 'notes',
            'schedules',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]

    def get_production_type_display(self, obj):
        if obj.manufacturing_item:
            return obj.manufacturing_item.get_production_type_display()
        return None


class ProductionPlanCreateSerializer(serializers.ModelSerializer):
    """生産計画作成用シリアライザー"""
    schedules = ProductionScheduleCreateSerializer(many=True, required=False)

    class Meta:
        model = ProductionPlan
        fields = [
            'manufacturing_item', 'product',
            'total_planned_quantity',
            'planned_start_date', 'planned_end_date',
            'status', 'priority', 'notes',
            'schedules'
        ]

    def validate_manufacturing_item(self, value):
        """制作品の存在確認"""
        if not value.is_active:
            raise serializers.ValidationError("この制作品は無効です")
        return value

    def create(self, validated_data):
        schedules_data = validated_data.pop('schedules', [])
        request = self.context.get('request')

        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        plan = ProductionPlan.objects.create(**validated_data)

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


# ===== 統計情報シリアライザー =====

class ProductionPlanStatisticsSerializer(serializers.Serializer):
    """生産計画統計情報シリアライザー"""
    production_type = serializers.CharField()
    production_type_display = serializers.CharField()
    total_plans = serializers.IntegerField()
    active_plans = serializers.IntegerField()
    completed_plans = serializers.IntegerField()
    total_planned_quantity = serializers.IntegerField()
    total_completed_quantity = serializers.IntegerField()
    overall_completion_rate = serializers.FloatField()
