# api/supplier/models.py

from django.db import models
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError

# Create your models here.

class Supplier(models.Model):
    """サプライヤーモデル(最上位)"""

    # 識別情報
    supplier_code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='サプライヤーコード',
        help_text='例: SUP001',
    )

    # 企業情報
    company_name = models.CharField(
        max_length=200,
        unique=True,
        verbose_name='企業名',
        help_text='例: 株式会社ABC',
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
        help_text='取引中のサプライヤーかどうか'
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
        verbose_name = 'サプライヤー'
        verbose_name_plural = 'サプライヤー一覧'
        ordering = ['company_name']
        db_table = 'suppliers'

    def __str__(self):
        return self.company_name

    
class SupplierBranch(models.Model):
    """サプライヤー拠点（本店・支店）モデル - 中間層"""

    class BranchType(models.TextChoices):
        HEAD_OFFICE = 'HEAD_OFFICE', '本社'
        BRANCH = 'BRANCH', '支店'
        SALES_OFFICE = 'SALES_OFFICE', '営業所'
        FACTORY = 'FACTORY', '工場'
        WAREHOUSE = 'WAREHOUSE', '倉庫'
        OTHER = 'OTHER' , 'その他'

    # サプライヤーとの関連
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name='branches',
        verbose_name='サプライヤー'
    )

    branch_code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='拠点コード',
        help_text='例: SUP001-HQ(本社), SUP001-NAG(名古屋支店)'
    )

    # 拠点情報
    branch_name = models.CharField(
        max_length=200,
        verbose_name='拠点名',
        help_text='例: 本社、名古屋支店, 安城営業所'
    )

    branch_type = models.CharField(
        max_length=20,
        choices=BranchType.choices,
        default=BranchType.BRANCH,
        verbose_name='拠点種別'
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
        verbose_name = 'サプライヤー拠点'
        verbose_name_plural = 'サプライヤー拠点一覧'
        ordering = ['supplier', 'branch_type', 'branch_name']
        db_table = 'supplier_branches'
        constraints = [
            # 同じサプライヤーで同じ拠点名は禁止
            models.UniqueConstraint(
                fields=['supplier', 'branch_name'],
                name='unique_supplier_branch_name'
            )
        ]

    def __str__(self):
        return f'{self.supplier.company_name} - {self.branch_name}'
    
    @property
    def display_name(self):
        """表示用の名前"""
        return f'{self.supplier.company_name} {self.branch_name}'
    
    @property
    def full_address(self):
        """完全な住所"""
        if self.postal_code and self.address:
            return f'〒{self.postal_code} {self.address}'
        return self.address or ''
    
    @property
    def primary_contact(self):
        """主担当者を取得"""
        return self.contacts.filter(is_primary=True, is_active=True).first()
    
class SupplierContact(models.Model):
    """サプライヤー担当者モデル - 最下層"""
    
    class ResponsibilityChoices(models.TextChoices):
        QUOTATION = "QUOTATION", "見積"
        ORDER = "ORDER", "発注"
        DELIVERY = "DELIVERY", "納品"
        TECHNICAL = "TECHNICAL", "技術"
        QUALITY = "QUALITY", "品質"
        ACCOUNTING = "ACCOUNTING", "経理"
        GENERAL = "GENERAL", "全般"
        OTHER = "OTHER", "その他"
    
    # ========== 拠点との関連（必須） ==========
    branch = models.ForeignKey(
        SupplierBranch,
        on_delete=models.CASCADE,
        related_name="contacts",
        verbose_name="所属拠点"
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
    
    # ========== 担当業務 ==========
    responsibility = models.CharField(
        max_length=20,
        choices=ResponsibilityChoices.choices,
        default=ResponsibilityChoices.GENERAL,
        verbose_name="主担当業務"
    )
    
    responsibility_detail = models.TextField(
        blank=True,
        null=True,
        verbose_name="担当業務詳細"
    )
    
    # ========== ステータス ==========
    is_primary = models.BooleanField(
        default=False,
        verbose_name="主担当",
        help_text="この拠点の主要な連絡先"
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効"
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="備考"
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
        verbose_name = "サプライヤー担当者"
        verbose_name_plural = "サプライヤー担当者一覧"
        ordering = ['branch', '-is_primary', 'name']
        db_table = "supplier_contacts"
        constraints = [
            # 同じ拠点で同じメールアドレスは禁止
            models.UniqueConstraint(
                fields=['branch', 'email'],
                name='unique_branch_email',
                condition=models.Q(email__isnull=False)
            )
        ]
    
    def __str__(self):
        return f"{self.branch.display_name} - {self.name}"
    
    @property
    def supplier(self):
        """所属サプライヤーを取得"""
        return self.branch.supplier
    
    @property
    def display_name_with_company(self):
        """企業名を含む表示名"""
        return f"{self.branch.supplier.company_name} {self.branch.branch_name} - {self.name}"
    
    def clean(self):
        """バリデーション"""
        # メールアドレスか電話番号のいずれかは必須
        if not self.email and not self.phone_number and not self.mobile_number:
            raise ValidationError(
                'メールアドレスまたは電話番号のいずれかは必須です'
            )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        
        # 主担当が複数にならないようにする（同じ拠点内で）
        if self.is_primary:
            SupplierContact.objects.filter(
                branch=self.branch,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        
        super().save(*args, **kwargs)