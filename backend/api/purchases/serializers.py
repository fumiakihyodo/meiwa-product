# api/purchases/serializers.py

from rest_framework import serializers
from api.purchases.models import (
    Part, PriceHistory, SuppliedItem, SuppliedItemPriceHistory,
    SuppliedItemList, SuppliedItemListItem, SuppliedItemReceiving,
    SuppliedItemReceivingItem, SuppliedItemInventory,
    PurchaseOrder, PurchaseOrderItem, PurchaseReceiving,
    PurchaseReceivingItem, PurchasedItemInventory, InventoryAdjustment
)
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
    product_number = serializers.CharField(source='product.product_number', read_only=True, default=None)
    product_name = serializers.CharField(source='product.product_name', read_only=True, default=None)
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
            'lead_time_days', 'usage_quantity', 'current_price', 'price_history_count',
            'is_active', 'created_at'
        ]


# serializers.py

class PartDetailSerializer(serializers.ModelSerializer):
    """部品詳細用のシリアライザー(価格履歴を含む)"""
    product_number = serializers.CharField(source='product.product_number', read_only=True, default=None)
    product_name = serializers.CharField(source='product.product_name', read_only=True, default=None)
    
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
            'lead_time_days', 'usage_quantity', 'current_price', 'has_multiple_active_prices',
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
            'product', 'supplier_branch', 'part_number', 'part_name', 'order_type', 'supplier_part_name',
            'specification', 'unit', 'usage_quantity', 'minimum_order_quantity',
            'lead_time_days', 'is_active', 'notes',
            'created_by'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'product': {'required': False, 'allow_null': True},
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

        # 製品が指定されていない場合の重複チェック
        if product is None:
            if instance:
                existing = Part.objects.filter(
                    product__isnull=True,
                    supplier_branch=supplier_branch,
                    part_number=part_number
                ).exclude(pk=instance.pk)
            else:
                existing = Part.objects.filter(
                    product__isnull=True,
                    supplier_branch=supplier_branch,
                    part_number=part_number
                )
        else:
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
            'change_reason', 'created_at', 'created_by_name'
        ]


class SuppliedItemPriceHistoryDetailSerializer(serializers.ModelSerializer):
    """支給品価格履歴詳細用のシリアライザー"""
    item_number = serializers.CharField(source='supplied_item.item_number', read_only=True)
    item_name = serializers.CharField(source='supplied_item.item_name', read_only=True)
    is_current = serializers.BooleanField(read_only=True)
    is_future = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
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
            'change_reason', 'notes', 'created_at', 'updated_at',
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
            'is_active', 'change_reason', 'notes',
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
        instance = super().create(validated_data)
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


# ===== 在庫管理関連のシリアライザー =====

