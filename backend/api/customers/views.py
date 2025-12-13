# api/customers/views.py

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.db.models import Count, Q

from api.customers.models import Customer, CustomerBranch, CustomerContact
from api.customers.serializers import (
    CustomerListSerializer,
    CustomerDetailSerializer,
    CustomerCreateUpdateSerializer,
    CustomerBranchListSerializer,
    CustomerBranchDetailSerializer,
    CustomerBranchCreateUpdateSerializer,
    CustomerContactListSerializer,
    CustomerContactDetailSerializer,
    CustomerContactCreateUpdateSerializer,
)
import logging

logger = logging.getLogger(__name__)


class IsAdminUser(permissions.BasePermission):
    """管理者権限の確認"""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_administrator
        )


# ==================== Customer Views ====================

class CustomerListCreateView(generics.ListCreateAPIView):
    """カスタマー一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = Customer.objects.annotate(
            active_branches_count=Count('branches', filter=Q(branches__is_active=True))
        )

        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(customer_code__icontains=search) |
                Q(company_name__icontains=search)
            )

        return queryset.order_by('company_name')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CustomerCreateUpdateSerializer
        return CustomerListSerializer


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """カスタマー詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return Customer.objects.annotate(
            active_branches_count=Count('branches', filter=Q(branches__is_active=True))
        ).prefetch_related('branches')

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CustomerCreateUpdateSerializer
        return CustomerDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """カスタマーの削除（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"},
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()

        if instance.branches.exists():
            return Response(
                {"error": "拠点が存在するため削除できません"},
                status=status.HTTP_400_BAD_REQUEST
            )

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== CustomerBranch Views ====================

class CustomerBranchListCreateView(generics.ListCreateAPIView):
    """カスタマー拠点一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = CustomerBranch.objects.select_related('customer').annotate(
            contacts_count=Count('contacts')
        )

        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        branch_type = self.request.query_params.get('branch_type', None)
        if branch_type:
            queryset = queryset.filter(branch_type=branch_type)

        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(branch_code__icontains=search) |
                Q(branch_name__icontains=search) |
                Q(customer__company_name__icontains=search)
            )

        return queryset.order_by('customer', 'branch_type', 'branch_name')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CustomerBranchCreateUpdateSerializer
        return CustomerBranchListSerializer


class CustomerBranchDetailView(generics.RetrieveUpdateDestroyAPIView):
    """カスタマー拠点詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return CustomerBranch.objects.select_related('customer').prefetch_related(
            'contacts'
        ).annotate(
            contacts_count=Count('contacts')
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CustomerBranchCreateUpdateSerializer
        return CustomerBranchDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """カスタマー拠点の削除（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"},
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()

        if instance.contacts.exists():
            return Response(
                {"error": "担当者が存在するため削除できません"},
                status=status.HTTP_400_BAD_REQUEST
            )

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== CustomerContact Views ====================

class CustomerContactListCreateView(generics.ListCreateAPIView):
    """カスタマー担当者一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = CustomerContact.objects.select_related(
            'branch__customer'
        )

        branch_id = self.request.query_params.get('branch', None)
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)

        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(branch__customer_id=customer_id)

        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(name_kana__icontains=search) |
                Q(email__icontains=search) |
                Q(branch__customer__company_name__icontains=search)
            )

        return queryset.order_by('branch', 'name')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CustomerContactCreateUpdateSerializer
        return CustomerContactListSerializer


class CustomerContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    """カスタマー担当者詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return CustomerContact.objects.select_related(
            'branch__customer'
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CustomerContactCreateUpdateSerializer
        return CustomerContactDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """カスタマー担当者の削除（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"},
                status=status.HTTP_403_FORBIDDEN
            )

        self.perform_destroy(self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)