import django
from rest_framework import generics, status, views, permissions, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import User, LoginLog, AllowedIP, UserAllowedIP, IPRestrictionSettings
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, LoginSerializer
)


def get_client_ip(request):
    """クライアントのIPアドレスを取得"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def check_ip_restriction(request, user):
    """IPアドレス制限のチェック"""
    # 管理者権限ユーザーは常に許可
    if user.is_administrator:
        return True

    # ユーザーのIP制限が有効かチェック
    if not user.ip_restriction_enabled:
        return True

    # クライアントIPを取得
    client_ip = get_client_ip(request)

    # グローバル許可IPリストをチェック
    if AllowedIP.objects.filter(ip_address=client_ip, is_active=True).exists():
        return True

    # ユーザー固有の許可IPリストをチェック
    user_allowed = UserAllowedIP.objects.filter(
        user=user,
        ip_address=client_ip,
        is_active=True
    ).exists()

    return user_allowed


class LoginView(views.APIView):
    """統一ログインビュー"""
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        # クライアントIPとUser Agentを取得
        client_ip = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        serializer = self.serializer_class(
            data=request.data,
            context={'request': request}
        )

        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']

            # IPアドレス制限のチェック
            if not check_ip_restriction(request, user):
                # ログイン失敗を記録
                LoginLog.objects.create(
                    user=user,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    success=False,
                    failure_reason="IPアドレス制限"
                )
                return Response(
                    {"detail": "このIPアドレスからのアクセスは許可されていません"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # 最終ログイン時刻とIPアドレスを更新
            user.last_login = timezone.now()
            user.last_login_at = user.last_login
            user.last_login_ip = client_ip
            user.save(update_fields=['last_login', 'last_login_at', 'last_login_ip'])

            # ログイン成功を記録
            LoginLog.objects.create(
                user=user,
                ip_address=client_ip,
                user_agent=user_agent,
                success=True
            )

            # IPアドレスを自動的に記録（ユーザーの許可IPリストに追加）
            is_first_login = not LoginLog.objects.filter(user=user, success=True).exclude(
                ip_address=client_ip
            ).exists() and not UserAllowedIP.objects.filter(user=user).exists()

            # 既存のIPアドレスでない場合は追加
            if not UserAllowedIP.objects.filter(user=user, ip_address=client_ip).exists():
                UserAllowedIP.objects.create(
                    user=user,
                    ip_address=client_ip,
                    description="自動記録（ログイン時）",
                    is_first_login_ip=is_first_login,
                    is_active=True
                )

            # JWTトークンを生成
            refresh = RefreshToken.for_user(user)

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data,
            }, status=status.HTTP_200_OK)

        except ValidationError as e:
            # ログイン失敗を記録（ユーザーが特定できる場合）
            userid = request.data.get('userid')
            if userid:
                try:
                    user = User.objects.get(userid=userid)
                    LoginLog.objects.create(
                        user=user,
                        ip_address=client_ip,
                        user_agent=user_agent,
                        success=False,
                        failure_reason="認証失敗"
                    )
                except User.DoesNotExist:
                    pass
            raise e


class LogoutView(views.APIView):
    """ログアウトビュー"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            return Response(
                {"message": "ログアウトしました"}, 
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": "ログアウトに失敗しました"}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class IsAdminUser(permissions.BasePermission):
    """管理権限の確認"""

    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.is_administrator
        )


class UserListCreateView(generics.ListCreateAPIView):
    """ユーザー一覧取得・作成ビュー"""
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        serializer.save()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """ユーザー詳細取得・更新・削除ビュー"""
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        """自分のプロフィール又は管理者の場合は他のユーザー"""
        pk = self.kwargs.get('pk')

        if pk == 'me':
            return self.request.user

        # 管理者の場合は他のユーザーにアクセス可能
        if self.request.user.is_administrator:
            return super().get_object()
        
        # 管理者以外は他のユーザーの情報にアクセスできない
        if str(self.request.user.pk) != str(pk):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("他のユーザーの情報にアクセスする権限がありません")
        
        return self.request.user

    def destroy(self, request, *args, **kwargs):
        """ユーザーの削除"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"}, 
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()
        if instance == request.user:
            return Response(
                {"error": "自分自身は削除できません"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(views.APIView):
    """現在のユーザー情報取得ビュー"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChangePasswordView(generics.UpdateAPIView):
    """パスワード変更ビュー"""
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = self.get_object()
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response(
            {"message": "パスワードを変更しました"}, 
            status=status.HTTP_200_OK
        )


