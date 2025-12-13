# api/purchases/views.py

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.http import FileResponse, Http404
from django.db.models import Count, Q, Prefetch
import logging
import os

from api.purchases.models import Part, PriceHistory
from api.purchases.serializers import (
    PartListSerializer,
    PartDetailSerializer,
    PartCreateUpdateSerializer,
    PriceHistoryListSerializer,
    PriceHistoryDetailSerializer,
    PriceHistoryCreateUpdateSerializer,
)

logger = logging.getLogger(__name__)


class IsAdminUser(permissions.BasePermission):
    """管理者権限の確認"""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_administrator
        )


# ==================== Part Views ====================

class PartListCreateView(generics.ListCreateAPIView):
    """部品一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = Part.objects.select_related(
            'product',
            'supplier_branch__supplier',
            'created_by'
        ).annotate(
            price_history_count=Count('price_histories')
        )

        # フィルタリング
        product_id = self.request.query_params.get('product', None)
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        supplier_id = self.request.query_params.get('supplier', None)
        if supplier_id:
            queryset = queryset.filter(
                supplier_branch__supplier_id=supplier_id)

        branch_id = self.request.query_params.get('branch', None)
        if branch_id:
            queryset = queryset.filter(supplier_branch_id=branch_id)

        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(part_number__icontains=search) |
                Q(part_name__icontains=search) |
                Q(product__product_number__icontains=search) |
                Q(product__product_name__icontains=search) |
                Q(supplier_branch__supplier__company_name__icontains=search)
            )

        return queryset.order_by('part_number')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PartCreateUpdateSerializer
        return PartListSerializer

    def create(self, request, *args, **kwargs):
        """部品作成（デバッグログ付き）"""
        logger.info(f"[Part Create] User: {request.user}")
        logger.info(f"[Part Create] Data: {request.data}")

        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            self.perform_create(serializer)

            headers = self.get_success_headers(serializer.data)
            logger.info(
                f"[Part Create] Success: Part ID {serializer.data.get('id')}")

            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            logger.error(f"[Part Create] Error: {str(e)}")
            logger.error(f"[Part Create] Error type: {type(e).__name__}")
            if hasattr(e, 'detail'):
                logger.error(f"[Part Create] Error detail: {e.detail}")
            raise

    def perform_create(self, serializer):
        """部品作成時に作成者を設定"""
        serializer.save()


class PartDetailView(generics.RetrieveUpdateDestroyAPIView):
    """部品詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        # 価格履歴を最適化して取得
        price_histories_prefetch = Prefetch(
            'price_histories',
            queryset=PriceHistory.objects.select_related(
                'created_by').order_by('-start_date', '-created_at')
        )

        return Part.objects.select_related(
            'product',
            'product__customer_branch',
            'product__customer_branch__customer',
            'supplier_branch__supplier',
            'created_by'
        ).prefetch_related(
            price_histories_prefetch
        ).annotate(
            price_history_count=Count('price_histories')
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return PartCreateUpdateSerializer
        return PartDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """部品の削除（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"},
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()

        # 価格履歴が存在するかチェック
        if instance.price_histories.exists():
            return Response(
                {"error": "価格履歴が存在するため削除できません。無効化を検討してください。"},
                status=status.HTTP_400_BAD_REQUEST
            )

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== PriceHistory Views ====================

class PriceHistoryListCreateView(generics.ListCreateAPIView):
    """価格履歴一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = PriceHistory.objects.select_related(
            'part__product',
            'part__supplier_branch__supplier',
            'created_by'
        )

        part_id = self.request.query_params.get('part', None)
        if part_id:
            queryset = queryset.filter(part_id=part_id)

        product_id = self.request.query_params.get('product', None)
        if product_id:
            queryset = queryset.filter(part__product_id=product_id)

        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        status_filter = self.request.query_params.get('status', None)
        if status_filter == 'current':
            from django.utils import timezone
            today = timezone.now().date()
            queryset = queryset.filter(
                is_active=True,
                start_date__lte=today
            ).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=today)
            )
        elif status_filter == 'future':
            from django.utils import timezone
            today = timezone.now().date()
            queryset = queryset.filter(start_date__gt=today)
        elif status_filter == 'expired':
            from django.utils import timezone
            today = timezone.now().date()
            queryset = queryset.filter(
                end_date__isnull=False,
                end_date__lt=today
            )

        return queryset.order_by('-start_date', '-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PriceHistoryCreateUpdateSerializer
        return PriceHistoryListSerializer

    def create(self, request, *args, **kwargs):
        """価格履歴作成（デバッグログ付き）"""
        logger.info(f"[PriceHistory Create] User: {request.user}")
        logger.info(
            f"[PriceHistory Create] User authenticated: {request.user.is_authenticated}")
        logger.info(
            f"[PriceHistory Create] Content-Type: {request.content_type}")
        logger.info(
            f"[PriceHistory Create] Request data keys: {request.data.keys()}")
        logger.info(
            f"[PriceHistory Create] Request data: {dict(request.data)}")
        logger.info(f"[PriceHistory Create] Files: {request.FILES}")
        logger.info(
            f"[PriceHistory Create] Files keys: {request.FILES.keys() if request.FILES else 'No files'}")

        # ファイルの詳細ログ
        if 'quote_file' in request.FILES:
            file = request.FILES['quote_file']
            logger.info(f"[PriceHistory Create] File name: {file.name}")
            logger.info(f"[PriceHistory Create] File size: {file.size}")
            logger.info(
                f"[PriceHistory Create] File content_type: {file.content_type}")

        try:
            serializer = self.get_serializer(
                data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)

            logger.info(
                f"[PriceHistory Create] Validated data: {serializer.validated_data}")
            logger.info(
                f"[PriceHistory Create] Quote file in validated_data: {'quote_file' in serializer.validated_data}")

            self.perform_create(serializer)

            # 保存後のファイル情報をログ
            instance = serializer.instance
            logger.info(
                f"[PriceHistory Create] Saved instance ID: {instance.id}")
            logger.info(
                f"[PriceHistory Create] Saved quote_file: {instance.quote_file}")
            logger.info(
                f"[PriceHistory Create] Saved quote_file path: {instance.quote_file.path if instance.quote_file else 'No file'}")

            headers = self.get_success_headers(serializer.data)
            logger.info(
                f"[PriceHistory Create] Success: PriceHistory ID {serializer.data.get('id')}")
            logger.info(
                f"[PriceHistory Create] Response data: {serializer.data}")

            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            logger.error(f"[PriceHistory Create] Error: {str(e)}")
            logger.error(
                f"[PriceHistory Create] Error type: {type(e).__name__}")
            if hasattr(e, 'detail'):
                logger.error(f"[PriceHistory Create] Error detail: {e.detail}")
            import traceback
            logger.error(
                f"[PriceHistory Create] Traceback: {traceback.format_exc()}")
            raise

    def perform_create(self, serializer):
        """価格履歴作成時に作成者を設定"""
        serializer.save()


class PriceHistoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """価格履歴詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return PriceHistory.objects.select_related(
            'part__product',
            'part__supplier_branch__supplier',
            'created_by'
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return PriceHistoryCreateUpdateSerializer
        return PriceHistoryDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """価格履歴の削除（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"},
                status=status.HTTP_403_FORBIDDEN
            )

        self.perform_destroy(self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== Quote File Download ====================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_quote_file(request, pk):
    """見積書ファイルのダウンロード"""
    try:
        logger.info(f"[Quote File Download] Request from user: {request.user}")
        logger.info(f"[Quote File Download] Price history ID: {pk}")

        # 価格履歴を取得
        try:
            price_history = PriceHistory.objects.get(pk=pk)
            logger.info(
                f"[Quote File Download] Found price history: {price_history.id}")
        except PriceHistory.DoesNotExist:
            logger.error(
                f"[Quote File Download] Price history not found: {pk}")
            raise Http404("価格履歴が見つかりません")

        # ファイルが存在するかチェック
        if not price_history.quote_file:
            logger.error(
                f"[Quote File Download] No file attached to price history: {pk}")
            raise Http404("見積書ファイルが存在しません")

        logger.info(
            f"[Quote File Download] File field: {price_history.quote_file}")
        logger.info(
            f"[Quote File Download] File name: {price_history.quote_file.name}")
        logger.info(
            f"[Quote File Download] File path: {price_history.quote_file.path}")

        # ファイルが実際に存在するか確認
        if not os.path.isfile(price_history.quote_file.path):
            logger.error(
                f"[Quote File Download] File not found on disk: {price_history.quote_file.path}")
            raise Http404("見積書ファイルが見つかりません")

        logger.info(
            f"[Quote File Download] File exists, size: {os.path.getsize(price_history.quote_file.path)} bytes")

        # ファイル名を取得
        file_name = price_history.quote_file_name or os.path.basename(
            price_history.quote_file.name)
        logger.info(f"[Quote File Download] Returning file: {file_name}")

        # ファイルレスポンスを返す
        response = FileResponse(
            price_history.quote_file.open('rb'),
            as_attachment=True,
            filename=file_name
        )

        # Content-Dispositionヘッダーを明示的に設定
        response['Content-Disposition'] = f'attachment; filename="{file_name}"'

        logger.info(f"[Quote File Download] Success")
        return response

    except Http404:
        raise
    except Exception as e:
        logger.error(f"[Quote File Download] Unexpected error: {str(e)}")
        logger.error(f"[Quote File Download] Error type: {type(e).__name__}")
        import traceback
        logger.error(
            f"[Quote File Download] Traceback: {traceback.format_exc()}")
        raise Http404("ファイルのダウンロードに失敗しました")
