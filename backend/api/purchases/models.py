# api/purchases/models.py

import os
from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal


class Part(models.Model):
    """部品モデル"""
    
    # 関連
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='parts',
        verbose_name="製品",
        help_text="この部品が使用される製品"
    )
    supplier_branch = models.ForeignKey(
        'supplier.SupplierBranch',
        on_delete=models.PROTECT,
        related_name='parts',
        verbose_name="仕入先支店",
        help_text="この部品を供給する仕入先支店"
    )
    
    # 基本情報
    part_number = models.CharField(
        max_length=100,
        verbose_name="部品品番",
        help_text="部品を識別する品番"
    )
    part_name = models.CharField(
        max_length=200,
        verbose_name="部品名"
    )

    supplier_part_name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name='仕入先部品名称'
    )
    
    # 仕様情報
    specification = models.TextField(
        blank=True,
        verbose_name="仕様",
        help_text="部品の詳細仕様"
    )
    unit = models.CharField(
        max_length=20,
        default="個",
        verbose_name="単位",
        help_text="発注単位（個、kg、m等）"
    )

    class OrderType(models.TextChoices):
        MOQ = 'MOQ', 'MOQ'
        SPQ = 'SPQ', 'SPQ'
        SNP = 'SNP', 'SNP'
        OTHER = 'OTHER', 'その他'


    # 発注区分
    order_type = models.CharField(
        max_length=20,
        choices=OrderType.choices,
        default=OrderType.MOQ,
        verbose_name='発注区分'
    )

    
    # 最小発注数量
    minimum_order_quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name="最小発注数量",
        help_text="最小発注ロット数"
    )
    
    # 標準リードタイム（日数）
    lead_time_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="リードタイム（日）",
        help_text="標準納期日数"
    )

    # 使用数量
    usage_quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name="使用数",
        help_text="製品1個あたりの使用数量"
    )

    # ステータス
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効",
        help_text="この部品が現在使用可能かどうか"
    )

    # 使用数
    quantity_per_product = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="製品あたりの使用数",
        help_text="製品1個を製造する際に必要な部品の数量"
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
        related_name='created_parts',
        verbose_name="作成者"
    )
    
    class Meta:
        verbose_name = "部品"
        verbose_name_plural = "部品一覧"
        ordering = ['part_number']
        db_table = "parts"
        unique_together = [['product', 'supplier_branch', 'part_number']]
        indexes = [
            models.Index(fields=['part_number']),
            models.Index(fields=['product', 'is_active']),
            models.Index(fields=['supplier_branch', 'is_active']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.part_number} - {self.part_name}"
    
    def clean(self):
        """バリデーション"""
        super().clean()
        
        # 同じ製品と仕入先の組み合わせで同じ品番が存在しないかチェック
        if self.pk:
            existing = Part.objects.filter(
                product=self.product,
                supplier_branch=self.supplier_branch,
                part_number=self.part_number
            ).exclude(pk=self.pk)
        else:
            existing = Part.objects.filter(
                product=self.product,
                supplier_branch=self.supplier_branch,
                part_number=self.part_number
            )
        
        if existing.exists():
            raise ValidationError(
                "この製品と仕入先の組み合わせで、同じ品番が既に登録されています。"
            )
    
    @property
    def current_price(self):
        """現在の有効な価格を取得（最新の1つ）"""
        price_history = self.price_histories.filter(
            is_active=True,
            start_date__lte=timezone.now().date()
        ).order_by('-start_date').first()
        
        return price_history.price if price_history else None
    
    @property
    def current_prices(self):
        """現在有効な価格を全て取得（複数の場合あり）"""
        return self.price_histories.filter(
            is_active=True,
            start_date__lte=timezone.now().date()
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=timezone.now().date())
        ).order_by('-start_date')
    
    @property
    def has_multiple_active_prices(self):
        """複数の有効な価格が存在するかチェック"""
        return self.current_prices.count() > 1
    
    # NOTE: price_history_count property has been removed to avoid conflicts with annotate()
    # The field is now added dynamically in views using annotate()


