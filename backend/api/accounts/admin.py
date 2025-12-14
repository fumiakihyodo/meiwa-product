from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, LoginLog, AllowedIP, IPRestrictionSettings


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """カスタムユーザー管理画面"""
    
    # リスト表示の設定
    list_display = [
        'userid', 'email', 'full_name', 'department',
        'is_active', 'is_admin', 'is_staff', 'last_login_ip', 'created_at'
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
                'last_login', 'last_login_at', 'last_login_ip', 'created_at', 'updated_at'
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
    readonly_fields = ['created_at', 'updated_at', 'last_login', 'last_login_at', 'last_login_ip']
    
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


@admin.register(LoginLog)
class LoginLogAdmin(admin.ModelAdmin):
    """ログイン履歴管理画面"""

    list_display = [
        'user', 'ip_address', 'success', 'failure_reason',
        'login_at', 'user_agent_short'
    ]
    list_filter = ['success', 'login_at', 'user']
    search_fields = ['user__userid', 'ip_address', 'user_agent']
    ordering = ['-login_at']
    readonly_fields = [
        'user', 'ip_address', 'user_agent', 'login_at',
        'success', 'failure_reason'
    ]

    list_per_page = 50

    def user_agent_short(self, obj):
        """ユーザーエージェントを短縮表示"""
        if obj.user_agent:
            return obj.user_agent[:50] + '...' if len(obj.user_agent) > 50 else obj.user_agent
        return '-'
    user_agent_short.short_description = 'ユーザーエージェント'

    def has_add_permission(self, request):
        """新規作成を無効化"""
        return False

    def has_change_permission(self, request, obj=None):
        """編集を無効化"""
        return False


@admin.register(AllowedIP)
class AllowedIPAdmin(admin.ModelAdmin):
    """許可IPアドレス管理画面"""

    list_display = ['ip_address', 'description', 'is_active', 'created_at', 'updated_at']
    list_filter = ['is_active', 'created_at', 'updated_at']
    search_fields = ['ip_address', 'description']
    ordering = ['-created_at']

    fieldsets = (
        (None, {
            'fields': ('ip_address', 'description', 'is_active')
        }),
        (_('タイムスタンプ'), {
            'fields': ('created_at', 'updated_at')
        }),
    )

    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['is_active']
    list_per_page = 50

    actions = ['activate_ips', 'deactivate_ips']

    def activate_ips(self, request, queryset):
        """選択したIPアドレスを有効化"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated}件のIPアドレスを有効化しました。')
    activate_ips.short_description = '選択したIPアドレスを有効化'

    def deactivate_ips(self, request, queryset):
        """選択したIPアドレスを無効化"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated}件のIPアドレスを無効化しました。')
    deactivate_ips.short_description = '選択したIPアドレスを無効化'


@admin.register(IPRestrictionSettings)
class IPRestrictionSettingsAdmin(admin.ModelAdmin):
    """IP制限設定管理画面（シングルトン）"""

    list_display = ['enabled', 'exclude_superusers', 'updated_at']

    fieldsets = (
        (None, {
            'fields': ('enabled', 'exclude_superusers')
        }),
        (_('タイムスタンプ'), {
            'fields': ('updated_at',)
        }),
    )

    readonly_fields = ['updated_at']

    def has_add_permission(self, request):
        """新規作成を無効化（シングルトン）"""
        return not IPRestrictionSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        """削除を無効化"""
        return False