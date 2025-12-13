# api/supplier/views.py

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.db.models import Count, Q

from api.supplier.models import Supplier, SupplierBranch, SupplierContact
from api.supplier.serializers import (
    SupplierListSerializer,
    SupplierDetailSerializer,
    SupplierCreateUpdateSerializer,
    SupplierBranchListSerializer,
    SupplierBranchDetailSerializer,
    SupplierBranchCreateUpdateSerializer,
    SupplierContactListSerializer,
    SupplierContactDetailSerializer,
    SupplierContactCreateUpdateSerializer,
)


class IsAdminUser(permissions.BasePermission):
    """管理者権限の確認"""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_administrator
        )


# ==================== Supplier Views ====================

class SupplierListCreateView(generics.ListCreateAPIView):
    """サプライヤー一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = Supplier.objects.annotate(
            active_branches_count=Count('branches', filter=Q(branches__is_active=True))
        )
        
        # フィルタリング
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(supplier_code__icontains=search) |
                Q(company_name__icontains=search)
            )
        
        return queryset.order_by('company_name')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SupplierCreateUpdateSerializer
        return SupplierListSerializer


class SupplierDetailView(generics.RetrieveUpdateDestroyAPIView):
    """サプライヤー詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return Supplier.objects.annotate(
            active_branches_count=Count('branches', filter=Q(branches__is_active=True))
        ).prefetch_related('branches__contacts')

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SupplierCreateUpdateSerializer
        return SupplierDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """サプライヤーの削除（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance = self.get_object()
        
        # 紐づく拠点が存在するかチェック
        if instance.branches.exists():
            return Response(
                {"error": "拠点が紐づいているため削除できません"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== SupplierBranch Views ====================

class SupplierBranchListCreateView(generics.ListCreateAPIView):
    """サプライヤー拠点一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = SupplierBranch.objects.select_related('supplier').prefetch_related('contacts')
        
        # フィルタリング
        supplier_id = self.request.query_params.get('supplier', None)
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)
        
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
                Q(supplier__company_name__icontains=search)
            )
        
        return queryset.order_by('supplier', 'branch_type', 'branch_name')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SupplierBranchCreateUpdateSerializer
        return SupplierBranchListSerializer


class SupplierBranchDetailView(generics.RetrieveUpdateDestroyAPIView):
    """サプライヤー拠点詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return SupplierBranch.objects.select_related(
            'supplier'
        ).prefetch_related(
            'contacts',
            'parts__product'
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SupplierBranchCreateUpdateSerializer
        return SupplierBranchDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """拠点の削除（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance = self.get_object()
        
        # 紐づく部品が存在するかチェック
        if instance.parts.filter(is_active=True).exists():
            return Response(
                {"error": "有効な部品が紐づいているため削除できません"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== SupplierContact Views ====================

class SupplierContactListCreateView(generics.ListCreateAPIView):
    """サプライヤー担当者一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = SupplierContact.objects.select_related(
            'branch__supplier'
        )
        
        # フィルタリング
        branch_id = self.request.query_params.get('branch', None)
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        supplier_id = self.request.query_params.get('supplier', None)
        if supplier_id:
            queryset = queryset.filter(branch__supplier_id=supplier_id)
        
        responsibility = self.request.query_params.get('responsibility', None)
        if responsibility:
            queryset = queryset.filter(responsibility=responsibility)
        
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        is_primary = self.request.query_params.get('is_primary', None)
        if is_primary is not None:
            queryset = queryset.filter(is_primary=is_primary.lower() == 'true')
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(name_kana__icontains=search) |
                Q(email__icontains=search) |
                Q(department__icontains=search)
            )
        
        return queryset.order_by('branch', '-is_primary', 'name')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SupplierContactCreateUpdateSerializer
        return SupplierContactListSerializer


class SupplierContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    """サプライヤー担当者詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return SupplierContact.objects.select_related(
            'branch__supplier'
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SupplierContactCreateUpdateSerializer
        return SupplierContactDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """担当者の削除（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        self.perform_destroy(self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)