def quote_file_upload_path(instance, filename):
    """見積書ファイルのアップロードパスを生成"""
    # ファイル名をサニタイズ
    ext = os.path.splitext(filename)[1]
    # parts/見積書/部品番号/YYYY/MM/ファイル名
    date = timezone.now()
    return f"quotes/{instance.part.part_number}/{date.year}/{date.month:02d}/{filename}"


class PriceHistory(models.Model):
    """価格履歴モデル"""
    
    # 関連
    part = models.ForeignKey(
        'Part',
        on_delete=models.CASCADE,
        related_name='price_histories',
        verbose_name="部品"
    )
    
    # 価格情報
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="単価",
        help_text="税抜単価"
    )
    
    # 有効期間
    start_date = models.DateField(
        verbose_name="開始日",
        help_text="この価格が有効になる日"
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="終了日",
        help_text="この価格が無効になる日（空白の場合は無期限）"
    )
    
    # ステータス
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効",
        help_text="手動で無効化する場合に使用"
    )
    
    # 変更理由
    change_reason = models.TextField(
        blank=True,
        verbose_name="変更理由",
        help_text="価格変更の理由や背景"
    )
    
    # 見積書ファイル
    quote_file = models.FileField(
        upload_to=quote_file_upload_path,
        null=True,
        blank=True,
        verbose_name="見積書ファイル",
        help_text="見積書のPDFやExcelファイル",
        max_length=500
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
        related_name='created_price_histories',
        verbose_name="作成者"
    )
    
    class Meta:
        verbose_name = "価格履歴"
        verbose_name_plural = "価格履歴一覧"
        ordering = ['-start_date', '-created_at']
        db_table = "price_histories"
        indexes = [
            models.Index(fields=['part', 'start_date']),
            models.Index(fields=['part', 'is_active']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.part.part_number} - ¥{self.price} ({self.start_date}〜)"
    
    def clean(self):
        """バリデーション"""
        super().clean()
        
        # 終了日が開始日より前でないかチェック
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({
                'end_date': '終了日は開始日以降の日付を指定してください。'
            })
        
        # 同じ部品で期間が重複する価格履歴がないかチェック（自分自身は除外）
        overlapping = PriceHistory.objects.filter(
            part=self.part,
            is_active=True
        )
        
        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)
        
        for history in overlapping:
            # 期間の重複をチェック
            if self._is_overlapping(history):
                raise ValidationError(
                    f"価格適用期間が既存の価格履歴（{history.start_date}〜{history.end_date or '無期限'}）と重複しています。"
                )
    
    def _is_overlapping(self, other):
        """期間の重複をチェックするヘルパーメソッド"""
        # 自分の終了日が設定されていない場合
        if not self.end_date:
            # 相手の終了日も設定されていない場合は必ず重複
            if not other.end_date:
                return True
            # 相手の終了日が自分の開始日以降なら重複
            return other.end_date >= self.start_date
        
        # 相手の終了日が設定されていない場合
        if not other.end_date:
            # 自分の終了日が相手の開始日以降なら重複
            return self.end_date >= other.start_date
        
        # 両方とも終了日が設定されている場合
        return (
            (self.start_date <= other.end_date) and
            (self.end_date >= other.start_date)
        )
    
    def save(self, *args, **kwargs):
        """保存時の処理"""
        # 終了日を過ぎている場合は自動的に無効化
        if self.end_date and self.end_date < timezone.now().date():
            self.is_active = False
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """削除時にファイルも削除"""
        if self.quote_file:
            # ファイルが存在する場合は削除
            if os.path.isfile(self.quote_file.path):
                os.remove(self.quote_file.path)
        super().delete(*args, **kwargs)
    
    @property
    def is_current(self):
        """現在有効な価格かどうか"""
        if not self.start_date:
            return False
        
        today = timezone.now().date()
        
        if not self.is_active:
            return False
        
        if self.start_date > today:
            return False
        
        if self.end_date and self.end_date < today:
            return False
        
        return True
    
    @property
    def is_future(self):
        """将来の価格かどうか"""
        if not self.start_date:
            return False
        return self.start_date > timezone.now().date()
    
    @property
    def is_expired(self):
        """期限切れかどうか"""
        if not self.end_date:
            return False
        return self.end_date < timezone.now().date()
    
    @property
    def quote_file_name(self):
        """見積書ファイル名を取得"""
        if self.quote_file:
            return os.path.basename(self.quote_file.name)
        return None
    
    @property
    def quote_file_size(self):
        """見積書ファイルサイズを取得（バイト）"""
        if self.quote_file:
            return self.quote_file.size
        return None


