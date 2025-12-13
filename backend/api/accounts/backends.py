# api/accounts/backends.py

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class UseridBackend(ModelBackend):
    """useridフィールドを使用した認証バックエンド"""

    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        useridでユーザー認証を行う
        DjangoのデフォルトはusernameパラメータのためSuseridをusernameとして受け取る
        """
        try:
            # usernameパラメータをuseridとして使用
            user = User.objects.get(userid=username)
        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