class SuppliedItemListItemSerializer(serializers.ModelSerializer):
    """支給品リスト項目シリアライザー"""
    is_quantity_matched = serializers.BooleanField(read_only=True)
    receiving_confirmed_by_name = serializers.CharField(
        source='receiving_confirmed_by.full_name',
        read_only=True,
        default=None
    )
    count_confirmed_by_name = serializers.CharField(
        source='count_confirmed_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = SuppliedItemListItem
        fields = [
            'id', 'supplied_item_list', 'supplied_item',
            'item_number', 'item_name', 'quantity', 'quantity_per_box',
            'box_count', 'unit', 'receiving_confirmed', 'receiving_confirmed_at',
            'receiving_confirmed_by', 'receiving_confirmed_by_name',
            'received_quantity', 'is_quantity_matched',
            'count_confirmed', 'count_confirmed_at', 'count_confirmed_by',
            'count_confirmed_by_name', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SuppliedItemListItemCreateSerializer(serializers.ModelSerializer):
    """支給品リスト項目作成シリアライザー"""

    class Meta:
        model = SuppliedItemListItem
        fields = [
            'id', 'supplied_item_list', 'supplied_item',
            'item_number', 'item_name', 'quantity', 'quantity_per_box',
            'box_count', 'unit', 'notes'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'item_number': {'required': True},
            'item_name': {'required': True},
            'quantity': {'required': True},
        }


class SuppliedItemListListSerializer(serializers.ModelSerializer):
    """支給品リスト一覧シリアライザー

    パフォーマンス最適化: アノテーションフィールドを使用
    """
    product_name = serializers.CharField(source='product.product_name', read_only=True, allow_null=True, default=None)
    product_number = serializers.CharField(source='product.product_number', read_only=True, allow_null=True, default=None)
    customer_name = serializers.SerializerMethodField()
    # アノテーションから取得（N+1問題の解消）
    total_items = serializers.SerializerMethodField()
    total_quantity = serializers.SerializerMethodField()
    received_items_count = serializers.SerializerMethodField()
    count_confirmed_items_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = SuppliedItemList
        fields = [
            'id', 'list_number', 'product', 'product_name', 'product_number',
            'customer_name', 'issue_date', 'delivery_date', 'status', 'status_display',
            'total_items', 'total_quantity', 'received_items_count',
            'count_confirmed_items_count', 'notes', 'created_at',
            'updated_at', 'created_by_name'
        ]

    def get_customer_name(self, obj):
        """顧客名を取得"""
        try:
            if obj.product and obj.product.customer_branch:
                return obj.product.customer_branch.customer.company_name
        except AttributeError:
            pass
        return None

    def get_total_items(self, obj):
        """項目数を取得（アノテーション優先）"""
        if hasattr(obj, 'total_items_count'):
            return obj.total_items_count
        return obj.total_items

    def get_total_quantity(self, obj):
        """合計数量を取得（アノテーション優先）"""
        if hasattr(obj, 'total_quantity_sum'):
            return obj.total_quantity_sum or 0
        return obj.total_quantity

    def get_received_items_count(self, obj):
        """受入確認済み数を取得（アノテーション優先）"""
        if hasattr(obj, 'received_items_annotated'):
            return obj.received_items_annotated
        return obj.received_items_count

    def get_count_confirmed_items_count(self, obj):
        """員数確認済み数を取得（アノテーション優先）"""
        if hasattr(obj, 'count_confirmed_items_annotated'):
            return obj.count_confirmed_items_annotated
        return obj.count_confirmed_items_count


class SuppliedItemListDetailSerializer(serializers.ModelSerializer):
    """支給品リスト詳細シリアライザー"""
    product_name = serializers.CharField(source='product.product_name', read_only=True, allow_null=True, default=None)
    product_number = serializers.CharField(source='product.product_number', read_only=True, allow_null=True, default=None)
    customer_name = serializers.SerializerMethodField()
    items = SuppliedItemListItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)
    received_items_count = serializers.IntegerField(read_only=True)
    count_confirmed_items_count = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = SuppliedItemList
        fields = [
            'id', 'list_number', 'product', 'product_name', 'product_number',
            'customer_name', 'issue_date', 'delivery_date', 'csv_file', 'status', 'status_display',
            'items', 'total_items', 'total_quantity', 'received_items_count',
            'count_confirmed_items_count', 'notes', 'created_at', 'updated_at',
            'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'list_number', 'created_at', 'updated_at', 'created_by']

    def get_customer_name(self, obj):
        """顧客名を取得"""
        try:
            if obj.product and obj.product.customer_branch:
                return obj.product.customer_branch.customer.company_name
        except AttributeError:
            pass
        return None


class SuppliedItemListCreateSerializer(serializers.ModelSerializer):
    """支給品リスト作成シリアライザー"""
    items = SuppliedItemListItemCreateSerializer(many=True, required=False)
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = SuppliedItemList
        fields = [
            'id', 'product', 'issue_date', 'delivery_date', 'csv_file',
            'status', 'notes', 'items', 'created_by'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'product': {'required': True},
            'issue_date': {'required': True},
            'delivery_date': {'required': False},
        }

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        instance = SuppliedItemList.objects.create(**validated_data)

        for item_data in items_data:
            SuppliedItemListItem.objects.create(
                supplied_item_list=instance,
                **item_data
            )

        return instance

    def to_representation(self, instance):
        return SuppliedItemListDetailSerializer(instance, context=self.context).data


class SuppliedItemListUpdateSerializer(serializers.ModelSerializer):
    """支給品リスト更新シリアライザー"""

    class Meta:
        model = SuppliedItemList
        fields = [
            'id', 'product', 'issue_date', 'delivery_date', 'csv_file',
            'status', 'notes'
        ]
        read_only_fields = ['id']

    def to_representation(self, instance):
        return SuppliedItemListDetailSerializer(instance, context=self.context).data


# ===== 受入確認関連のシリアライザー =====

class SuppliedItemReceivingItemSerializer(serializers.ModelSerializer):
    """支給品受入確認項目シリアライザー"""

    class Meta:
        model = SuppliedItemReceivingItem
        fields = [
            'id', 'receiving', 'supplied_item', 'list_item', 'item_number', 'item_name',
            'quantity_per_box', 'box_count', 'calculated_quantity',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'calculated_quantity', 'created_at', 'updated_at']


class SuppliedItemReceivingItemCreateSerializer(serializers.ModelSerializer):
    """支給品受入確認項目作成シリアライザー"""

    class Meta:
        model = SuppliedItemReceivingItem
        fields = [
            'id', 'supplied_item', 'list_item', 'item_number', 'item_name',
            'quantity_per_box', 'box_count', 'notes'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'item_number': {'required': True},
            'quantity_per_box': {'required': True},
            'box_count': {'required': True},
        }


class SuppliedItemReceivingListSerializer(serializers.ModelSerializer):
    """支給品受入確認一覧シリアライザー"""
    list_number = serializers.SerializerMethodField()
    list_numbers = serializers.SerializerMethodField()  # 多対多紐づけ用
    product_name = serializers.SerializerMethodField()
    product_number = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    total_quantity = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = SuppliedItemReceiving
        fields = [
            'id', 'supplied_item_list', 'supplied_item_lists', 'product', 'list_number',
            'list_numbers', 'product_number', 'product_name',
            'status', 'status_display', 'receiving_date', 'items_count',
            'total_quantity', 'notes', 'created_at', 'updated_at', 'created_by_name'
        ]

    def get_list_number(self, obj):
        # 後方互換: 単一リストがある場合はそのリスト番号を返す
        if obj.supplied_item_list:
            return obj.supplied_item_list.list_number
        # 多対多紐づけがある場合は最初のリスト番号を返す
        first_list = obj.supplied_item_lists.first()
        if first_list:
            return first_list.list_number
        return None

    def get_list_numbers(self, obj):
        """多対多紐づけされた全リスト番号を返す"""
        list_numbers = list(obj.supplied_item_lists.values_list('list_number', flat=True))
        # 後方互換: 単一リストも含める
        if obj.supplied_item_list and obj.supplied_item_list.list_number not in list_numbers:
            list_numbers.insert(0, obj.supplied_item_list.list_number)
        return list_numbers

    def get_product_name(self, obj):
        if obj.supplied_item_list and obj.supplied_item_list.product:
            return obj.supplied_item_list.product.product_name
        if obj.product:
            return obj.product.product_name
        return None

    def get_product_number(self, obj):
        if obj.supplied_item_list and obj.supplied_item_list.product:
            return obj.supplied_item_list.product.product_number
        if obj.product:
            return obj.product.product_number
        return None

    def get_total_quantity(self, obj):
        return sum(item.calculated_quantity for item in obj.items.all())


class SuppliedItemReceivingDetailSerializer(serializers.ModelSerializer):
    """支給品受入確認詳細シリアライザー"""
    list_number = serializers.SerializerMethodField()
    list_numbers = serializers.SerializerMethodField()  # 多対多紐づけ用
    list_ids = serializers.SerializerMethodField()  # 多対多紐づけのID一覧
    product_name = serializers.SerializerMethodField()
    product_number = serializers.SerializerMethodField()
    items = SuppliedItemReceivingItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_quantity = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = SuppliedItemReceiving
        fields = [
            'id', 'supplied_item_list', 'supplied_item_lists', 'product',
            'list_number', 'list_numbers', 'list_ids',
            'product_number', 'product_name',
            'status', 'status_display', 'receiving_date', 'items',
            'total_quantity', 'notes', 'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_list_number(self, obj):
        # 後方互換: 単一リストがある場合はそのリスト番号を返す
        if obj.supplied_item_list:
            return obj.supplied_item_list.list_number
        # 多対多紐づけがある場合は最初のリスト番号を返す
        first_list = obj.supplied_item_lists.first()
        if first_list:
            return first_list.list_number
        return None

    def get_list_numbers(self, obj):
        """多対多紐づけされた全リスト番号を返す"""
        list_numbers = list(obj.supplied_item_lists.values_list('list_number', flat=True))
        # 後方互換: 単一リストも含める
        if obj.supplied_item_list and obj.supplied_item_list.list_number not in list_numbers:
            list_numbers.insert(0, obj.supplied_item_list.list_number)
        return list_numbers

    def get_list_ids(self, obj):
        """多対多紐づけされた全リストIDを返す"""
        list_ids = list(obj.supplied_item_lists.values_list('id', flat=True))
        # 後方互換: 単一リストも含める
        if obj.supplied_item_list_id and obj.supplied_item_list_id not in list_ids:
            list_ids.insert(0, obj.supplied_item_list_id)
        return list_ids

    def get_product_name(self, obj):
        if obj.supplied_item_list and obj.supplied_item_list.product:
            return obj.supplied_item_list.product.product_name
        if obj.product:
            return obj.product.product_name
        return None

    def get_product_number(self, obj):
        if obj.supplied_item_list and obj.supplied_item_list.product:
            return obj.supplied_item_list.product.product_number
        if obj.product:
            return obj.product.product_number
        return None

    def get_total_quantity(self, obj):
        return sum(item.calculated_quantity for item in obj.items.all())


class SuppliedItemReceivingCreateSerializer(serializers.ModelSerializer):
    """支給品受入確認作成シリアライザー（一時保存対応・多対多紐づけ対応）

    リスト登録前でも受入れ登録が可能。
    supplied_item_list または product のどちらかを指定する。
    list_ids で複数のリストに紐づけ可能（多対多紐づけ）。
    """
    items = SuppliedItemReceivingItemCreateSerializer(many=True, required=False)
    list_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="紐づける支給品リストのID一覧（多対多紐づけ）"
    )
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = SuppliedItemReceiving
        fields = [
            'id', 'supplied_item_list', 'list_ids', 'product', 'status', 'receiving_date',
            'notes', 'items', 'created_by'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'supplied_item_list': {'required': False},
            'product': {'required': False},
        }

    def validate(self, attrs):
        supplied_item_list = attrs.get('supplied_item_list')
        list_ids = attrs.get('list_ids', [])
        product = attrs.get('product')

        # supplied_item_list, list_ids, product のいずれかが必要
        if not supplied_item_list and not list_ids and not product:
            raise serializers.ValidationError(
                "supplied_item_list, list_ids, または product のいずれかを指定してください"
            )

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        list_ids = validated_data.pop('list_ids', [])

        instance = SuppliedItemReceiving.objects.create(**validated_data)

        # 多対多紐づけを設定
        if list_ids:
            lists = SuppliedItemList.objects.filter(id__in=list_ids)
            instance.supplied_item_lists.set(lists)

        for item_data in items_data:
            SuppliedItemReceivingItem.objects.create(
                receiving=instance,
                **item_data
            )

        return instance

    def to_representation(self, instance):
        return SuppliedItemReceivingDetailSerializer(instance, context=self.context).data


class SuppliedItemReceivingUpdateSerializer(serializers.ModelSerializer):
    """支給品受入確認更新シリアライザー（一時保存対応・多対多紐づけ対応）"""
    items = SuppliedItemReceivingItemCreateSerializer(many=True, required=False)
    list_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="紐づける支給品リストのID一覧（多対多紐づけ）"
    )

    class Meta:
        model = SuppliedItemReceiving
        fields = [
            'id', 'list_ids', 'status', 'receiving_date', 'notes', 'items'
        ]
        read_only_fields = ['id']

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        list_ids = validated_data.pop('list_ids', None)

        # 基本情報の更新
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 多対多紐づけの更新
        if list_ids is not None:
            lists = SuppliedItemList.objects.filter(id__in=list_ids)
            instance.supplied_item_lists.set(lists)

        # 項目の更新（全削除して再作成）
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                SuppliedItemReceivingItem.objects.create(
                    receiving=instance,
                    **item_data
                )

        return instance

    def to_representation(self, instance):
        return SuppliedItemReceivingDetailSerializer(instance, context=self.context).data


# ===== 在庫関連のシリアライザー =====

class SuppliedItemInventoryListSerializer(serializers.ModelSerializer):
    """支給品在庫一覧シリアライザー"""
    item_number = serializers.CharField(source='supplied_item.item_number', read_only=True)
    item_name = serializers.CharField(source='supplied_item.item_name', read_only=True)
    unit = serializers.CharField(source='supplied_item.unit', read_only=True)
    product = serializers.IntegerField(source='supplied_item.product.id', read_only=True)
    product_number = serializers.CharField(
        source='supplied_item.product.product_number',
        read_only=True
    )
    product_name = serializers.CharField(
        source='supplied_item.product.product_name',
        read_only=True
    )
    customer_name = serializers.SerializerMethodField()
    list_number = serializers.CharField(
        source='list_item.supplied_item_list.list_number',
        read_only=True,
        default=None
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = SuppliedItemInventory
        fields = [
            'id', 'supplied_item', 'item_number', 'item_name', 'unit',
            'product', 'product_number', 'product_name', 'customer_name',
            'list_item', 'list_number', 'quantity',
            'lot_number', 'received_date', 'notes',
            'created_at', 'updated_at', 'created_by_name'
        ]

    def get_customer_name(self, obj):
        try:
            if obj.supplied_item.product and obj.supplied_item.product.customer_branch:
                return obj.supplied_item.product.customer_branch.customer.company_name
        except AttributeError:
            pass
        return None


class SuppliedItemInventoryDetailSerializer(serializers.ModelSerializer):
    """支給品在庫詳細シリアライザー"""
    item_number = serializers.CharField(source='supplied_item.item_number', read_only=True)
    item_name = serializers.CharField(source='supplied_item.item_name', read_only=True)
    unit = serializers.CharField(source='supplied_item.unit', read_only=True)
    product = serializers.IntegerField(source='supplied_item.product.id', read_only=True)
    product_number = serializers.CharField(
        source='supplied_item.product.product_number',
        read_only=True
    )
    product_name = serializers.CharField(
        source='supplied_item.product.product_name',
        read_only=True
    )
    customer_name = serializers.SerializerMethodField()
    list_number = serializers.CharField(
        source='list_item.supplied_item_list.list_number',
        read_only=True,
        default=None
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = SuppliedItemInventory
        fields = [
            'id', 'supplied_item', 'item_number', 'item_name', 'unit',
            'product', 'product_number', 'product_name', 'customer_name',
            'list_item', 'list_number',
            'quantity', 'lot_number', 'received_date', 'notes',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_customer_name(self, obj):
        try:
            if obj.supplied_item.product and obj.supplied_item.product.customer_branch:
                return obj.supplied_item.product.customer_branch.customer.company_name
        except AttributeError:
            pass
        return None


class SuppliedItemInventoryCreateSerializer(serializers.ModelSerializer):
    """支給品在庫作成シリアライザー"""
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = SuppliedItemInventory
        fields = [
            'id', 'supplied_item', 'list_item', 'quantity',
            'lot_number', 'received_date', 'notes', 'created_by'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'supplied_item': {'required': True},
            'quantity': {'required': True},
        }

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("数量は1以上である必要があります")
        return value

    def to_representation(self, instance):
        return SuppliedItemInventoryDetailSerializer(instance, context=self.context).data


class SuppliedItemInventoryUpdateSerializer(serializers.ModelSerializer):
    """支給品在庫更新シリアライザー"""

    class Meta:
        model = SuppliedItemInventory
        fields = [
            'id', 'quantity', 'lot_number', 'received_date', 'notes'
        ]
        read_only_fields = ['id']

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("数量は1以上である必要があります")
        return value

    def to_representation(self, instance):
        return SuppliedItemInventoryDetailSerializer(instance, context=self.context).data


# ===== 員数確認用のシリアライザー =====

class SuppliedItemListItemCountConfirmSerializer(serializers.ModelSerializer):
    """支給品リスト項目員数確認シリアライザー

    員数確認がtrueに更新されたタイミングで、在庫登録を自動実行する。
    - 受け入れ数量（received_quantity or quantity）を在庫に移動
    - SuppliedItemInventoryに新規レコードを作成
    """

    class Meta:
        model = SuppliedItemListItem
        fields = ['id', 'count_confirmed', 'notes']
        read_only_fields = ['id']

    def update(self, instance, validated_data):
        from django.utils import timezone
        from django.db import transaction

        count_confirmed = validated_data.get('count_confirmed', instance.count_confirmed)

        # 員数確認がFalse→Trueに変更された場合
        if count_confirmed and not instance.count_confirmed:
            instance.count_confirmed_at = timezone.now()
            instance.count_confirmed_by = self.context['request'].user

            # 在庫登録を実行（支給品マスタに紐付いている場合のみ）
            if instance.supplied_item:
                with transaction.atomic():
                    # 受入れ数量（なければリスト数量）を在庫に登録
                    quantity = instance.received_quantity or instance.quantity

                    # 親リストの納品予定日を取得（なければ現在日）
                    received_date = None
                    if instance.supplied_item_list and instance.supplied_item_list.delivery_date:
                        received_date = instance.supplied_item_list.delivery_date
                    else:
                        received_date = timezone.now().date()

                    # 在庫レコードを作成
                    SuppliedItemInventory.objects.create(
                        supplied_item=instance.supplied_item,
                        list_item=instance,
                        quantity=quantity,
                        received_date=received_date,
                        created_by=self.context['request'].user,
                        notes=f"員数確認時に自動登録"
                    )
        elif not count_confirmed:
            instance.count_confirmed_at = None
            instance.count_confirmed_by = None

            # 員数確認がTrue→Falseに変更された場合、対応する在庫を削除
            if instance.supplied_item:
                SuppliedItemInventory.objects.filter(list_item=instance).delete()

        instance.count_confirmed = count_confirmed
        instance.notes = validated_data.get('notes', instance.notes)
        instance.save()

        return instance

    def to_representation(self, instance):
        return SuppliedItemListItemSerializer(instance, context=self.context).data


class SuppliedItemListItemReceivingConfirmSerializer(serializers.ModelSerializer):
    """支給品リスト項目受入確認シリアライザー"""

    class Meta:
        model = SuppliedItemListItem
        fields = ['id', 'receiving_confirmed', 'received_quantity', 'notes']
        read_only_fields = ['id']

    def update(self, instance, validated_data):
        from django.utils import timezone

        receiving_confirmed = validated_data.get('receiving_confirmed', instance.receiving_confirmed)

        if receiving_confirmed and not instance.receiving_confirmed:
            instance.receiving_confirmed_at = timezone.now()
            instance.receiving_confirmed_by = self.context['request'].user
        elif not receiving_confirmed:
            instance.receiving_confirmed_at = None
            instance.receiving_confirmed_by = None

        instance.receiving_confirmed = receiving_confirmed
        instance.received_quantity = validated_data.get('received_quantity', instance.received_quantity)
        instance.notes = validated_data.get('notes', instance.notes)
        instance.save()

        return instance

    def to_representation(self, instance):
        return SuppliedItemListItemSerializer(instance, context=self.context).data


# ===== 購入品管理関連のシリアライザー =====

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """発注明細シリアライザー"""
    is_quantity_matched = serializers.BooleanField(read_only=True)
    receiving_confirmed_by_name = serializers.CharField(
        source='receiving_confirmed_by.full_name',
        read_only=True,
        default=None
    )
    count_confirmed_by_name = serializers.CharField(
        source='count_confirmed_by.full_name',
        read_only=True,
        default=None
    )
    supplier_name = serializers.CharField(
        source='part.supplier_branch.supplier.company_name',
        read_only=True,
        default=None
    )
    supplier_branch_name = serializers.CharField(
        source='part.supplier_branch.branch_name',
        read_only=True,
        default=None
    )
    supplier_part_name = serializers.CharField(
        source='part.supplier_part_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'purchase_order', 'part', 'part_number', 'part_name',
            'supplier_part_name', 'quantity', 'unit_price', 'amount', 'unit',
            'receiving_confirmed', 'receiving_confirmed_at',
            'receiving_confirmed_by', 'receiving_confirmed_by_name',
            'received_quantity', 'is_quantity_matched',
            'count_confirmed', 'count_confirmed_at', 'count_confirmed_by',
            'count_confirmed_by_name', 'supplier_name', 'supplier_branch_name',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PurchaseOrderItemCreateSerializer(serializers.ModelSerializer):
    """発注明細作成シリアライザー"""

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'part', 'part_number', 'part_name',
            'quantity', 'unit_price', 'unit', 'notes'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'part': {'required': True},
            'part_number': {'required': True},
            'part_name': {'required': True},
            'quantity': {'required': True},
        }


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    """発注一覧シリアライザー"""
    product_name = serializers.CharField(source='product.product_name', read_only=True, allow_null=True, default=None)
    product_number = serializers.CharField(source='product.product_number', read_only=True, allow_null=True, default=None)
    customer_name = serializers.SerializerMethodField()
    supplier_name = serializers.CharField(
        source='supplier_branch.supplier.company_name',
        read_only=True,
        default=None
    )
    supplier_branch_name = serializers.CharField(
        source='supplier_branch.branch_name',
        read_only=True,
        default=None
    )
    # アノテーションから取得
    total_items = serializers.SerializerMethodField()
    total_quantity = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    received_items_count = serializers.SerializerMethodField()
    count_confirmed_items_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'order_number', 'product', 'product_name', 'product_number',
            'customer_name', 'supplier_branch', 'supplier_name', 'supplier_branch_name',
            'order_date', 'requested_delivery_date', 'confirmed_delivery_date',
            'status', 'status_display',
            'total_items', 'total_quantity', 'total_amount',
            'received_items_count', 'count_confirmed_items_count',
            'notes', 'created_at', 'updated_at', 'created_by_name'
        ]

    def get_customer_name(self, obj):
        """顧客名を取得"""
        try:
            if obj.product and obj.product.customer_branch:
                return obj.product.customer_branch.customer.company_name
        except AttributeError:
            pass
        return None

    def get_total_items(self, obj):
        if hasattr(obj, 'total_items_count'):
            return obj.total_items_count
        return obj.total_items

    def get_total_quantity(self, obj):
        if hasattr(obj, 'total_quantity_sum'):
            return obj.total_quantity_sum or 0
        return obj.total_quantity

    def get_total_amount(self, obj):
        if hasattr(obj, 'total_amount_sum'):
            return obj.total_amount_sum or Decimal('0.00')
        return obj.total_amount

    def get_received_items_count(self, obj):
        if hasattr(obj, 'received_items_annotated'):
            return obj.received_items_annotated
        return obj.received_items_count

    def get_count_confirmed_items_count(self, obj):
        if hasattr(obj, 'count_confirmed_items_annotated'):
            return obj.count_confirmed_items_annotated
        return obj.count_confirmed_items_count


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    """発注詳細シリアライザー"""
    product_name = serializers.CharField(source='product.product_name', read_only=True, allow_null=True, default=None)
    product_number = serializers.CharField(source='product.product_number', read_only=True, allow_null=True, default=None)
    customer_name = serializers.SerializerMethodField()
    supplier_name = serializers.CharField(
        source='supplier_branch.supplier.company_name',
        read_only=True,
        default=None
    )
    supplier_branch_name = serializers.CharField(
        source='supplier_branch.branch_name',
        read_only=True,
        default=None
    )
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    received_items_count = serializers.IntegerField(read_only=True)
    count_confirmed_items_count = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'order_number', 'product', 'product_name', 'product_number',
            'customer_name', 'supplier_branch', 'supplier_name', 'supplier_branch_name',
            'order_date', 'requested_delivery_date', 'confirmed_delivery_date',
            'status', 'status_display', 'items',
            'total_items', 'total_quantity', 'total_amount',
            'received_items_count', 'count_confirmed_items_count',
            'notes', 'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at', 'created_by']

    def get_customer_name(self, obj):
        try:
            if obj.product and obj.product.customer_branch:
                return obj.product.customer_branch.customer.company_name
        except AttributeError:
            pass
        return None


class PurchaseOrderCreateSerializer(serializers.ModelSerializer):
    """発注作成シリアライザー"""
    items = PurchaseOrderItemCreateSerializer(many=True, required=False)
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'product', 'supplier_branch', 'order_date',
            'requested_delivery_date', 'confirmed_delivery_date',
            'status', 'notes', 'items', 'created_by'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'product': {'required': True},
            'supplier_branch': {'required': True},
        }

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        instance = PurchaseOrder.objects.create(**validated_data)

        for item_data in items_data:
            PurchaseOrderItem.objects.create(
                purchase_order=instance,
                **item_data
            )

        return instance

    def to_representation(self, instance):
        return PurchaseOrderDetailSerializer(instance, context=self.context).data


class PurchaseOrderUpdateSerializer(serializers.ModelSerializer):
    """発注更新シリアライザー"""

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'order_date', 'requested_delivery_date', 'confirmed_delivery_date',
            'status', 'notes'
        ]
        read_only_fields = ['id']

    def to_representation(self, instance):
        return PurchaseOrderDetailSerializer(instance, context=self.context).data