class SuppliedItem(models.Model):
    """支給品モデル"""

    # 関連
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='supplied_items',
        verbose_name="製品",
        help_text="この支給品が使用される製品"
    )

    # 基本情報
    item_number = models.CharField(
        max_length=100,
        verbose_name="支給品品番",
        help_text="支給品を識別する品番"
    )
    item_name = models.CharField(
        max_length=200,
        verbose_name="支給品名"
    )

    # 仕様情報
    specification = models.TextField(
        blank=True,
        verbose_name="仕様",
        help_text="支給品の詳細仕様"
    )
    unit = models.CharField(
        max_length=20,
        default="個",
        verbose_name="単位",
        help_text="単位（個、kg、m等）"
    )

    # 標準数量
    standard_quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name="標準数量",
        help_text="製品1個あたりの標準使用数量"
    )

    # ステータス
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効",
        help_text="この支給品が現在使用可能かどうか"
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
        related_name='created_supplied_items',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "支給品"
        verbose_name_plural = "支給品一覧"
        ordering = ['item_number']
        db_table = "supplied_items"
        unique_together = [['product', 'item_number']]
        indexes = [
            models.Index(fields=['item_number']),
            models.Index(fields=['product', 'is_active']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.item_number} - {self.item_name}"

    def clean(self):
        """バリデーション"""
        super().clean()

        # 同じ製品で同じ品番が存在しないかチェック
        if self.pk:
            existing = SuppliedItem.objects.filter(
                product=self.product,
                item_number=self.item_number
            ).exclude(pk=self.pk)
        else:
            existing = SuppliedItem.objects.filter(
                product=self.product,
                item_number=self.item_number
            )

        if existing.exists():
            raise ValidationError(
                "この製品で同じ品番が既に登録されています。"
            )

    @property
    def current_price(self):
        """現在の有効な価格を取得（最新の1つ）"""
        price_history = self.supplied_item_price_histories.filter(
            is_active=True,
            start_date__lte=timezone.now().date()
        ).order_by('-start_date').first()

        return price_history.price if price_history else None

    @property
    def current_prices(self):
        """現在有効な価格を全て取得（複数の場合あり）"""
        return self.supplied_item_price_histories.filter(
            is_active=True,
            start_date__lte=timezone.now().date()
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=timezone.now().date())
        ).order_by('-start_date')

    @property
    def has_multiple_active_prices(self):
        """複数の有効な価格が存在するかチェック"""
        return self.current_prices.count() > 1


