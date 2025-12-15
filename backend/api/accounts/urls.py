from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    LogoutView,
    UserListCreateView,
    UserDetailView,
    CurrentUserView,
    ChangePasswordView,
    CheckAuthView,
    UserAllowedIPViewSet,
    UserIPRestrictionView,
)

app_name = 'accounts'

urlpatterns = [
    # 認証関連
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/check/', CheckAuthView.as_view(), name='check_auth'),

    # ユーザー関連
    path('users/', UserListCreateView.as_view(), name='user_list_create'),
    path('users/me/', CurrentUserView.as_view(), name='current_user'),
    path('users/me/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('users/<str:pk>/', UserDetailView.as_view(), name='user_detail'),

    # IP制限関連
    path('ip-restriction/', UserIPRestrictionView.as_view(), name='ip_restriction'),
    path('allowed-ips/', UserAllowedIPViewSet.as_view({'get': 'list', 'post': 'create'}), name='allowed_ips'),
    path('allowed-ips/<int:pk>/', UserAllowedIPViewSet.as_view({'put': 'update', 'delete': 'destroy'}), name='allowed_ip_detail'),
]