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


def supplied_item_quote_file_upload_path(instance, filename):
    """支給品見積書ファイルのアップロードパスを生成"""
    date = timezone.now()
    return f"supplied_item_quotes/{instance.supplied_item.item_number}/{date.year}/{date.month:02d}/{filename}"


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

    # 見積書ファイル
    quote_file = models.FileField(
        upload_to=supplied_item_quote_file_upload_path,
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