class SuppliedItemPriceHistory(models.Model):
    """支給品価格履歴モデル"""

    # 関連
    supplied_item = models.ForeignKey(
        'SuppliedItem',
        on_delete=models.CASCADE,
        related_name='supplied_item_price_histories',
        verbose_name="支給品"
    )

    # 価格情報
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="単価",
        help_text="税抜単価"
    )

    # 有効期間
    start_date = models.DateField(
        verbose_name="開始日",
        help_text="この価格が有効になる日"
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="終了日",
        help_text="この価格が無効になる日（空白の場合は無期限）"
    )

    # ステータス
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効",
        help_text="手動で無効化する場合に使用"
    )

    # 変更理由
    change_reason = models.TextField(
        blank=True,
        verbose_name="変更理由",
        help_text="価格変更の理由や背景"
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
        related_name='created_supplied_item_price_histories',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "支給品価格履歴"
        verbose_name_plural = "支給品価格履歴一覧"
        ordering = ['-start_date', '-created_at']
        db_table = "supplied_item_price_histories"
        indexes = [
            models.Index(fields=['supplied_item', 'start_date']),
            models.Index(fields=['supplied_item', 'is_active']),
            models.Index(fields=['start_date', 'end_date']),
        ]

    def __str__(self):
        return f"{self.supplied_item.item_number} - ¥{self.price} ({self.start_date}〜)"

    def clean(self):
        """バリデーション"""
        super().clean()

        # 終了日が開始日より前でないかチェック
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({
                'end_date': '終了日は開始日以降の日付を指定してください。'
            })

        # 同じ支給品で期間が重複する価格履歴がないかチェック（自分自身は除外）
        overlapping = SuppliedItemPriceHistory.objects.filter(
            supplied_item=self.supplied_item,
            is_active=True
        )

        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)

        for history in overlapping:
            # 期間の重複をチェック
            if self._is_overlapping(history):
                raise ValidationError(
                    f"価格適用期間が既存の価格履歴（{history.start_date}〜{history.end_date or '無期限'}）と重複しています。"
                )

    def _is_overlapping(self, other):
        """期間の重複をチェックするヘルパーメソッド"""
        # 自分の終了日が設定されていない場合
        if not self.end_date:
            # 相手の終了日も設定されていない場合は必ず重複
            if not other.end_date:
                return True
            # 相手の終了日が自分の開始日以降なら重複
            return other.end_date >= self.start_date

        # 相手の終了日が設定されていない場合
        if not other.end_date:
            # 自分の終了日が相手の開始日以降なら重複
            return self.end_date >= other.start_date

        # 両方とも終了日が設定されている場合
        return (
            (self.start_date <= other.end_date) and
            (self.end_date >= other.start_date)
        )

    def save(self, *args, **kwargs):
        """保存時の処理"""
        # 終了日を過ぎている場合は自動的に無効化
        if self.end_date and self.end_date < timezone.now().date():
            self.is_active = False

        super().save(*args, **kwargs)

    @property
    def is_current(self):
        """現在有効な価格かどうか"""
        if not self.start_date:
            return False

        today = timezone.now().date()

        if not self.is_active:
            return False

        if self.start_date > today:
            return False

        if self.end_date and self.end_date < today:
            return False

        return True

    @property
    def is_future(self):
        """将来の価格かどうか"""
        if not self.start_date:
            return False
        return self.start_date > timezone.now().date()

    @property
    def is_expired(self):
        """期限切れかどうか"""
        if not self.end_date:
            return False
        return self.end_date < timezone.now().date()


# ===== 在庫管理モデル =====

def supplied_item_list_file_upload_path(instance, filename):
    """支給品リストCSVファイルのアップロードパスを生成"""
    date = timezone.now()
    return f"supplied_item_lists/{date.year}/{date.month:02d}/{filename}"


