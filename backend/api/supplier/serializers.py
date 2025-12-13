# api/supplier/serializers.py

from rest_framework import serializers
from api.supplier.models import Supplier, SupplierBranch, SupplierContact


class SupplierContactListSerializer(serializers.ModelSerializer):
    """サプライヤー担当者一覧用のシリアライザー"""
    branch_name = serializers.CharField(source='branch.branch_name', read_only=True)
    supplier_name = serializers.CharField(source='branch.supplier.company_name', read_only=True)
    
    class Meta:
        model = SupplierContact
        fields = [
            'id', 'branch', 'branch_name', 'supplier_name',
            'name', 'name_kana', 'department', 'position',
            'email', 'phone_number', 'mobile_number', 'extension_number',
            'responsibility', 'is_primary', 'is_active'
        ]


class SupplierContactDetailSerializer(serializers.ModelSerializer):
    """サプライヤー担当者詳細用のシリアライザー"""
    branch_name = serializers.CharField(source='branch.branch_name', read_only=True)
    supplier_name = serializers.CharField(source='branch.supplier.company_name', read_only=True)
    display_name_with_company = serializers.CharField(read_only=True)

    class Meta:
        model = SupplierContact
        fields = [
            'id', 'branch', 'branch_name', 'supplier_name',
            'name', 'name_kana', 'department', 'position',
            'email', 'phone_number', 'mobile_number', 'extension_number',
            'responsibility', 'responsibility_detail',
            'is_primary', 'is_active', 'notes',
            'display_name_with_company', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SupplierContactCreateUpdateSerializer(serializers.ModelSerializer):
    """サプライヤー担当者作成・更新用のシリアライザー"""

    class Meta:
        model = SupplierContact
        fields = [
            'branch', 'name', 'name_kana', 'department', 'position',
            'email', 'phone_number', 'mobile_number', 'extension_number',
            'responsibility', 'responsibility_detail',
            'is_primary', 'is_active', 'notes'
        ]

    def validate(self, attrs):
        """バリデーション"""
        # メールアドレスか電話番号のいずれかは必須
        email = attrs.get('email')
        phone = attrs.get('phone_number')
        mobile = attrs.get('mobile_number')
        
        if not email and not phone and not mobile:
            raise serializers.ValidationError(
                "メールアドレスまたは電話番号のいずれかは必須です"
            )
        
        return attrs


class SupplierBranchListSerializer(serializers.ModelSerializer):
    """サプライヤー拠点一覧用のシリアライザー"""
    supplier_name = serializers.CharField(source='supplier.company_name', read_only=True)
    display_name = serializers.CharField(read_only=True)
    primary_contact = serializers.SerializerMethodField()

    class Meta:
        model = SupplierBranch
        fields = [
            'id', 'branch_code', 'branch_name', 'branch_type',
            'supplier', 'supplier_name', 'display_name',
            'phone_number', 'email', 'address',
            'is_active', 'primary_contact'
        ]

    def get_primary_contact(self, obj):
        """主担当者情報を取得"""
        primary = obj.primary_contact
        if primary:
            return {
                'id': primary.id,
                'name': primary.name,
                'email': primary.email,
                'phone_number': primary.phone_number
            }
        return None


class SupplierBranchDetailSerializer(serializers.ModelSerializer):
    """サプライヤー拠点詳細用のシリアライザー（担当者・部品情報を含む）"""
    supplier_name = serializers.CharField(source='supplier.company_name', read_only=True)
    display_name = serializers.CharField(read_only=True)
    full_address = serializers.CharField(read_only=True)
    
    # 紐づく担当者一覧
    contacts = SupplierContactListSerializer(many=True, read_only=True)
    
    # 紐づく部品情報
    parts = serializers.SerializerMethodField()

    class Meta:
        model = SupplierBranch
        fields = [
            'id', 'supplier', 'supplier_name', 'branch_code',
            'branch_name', 'branch_type', 'display_name',
            'postal_code', 'address', 'full_address',
            'phone_number', 'fax_number', 'email',
            'notes', 'is_active', 'contacts', 'parts',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_parts(self, obj):
        """関連する部品情報を取得"""
        from api.purchases.serializers import PartListSerializer
        parts = obj.parts.filter(is_active=True)
        return PartListSerializer(parts, many=True).data


class SupplierBranchCreateUpdateSerializer(serializers.ModelSerializer):
    """サプライヤー拠点作成・更新用のシリアライザー"""

    class Meta:
        model = SupplierBranch
        fields = [
            'supplier', 'branch_code', 'branch_name', 'branch_type',
            'postal_code', 'address', 'phone_number', 'fax_number',
            'email', 'notes', 'is_active'
        ]
        extra_kwargs = {
            'supplier': {'required': True},
            'branch_code': {'required': True},
            'branch_name': {'required': True},
        }

    def validate_branch_code(self, value):
        """拠点コードの重複チェック"""
        instance = self.instance
        if instance:
            if SupplierBranch.objects.filter(branch_code=value).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError("この拠点コードは既に使用されています")
        else:
            if SupplierBranch.objects.filter(branch_code=value).exists():
                raise serializers.ValidationError("この拠点コードは既に使用されています")
        return value


class SupplierListSerializer(serializers.ModelSerializer):
    """サプライヤー一覧用のシリアライザー"""
    active_branches_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Supplier
        fields = [
            'id', 'supplier_code', 'company_name', 'website',
            'is_active', 'active_branches_count',
            'created_at', 'updated_at'
        ]


class SupplierDetailSerializer(serializers.ModelSerializer):
    """サプライヤー詳細用のシリアライザー（拠点情報を含む）"""
    active_branches_count = serializers.IntegerField(read_only=True)
    
    # 紐づく拠点一覧
    branches = SupplierBranchListSerializer(many=True, read_only=True)

    class Meta:
        model = Supplier
        fields = [
            'id', 'supplier_code', 'company_name', 'website',
            'notes', 'is_active', 'active_branches_count',
            'branches', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SupplierCreateUpdateSerializer(serializers.ModelSerializer):
    """サプライヤー作成・更新用のシリアライザー"""

    class Meta:
        model = Supplier
        fields = [
            'supplier_code', 'company_name', 'website',
            'notes', 'is_active'
        ]
        extra_kwargs = {
            'supplier_code': {'required': True},
            'company_name': {'required': True},
        }

    def validate_supplier_code(self, value):
        """サプライヤーコードの重複チェック"""
        instance = self.instance
        if instance:
            if Supplier.objects.filter(supplier_code=value).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError("このサプライヤーコードは既に使用されています")
        else:
            if Supplier.objects.filter(supplier_code=value).exists():
                raise serializers.ValidationError("このサプライヤーコードは既に使用されています")
        return value

    def validate_company_name(self, value):
        """企業名の重複チェック"""
        instance = self.instance
        if instance:
            if Supplier.objects.filter(company_name=value).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError("この企業名は既に登録されています")
        else:
            if Supplier.objects.filter(company_name=value).exists():
                raise serializers.ValidationError("この企業名は既に登録されています")
        return value