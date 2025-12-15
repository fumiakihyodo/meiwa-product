# api/purchases/serializers.py

from rest_framework import serializers
from api.purchases.models import Part, PriceHistory, SuppliedItem, SuppliedItemPriceHistory
from decimal import Decimal


class PriceHistoryListSerializer(serializers.ModelSerializer):
    """価格履歴一覧用のシリアライザー"""
    is_current = serializers.BooleanField(read_only=True)
    is_future = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    quote_file_name = serializers.CharField(read_only=True)  # ← 追加
    quote_file_size = serializers.IntegerField(read_only=True)  # ← 追加
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = PriceHistory
        fields = [
            'id', 'price', 'start_date', 'end_date', 'is_active',
            'is_current', 'is_future', 'is_expired',
            'change_reason', 'quote_file', 'quote_file_name', 'quote_file_size',  
            'created_at', 'created_by_name'
        ]


class PriceHistoryDetailSerializer(serializers.ModelSerializer):
    """価格履歴詳細用のシリアライザー"""
    part_number = serializers.CharField(source='part.part_number', read_only=True)
    part_name = serializers.CharField(source='part.part_name', read_only=True)
    is_current = serializers.BooleanField(read_only=True)
    is_future = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    quote_file_name = serializers.CharField(read_only=True)
    quote_file_size = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = PriceHistory
        fields = [
            'id', 'part', 'part_number', 'part_name',
            'price', 'start_date', 'end_date', 'is_active',
            'is_current', 'is_future', 'is_expired',
            'change_reason', 'quote_file', 'quote_file_name',
            'quote_file_size', 'notes', 'created_at', 'updated_at',
            'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


class PriceHistoryCreateUpdateSerializer(serializers.ModelSerializer):
    """価格履歴作成・更新用のシリアライザー"""
    
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = PriceHistory
        fields = [
            'id', 'part', 'price', 'start_date', 'end_date',
            'is_active', 'change_reason', 'quote_file', 'notes',
            'created_by'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'part': {'required': True},
            'price': {'required': True},
            'start_date': {'required': True},
        }

    def validate_price(self, value):
        """価格の検証"""
        if value < Decimal('0.00'):
            raise serializers.ValidationError("価格は0以上である必要があります")
        return value

    def validate(self, attrs):
        """期間の検証"""
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({
                'end_date': '終了日は開始日以降の日付を指定してください'
            })
        
        return attrs
    
    def create(self, validated_data):
        """作成時の処理"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"[Serializer Create] validated_data: {validated_data}")
        logger.info(f"[Serializer Create] quote_file present: {'quote_file' in validated_data}")
        
        instance = super().create(validated_data)
        
        logger.info(f"[Serializer Create] Created instance: {instance.id}")
        logger.info(f"[Serializer Create] Instance quote_file: {instance.quote_file}")
        
        return instance
    
    def to_representation(self, instance):
        """レスポンス用のシリアライザーを使用"""
        return PriceHistoryDetailSerializer(instance, context=self.context).data


class PartListSerializer(serializers.ModelSerializer):
    """部品一覧用のシリアライザー"""
    product_number = serializers.CharField(source='product.product_number', read_only=True)
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    supplier_name = serializers.CharField(
        source='supplier_branch.supplier.company_name',
        read_only=True
    )
    branch_name = serializers.CharField(
        source='supplier_branch.branch_name',
        read_only=True
    )
    current_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    price_history_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Part
        fields = [
            'id', 'part_number', 'part_name','supplier_part_name', 'order_type','product', 'product_number',
            'product_name', 'supplier_branch', 'supplier_name', 'branch_name',
            'specification', 'unit', 'minimum_order_quantity',
            'lead_time_days', 'current_price', 'price_history_count',
            'is_active', 'created_at'
        ]


# serializers.py

class PartDetailSerializer(serializers.ModelSerializer):
    """部品詳細用のシリアライザー(価格履歴を含む)"""
    product_number = serializers.CharField(source='product.product_number', read_only=True)
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    
    # 顧客情報を追加
    customer_name = serializers.SerializerMethodField()
    customer_branch_name = serializers.SerializerMethodField()

    supplier_name = serializers.CharField(
        source='supplier_branch.supplier.company_name',
        read_only=True
    )
    branch_name = serializers.CharField(
        source='supplier_branch.branch_name',
        read_only=True
    )
    branch_display_name = serializers.CharField(
        source='supplier_branch.display_name',
        read_only=True
    )
    current_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    has_multiple_active_prices = serializers.BooleanField(read_only=True)
    price_history_count = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )
    
    # 価格履歴
    price_histories = PriceHistoryListSerializer(many=True, read_only=True)

    class Meta:
        model = Part
        fields = [
            'id', 'product', 'product_number', 'product_name',
            'customer_name', 'customer_branch_name', 
            'supplier_branch', 'supplier_name', 'branch_name',
            'branch_display_name', 'part_number', 'part_name','supplier_part_name',
            'order_type', 'specification', 'unit', 'minimum_order_quantity',
            'lead_time_days', 'current_price', 'has_multiple_active_prices',
            'price_history_count', 'price_histories', 'is_active',
            'notes', 'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_customer_name(self, obj):
        """顧客名を取得"""
        try:
            if obj.product and obj.product.customer_branch:
                return obj.product.customer_branch.customer.company_name
        except AttributeError:
            pass
        return None
    
    def get_customer_branch_name(self, obj):
        """顧客拠点名を取得"""
        try:
            if obj.product and obj.product.customer_branch:
                return obj.product.customer_branch.branch_name
        except AttributeError:
            pass
        return None


class PartCreateUpdateSerializer(serializers.ModelSerializer):
    """部品作成・更新用のシリアライザー"""
    
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = Part
        fields = [
            'id',
            'product', 'supplier_branch', 'part_number', 'part_name','order_type', 'supplier_part_name',
            'specification', 'unit', 'minimum_order_quantity',
            'lead_time_days', 'is_active', 'notes',
            'created_by'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'product': {'required': True},
            'supplier_branch': {'required': True},
            'part_number': {'required': True},
            'part_name': {'required': True},
        }

    def validate_minimum_order_quantity(self, value):
        """最小発注数量の検証"""
        if value < 1:
            raise serializers.ValidationError("最小発注数量は1以上である必要があります")
        return value

    def validate(self, attrs):
        """重複チェック"""
        product = attrs.get('product')
        supplier_branch = attrs.get('supplier_branch')
        part_number = attrs.get('part_number')
        
        instance = self.instance
        if instance:
            existing = Part.objects.filter(
                product=product,
                supplier_branch=supplier_branch,
                part_number=part_number
            ).exclude(pk=instance.pk)
        else:
            existing = Part.objects.filter(
                product=product,
                supplier_branch=supplier_branch,
                part_number=part_number
            )
        
        if existing.exists():
            raise serializers.ValidationError(
                "この製品と仕入先の組み合わせで、同じ品番が既に登録されています"
            )

        return attrs


# ===== 支給品関連のシリアライザー =====

class SuppliedItemPriceHistoryListSerializer(serializers.ModelSerializer):
    """支給品価格履歴一覧用のシリアライザー"""
    is_current = serializers.BooleanField(read_only=True)
    is_future = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    quote_file_name = serializers.CharField(read_only=True)
    quote_file_size = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = SuppliedItemPriceHistory
        fields = [
            'id', 'price', 'start_date', 'end_date', 'is_active',
            'is_current', 'is_future', 'is_expired',
            'change_reason', 'quote_file', 'quote_file_name', 'quote_file_size',
            'created_at', 'created_by_name'
        ]


class SuppliedItemPriceHistoryDetailSerializer(serializers.ModelSerializer):
    """支給品価格履歴詳細用のシリアライザー"""
    item_number = serializers.CharField(source='supplied_item.item_number', read_only=True)
    item_name = serializers.CharField(source='supplied_item.item_name', read_only=True)
    is_current = serializers.BooleanField(read_only=True)
    is_future = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    quote_file_name = serializers.CharField(read_only=True)
    quote_file_size = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = SuppliedItemPriceHistory
        fields = [
            'id', 'supplied_item', 'item_number', 'item_name',
            'price', 'start_date', 'end_date', 'is_active',
            'is_current', 'is_future', 'is_expired',
            'change_reason', 'quote_file', 'quote_file_name',
            'quote_file_size', 'notes', 'created_at', 'updated_at',
            'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


class SuppliedItemPriceHistoryCreateUpdateSerializer(serializers.ModelSerializer):
    """支給品価格履歴作成・更新用のシリアライザー"""

    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = SuppliedItemPriceHistory
        fields = [
            'id', 'supplied_item', 'price', 'start_date', 'end_date',
            'is_active', 'change_reason', 'quote_file', 'notes',
            'created_by'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'supplied_item': {'required': True},
            'price': {'required': True},
            'start_date': {'required': True},
        }

    def validate_price(self, value):
        """価格の検証"""
        if value < Decimal('0.00'):
            raise serializers.ValidationError("価格は0以上である必要があります")
        return value

    def validate(self, attrs):
        """期間の検証"""
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({
                'end_date': '終了日は開始日以降の日付を指定してください'
            })

        return attrs

    def create(self, validated_data):
        """作成時の処理"""
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"[Serializer Create] validated_data: {validated_data}")
        logger.info(f"[Serializer Create] quote_file present: {'quote_file' in validated_data}")

        instance = super().create(validated_data)

        logger.info(f"[Serializer Create] Created instance: {instance.id}")
        logger.info(f"[Serializer Create] Instance quote_file: {instance.quote_file}")

        return instance

    def to_representation(self, instance):
        """レスポンス用のシリアライザーを使用"""
        return SuppliedItemPriceHistoryDetailSerializer(instance, context=self.context).data


class SuppliedItemListSerializer(serializers.ModelSerializer):
    """支給品一覧用のシリアライザー"""
    product_number = serializers.CharField(source='product.product_number', read_only=True)
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    current_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    price_history_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = SuppliedItem
        fields = [
            'id', 'item_number', 'item_name', 'product', 'product_number',
            'product_name', 'specification', 'unit', 'standard_quantity',
            'current_price', 'price_history_count',
            'is_active', 'created_at'
        ]


class SuppliedItemDetailSerializer(serializers.ModelSerializer):
    """支給品詳細用のシリアライザー(価格履歴を含む)"""
    product_number = serializers.CharField(source='product.product_number', read_only=True)
    product_name = serializers.CharField(source='product.product_name', read_only=True)

    # 顧客情報を追加
    customer_name = serializers.SerializerMethodField()
    customer_branch_name = serializers.SerializerMethodField()

    current_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    has_multiple_active_prices = serializers.BooleanField(read_only=True)
    price_history_count = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    # 価格履歴
    supplied_item_price_histories = SuppliedItemPriceHistoryListSerializer(many=True, read_only=True)

    class Meta:
        model = SuppliedItem
        fields = [
            'id', 'product', 'product_number', 'product_name',
            'customer_name', 'customer_branch_name',
            'item_number', 'item_name',
            'specification', 'unit', 'standard_quantity',
            'current_price', 'has_multiple_active_prices',
            'price_history_count', 'supplied_item_price_histories', 'is_active',
            'notes', 'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_customer_name(self, obj):
        """顧客名を取得"""
        try:
            if obj.product and obj.product.customer_branch:
                return obj.product.customer_branch.customer.company_name
        except AttributeError:
            pass
        return None

    def get_customer_branch_name(self, obj):
        """顧客拠点名を取得"""
        try:
            if obj.product and obj.product.customer_branch:
                return obj.product.customer_branch.branch_name
        except AttributeError:
            pass
        return None


class SuppliedItemCreateUpdateSerializer(serializers.ModelSerializer):
    """支給品作成・更新用のシリアライザー"""

    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = SuppliedItem
        fields = [
            'id',
            'product', 'item_number', 'item_name',
            'specification', 'unit', 'standard_quantity',
            'is_active', 'notes',
            'created_by'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'product': {'required': True},
            'item_number': {'required': True},
            'item_name': {'required': True},
        }

    def validate_standard_quantity(self, value):
        """標準数量の検証"""
        if value < 1:
            raise serializers.ValidationError("標準数量は1以上である必要があります")
        return value

    def validate(self, attrs):
        """重複チェック"""
        product = attrs.get('product')
        item_number = attrs.get('item_number')

        instance = self.instance
        if instance:
            existing = SuppliedItem.objects.filter(
                product=product,
                item_number=item_number
            ).exclude(pk=instance.pk)
        else:
            existing = SuppliedItem.objects.filter(
                product=product,
                item_number=item_number
            )

        if existing.exists():
            raise serializers.ValidationError(
                "この製品で同じ品番が既に登録されています"
            )

        return attrs