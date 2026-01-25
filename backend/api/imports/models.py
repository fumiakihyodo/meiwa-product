# api/imports/models.py
# 輸入管理モデル

from django.db import models
from django.core.validators import MinValueValidator, FileExtensionValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
import os


def import_file_upload_path(instance, filename):
    """インポートファイルのアップロードパスを生成"""
    today = timezone.now()
    invoice_number = instance.import_invoice.invoice_number if instance.import_invoice else 'unknown'
    return f"imports/{invoice_number}/{today.strftime('%Y')}/{today.strftime('%m')}/{filename}"


class ImportPurchaseOrder(models.Model):
    """輸入発注モデル（Import Purchase Order）

    海外サプライヤーへの発注を管理。
    1つのインボイスに対して複数のPOを紐付け可能。
    """

    class POStatus(models.TextChoices):
        DRAFT = 'draft', '下書き'
        CONFIRMED = 'confirmed', '確定'
        SHIPPED = 'shipped', '出荷済み'
        IN_TRANSIT = 'in_transit', '輸送中'
        ARRIVED = 'arrived', '到着済み'
        COMPLETED = 'completed', '完了'
        CANCELLED = 'cancelled', 'キャンセル'

    # PO番号（自動生成）
    po_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="PO番号",
        help_text="輸入発注を識別する番号（自動生成）"
    )

    # サプライヤー（既存のSupplierBranchを参照）
    supplier_branch = models.ForeignKey(
        'supplier.SupplierBranch',
        on_delete=models.PROTECT,
        related_name='import_purchase_orders',
        verbose_name="サプライヤー支店"
    )

    # 日付
    order_date = models.DateField(
        verbose_name="発注日",
        help_text="発注を行った日付"
    )
    expected_ship_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="出荷予定日",
        help_text="サプライヤーからの出荷予定日"
    )
    expected_arrival_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="到着予定日",
        help_text="日本への到着予定日"
    )
    actual_ship_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="実出荷日"
    )
    actual_arrival_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="実到着日"
    )

    # ステータス
    status = models.CharField(
        max_length=20,
        choices=POStatus.choices,
        default=POStatus.DRAFT,
        verbose_name="ステータス"
    )

    # 通貨
    currency = models.CharField(
        max_length=10,
        default='USD',
        verbose_name="通貨",
        help_text="取引通貨（USD, EUR, CNY, JPY等）"
    )

    # 為替レート（参考）
    exchange_rate = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.0001'))],
        verbose_name="為替レート",
        help_text="発注時点の参考為替レート"
    )

    # 輸送情報
    shipping_method = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="輸送方法",
        help_text="Air, Sea, Express等"
    )
    tracking_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="追跡番号"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_import_pos',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "輸入発注"
        verbose_name_plural = "輸入発注一覧"
        ordering = ['-order_date', '-created_at']
        db_table = "import_purchase_orders"
        indexes = [
            models.Index(fields=['po_number']),
            models.Index(fields=['supplier_branch']),
            models.Index(fields=['status']),
            models.Index(fields=['order_date']),
            models.Index(fields=['expected_arrival_date']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.po_number} - {self.supplier_branch}"

    def save(self, *args, **kwargs):
        if not self.po_number:
            # PO番号を自動生成 (IPO-YYYYMMDD-NNNN)
            today = timezone.now()
            prefix = f"IPO-{today.strftime('%Y%m%d')}-"
            last_po = ImportPurchaseOrder.objects.filter(
                po_number__startswith=prefix
            ).order_by('-po_number').first()

            if last_po:
                last_num = int(last_po.po_number.split('-')[-1])
                self.po_number = f"{prefix}{last_num + 1:04d}"
            else:
                self.po_number = f"{prefix}0001"

        super().save(*args, **kwargs)

    @property
    def total_items(self):
        """明細の品目数"""
        return self.items.count()

    @property
    def total_quantity(self):
        """合計数量"""
        return self.items.aggregate(
            total=models.Sum('quantity')
        )['total'] or 0

    @property
    def total_amount(self):
        """合計金額"""
        return self.items.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')


class ImportPurchaseOrderItem(models.Model):
    """輸入発注明細モデル"""

    # 親のPO
    import_po = models.ForeignKey(
        'ImportPurchaseOrder',
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="輸入発注"
    )

    # 材料との紐付け（オプション）
    material = models.ForeignKey(
        'manufacturing.Material',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='import_po_items',
        verbose_name="材料"
    )

    # 品番・品名（材料マスタに存在しない場合も登録可能）
    part_number = models.CharField(
        max_length=100,
        verbose_name="品番"
    )
    description = models.CharField(
        max_length=300,
        blank=True,
        verbose_name="品名・説明"
    )

    # 数量・単価
    quantity = models.PositiveIntegerField(
        verbose_name="数量"
    )
    unit = models.CharField(
        max_length=20,
        default="個",
        verbose_name="単位"
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="単価"
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="金額"
    )

    # 受入情報
    received_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name="受入済み数量"
    )
    is_received = models.BooleanField(
        default=False,
        verbose_name="受入完了"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )

    class Meta:
        verbose_name = "輸入発注明細"
        verbose_name_plural = "輸入発注明細一覧"
        ordering = ['id']
        db_table = "import_purchase_order_items"
        indexes = [
            models.Index(fields=['import_po']),
            models.Index(fields=['part_number']),
            models.Index(fields=['material']),
        ]

    def __str__(self):
        return f"{self.part_number} x {self.quantity}"

    def save(self, *args, **kwargs):
        # 金額を自動計算
        if self.unit_price is not None and self.quantity:
            self.amount = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class ImportInvoice(models.Model):
    """インボイスモデル

    海外サプライヤーからのインボイス（請求書）を管理。
    複数のPOと紐付け可能。
    """

    class InvoiceStatus(models.TextChoices):
        DRAFT = 'draft', '下書き'
        PENDING = 'pending', '処理待ち'
        PROCESSING = 'processing', '処理中'
        COMPLETED = 'completed', '完了'
        CANCELLED = 'cancelled', 'キャンセル'

    # インボイス番号
    invoice_number = models.CharField(
        max_length=100,
        verbose_name="インボイス番号",
        help_text="サプライヤーからのインボイス番号"
    )

    # サプライヤー
    supplier_branch = models.ForeignKey(
        'supplier.SupplierBranch',
        on_delete=models.PROTECT,
        related_name='import_invoices',
        verbose_name="サプライヤー支店"
    )

    # 紐付けPO（多対多）
    linked_pos = models.ManyToManyField(
        'ImportPurchaseOrder',
        blank=True,
        related_name='invoices',
        verbose_name="紐付けPO"
    )

    # 日付
    invoice_date = models.DateField(
        verbose_name="インボイス日付"
    )
    received_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="受領日",
        help_text="インボイスを受領した日付"
    )

    # ステータス
    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.DRAFT,
        verbose_name="ステータス"
    )

    # 通貨・金額
    currency = models.CharField(
        max_length=10,
        default='USD',
        verbose_name="通貨"
    )
    subtotal = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="小計"
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="税額"
    )
    shipping_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="送料"
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="合計金額"
    )

    # 半製品在庫登録フラグ
    registered_as_semi_finished = models.BooleanField(
        default=False,
        verbose_name="半製品在庫登録済み",
        help_text="このインボイスの品目が半製品として在庫登録されたかどうか"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_import_invoices',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "インボイス"
        verbose_name_plural = "インボイス一覧"
        ordering = ['-invoice_date', '-created_at']
        db_table = "import_invoices"
        indexes = [
            models.Index(fields=['invoice_number']),
            models.Index(fields=['supplier_branch']),
            models.Index(fields=['status']),
            models.Index(fields=['invoice_date']),
            models.Index(fields=['received_date']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.supplier_branch}"

    @property
    def total_items(self):
        """明細の品目数"""
        return self.items.count()

    @property
    def total_quantity(self):
        """合計数量"""
        return self.items.aggregate(
            total=models.Sum('quantity')
        )['total'] or 0

    @property
    def linked_po_ids(self):
        """紐付けPOのIDリスト"""
        return list(self.linked_pos.values_list('id', flat=True))


class ImportInvoiceItem(models.Model):
    """インボイス明細モデル"""

    # 親のインボイス
    import_invoice = models.ForeignKey(
        'ImportInvoice',
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="インボイス"
    )

    # PO明細との紐付け（オプション）
    import_po_item = models.ForeignKey(
        'ImportPurchaseOrderItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_items',
        verbose_name="PO明細"
    )

    # 材料との紐付け（オプション）
    material = models.ForeignKey(
        'manufacturing.Material',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='import_invoice_items',
        verbose_name="材料"
    )

    # 品番・品名
    part_number = models.CharField(
        max_length=100,
        verbose_name="品番"
    )
    description = models.CharField(
        max_length=300,
        blank=True,
        verbose_name="品名・説明"
    )

    # 数量・単価
    quantity = models.PositiveIntegerField(
        verbose_name="数量"
    )
    unit = models.CharField(
        max_length=20,
        default="個",
        verbose_name="単位"
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="単価"
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="金額"
    )

    # 半製品在庫登録フラグ
    registered_as_semi_finished = models.BooleanField(
        default=False,
        verbose_name="半製品在庫登録済み"
    )

    # OCR情報（参考）
    ocr_confidence = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name="OCR信頼度",
        help_text="OCRによる抽出時の信頼度（0-1）"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )

    class Meta:
        verbose_name = "インボイス明細"
        verbose_name_plural = "インボイス明細一覧"
        ordering = ['id']
        db_table = "import_invoice_items"
        indexes = [
            models.Index(fields=['import_invoice']),
            models.Index(fields=['part_number']),
            models.Index(fields=['material']),
            models.Index(fields=['import_po_item']),
        ]

    def __str__(self):
        return f"{self.part_number} x {self.quantity}"

    def save(self, *args, **kwargs):
        # 金額を自動計算
        if self.unit_price is not None and self.quantity:
            self.amount = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class ImportFile(models.Model):
    """インポートファイルモデル

    Waybill, Invoice, 請求書などのファイルを管理
    """

    class FileType(models.TextChoices):
        WAYBILL = 'waybill', 'Waybill'
        INVOICE = 'invoice', 'Invoice'
        BILL = 'bill', '請求書'
        PACKING_LIST = 'packing_list', 'Packing List'
        CERTIFICATE = 'certificate', '証明書'
        OTHER = 'other', 'その他'

    # 親のインボイス
    import_invoice = models.ForeignKey(
        'ImportInvoice',
        on_delete=models.CASCADE,
        related_name='files',
        verbose_name="インボイス"
    )

    # ファイル種別
    file_type = models.CharField(
        max_length=20,
        choices=FileType.choices,
        default=FileType.INVOICE,
        verbose_name="ファイル種別"
    )

    # ファイル
    file = models.FileField(
        upload_to=import_file_upload_path,
        validators=[
            FileExtensionValidator(
                allowed_extensions=['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'xlsx', 'xls', 'doc', 'docx']
            )
        ],
        verbose_name="ファイル"
    )

    # ファイル名（元のファイル名を保存）
    original_filename = models.CharField(
        max_length=255,
        verbose_name="元ファイル名"
    )

    # ファイルサイズ（バイト）
    file_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="ファイルサイズ"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="アップロード日時"
    )
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_import_files',
        verbose_name="アップロード者"
    )

    class Meta:
        verbose_name = "インポートファイル"
        verbose_name_plural = "インポートファイル一覧"
        ordering = ['-uploaded_at']
        db_table = "import_files"
        indexes = [
            models.Index(fields=['import_invoice']),
            models.Index(fields=['file_type']),
            models.Index(fields=['uploaded_at']),
        ]

    def __str__(self):
        return f"{self.get_file_type_display()} - {self.original_filename}"

    def save(self, *args, **kwargs):
        # ファイルサイズを保存
        if self.file and not self.file_size:
            self.file_size = self.file.size
        # 元ファイル名を保存
        if self.file and not self.original_filename:
            self.original_filename = os.path.basename(self.file.name)
        super().save(*args, **kwargs)

    @property
    def file_name(self):
        """ファイル名を取得"""
        return self.original_filename or os.path.basename(self.file.name)

    @property
    def file_extension(self):
        """ファイル拡張子を取得"""
        return os.path.splitext(self.file_name)[1].lower()

    @property
    def is_pdf(self):
        """PDFファイルかどうか"""
        return self.file_extension == '.pdf'

    @property
    def is_image(self):
        """画像ファイルかどうか"""
        return self.file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
