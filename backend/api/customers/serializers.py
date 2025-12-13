# api/customers/serializers.py

from rest_framework import serializers
from api.customers.models import Customer, CustomerBranch, CustomerContact


class CustomerListSerializer(serializers.ModelSerializer):
    """カスタマー一覧用のシリアライザー"""
    active_branches_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'customer_code', 'company_name', 'website',
            'is_active', 'active_branches_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CustomerContactListSerializer(serializers.ModelSerializer):
    """カスタマー担当者一覧用のシリアライザー"""
    branch_name = serializers.CharField(source='branch.branch_name', read_only=True)
    customer_name = serializers.CharField(source='branch.customer.company_name', read_only=True)

    class Meta:
        model = CustomerContact
        fields = [
            'id', 'branch', 'branch_name', 'customer_name', 'name', 'name_kana',
            'department', 'position', 'email', 'phone_number', 'mobile_number',
            'extension_number', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CustomerContactDetailSerializer(serializers.ModelSerializer):
    """カスタマー担当者詳細用のシリアライザー"""
    branch_name = serializers.CharField(source='branch.branch_name', read_only=True)
    customer_name = serializers.CharField(source='branch.customer.company_name', read_only=True)
    display_name_with_company = serializers.CharField(read_only=True)

    class Meta:
        model = CustomerContact
        fields = [
            'id', 'branch', 'branch_name', 'customer_name', 'name', 'name_kana',
            'department', 'position', 'email', 'phone_number', 'mobile_number',
            'extension_number', 'display_name_with_company', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CustomerContactCreateUpdateSerializer(serializers.ModelSerializer):
    """カスタマー担当者作成・更新用のシリアライザー"""

    class Meta:
        model = CustomerContact
        fields = [
            'branch', 'name', 'name_kana', 'department', 'position',
            'email', 'phone_number', 'mobile_number', 'extension_number'
        ]
        extra_kwargs = {
            'branch': {'required': True},
            'name': {'required': True},
        }

    def validate(self, attrs):
        """バリデーション"""
        email = attrs.get('email')
        phone_number = attrs.get('phone_number')
        mobile_number = attrs.get('mobile_number')

        if not email and not phone_number and not mobile_number:
            raise serializers.ValidationError(
                'メールアドレスまたは電話番号のいずれかは必須です'
            )

        return attrs


class CustomerBranchListSerializer(serializers.ModelSerializer):
    """カスタマー拠点一覧用のシリアライザー"""
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)
    display_name = serializers.CharField(read_only=True)
    contacts_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CustomerBranch
        fields = [
            'id', 'customer', 'customer_name', 'branch_code', 'branch_name',
            'branch_type', 'display_name', 'postal_code', 'address',
            'phone_number', 'email', 'is_active', 'contacts_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CustomerBranchDetailSerializer(serializers.ModelSerializer):
    """カスタマー拠点詳細用のシリアライザー"""
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)
    display_name = serializers.CharField(read_only=True)
    full_address = serializers.CharField(read_only=True)
    contacts = CustomerContactListSerializer(many=True, read_only=True)
    contacts_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CustomerBranch
        fields = [
            'id', 'customer', 'customer_name', 'branch_code', 'branch_name',
            'branch_type', 'display_name', 'postal_code', 'address', 'full_address',
            'phone_number', 'fax_number', 'email', 'notes', 'is_active',
            'contacts', 'contacts_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CustomerBranchCreateUpdateSerializer(serializers.ModelSerializer):
    """カスタマー拠点作成・更新用のシリアライザー"""

    class Meta:
        model = CustomerBranch
        fields = [
            'customer', 'branch_code', 'branch_name', 'branch_type',
            'postal_code', 'address', 'phone_number', 'fax_number',
            'email', 'notes', 'is_active'
        ]
        extra_kwargs = {
            'customer': {'required': True},
            'branch_code': {'required': True},
            'branch_name': {'required': True},
        }

    def validate(self, attrs):
        """重複チェック"""
        customer = attrs.get('customer')
        branch_name = attrs.get('branch_name')

        instance = self.instance
        if instance:
            existing = CustomerBranch.objects.filter(
                customer=customer,
                branch_name=branch_name
            ).exclude(pk=instance.pk)
        else:
            existing = CustomerBranch.objects.filter(
                customer=customer,
                branch_name=branch_name
            )

        if existing.exists():
            raise serializers.ValidationError(
                'このカスタマーで同じ拠点名が既に登録されています'
            )

        return attrs


class CustomerDetailSerializer(serializers.ModelSerializer):
    """カスタマー詳細用のシリアライザー"""
    active_branches_count = serializers.IntegerField(read_only=True)
    branches = CustomerBranchListSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'customer_code', 'company_name', 'website', 'notes',
            'is_active', 'active_branches_count', 'branches',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CustomerCreateUpdateSerializer(serializers.ModelSerializer):
    """カスタマー作成・更新用のシリアライザー"""

    class Meta:
        model = Customer
        fields = [
            'customer_code', 'company_name', 'website', 'notes', 'is_active'
        ]
        extra_kwargs = {
            'customer_code': {'required': True},
            'company_name': {'required': True},
        }

    def validate_customer_code(self, value):
        """カスタマーコードの重複チェック"""
        instance = self.instance
        if instance:
            if Customer.objects.filter(customer_code=value).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError('このカスタマーコードは既に使用されています')
        else:
            if Customer.objects.filter(customer_code=value).exists():
                raise serializers.ValidationError('このカスタマーコードは既に使用されています')
        return value

    def validate_company_name(self, value):
        """企業名の重複チェック"""
        instance = self.instance
        if instance:
            if Customer.objects.filter(company_name=value).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError('この企業名は既に使用されています')
        else:
            if Customer.objects.filter(company_name=value).exists():
                raise serializers.ValidationError('この企業名は既に使用されています')
        return value