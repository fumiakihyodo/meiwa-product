# api/products/views.py

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q
from django.http import HttpResponse
from django.db import transaction
import csv
import io
import logging

from api.products.models import Product
from api.products.serializers import (
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer
)
from api.customers.models import CustomerBranch

logger = logging.getLogger(__name__)


class IsAdminUser(permissions.BasePermission):
    """管理者権限の確認"""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_administrator
        )


class ProductListCreateView(generics.ListCreateAPIView):
    """製品一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """クエリセットを取得（部品数・製造品数も含む）"""
        queryset = Product.objects.annotate(
            parts_count=Count('parts', filter=Q(parts__is_active=True)),
            manufacturing_items_count=Count('manufacturing_items', filter=Q(manufacturing_items__is_active=True))
        ).select_related('created_by', 'customer_branch__customer')

        # ステータスフィルタリング
        # デフォルトでは ACTIVE と DEVELOPMENT のみ表示
        status_filter = self.request.query_params.get('status', None)
        include_discontinued = self.request.query_params.get('include_discontinued', 'false').lower() == 'true'

        if status_filter:
            # 明示的にステータスが指定された場合はそれを使用
            queryset = queryset.filter(status=status_filter)
        elif not include_discontinued:
            # 廃盤を含めない場合（デフォルト）
            queryset = queryset.filter(status__in=['ACTIVE', 'DEVELOPMENT'])
        # include_discontinued=true の場合は何もフィルタしない（全て表示）

        # CustomerBranchフィルタリング
        customer_branch_id = self.request.query_params.get('customer_branch', None)
        if customer_branch_id:
            queryset = queryset.filter(customer_branch_id=customer_branch_id)

        # Customerフィルタリング（顧客単位での検索）
        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer_branch__customer_id=customer_id)

        # Branch typeフィルタリング
        branch_type = self.request.query_params.get('branch_type', None)
        if branch_type:
            queryset = queryset.filter(customer_branch__branch_type=branch_type)

        # 検索
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(product_number__icontains=search) |
                Q(product_name__icontains=search) |
                Q(description__icontains=search) |
                Q(customer_branch__customer__company_name__icontains=search) |
                Q(customer_branch__branch_name__icontains=search)
            )

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProductCreateUpdateSerializer
        return ProductListSerializer

    def perform_create(self, serializer):
        """製品作成時に作成者を設定"""
        serializer.save(created_by=self.request.user)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """製品詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return Product.objects.annotate(
            parts_count=Count('parts', filter=Q(parts__is_active=True)),
            manufacturing_items_count=Count('manufacturing_items', filter=Q(manufacturing_items__is_active=True))
        ).select_related(
            'created_by', 'customer_branch__customer'
        ).prefetch_related(
            'parts__supplier_branch__supplier',
            'manufacturing_items'
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """製品の削除（管理者のみ）"""
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


# ==================== CSV Bulk Import/Export Views ====================

class ProductBulkImportView(APIView):
    """製品一括登録ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """CSVファイルから一括登録"""
        if 'file' not in request.FILES:
            return Response(
                {"error": "CSVファイルがアップロードされていません"},
                status=status.HTTP_400_BAD_REQUEST
            )

        csv_file = request.FILES['file']

        if not csv_file.name.endswith('.csv'):
            return Response(
                {"error": "CSVファイルのみアップロード可能です"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            decoded_file = csv_file.read().decode('utf-8-sig')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)

            errors = []
            success_count = 0
            created_items = []

            with transaction.atomic():
                for row_num, row in enumerate(reader, start=2):
                    try:
                        # 必須フィールドのチェック
                        if not row.get('product_number'):
                            errors.append({
                                'row': row_num,
                                'error': '製品品番は必須です'
                            })
                            continue

                        if not row.get('product_name'):
                            errors.append({
                                'row': row_num,
                                'error': '製品名は必須です'
                            })
                            continue

                        # 顧客拠点の検索（オプショナル）
                        customer_branch = None
                        branch_code = row.get('customer_branch_code', '').strip()
                        if branch_code:
                            try:
                                customer_branch = CustomerBranch.objects.get(
                                    branch_code=branch_code
                                )
                            except CustomerBranch.DoesNotExist:
                                errors.append({
                                    'row': row_num,
                                    'error': f"拠点コード '{branch_code}' が見つかりません"
                                })
                                continue

                        # データの準備
                        product_data = {
                            'product_number': row.get('product_number', '').strip(),
                            'product_name': row.get('product_name', '').strip(),
                            'description': row.get('description', '').strip() or '',
                            'status': row.get('status', 'ACTIVE').strip(),
                            'customer_branch': customer_branch.id if customer_branch else None,
                        }

                        # シリアライザーでバリデーション
                        serializer = ProductCreateUpdateSerializer(data=product_data)
                        if serializer.is_valid():
                            product = serializer.save(created_by=request.user)
                            created_items.append({
                                'row': row_num,
                                'product_number': product.product_number,
                                'product_name': product.product_name
                            })
                            success_count += 1
                        else:
                            errors.append({
                                'row': row_num,
                                'error': serializer.errors
                            })

                    except Exception as e:
                        errors.append({
                            'row': row_num,
                            'error': str(e)
                        })

                # エラーがある場合はロールバック
                if errors:
                    transaction.set_rollback(True)
                    return Response({
                        'success': False,
                        'message': f'{len(errors)}件のエラーがあります',
                        'errors': errors,
                        'success_count': 0
                    }, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'success': True,
                'message': f'{success_count}件の製品を登録しました',
                'success_count': success_count,
                'created_items': created_items,
                'errors': []
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"CSV一括登録エラー: {str(e)}")
            return Response(
                {"error": f"CSVファイルの処理中にエラーが発生しました: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProductCSVTemplateView(APIView):
    """製品CSVテンプレートダウンロードビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """CSVテンプレートをダウンロード"""
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="product_template.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'product_number', 'product_name', 'description', 'status', 'customer_branch_code'
        ])
        writer.writerow([
            'PROD001', 'サンプル製品', '製品の詳細説明', 'ACTIVE', 'HQ'
        ])

        return response