class SuppliedItemList(models.Model):
    """支給品リストモデル（CSVインポート用）"""

    class ListStatus(models.TextChoices):
        DRAFT = 'draft', '下書き'
        PENDING_RECEIVING = 'pending_receiving', '受入待ち'
        RECEIVING = 'receiving', '受入中'
        PENDING_COUNT = 'pending_count', '員数確認待ち'
        COUNTING = 'counting', '員数確認中'
        COMPLETED = 'completed', '完了'
        CANCELLED = 'cancelled', 'キャンセル'

    # リスト番号（自動生成）
    list_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="リスト番号",
        help_text="支給品リストを識別する番号"
    )

    # 製品
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='supplied_item_lists',
        verbose_name="製品"
    )

    # 発行日
    issue_date = models.DateField(
        verbose_name="発行日",
        help_text="CSVの発行日（1列目）"
    )

    # 納品予定日
    delivery_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="納品予定日",
        help_text="支給品の納品予定日"
    )

    # CSVファイル
    csv_file = models.FileField(
        upload_to=supplied_item_list_file_upload_path,
        null=True,
        blank=True,
        verbose_name="CSVファイル",
        help_text="インポート元のCSVファイル"
    )

    # ステータス
    status = models.CharField(
        max_length=20,
        choices=ListStatus.choices,
        default=ListStatus.DRAFT,
        verbose_name="ステータス"
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
        related_name='created_supplied_item_lists',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "支給品リスト"
        verbose_name_plural = "支給品リスト一覧"
        ordering = ['-created_at']
        db_table = "supplied_item_lists"
        indexes = [
            models.Index(fields=['list_number']),
            models.Index(fields=['product', 'status']),
            models.Index(fields=['issue_date']),
            models.Index(fields=['delivery_date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.list_number} - {self.product.product_name}"

    def save(self, *args, **kwargs):
        if not self.list_number:
            # リスト番号を自動生成 (SL-YYYYMMDD-NNNN)
            today = timezone.now()
            prefix = f"SL-{today.strftime('%Y%m%d')}-"
            last_list = SuppliedItemList.objects.filter(
                list_number__startswith=prefix
            ).order_by('-list_number').first()

            if last_list:
                last_num = int(last_list.list_number.split('-')[-1])
                self.list_number = f"{prefix}{last_num + 1:04d}"
            else:
                self.list_number = f"{prefix}0001"

        super().save(*args, **kwargs)

    @property
    def total_items(self):
        """リスト内の品番数"""
        return self.items.count()

    @property
    def total_quantity(self):
        """リスト内の合計数量"""
        return self.items.aggregate(
            total=models.Sum('quantity')
        )['total'] or 0

    @property
    def received_items_count(self):
        """受入確認済みの品番数"""
        return self.items.filter(receiving_confirmed=True).count()

    @property
    def count_confirmed_items_count(self):
        """員数確認済みの品番数"""
        return self.items.filter(count_confirmed=True).count()


class SuppliedItemListItem(models.Model):
    """支給品リスト項目モデル（リスト内の各品番）"""

    # 親リスト
    supplied_item_list = models.ForeignKey(
        'SuppliedItemList',
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="支給品リスト"
    )

    # 支給品マスタ（任意：マスタに紐づける場合）
    supplied_item = models.ForeignKey(
        'SuppliedItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='list_items',
        verbose_name="支給品マスタ"
    )

    # 品番情報（CSVからの直接入力も可能にするため）
    item_number = models.CharField(
        max_length=100,
        verbose_name="品番"
    )
    item_name = models.CharField(
        max_length=200,
        verbose_name="品名"
    )

    # 数量情報
    quantity = models.PositiveIntegerField(
        verbose_name="数量",
        help_text="リストに記載された数量"
    )
    quantity_per_box = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="入数",
        help_text="1箱あたりの入数"
    )
    box_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="箱数"
    )

    # 単位
    unit = models.CharField(
        max_length=20,
        default="個",
        verbose_name="単位"
    )

    # 受入確認
    receiving_confirmed = models.BooleanField(
        default=False,
        verbose_name="受入確認済み"
    )
    receiving_confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="受入確認日時"
    )
    receiving_confirmed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='receiving_confirmed_items',
        verbose_name="受入確認者"
    )

    # 実際の受入数量（受入時に入力）
    received_quantity = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="受入数量",
        help_text="実際に受け入れた数量"
    )

    # 員数確認
    count_confirmed = models.BooleanField(
        default=False,
        verbose_name="員数確認済み"
    )
    count_confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="員数確認日時"
    )
    count_confirmed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='count_confirmed_items',
        verbose_name="員数確認者"
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
        verbose_name = "支給品リスト項目"
        verbose_name_plural = "支給品リスト項目一覧"
        ordering = ['id']
        db_table = "supplied_item_list_items"
        indexes = [
            models.Index(fields=['supplied_item_list']),
            models.Index(fields=['item_number']),
            models.Index(fields=['receiving_confirmed']),
            models.Index(fields=['count_confirmed']),
        ]

    def __str__(self):
        return f"{self.item_number} - {self.item_name} ({self.quantity}{self.unit})"

    @property
    def is_quantity_matched(self):
        """受入数量がリスト数量と一致しているか"""
        if self.received_quantity is None:
            return None
        return self.received_quantity == self.quantity