# ===== 購入品受入確認関連のシリアライザー =====

class PurchaseReceivingItemSerializer(serializers.ModelSerializer):
    """購入品受入確認項目シリアライザー"""

    class Meta:
        model = PurchaseReceivingItem
        fields = [
            'id', 'receiving', 'order_item', 'part', 'part_number', 'part_name',
            'quantity_per_box', 'box_count', 'calculated_quantity',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'calculated_quantity', 'created_at', 'updated_at']


class PurchaseReceivingItemCreateSerializer(serializers.ModelSerializer):
    """購入品受入確認項目作成シリアライザー"""

    class Meta:
        model = PurchaseReceivingItem
        fields = [
            'id', 'order_item', 'part', 'part_number', 'part_name',
            'quantity_per_box', 'box_count', 'notes'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'part_number': {'required': True},
            'quantity_per_box': {'required': True},
            'box_count': {'required': True},
        }


class PurchaseReceivingListSerializer(serializers.ModelSerializer):
    """購入品受入確認一覧シリアライザー"""
    order_numbers = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.product_name', read_only=True, default=None)
    product_number = serializers.CharField(source='product.product_number', read_only=True, default=None)
    supplier_name = serializers.CharField(
        source='supplier_branch.supplier.company_name',
        read_only=True,
        default=None
    )
    supplier_branch_name = serializers.CharField(
        source='supplier_branch.branch_name',
        read_only=True,
        default=None
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    total_quantity = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = PurchaseReceiving
        fields = [
            'id', 'purchase_orders', 'order_numbers', 'product', 'product_name',
            'product_number', 'supplier_branch', 'supplier_name', 'supplier_branch_name',
            'status', 'status_display', 'receiving_date', 'items_count',
            'total_quantity', 'notes', 'created_at', 'updated_at', 'created_by_name'
        ]

    def get_order_numbers(self, obj):
        return list(obj.purchase_orders.values_list('order_number', flat=True))

    def get_total_quantity(self, obj):
        return sum(item.calculated_quantity for item in obj.items.all())


class PurchaseReceivingDetailSerializer(serializers.ModelSerializer):
    """購入品受入確認詳細シリアライザー"""
    order_numbers = serializers.SerializerMethodField()
    order_ids = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.product_name', read_only=True, default=None)
    product_number = serializers.CharField(source='product.product_number', read_only=True, default=None)
    supplier_name = serializers.CharField(
        source='supplier_branch.supplier.company_name',
        read_only=True,
        default=None
    )
    supplier_branch_name = serializers.CharField(
        source='supplier_branch.branch_name',
        read_only=True,
        default=None
    )
    items = PurchaseReceivingItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_quantity = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = PurchaseReceiving
        fields = [
            'id', 'purchase_orders', 'order_numbers', 'order_ids',
            'product', 'product_name', 'product_number',
            'supplier_branch', 'supplier_name', 'supplier_branch_name',
            'status', 'status_display', 'receiving_date', 'items',
            'total_quantity', 'notes', 'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_order_numbers(self, obj):
        return list(obj.purchase_orders.values_list('order_number', flat=True))

    def get_order_ids(self, obj):
        return list(obj.purchase_orders.values_list('id', flat=True))

    def get_total_quantity(self, obj):
        return sum(item.calculated_quantity for item in obj.items.all())


class PurchaseReceivingCreateSerializer(serializers.ModelSerializer):
    """購入品受入確認作成シリアライザー"""
    items = PurchaseReceivingItemCreateSerializer(many=True, required=False)
    order_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="紐づける発注のID一覧"
    )
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = PurchaseReceiving
        fields = [
            'id', 'order_ids', 'product', 'supplier_branch', 'status', 'receiving_date',
            'notes', 'items', 'created_by'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'product': {'required': False},
            'supplier_branch': {'required': False},
        }

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order_ids = validated_data.pop('order_ids', [])

        instance = PurchaseReceiving.objects.create(**validated_data)

        if order_ids:
            orders = PurchaseOrder.objects.filter(id__in=order_ids)
            instance.purchase_orders.set(orders)

        for item_data in items_data:
            PurchaseReceivingItem.objects.create(
                receiving=instance,
                **item_data
            )

        return instance

    def to_representation(self, instance):
        return PurchaseReceivingDetailSerializer(instance, context=self.context).data


class PurchaseReceivingUpdateSerializer(serializers.ModelSerializer):
    """購入品受入確認更新シリアライザー"""
    items = PurchaseReceivingItemCreateSerializer(many=True, required=False)
    order_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="紐づける発注のID一覧"
    )

    class Meta:
        model = PurchaseReceiving
        fields = [
            'id', 'order_ids', 'status', 'receiving_date', 'notes', 'items'
        ]
        read_only_fields = ['id']

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        order_ids = validated_data.pop('order_ids', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if order_ids is not None:
            orders = PurchaseOrder.objects.filter(id__in=order_ids)
            instance.purchase_orders.set(orders)

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                PurchaseReceivingItem.objects.create(
                    receiving=instance,
                    **item_data
                )

        return instance

    def to_representation(self, instance):
        return PurchaseReceivingDetailSerializer(instance, context=self.context).data


# ===== 購入品在庫関連のシリアライザー =====

class PurchasedItemInventoryListSerializer(serializers.ModelSerializer):
    """購入品在庫一覧シリアライザー"""
    part_number = serializers.CharField(source='part.part_number', read_only=True)
    part_name = serializers.CharField(source='part.part_name', read_only=True)
    unit = serializers.CharField(source='part.unit', read_only=True)
    product = serializers.IntegerField(source='part.product.id', read_only=True)
    product_number = serializers.CharField(source='part.product.product_number', read_only=True)
    product_name = serializers.CharField(source='part.product.product_name', read_only=True)
    supplier_name = serializers.CharField(
        source='part.supplier_branch.supplier.company_name',
        read_only=True,
        default=None
    )
    supplier_branch_name = serializers.CharField(
        source='part.supplier_branch.branch_name',
        read_only=True,
        default=None
    )
    customer_name = serializers.SerializerMethodField()
    order_number = serializers.CharField(
        source='order_item.purchase_order.order_number',
        read_only=True,
        default=None
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = PurchasedItemInventory
        fields = [
            'id', 'part', 'part_number', 'part_name', 'unit',
            'product', 'product_number', 'product_name', 'customer_name',
            'supplier_name', 'supplier_branch_name',
            'order_item', 'order_number', 'quantity',
            'lot_number', 'received_date', 'notes',
            'created_at', 'updated_at', 'created_by_name'
        ]

    def get_customer_name(self, obj):
        try:
            if obj.part.product and obj.part.product.customer_branch:
                return obj.part.product.customer_branch.customer.company_name
        except AttributeError:
            pass
        return None


class PurchasedItemInventoryDetailSerializer(serializers.ModelSerializer):
    """購入品在庫詳細シリアライザー"""
    part_number = serializers.CharField(source='part.part_number', read_only=True)
    part_name = serializers.CharField(source='part.part_name', read_only=True)
    unit = serializers.CharField(source='part.unit', read_only=True)
    product = serializers.IntegerField(source='part.product.id', read_only=True)
    product_number = serializers.CharField(source='part.product.product_number', read_only=True)
    product_name = serializers.CharField(source='part.product.product_name', read_only=True)
    supplier_name = serializers.CharField(
        source='part.supplier_branch.supplier.company_name',
        read_only=True,
        default=None
    )
    supplier_branch_name = serializers.CharField(
        source='part.supplier_branch.branch_name',
        read_only=True,
        default=None
    )
    customer_name = serializers.SerializerMethodField()
    order_number = serializers.CharField(
        source='order_item.purchase_order.order_number',
        read_only=True,
        default=None
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = PurchasedItemInventory
        fields = [
            'id', 'part', 'part_number', 'part_name', 'unit',
            'product', 'product_number', 'product_name', 'customer_name',
            'supplier_name', 'supplier_branch_name',
            'order_item', 'order_number',
            'quantity', 'lot_number', 'received_date', 'notes',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_customer_name(self, obj):
        try:
            if obj.part.product and obj.part.product.customer_branch:
                return obj.part.product.customer_branch.customer.company_name
        except AttributeError:
            pass
        return None


class PurchasedItemInventoryCreateSerializer(serializers.ModelSerializer):
    """購入品在庫作成シリアライザー"""
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = PurchasedItemInventory
        fields = [
            'id', 'part', 'order_item', 'quantity',
            'lot_number', 'received_date', 'notes', 'created_by'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'part': {'required': True},
            'quantity': {'required': True},
        }

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("数量は1以上である必要があります")
        return value

    def to_representation(self, instance):
        return PurchasedItemInventoryDetailSerializer(instance, context=self.context).data


class PurchasedItemInventoryUpdateSerializer(serializers.ModelSerializer):
    """購入品在庫更新シリアライザー"""

    class Meta:
        model = PurchasedItemInventory
        fields = [
            'id', 'quantity', 'lot_number', 'received_date', 'notes'
        ]
        read_only_fields = ['id']

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("数量は1以上である必要があります")
        return value

    def to_representation(self, instance):
        return PurchasedItemInventoryDetailSerializer(instance, context=self.context).data


# ===== 発注明細確認用のシリアライザー =====

class PurchaseOrderItemCountConfirmSerializer(serializers.ModelSerializer):
    """発注明細員数確認シリアライザー

    員数確認がtrueに更新されたタイミングで、在庫登録を自動実行する。
    """

    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'count_confirmed', 'notes']
        read_only_fields = ['id']

    def update(self, instance, validated_data):
        from django.utils import timezone
        from django.db import transaction

        count_confirmed = validated_data.get('count_confirmed', instance.count_confirmed)

        if count_confirmed and not instance.count_confirmed:
            instance.count_confirmed_at = timezone.now()
            instance.count_confirmed_by = self.context['request'].user

            # 在庫登録を実行（部品マスタに紐付いている場合）
            if instance.part:
                with transaction.atomic():
                    quantity = instance.received_quantity or instance.quantity

                    received_date = None
                    if instance.purchase_order and instance.purchase_order.confirmed_delivery_date:
                        received_date = instance.purchase_order.confirmed_delivery_date
                    else:
                        received_date = timezone.now().date()

                    PurchasedItemInventory.objects.create(
                        part=instance.part,
                        order_item=instance,
                        quantity=quantity,
                        received_date=received_date,
                        created_by=self.context['request'].user,
                        notes="員数確認時に自動登録"
                    )
        elif not count_confirmed:
            instance.count_confirmed_at = None
            instance.count_confirmed_by = None

            if instance.part:
                PurchasedItemInventory.objects.filter(order_item=instance).delete()

        instance.count_confirmed = count_confirmed
        instance.notes = validated_data.get('notes', instance.notes)
        instance.save()

        return instance

    def to_representation(self, instance):
        return PurchaseOrderItemSerializer(instance, context=self.context).data


class PurchaseOrderItemReceivingConfirmSerializer(serializers.ModelSerializer):
    """発注明細受入確認シリアライザー"""

    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'receiving_confirmed', 'received_quantity', 'notes']
        read_only_fields = ['id']

    def update(self, instance, validated_data):
        from django.utils import timezone

        receiving_confirmed = validated_data.get('receiving_confirmed', instance.receiving_confirmed)

        if receiving_confirmed and not instance.receiving_confirmed:
            instance.receiving_confirmed_at = timezone.now()
            instance.receiving_confirmed_by = self.context['request'].user
        elif not receiving_confirmed:
            instance.receiving_confirmed_at = None
            instance.receiving_confirmed_by = None

        instance.receiving_confirmed = receiving_confirmed
        instance.received_quantity = validated_data.get('received_quantity', instance.received_quantity)
        instance.notes = validated_data.get('notes', instance.notes)
        instance.save()

        return instance

    def to_representation(self, instance):
        return PurchaseOrderItemSerializer(instance, context=self.context).data


# ===== 発注作成用のサプライヤー別部品グルーピング =====

class PartForOrderSerializer(serializers.ModelSerializer):
    """発注作成時に使用する部品シリアライザー"""
    current_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = Part
        fields = [
            'id', 'part_number', 'part_name', 'supplier_part_name',
            'specification', 'unit', 'order_type', 'minimum_order_quantity',
            'lead_time_days', 'current_price', 'is_active'
        ]


class SupplierPartsGroupSerializer(serializers.Serializer):
    """サプライヤー別部品グループシリアライザー"""
    supplier_branch_id = serializers.IntegerField()
    supplier_name = serializers.CharField()
    branch_name = serializers.CharField()
    parts = PartForOrderSerializer(many=True)


# ===== 在庫調整関連のシリアライザー =====

class InventoryAdjustmentListSerializer(serializers.ModelSerializer):
    """在庫調整一覧シリアライザー"""
    item_type_display = serializers.CharField(source='get_item_type_display', read_only=True)
    adjustment_type_display = serializers.CharField(source='get_adjustment_type_display', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    item_number = serializers.SerializerMethodField()
    item_name = serializers.SerializerMethodField()
    product_number = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = InventoryAdjustment
        fields = [
            'id', 'item_type', 'item_type_display',
            'supplied_item_inventory', 'purchased_item_inventory',
            'item_number', 'item_name', 'product_number', 'product_name',
            'adjustment_type', 'adjustment_type_display',
            'quantity', 'quantity_before', 'quantity_after',
            'reason', 'reason_display', 'notes',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]

    def get_item_number(self, obj):
        if obj.item_type == 'supplied' and obj.supplied_item_inventory:
            return obj.supplied_item_inventory.supplied_item.item_number
        elif obj.item_type == 'purchased' and obj.purchased_item_inventory:
            return obj.purchased_item_inventory.part.part_number
        return None

    def get_item_name(self, obj):
        if obj.item_type == 'supplied' and obj.supplied_item_inventory:
            return obj.supplied_item_inventory.supplied_item.item_name
        elif obj.item_type == 'purchased' and obj.purchased_item_inventory:
            return obj.purchased_item_inventory.part.part_name
        return None

    def get_product_number(self, obj):
        if obj.item_type == 'supplied' and obj.supplied_item_inventory:
            return obj.supplied_item_inventory.supplied_item.product.product_number
        elif obj.item_type == 'purchased' and obj.purchased_item_inventory:
            if obj.purchased_item_inventory.part.product:
                return obj.purchased_item_inventory.part.product.product_number
        return None

    def get_product_name(self, obj):
        if obj.item_type == 'supplied' and obj.supplied_item_inventory:
            return obj.supplied_item_inventory.supplied_item.product.product_name
        elif obj.item_type == 'purchased' and obj.purchased_item_inventory:
            if obj.purchased_item_inventory.part.product:
                return obj.purchased_item_inventory.part.product.product_name
        return None


class InventoryAdjustmentDetailSerializer(serializers.ModelSerializer):
    """在庫調整詳細シリアライザー"""
    item_type_display = serializers.CharField(source='get_item_type_display', read_only=True)
    adjustment_type_display = serializers.CharField(source='get_adjustment_type_display', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    item_number = serializers.SerializerMethodField()
    item_name = serializers.SerializerMethodField()
    unit = serializers.SerializerMethodField()
    product_number = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(
        source='created_by.full_name',
        read_only=True,
        default=None
    )

    class Meta:
        model = InventoryAdjustment
        fields = [
            'id', 'item_type', 'item_type_display',
            'supplied_item_inventory', 'purchased_item_inventory',
            'item_number', 'item_name', 'unit', 'product_number', 'product_name',
            'adjustment_type', 'adjustment_type_display',
            'quantity', 'quantity_before', 'quantity_after',
            'reason', 'reason_display', 'notes',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]

    def get_item_number(self, obj):
        if obj.item_type == 'supplied' and obj.supplied_item_inventory:
            return obj.supplied_item_inventory.supplied_item.item_number
        elif obj.item_type == 'purchased' and obj.purchased_item_inventory:
            return obj.purchased_item_inventory.part.part_number
        return None

    def get_item_name(self, obj):
        if obj.item_type == 'supplied' and obj.supplied_item_inventory:
            return obj.supplied_item_inventory.supplied_item.item_name
        elif obj.item_type == 'purchased' and obj.purchased_item_inventory:
            return obj.purchased_item_inventory.part.part_name
        return None

    def get_unit(self, obj):
        if obj.item_type == 'supplied' and obj.supplied_item_inventory:
            return obj.supplied_item_inventory.supplied_item.unit
        elif obj.item_type == 'purchased' and obj.purchased_item_inventory:
            return obj.purchased_item_inventory.part.unit
        return None

    def get_product_number(self, obj):
        if obj.item_type == 'supplied' and obj.supplied_item_inventory:
            return obj.supplied_item_inventory.supplied_item.product.product_number
        elif obj.item_type == 'purchased' and obj.purchased_item_inventory:
            if obj.purchased_item_inventory.part.product:
                return obj.purchased_item_inventory.part.product.product_number
        return None

    def get_product_name(self, obj):
        if obj.item_type == 'supplied' and obj.supplied_item_inventory:
            return obj.supplied_item_inventory.supplied_item.product.product_name
        elif obj.item_type == 'purchased' and obj.purchased_item_inventory:
            if obj.purchased_item_inventory.part.product:
                return obj.purchased_item_inventory.part.product.product_name
        return None


class InventoryAdjustmentCreateSerializer(serializers.ModelSerializer):
    """在庫調整作成シリアライザー"""
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = InventoryAdjustment
        fields = [
            'id', 'item_type', 'supplied_item_inventory', 'purchased_item_inventory',
            'adjustment_type', 'quantity', 'reason', 'notes', 'created_by'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'item_type': {'required': True},
            'adjustment_type': {'required': True},
            'quantity': {'required': True},
            'reason': {'required': True},
        }

    def validate(self, attrs):
        item_type = attrs.get('item_type')
        supplied_inventory = attrs.get('supplied_item_inventory')
        purchased_inventory = attrs.get('purchased_item_inventory')

        if item_type == 'supplied' and not supplied_inventory:
            raise serializers.ValidationError({
                'supplied_item_inventory': '支給品在庫を指定してください'
            })
        if item_type == 'purchased' and not purchased_inventory:
            raise serializers.ValidationError({
                'purchased_item_inventory': '購入品在庫を指定してください'
            })

        # 減少の場合、在庫数を超えていないかチェック
        adjustment_type = attrs.get('adjustment_type')
        quantity = attrs.get('quantity', 0)

        if adjustment_type == 'decrease':
            current_quantity = 0
            if item_type == 'supplied' and supplied_inventory:
                current_quantity = supplied_inventory.quantity
            elif item_type == 'purchased' and purchased_inventory:
                current_quantity = purchased_inventory.quantity

            if quantity > current_quantity:
                raise serializers.ValidationError({
                    'quantity': f'調整数量が現在の在庫数（{current_quantity}）を超えています'
                })

        return attrs

    def create(self, validated_data):
        # 調整前の数量を設定
        item_type = validated_data.get('item_type')
        if item_type == 'supplied':
            validated_data['quantity_before'] = validated_data['supplied_item_inventory'].quantity
        elif item_type == 'purchased':
            validated_data['quantity_before'] = validated_data['purchased_item_inventory'].quantity

        # 調整後の数量を計算
        adjustment_type = validated_data.get('adjustment_type')
        quantity = validated_data.get('quantity', 0)
        quantity_before = validated_data.get('quantity_before', 0)

        if adjustment_type == 'increase':
            validated_data['quantity_after'] = quantity_before + quantity
        else:
            validated_data['quantity_after'] = quantity_before - quantity

        return super().create(validated_data)

    def to_representation(self, instance):
        return InventoryAdjustmentDetailSerializer(instance, context=self.context).data