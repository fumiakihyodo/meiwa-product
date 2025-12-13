from turtle import Turtle
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

    # タイムスタンプ
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")
    last_login_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="最終ログイン日時"
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
    