class SuppliedItemReceiving(models.Model):
    """支給品受入確認モデル（一時保存対応）"""

    class ReceivingStatus(models.TextChoices):
        DRAFT = 'draft', '一時保存'
        COMPLETED = 'completed', '完了'

    # 支給品リスト
    supplied_item_list = models.ForeignKey(
        'SuppliedItemList',
        on_delete=models.CASCADE,
        related_name='receivings',
        verbose_name="支給品リスト"
    )

    # ステータス
    status = models.CharField(
        max_length=20,
        choices=ReceivingStatus.choices,
        default=ReceivingStatus.DRAFT,
        verbose_name="ステータス"
    )

    # 受入日時
    receiving_date = models.DateTimeField(
        default=timezone.now,
        verbose_name="受入日時"
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
        related_name='created_receivings',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "支給品受入確認"
        verbose_name_plural = "支給品受入確認一覧"
        ordering = ['-created_at']
        db_table = "supplied_item_receivings"
        indexes = [
            models.Index(fields=['supplied_item_list']),
            models.Index(fields=['status']),
            models.Index(fields=['receiving_date']),
        ]

    def __str__(self):
        return f"{self.supplied_item_list.list_number} - {self.receiving_date}"


class SuppliedItemReceivingItem(models.Model):
    """支給品受入確認項目モデル"""

    # 親の受入確認
    receiving = models.ForeignKey(
        'SuppliedItemReceiving',
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="受入確認"
    )

    # リスト項目（任意）
    list_item = models.ForeignKey(
        'SuppliedItemListItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='receiving_items',
        verbose_name="リスト項目"
    )

    # 品番情報
    item_number = models.CharField(
        max_length=100,
        verbose_name="品番"
    )

    # 入数
    quantity_per_box = models.PositiveIntegerField(
        verbose_name="入数",
        help_text="1箱あたりの入数"
    )

    # 箱数
    box_count = models.PositiveIntegerField(
        verbose_name="箱数"
    )

    # 計算された数量（入数 × 箱数）
    calculated_quantity = models.PositiveIntegerField(
        verbose_name="数量",
        help_text="入数 × 箱数で自動計算"
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
        verbose_name = "支給品受入確認項目"
        verbose_name_plural = "支給品受入確認項目一覧"
        ordering = ['id']
        db_table = "supplied_item_receiving_items"
        indexes = [
            models.Index(fields=['receiving']),
            models.Index(fields=['item_number']),
        ]

    def __str__(self):
        return f"{self.item_number} ({self.quantity_per_box} × {self.box_count} = {self.calculated_quantity})"

    def save(self, *args, **kwargs):
        # 数量を自動計算
        self.calculated_quantity = self.quantity_per_box * self.box_count
        super().save(*args, **kwargs)


class SuppliedItemInventory(models.Model):
    """支給品在庫モデル"""

    # 支給品マスタ
    supplied_item = models.ForeignKey(
        'SuppliedItem',
        on_delete=models.CASCADE,
        related_name='inventories',
        verbose_name="支給品"
    )

    # リスト項目（どのリストから来たか）
    list_item = models.ForeignKey(
        'SuppliedItemListItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventories',
        verbose_name="リスト項目"
    )

    # 数量
    quantity = models.PositiveIntegerField(
        verbose_name="在庫数量"
    )

    # ロット番号
    lot_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="ロット番号"
    )

    # 入庫日
    received_date = models.DateField(
        default=timezone.now,
        verbose_name="入庫日"
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
        related_name='created_inventories',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "支給品在庫"
        verbose_name_plural = "支給品在庫一覧"
        ordering = ['-received_date', '-created_at']
        db_table = "supplied_item_inventories"
        indexes = [
            models.Index(fields=['supplied_item']),
            models.Index(fields=['lot_number']),
            models.Index(fields=['received_date']),
        ]

    def __str__(self):
        return f"{self.supplied_item.item_number} - {self.quantity}{self.supplied_item.unit}"