class CheckAuthView(views.APIView):
    """認証状態確認ビュー"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "is_authenticated": True,
            'is_admin': request.user.is_administrator,
            "user": UserSerializer(request.user).data
        }, status=status.HTTP_200_OK)


# IP制限管理用のビュー
class UserAllowedIPViewSet(viewsets.ViewSet):
    """ユーザーの許可IPアドレス管理ViewSet"""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """現在のユーザーまたは指定ユーザーの許可IPリストを取得"""
        user_id = request.query_params.get('user_id')

        # 管理者の場合は他のユーザーのIPリストも取得可能
        if user_id and request.user.is_administrator:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response(
                    {'detail': 'ユーザーが見つかりません'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            user = request.user

        allowed_ips = UserAllowedIP.objects.filter(user=user)
        data = [{
            'id': ip.id,
            'ip_address': ip.ip_address,
            'description': ip.description,
            'is_active': ip.is_active,
            'is_first_login_ip': ip.is_first_login_ip,
            'created_at': ip.created_at,
        } for ip in allowed_ips]

        return Response(data)

    def create(self, request):
        """新しい許可IPアドレスを追加"""
        user_id = request.data.get('user_id')

        # 管理者の場合は他のユーザーのIPリストも編集可能
        if user_id and request.user.is_administrator:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response(
                    {'detail': 'ユーザーが見つかりません'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            user = request.user

        ip_address = request.data.get('ip_address')
        description = request.data.get('description', '')

        if not ip_address:
            return Response(
                {'detail': 'IPアドレスは必須です'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 既存チェック
        if UserAllowedIP.objects.filter(user=user, ip_address=ip_address).exists():
            return Response(
                {'detail': 'このIPアドレスは既に登録されています'},
                status=status.HTTP_400_BAD_REQUEST
            )

        allowed_ip = UserAllowedIP.objects.create(
            user=user,
            ip_address=ip_address,
            description=description,
            is_active=True
        )

        return Response({
            'id': allowed_ip.id,
            'ip_address': allowed_ip.ip_address,
            'description': allowed_ip.description,
            'is_active': allowed_ip.is_active,
            'is_first_login_ip': allowed_ip.is_first_login_ip,
            'created_at': allowed_ip.created_at,
        }, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        """許可IPアドレスを更新"""
        try:
            allowed_ip = UserAllowedIP.objects.get(pk=pk)

            # 権限チェック
            if allowed_ip.user != request.user and not request.user.is_administrator:
                return Response(
                    {'detail': '権限がありません'},
                    status=status.HTTP_403_FORBIDDEN
                )

            allowed_ip.description = request.data.get('description', allowed_ip.description)
            allowed_ip.is_active = request.data.get('is_active', allowed_ip.is_active)
            allowed_ip.save()

            return Response({
                'id': allowed_ip.id,
                'ip_address': allowed_ip.ip_address,
                'description': allowed_ip.description,
                'is_active': allowed_ip.is_active,
                'is_first_login_ip': allowed_ip.is_first_login_ip,
                'created_at': allowed_ip.created_at,
            })
        except UserAllowedIP.DoesNotExist:
            return Response(
                {'detail': '許可IPアドレスが見つかりません'},
                status=status.HTTP_404_NOT_FOUND
            )

    def destroy(self, request, pk=None):
        """許可IPアドレスを削除"""
        try:
            allowed_ip = UserAllowedIP.objects.get(pk=pk)

            # 権限チェック
            if allowed_ip.user != request.user and not request.user.is_administrator:
                return Response(
                    {'detail': '権限がありません'},
                    status=status.HTTP_403_FORBIDDEN
                )

            allowed_ip.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except UserAllowedIP.objects.DoesNotExist:
            return Response(
                {'detail': '許可IPアドレスが見つかりません'},
                status=status.HTTP_404_NOT_FOUND
            )


class UserIPRestrictionView(views.APIView):
    """ユーザーのIP制限設定ビュー"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """IP制限設定を取得"""
        user_id = request.query_params.get('user_id')

        # 管理者の場合は他のユーザーの設定も取得可能
        if user_id and request.user.is_administrator:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response(
                    {'detail': 'ユーザーが見つかりません'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            user = request.user

        return Response({
            'user_id': user.id,
            'ip_restriction_enabled': user.ip_restriction_enabled,
        })

    def post(self, request):
        """IP制限設定を更新（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {'detail': '管理者権限が必要です'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')
        ip_restriction_enabled = request.data.get('ip_restriction_enabled')

        if user_id is None or ip_restriction_enabled is None:
            return Response(
                {'detail': 'user_idとip_restriction_enabledは必須です'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
            user.ip_restriction_enabled = ip_restriction_enabled
            user.save(update_fields=['ip_restriction_enabled'])

            return Response({
                'user_id': user.id,
                'ip_restriction_enabled': user.ip_restriction_enabled,
            })
        except User.DoesNotExist:
            return Response(
                {'detail': 'ユーザーが見つかりません'},
                status=status.HTTP_404_NOT_FOUND
            )















