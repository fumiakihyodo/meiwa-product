from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """ユーザー情報のシリアライザー"""

    class Meta:
        model = User
        fields = [
            'id', 'userid', 'email', 'first_name', 'last_name', 
            'full_name', 'phone_number', 'department', 'is_active', 
            'is_staff', 'is_admin', 'is_administrator', 'created_at',
            'updated_at', 'last_login_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 
            'last_login_at', 'is_administrator'
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    """ユーザー作成用のシリアライザー"""
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password], 
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True, 
        required=True, 
        style={'input_type': 'password'}, 
        label='確認用パスワード'
    )

    class Meta:
        model = User
        fields = [
            'userid', 'email', 'password', 'password2', 
            'first_name', 'last_name', 'full_name', 
            'phone_number', 'department', 'is_admin', 'is_staff'
        ]
        extra_kwargs = {
            'userid': {'required': True},
            'email': {'required': True},
        }

    def validate(self, attrs):
        """パスワードの一致を確認"""
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "パスワードが一致しません"}
            )
        return attrs
    
    def create(self, validated_data):
        """ユーザーの作成"""
        validated_data.pop('password2')
        password = validated_data.pop('password')

        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """ユーザー更新用のシリアライザー"""

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'full_name', 
            'phone_number', 'department', 'is_active', 
            'is_admin', 'is_staff'
        ]

    def validate(self, attrs):
        """自分自身のis_activeをFalseにすることを防ぐ"""
        request = self.context.get('request')
        if request and self.instance:
            # 自分自身のアカウントを更新しようとしている場合
            if self.instance.id == request.user.id:
                # is_activeをFalseに変更しようとしている場合
                if 'is_active' in attrs and not attrs['is_active']:
                    raise serializers.ValidationError(
                        {"is_active": "自分自身のアカウントを無効化することはできません"}
                    )
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """パスワード変更用のシリアライザー"""
    old_password = serializers.CharField(
        required=True, 
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password2 = serializers.CharField(
        required=True, 
        style={'input_type': 'password'}, 
        label='確認用パスワード'
    )

    def validate(self, attrs):
        """新しいパスワードの一致を確認"""
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError(
                {"new_password": "新しいパスワードが一致しません"}
            )
        return attrs
    
    def validate_old_password(self, value):
        """古いパスワードが正しいか確認"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError(
                "古いパスワードが正しくありません"
            )
        return value


class LoginSerializer(serializers.Serializer):
    """ログイン用のシリアライザー"""

    userid = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True, 
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        """承認の検証"""
        userid = attrs.get('userid')
        password = attrs.get('password')

        if userid and password:
            # カスタムのバックエンドを使用
            user = authenticate(
                request=self.context.get('request'),
                username=userid,  # DjangoのデフォルトはusernameをキーとするSS
                password=password
            )
            
            if not user:
                raise serializers.ValidationError(
                    {"detail": "無効なユーザーIDまたはパスワードです"}
                )
            
            if not user.is_active:
                raise serializers.ValidationError(
                    {"detail": "このアカウントは無効になっています"}
                )
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError(
                {"detail": "ユーザーIDとパスワードを入力してください"}
            )