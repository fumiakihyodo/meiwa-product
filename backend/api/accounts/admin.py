from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """カスタムユーザー管理画面"""
    
    # リスト表示の設定
    list_display = [
        'userid', 'email', 'full_name', 'department', 
        'is_active', 'is_admin', 'is_staff', 'created_at'
    ]
    list_filter = [
        'is_active', 'is_admin', 'is_staff', 'is_superuser',
        'department', 'created_at', 'updated_at'
    ]
    search_fields = ['userid', 'email', 'first_name', 'last_name', 'full_name']
    ordering = ['-created_at']
    
    # 編集画面のフィールド設定
    fieldsets = (
        (None, {
            'fields': ('userid', 'email', 'password')
        }),
        (_('個人情報'), {
            'fields': (
                'first_name', 'last_name', 'full_name', 'phone_number',
            )
        }),
        (_('組織情報'), {
            'fields': (
                'department',
            )
        }),
        (_('権限'), {
            'fields': (
                'is_active', 'is_staff', 'is_admin', 'is_superuser',
                'groups', 'user_permissions'
            )
        }),
        (_('重要な日付'), {
            'fields': (
                'last_login', 'last_login_at', 'created_at', 'updated_at'
            )
        }),
    )
    
    # 新規作成画面のフィールド設定
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'userid', 'email', 'password1', 'password2',
                'first_name', 'last_name', 'department',
                'is_admin', 'is_staff', 'is_active'
            ),
        }),
    )
    
    # 読み取り専用フィールド
    readonly_fields = ['created_at', 'updated_at', 'last_login', 'last_login_at']
    
    # インライン編集を有効にする
    list_editable = ['is_active', 'is_admin', 'is_staff', 'department']
    
    # 1ページあたりの表示件数
    list_per_page = 25
    
    # アクションの追加
    actions = ['activate_users', 'deactivate_users', 'make_admin', 'remove_admin']
    
    def activate_users(self, request, queryset):
        """選択したユーザーを有効化"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated}件のユーザーを有効化しました。')
    activate_users.short_description = '選択したユーザーを有効化'
    
    def deactivate_users(self, request, queryset):
        """選択したユーザーを無効化"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated}件のユーザーを無効化しました。')
    deactivate_users.short_description = '選択したユーザーを無効化'
    
    def make_admin(self, request, queryset):
        """選択したユーザーに管理者権限を付与"""
        updated = queryset.update(is_admin=True)
        self.message_user(request, f'{updated}件のユーザーに管理者権限を付与しました。')
    make_admin.short_description = '管理者権限を付与'
    
    def remove_admin(self, request, queryset):
        """選択したユーザーから管理者権限を削除"""
        updated = queryset.update(is_admin=False)
        self.message_user(request, f'{updated}件のユーザーから管理者権限を削除しました。')
    remove_admin.short_description = '管理者権限を削除'