# api/imports/serializers.py
# 輸入管理シリアライザ

from rest_framework import serializers
from django.db import transaction
from .models import (
    ImportPurchaseOrder,
    ImportPurchaseOrderItem,
    ImportInvoice,
    ImportInvoiceItem,
    ImportFile,
)
from api.manufacturing.models import Material


# ===== 輸入発注明細 =====

class ImportPurchaseOrderItemSerializer(serializers.ModelSerializer):
    """輸入発注明細シリアライザ"""
    material_code = serializers.CharField(source='material.material_code', read_only=True)
    material_name = serializers.CharField(source='material.material_name', read_only=True)

    class Meta:
        model = ImportPurchaseOrderItem
        fields = [
            'id',
            'import_po',
            'material',
            'material_code',
            'material_name',
            'part_number',
            'description',
            'quantity',
            'unit',
            'unit_price',
            'amount',
            'received_quantity',
            'is_received',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'amount', 'created_at', 'updated_at']


class ImportPurchaseOrderItemCreateSerializer(serializers.ModelSerializer):
    """輸入発注明細作成シリアライザ"""

    class Meta:
        model = ImportPurchaseOrderItem
        fields = [
            'material',
            'part_number',
            'description',
            'quantity',
            'unit',
            'unit_price',
            'notes',
        ]


# ===== 輸入発注 =====

class ImportPurchaseOrderListSerializer(serializers.ModelSerializer):
    """輸入発注一覧シリアライザ"""
    supplier_name = serializers.CharField(
        source='supplier_branch.supplier.company_name', read_only=True
    )
    supplier_branch_name = serializers.CharField(
        source='supplier_branch.branch_name', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)
    total_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )

    class Meta:
        model = ImportPurchaseOrder
        fields = [
            'id',
            'po_number',
            'supplier_branch',
            'supplier_name',
            'supplier_branch_name',
            'order_date',
            'expected_ship_date',
            'expected_arrival_date',
            'actual_ship_date',
            'actual_arrival_date',
            'status',
            'status_display',
            'currency',
            'shipping_method',
            'tracking_number',
            'total_items',
            'total_quantity',
            'total_amount',
            'notes',
            'created_at',
            'updated_at',
        ]


class ImportPurchaseOrderDetailSerializer(serializers.ModelSerializer):
    """輸入発注詳細シリアライザ"""
    supplier_name = serializers.CharField(
        source='supplier_branch.supplier.company_name', read_only=True
    )
    supplier_branch_name = serializers.CharField(
        source='supplier_branch.branch_name', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items = ImportPurchaseOrderItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)
    total_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.username', read_only=True
    )

    class Meta:
        model = ImportPurchaseOrder
        fields = [
            'id',
            'po_number',
            'supplier_branch',
            'supplier_name',
            'supplier_branch_name',
            'order_date',
            'expected_ship_date',
            'expected_arrival_date',
            'actual_ship_date',
            'actual_arrival_date',
            'status',
            'status_display',
            'currency',
            'exchange_rate',
            'shipping_method',
            'tracking_number',
            'items',
            'total_items',
            'total_quantity',
            'total_amount',
            'notes',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]


class ImportPurchaseOrderCreateSerializer(serializers.ModelSerializer):
    """輸入発注作成シリアライザ"""
    items = ImportPurchaseOrderItemCreateSerializer(many=True, required=False)

    class Meta:
        model = ImportPurchaseOrder
        fields = [
            'id',
            'supplier_branch',
            'order_date',
            'expected_ship_date',
            'expected_arrival_date',
            'status',
            'currency',
            'exchange_rate',
            'shipping_method',
            'tracking_number',
            'notes',
            'items',
        ]
        read_only_fields = ['id']

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        request = self.context.get('request')

        # PO作成
        po = ImportPurchaseOrder.objects.create(
            created_by=request.user if request else None,
            **validated_data
        )

        # 明細作成
        for item_data in items_data:
            ImportPurchaseOrderItem.objects.create(import_po=po, **item_data)

        return po

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # PO更新
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 明細更新（全削除→再作成）
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                ImportPurchaseOrderItem.objects.create(import_po=instance, **item_data)

        return instance


# ===== インボイス明細 =====

class ImportInvoiceItemSerializer(serializers.ModelSerializer):
    """インボイス明細シリアライザ"""
    material_code = serializers.CharField(source='material.material_code', read_only=True)
    material_name = serializers.CharField(source='material.material_name', read_only=True)
    po_item_part_number = serializers.CharField(
        source='import_po_item.part_number', read_only=True
    )

    class Meta:
        model = ImportInvoiceItem
        fields = [
            'id',
            'import_invoice',
            'import_po_item',
            'po_item_part_number',
            'material',
            'material_code',
            'material_name',
            'part_number',
            'description',
            'quantity',
            'unit',
            'unit_price',
            'amount',
            'registered_as_semi_finished',
            'ocr_confidence',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'amount', 'created_at', 'updated_at']


