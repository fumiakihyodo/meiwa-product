# api/products/models.py

from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone

# Create your models here.


class Product(models.Model):
    """製品モデル"""

    customer_branch = models.ForeignKey(
        'customers.CustomerBranch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name='顧客拠点',
        help_text='この製品を購入する顧客拠点'
    )

    # 基本情報
    product_number = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='製品品番',
        help_text='製品識別品番',
    )

    product_name = models.CharField(
        max_length=200,
        verbose_name='製品名称'
    )

    # 機種情報
    model_info = models.CharField(
        max_length=200,
        blank=True,
        default='',
        verbose_name='機種情報',
        help_text='製品の機種情報（製品名）'
    )

    # 詳細情報
    description = models.TextField(
        blank=True,
        verbose_name='製品説明',
        help_text='製品詳細説明'
    )

    # 製品種別
    is_assembly = models.BooleanField(
        default=False,
        verbose_name='組立',
        help_text='組立製品かどうか'
    )
    is_parts_processing = models.BooleanField(
        default=False,
        verbose_name='部品加工',
        help_text='部品加工製品かどうか'
    )

    # ステータス
    class StatusChoices(models.TextChoices):
        ACTIVE = 'ACTIVE', '有効'
        DISCONTINUED = 'DISCONTINUED', '廃盤'
        DEVELOPMENT = 'DEVELOPMENT', '開発中'

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE,
        verbose_name='ステータス'
    )

    # タイムスタンプ
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='作成日時')

    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新日時')

    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_products',
        verbose_name='作成者',
    )

    class Meta:
        verbose_name = '製品'
        verbose_name_plural = '製品一覧'
        ordering = ['product_number']
        db_table = 'products'
        indexes = [
            models.Index(fields=['product_number']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['customer_branch']),
            models.Index(fields=['model_info']),
            models.Index(fields=['is_assembly']),
            models.Index(fields=['is_parts_processing']),
        ]

    def __str__(self):
        return f'{self.product_number} - {self.product_name}'
    
    # NOTE: parts_count property has been removed to avoid conflicts with annotate()
    # The field is now added dynamically in views using annotate()
    
    @property
    def active_parts(self):
        '''有効な部品一覧を取得'''
        return self.parts.filter(is_active=True)
    
    @property
    def customer(self):
        """所属カスタマーを取得"""
        return self.customer_branch.customer if self.customer_branch else None
    
    @property
    def display_name_with_customer(self):
        """顧客情報を含む表示名"""
        if self.customer_branch:
            return f"{self.customer_branch.display_name} - {self.product_number} {self.product_name}"
        return f"{self.product_number} - {self.product_name}"