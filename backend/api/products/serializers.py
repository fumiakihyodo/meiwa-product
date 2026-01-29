# api/products/serializers.py

from rest_framework import serializers
from api.products.models import Product


class ProductListSerializer(serializers.ModelSerializer):
    """製品一覧用のシリアライザー"""
    parts_count = serializers.IntegerField(read_only=True)
    manufacturing_items_count = serializers.IntegerField(read_only=True, default=0)
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )
    customer_branch_name = serializers.CharField(
        source='customer_branch.display_name',
        read_only=True,
        default=None
    )
    customer_name = serializers.CharField(
        source='customer_branch.customer.company_name',
        read_only=True,
        default=None
    )
    branch_name = serializers.CharField(
        source='customer_branch.branch_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = Product
        fields = [
            'id', 'product_number', 'product_name', 'model_info', 'status',
            'is_assembly', 'is_parts_processing',
            'customer_branch', 'customer_branch_name', 'customer_name',
            'branch_name', 'parts_count', 'manufacturing_items_count',
            'created_at', 'updated_at', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductDetailSerializer(serializers.ModelSerializer):
    """製品詳細用のシリアライザー（部品情報を含む）"""
    parts_count = serializers.IntegerField(read_only=True)
    manufacturing_items_count = serializers.IntegerField(read_only=True, default=0)
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )
    customer_branch_name = serializers.CharField(
        source='customer_branch.display_name',
        read_only=True,
        default=None
    )
    customer_name = serializers.CharField(
        source='customer_branch.customer.company_name',
        read_only=True,
        default=None
    )
    branch_name = serializers.CharField(
        source='customer_branch.branch_name',
        read_only=True,
        default=None
    )
    branch_type = serializers.CharField(
        source='customer_branch.branch_type',
        read_only=True,
        default=None
    )
    customer_branch_full_address = serializers.CharField(
        source='customer_branch.full_address',
        read_only=True,
        default=None
    )

    # 紐づく部品の情報
    parts = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'product_number', 'product_name', 'model_info', 'description',
            'status', 'is_assembly', 'is_parts_processing',
            'customer_branch', 'customer_branch_name',
            'customer_name', 'branch_name', 'branch_type',
            'customer_branch_full_address', 'parts_count', 'manufacturing_items_count', 'parts',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_parts(self, obj):
        """関連する部品情報を取得"""
        from api.purchases.serializers import PartListSerializer
        parts = obj.active_parts
        return PartListSerializer(parts, many=True).data


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """製品作成・更新用のシリアライザー"""

    class Meta:
        model = Product
        fields = [
            'product_number', 'product_name', 'model_info', 'description', 'status',
            'is_assembly', 'is_parts_processing', 'customer_branch'
        ]
        extra_kwargs = {
            'product_number': {'required': True},
            'product_name': {'required': True},
        }

    def validate_product_number(self, value):
        """製品品番の重複チェック"""
        instance = self.instance
        if instance:
            if Product.objects.filter(product_number=value).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError("この製品品番は既に使用されています")
        else:
            if Product.objects.filter(product_number=value).exists():
                raise serializers.ValidationError("この製品品番は既に使用されています")
        return value

    def create(self, validated_data):
        """製品の作成"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)