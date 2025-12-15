from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone

# Create your models here.

class UserManager(BaseUserManager):
    """カスタムユーザーマネージャー"""

    def create_user(self, userid, email, password=None, **extra_fields):
        """通常のユーザーの作成"""
        if not userid:
            raise ValueError("ユーザーIDは必須です")
        if not email:
            raise ValueError("メールアドレスは必須です")
        
        email = self.normalize_email(email)
        user = self.model(userid=userid, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        return user
    
    def create_superuser(self, userid, email, password=None, **extra_fields):
        """スーパーユーザーの作成"""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("スーパーユーザーは is_staff=True である必要があります")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("スーパーユーザーは is_superuser=True である必要があります")
        
        return self.create_user(userid, email, password, **extra_fields)
    
class User(AbstractBaseUser, PermissionsMixin):
    """カスタムユーザーモデル"""

    # 基本設定
    userid = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="ユーザーID",
        help_text="ログイン時に使用するID"
    )
    email = models.EmailField(unique=True, verbose_name="メールアドレス")

    # プロフィール情報
    first_name = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="名"
    )
    last_name = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="性"
    )
    full_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="フルネーム"
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="電話番号"
    )

    # 組織情報
    class DepartmentChoices(models.TextChoices):
        SALES = "SALES", "営業部"
        ENGINEERING = "ENGINEERING", "技術部"
        MANUFACTURING = "MANUFACTURING", "製造部"
        MANAGEMENT = "MANAGEMENT", "管理部"
        NONE = "", "未所属"


    department = models.CharField(
        max_length=20,
        choices=DepartmentChoices.choices,
        default=DepartmentChoices.NONE,
        blank=True,
        verbose_name="部署"
    )

    # 権限関連
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効"
    )
    is_staff = models.BooleanField(
        default=False,
        verbose_name="スタッフ権限"
    )
    is_admin = models.BooleanField(
        default=False,
        verbose_name="管理者権限",
        help_text="ユーザー登録画面へのアクセス権限"
    )
    ip_restriction_enabled = models.BooleanField(
        default=False,
        verbose_name="IP制限を有効にする",
        help_text="このユーザーに対してIPアドレス制限を適用する"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")
    last_login_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="最終ログイン日時"
    )
    last_login_ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="最終ログインIPアドレス"
    )

    objects = UserManager()

    USERNAME_FIELD = "userid"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        verbose_name = "ユーザー"
        verbose_name_plural = "ユーザー一覧"
        ordering = ["userid"]
        db_table = "users"

    def __str__(self):
        return self.userid
    
    def save(self, *args, **kwargs):
        """保存時の処理"""
        # フルネーム自動生成
        if self.first_name and self.last_name and not self.full_name:
            self.full_name = f"{self.last_name} {self.first_name}"

        if self.last_login:
            self.last_login_at = self.last_login

        super().save(*args, **kwargs)

    @property
    def is_administrator(self):
        """管理者権限の確認"""
        return self.is_admin or self.is_superuser or self.is_staff


class LoginLog(models.Model):
    """ログイン履歴モデル"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='login_logs',
        verbose_name="ユーザー"
    )
    ip_address = models.GenericIPAddressField(verbose_name="IPアドレス")
    user_agent = models.TextField(blank=True, null=True, verbose_name="ユーザーエージェント")
    login_at = models.DateTimeField(auto_now_add=True, verbose_name="ログイン日時")
    success = models.BooleanField(default=True, verbose_name="ログイン成功")
    failure_reason = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="失敗理由"
    )

    class Meta:
        verbose_name = "ログイン履歴"
        verbose_name_plural = "ログイン履歴一覧"
        ordering = ["-login_at"]
        db_table = "login_logs"

    def __str__(self):
        status = "成功" if self.success else "失敗"
        return f"{self.user.userid} - {self.ip_address} ({status}) - {self.login_at}"


class UserAllowedIP(models.Model):
    """ユーザーごとの許可IPアドレスモデル"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='allowed_ips',
        verbose_name="ユーザー"
    )
    ip_address = models.GenericIPAddressField(verbose_name="IPアドレス")
    description = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="説明"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効"
    )
    is_first_login_ip = models.BooleanField(
        default=False,
        verbose_name="初回ログインIP",
        help_text="初回ログイン時のIPアドレス"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "ユーザー許可IPアドレス"
        verbose_name_plural = "ユーザー許可IPアドレス一覧"
        ordering = ["-created_at"]
        db_table = "user_allowed_ips"
        unique_together = ['user', 'ip_address']

    def __str__(self):
        return f"{self.user.userid} - {self.ip_address} - {self.description or '説明なし'}"


class AllowedIP(models.Model):
    """グローバル許可IPアドレスモデル（全ユーザー共通）"""
    ip_address = models.GenericIPAddressField(
        unique=True,
        verbose_name="IPアドレス"
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="説明"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "グローバル許可IPアドレス"
        verbose_name_plural = "グローバル許可IPアドレス一覧"
        ordering = ["-created_at"]
        db_table = "allowed_ips"

    def __str__(self):
        return f"{self.ip_address} - {self.description or '説明なし'}"


class IPRestrictionSettings(models.Model):
    """IPアドレス制限設定モデル（シングルトン）"""
    enabled = models.BooleanField(
        default=False,
        verbose_name="IP制限を有効にする"
    )
    exclude_superusers = models.BooleanField(
        default=True,
        verbose_name="管理者権限ユーザーを除外",
        help_text="管理者権限を持つユーザーはIP制限の対象外にする"
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "IP制限設定"
        verbose_name_plural = "IP制限設定"
        db_table = "ip_restriction_settings"

    def __str__(self):
        status = "有効" if self.enabled else "無効"
        return f"IP制限設定 ({status})"

    def save(self, *args, **kwargs):
        """シングルトンパターンの実装"""
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """設定を取得（存在しない場合は作成）"""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