class ImportInvoiceItemCreateSerializer(serializers.ModelSerializer):
    """インボイス明細作成シリアライザ"""

    class Meta:
        model = ImportInvoiceItem
        fields = [
            'import_po_item',
            'material',
            'part_number',
            'description',
            'quantity',
            'unit',
            'unit_price',
            'ocr_confidence',
            'notes',
        ]


# ===== インポートファイル =====

class ImportFileSerializer(serializers.ModelSerializer):
    """インポートファイルシリアライザ"""
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    file_name = serializers.CharField(read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = ImportFile
        fields = [
            'id',
            'import_invoice',
            'file_type',
            'file_type_display',
            'file',
            'file_name',
            'original_filename',
            'file_size',
            'is_pdf',
            'is_image',
            'notes',
            'uploaded_at',
            'uploaded_by',
            'uploaded_by_name',
        ]
        read_only_fields = ['id', 'file_name', 'file_size', 'uploaded_at']


class ImportFileUploadSerializer(serializers.ModelSerializer):
    """インポートファイルアップロードシリアライザ"""

    class Meta:
        model = ImportFile
        fields = [
            'file_type',
            'file',
            'notes',
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        invoice = self.context.get('invoice')

        file_obj = validated_data.get('file')

        return ImportFile.objects.create(
            import_invoice=invoice,
            original_filename=file_obj.name if file_obj else '',
            uploaded_by=request.user if request else None,
            **validated_data
        )


# ===== インボイス =====

class ImportInvoiceListSerializer(serializers.ModelSerializer):
    """インボイス一覧シリアライザ"""
    supplier_name = serializers.CharField(
        source='supplier_branch.supplier.company_name', read_only=True
    )
    supplier_branch_name = serializers.CharField(
        source='supplier_branch.branch_name', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)
    linked_po_ids = serializers.ListField(read_only=True)
    linked_po_count = serializers.SerializerMethodField()
    has_waybill = serializers.SerializerMethodField()
    has_invoice_file = serializers.SerializerMethodField()
    has_bill_file = serializers.SerializerMethodField()
    file_counts = serializers.SerializerMethodField()

    class Meta:
        model = ImportInvoice
        fields = [
            'id',
            'invoice_number',
            'supplier_branch',
            'supplier_name',
            'supplier_branch_name',
            'invoice_date',
            'received_date',
            'status',
            'status_display',
            'currency',
            'transportation_fee',
            'total_amount',
            'total_items',
            'total_quantity',
            'linked_po_ids',
            'linked_po_count',
            'has_waybill',
            'has_invoice_file',
            'has_bill_file',
            'file_counts',
            'registered_as_semi_finished',
            'notes',
            'created_at',
            'updated_at',
        ]

    def get_linked_po_count(self, obj):
        return obj.linked_pos.count()

    def get_has_waybill(self, obj):
        """Waybillファイルが登録されているかチェック"""
        return obj.files.filter(file_type='waybill').exists()

    def get_has_invoice_file(self, obj):
        """Invoiceファイルが登録されているかチェック"""
        return obj.files.filter(file_type='invoice').exists()

    def get_has_bill_file(self, obj):
        """請求書ファイルが登録されているかチェック"""
        return obj.files.filter(file_type='bill').exists()

    def get_file_counts(self, obj):
        """各ファイルタイプの登録数を返す"""
        files = obj.files.all()
        return {
            'waybill': files.filter(file_type='waybill').count(),
            'invoice': files.filter(file_type='invoice').count(),
            'bill': files.filter(file_type='bill').count(),
            'total': files.count(),
        }


class ImportInvoiceDetailSerializer(serializers.ModelSerializer):
    """インボイス詳細シリアライザ"""
    supplier_name = serializers.CharField(
        source='supplier_branch.supplier.company_name', read_only=True
    )
    supplier_branch_name = serializers.CharField(
        source='supplier_branch.branch_name', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items = ImportInvoiceItemSerializer(many=True, read_only=True)
    files = ImportFileSerializer(many=True, read_only=True)
    linked_pos = ImportPurchaseOrderListSerializer(many=True, read_only=True)
    linked_po_ids = serializers.ListField(read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = ImportInvoice
        fields = [
            'id',
            'invoice_number',
            'supplier_branch',
            'supplier_name',
            'supplier_branch_name',
            'invoice_date',
            'received_date',
            'status',
            'status_display',
            'currency',
            'subtotal',
            'tax_amount',
            'shipping_cost',
            'transportation_fee',
            'total_amount',
            'items',
            'files',
            'linked_pos',
            'linked_po_ids',
            'total_items',
            'total_quantity',
            'registered_as_semi_finished',
            'notes',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]


class ImportInvoiceCreateSerializer(serializers.ModelSerializer):
    """インボイス作成シリアライザ"""
    items = ImportInvoiceItemCreateSerializer(many=True, required=False)
    linked_po_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = ImportInvoice
        fields = [
            'id',
            'invoice_number',
            'supplier_branch',
            'invoice_date',
            'received_date',
            'status',
            'currency',
            'subtotal',
            'tax_amount',
            'shipping_cost',
            'transportation_fee',
            'total_amount',
            'notes',
            'items',
            'linked_po_ids',
        ]
        read_only_fields = ['id']

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        linked_po_ids = validated_data.pop('linked_po_ids', [])
        request = self.context.get('request')

        # インボイス作成
        invoice = ImportInvoice.objects.create(
            created_by=request.user if request else None,
            **validated_data
        )

        # PO紐付け
        if linked_po_ids:
            pos = ImportPurchaseOrder.objects.filter(id__in=linked_po_ids)
            invoice.linked_pos.set(pos)

        # 明細作成
        for item_data in items_data:
            ImportInvoiceItem.objects.create(import_invoice=invoice, **item_data)

        # 合計金額を計算
        self._calculate_totals(invoice)

        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        linked_po_ids = validated_data.pop('linked_po_ids', None)

        # インボイス更新
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # PO紐付け更新
        if linked_po_ids is not None:
            pos = ImportPurchaseOrder.objects.filter(id__in=linked_po_ids)
            instance.linked_pos.set(pos)

        # 明細更新（全削除→再作成）
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                ImportInvoiceItem.objects.create(import_invoice=instance, **item_data)

        # 合計金額を再計算
        self._calculate_totals(instance)

        return instance

    def _calculate_totals(self, invoice):
        """合計金額を計算"""
        from django.db.models import Sum
        subtotal = invoice.items.aggregate(total=Sum('amount'))['total'] or 0
        invoice.subtotal = subtotal
        if invoice.total_amount is None:
            invoice.total_amount = (
                subtotal +
                (invoice.tax_amount or 0) +
                (invoice.shipping_cost or 0) +
                (invoice.transportation_fee or 0)
            )
        invoice.save(update_fields=['subtotal', 'total_amount'])


# ===== 半製品在庫登録 =====

class RegisterSemiFinishedInventorySerializer(serializers.Serializer):
    """半製品在庫登録シリアライザ"""
    invoice_id = serializers.IntegerField(read_only=True)
    registered_count = serializers.IntegerField(read_only=True)
    skipped_count = serializers.IntegerField(read_only=True)
    errors = serializers.ListField(child=serializers.CharField(), read_only=True)

    def register_inventory(self, invoice):
        """インボイス明細を半製品在庫として登録"""
        from django.utils import timezone

        registered_count = 0
        skipped_count = 0
        errors = []

        for item in invoice.items.all():
            if item.registered_as_semi_finished:
                skipped_count += 1
                continue

            if not item.material:
                # 材料マスタに登録がない場合は新規作成
                try:
                    material = Material.objects.create(
                        material_code=item.part_number,
                        material_name=item.description or item.part_number,
                        category=Material.MaterialCategory.SEMI_FINISHED,
                        unit=item.unit,
                        stock_quantity=item.quantity,
                        supplier_branch=invoice.supplier_branch,
                        unit_price=item.unit_price,
                        created_by=invoice.created_by,
                    )
                    item.material = material
                    item.registered_as_semi_finished = True
                    item.save()
                    registered_count += 1
                except Exception as e:
                    errors.append(f"{item.part_number}: {str(e)}")
            else:
                # 既存の材料の在庫を増加
                try:
                    item.material.stock_quantity += item.quantity
                    item.material.save(update_fields=['stock_quantity', 'updated_at'])
                    item.registered_as_semi_finished = True
                    item.save()
                    registered_count += 1
                except Exception as e:
                    errors.append(f"{item.part_number}: {str(e)}")

        # インボイスのフラグを更新
        if registered_count > 0:
            invoice.registered_as_semi_finished = True
            invoice.save(update_fields=['registered_as_semi_finished', 'updated_at'])

        return {
            'invoice_id': invoice.id,
            'registered_count': registered_count,
            'skipped_count': skipped_count,
            'errors': errors,
        }


# ===== 品番マッチング =====

class PartNumberMatchSerializer(serializers.Serializer):
    """品番マッチングシリアライザ"""
    part_numbers = serializers.ListField(
        child=serializers.CharField(max_length=100)
    )
    supplier_branch_id = serializers.IntegerField(required=False)

    def match_parts(self, validated_data):
        """品番リストに対してマテリアルマスタをマッチング"""
        part_numbers = validated_data.get('part_numbers', [])
        supplier_branch_id = validated_data.get('supplier_branch_id')

        results = []
        for part_number in part_numbers:
            queryset = Material.objects.filter(material_code__iexact=part_number)

            if supplier_branch_id:
                # サプライヤー指定がある場合は絞り込み
                queryset = queryset.filter(supplier_branch_id=supplier_branch_id)

            material = queryset.first()

            results.append({
                'part_number': part_number,
                'matched': material is not None,
                'material_id': material.id if material else None,
                'material_code': material.material_code if material else None,
                'material_name': material.material_name if material else None,
            })

        return results
