# api/customers/models.py

from pyexpat import model
from tabnanny import verbose
from django.db import models
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError

# Create your models here.


class Customer(models.Model):
    """カスタマーモデル（最上位)"""

    # 識別情報
    customer_code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='カスタマーコード',
        help_text='例: CS001'
    )

    # 企業情報
    company_name = models.CharField(
        max_length=200,
        unique=True,
        verbose_name='企業名',
        help_text='例: 株式会社ABC'
    )

    # 基本情報
    website = models.URLField(
        blank=True,
        null=True,
        verbose_name='ウェブサイト',
    )

    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='備考'
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name='有効',
        help_text='取引中顧客かどうか'
    )

    # 　タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='作成日時'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新日時',
    )

    class Meta:
        verbose_name = 'カスタマー'
        verbose_name_plural = 'カスタマー一覧'
        ordering = ['company_name']
        db_table = 'customers'

    def __str__(self):
        return self.company_name


class CustomerBranch(models.Model):
    """カスタマー拠点（本店・支店）モデル -中間層"""

    class BranchType(models.TextChoices):
        HEAD_OFFICE = 'HEAD_OFFICE', '本社'
        BRANCH = 'BRANCH', '支店'
        SALES_OFFICE = 'SALES_OFFICE', '営業所'
        FACTORY = 'FACTORY', '工場'
        WAREHOUSE = 'WAREHOUSE', '倉庫'
        OTHER = 'OTHER', 'その他'

    # カスタマーとの関連
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='branches',
        verbose_name='カスタマー'
    )
    branch_code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='拠点コード',
        help_text='例: HQ(本社), NAG(名古屋支店)'
    )

    # 拠点情報
    branch_name = models.CharField(
        max_length=200,
        verbose_name='拠点名',
        help_text='例: 本社, 名古屋支店, 岡崎工場'
    )

    branch_type = models.CharField(
        max_length=20,
        choices=BranchType.choices,
        default=BranchType.BRANCH,
        verbose_name='拠点種別',
    )

    # 連絡先情報
    postal_code = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name='郵便番号',
    )

    address = models.TextField(
        blank=True,
        null=True,
        verbose_name='住所'
    )

    phone_regex = RegexValidator(
        regex=r'^[0-9\-\+\(\)]+$',
        message='電話番号は数字、ハイフン、プラス記号、括弧のみ使用可能です'
    )
    phone_number = models.CharField(
        validators=[phone_regex],
        max_length=20,
        blank=True,
        null=True,
        verbose_name='代表番号'
    )
    fax_number = models.CharField(
        validators=[phone_regex],
        max_length=20,
        blank=True,
        null=True,
        verbose_name='FAX番号'
    )

    email = models.EmailField(
        blank=True,
        null=True,
        verbose_name='代表メールアドレス'
    )

    # その他
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='備考'
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name='有効'
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='作成日時'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新日時'
    )

    class Meta:
        verbose_name = 'カスタマー拠点'
        verbose_name_plural = 'カスタマー拠点一覧'
        ordering = ['customer', 'branch_type', 'branch_name']
        db_table = 'customer_branches'
        constraints = [
            # 同じカスタマーで同じ拠点名は禁止
            models.UniqueConstraint(
                # blanch_name → branch_name
                fields=['customer', 'branch_name'],
                name='unique_customer_branch_name'
            )
        ]

    def __str__(self):
        return f'{self.customer.company_name} - {self.branch_name}'

    @property
    def display_name(self):
        """表示用の名前"""
        return f'{self.customer.company_name} {self.branch_name}'

    @property
    def full_address(self):
        """完全な住所"""
        if self.postal_code and self.address:
            return f'〒{self.postal_code} {self.address}'
        return self.address or ''


class CustomerContact(models.Model):
    """カスタマー担当者モデル - 最下層"""

    branch = models.ForeignKey(
        CustomerBranch,
        on_delete=models.CASCADE,
        related_name='contacts',
        verbose_name='所属拠点'
    )

    # ========== 担当者基本情報 ==========

    name = models.CharField(
        max_length=100,
        verbose_name="担当者名"
    )

    name_kana = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="担当者名（カナ）"
    )

    department = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="部署"
    )

    position = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="役職"
    )

    # ========== 連絡先情報 ==========
    email = models.EmailField(
        blank=True,
        null=True,
        verbose_name="メールアドレス"
    )

    phone_regex = RegexValidator(
        regex=r'^[0-9\-\+\(\)]+$',
        message="電話番号は数字、ハイフン、プラス記号、括弧のみ使用可能です"
    )
    phone_number = models.CharField(
        validators=[phone_regex],
        max_length=20,
        blank=True,
        null=True,
        verbose_name="電話番号（直通）"
    )

    extension_number = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name="内線番号"
    )

    mobile_number = models.CharField(
        validators=[phone_regex],
        max_length=20,
        blank=True,
        null=True,
        verbose_name="携帯電話番号"
    )

    # ========== タイムスタンプ ==========
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )

    class Meta:
        verbose_name = 'カスタマー担当者'
        verbose_name_plural = 'カスタマー担当者一覧'
        ordering = ['branch', 'name']
        db_table = 'customer_contacts'


    def __str__(self):
        return f"{self.branch.display_name} - {self.name}"

    @property
    def customer(self):
        """所属カスタマーを取得"""
        return self.branch.customer

    @property
    def display_name_with_company(self):
        """企業名を含む表示名"""
        return f"{self.branch.customer.company_name} {self.branch.branch_name} - {self.name}"

    def clean(self):
        """バリデーション"""
        # メールアドレスか電話番号のいずれかは必須
        if not self.email and not self.phone_number and not self.mobile_number:
            raise ValidationError(
                'メールアドレスまたは電話番号のいずれかは必須です'
            )
