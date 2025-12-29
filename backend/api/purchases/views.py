# api/purchases/views.py

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse, Http404, HttpResponse
from django.db.models import Count, Q, Prefetch, Sum, F, Case, When, IntegerField
from django.db import transaction
from decimal import Decimal, InvalidOperation
from datetime import datetime
import logging
import os
import csv
import io

from api.purchases.models import (
    Part, PriceHistory, SuppliedItem, SuppliedItemPriceHistory,
    SuppliedItemList, SuppliedItemListItem, SuppliedItemReceiving,
    SuppliedItemReceivingItem, SuppliedItemInventory
)
from api.purchases.serializers import (
    PartListSerializer,
    PartDetailSerializer,
    PartCreateUpdateSerializer,
    PriceHistoryListSerializer,
    PriceHistoryDetailSerializer,
    PriceHistoryCreateUpdateSerializer,
    SuppliedItemListSerializer,
    SuppliedItemDetailSerializer,
    SuppliedItemCreateUpdateSerializer,
    SuppliedItemPriceHistoryListSerializer,
    SuppliedItemPriceHistoryDetailSerializer,
    SuppliedItemPriceHistoryCreateUpdateSerializer,
    # 在庫管理用
    SuppliedItemListListSerializer,
    SuppliedItemListDetailSerializer,
    SuppliedItemListCreateSerializer,
    SuppliedItemListUpdateSerializer,
    SuppliedItemListItemSerializer,
    SuppliedItemListItemCreateSerializer,
    SuppliedItemListItemCountConfirmSerializer,
    SuppliedItemListItemReceivingConfirmSerializer,
    SuppliedItemReceivingListSerializer,
    SuppliedItemReceivingDetailSerializer,
    SuppliedItemReceivingCreateSerializer,
    SuppliedItemReceivingUpdateSerializer,
    SuppliedItemInventoryListSerializer,
    SuppliedItemInventoryDetailSerializer,
    SuppliedItemInventoryCreateSerializer,
    SuppliedItemInventoryUpdateSerializer,
)
from api.products.models import Product
from api.supplier.models import SupplierBranch

logger = logging.getLogger(__name__)


def decode_csv_file(csv_file):
    """
    CSVファイルを複数のエンコーディングで試してデコード

    UTF-8とShift-JIS（およびその変種）をサポート

    Args:
        csv_file: アップロードされたCSVファイル

    Returns:
        デコードされた文字列

    Raises:
        UnicodeDecodeError: すべてのエンコーディングで失敗した場合
    """
    file_content = csv_file.read()

    # 試すエンコーディングのリスト（優先順）
    encodings = ['utf-8-sig', 'utf-8', 'shift_jis', 'cp932', 'euc-jp']

    for encoding in encodings:
        try:
            decoded = file_content.decode(encoding)
            logger.info(f"CSV file successfully decoded with encoding: {encoding}")
            return decoded
        except UnicodeDecodeError:
            continue

    # すべてのエンコーディングで失敗した場合
    raise UnicodeDecodeError(
        'unknown', file_content, 0, len(file_content),
        f"CSVファイルを読み込めませんでした。サポートされているエンコーディング: {', '.join(encodings)}"
    )


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


# ==================== CSV Bulk Import/Export Views ====================

class PartBulkImportView(APIView):
    """部品一括登録ビュー"""
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
            decoded_file = decode_csv_file(csv_file)
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

                        if not row.get('supplier_branch_code'):
                            errors.append({
                                'row': row_num,
                                'error': '仕入先支店コードは必須です'
                            })
                            continue

                        if not row.get('part_number'):
                            errors.append({
                                'row': row_num,
                                'error': '部品品番は必須です'
                            })
                            continue

                        if not row.get('part_name'):
                            errors.append({
                                'row': row_num,
                                'error': '部品名は必須です'
                            })
                            continue

                        # 製品の検索
                        try:
                            product = Product.objects.get(
                                product_number=row.get('product_number', '').strip()
                            )
                        except Product.DoesNotExist:
                            errors.append({
                                'row': row_num,
                                'error': f"製品品番 '{row.get('product_number')}' が見つかりません"
                            })
                            continue

                        # サプライヤー支店の検索
                        try:
                            supplier_branch = SupplierBranch.objects.get(
                                branch_code=row.get('supplier_branch_code', '').strip()
                            )
                        except SupplierBranch.DoesNotExist:
                            errors.append({
                                'row': row_num,
                                'error': f"仕入先支店コード '{row.get('supplier_branch_code')}' が見つかりません"
                            })
                            continue

                        # 最小発注数量のパース
                        try:
                            min_order_qty = int(row.get('minimum_order_quantity', 1))
                        except (ValueError, TypeError):
                            min_order_qty = 1

                        # リードタイムのパース
                        lead_time_str = row.get('lead_time_days', '').strip()
                        lead_time = None
                        if lead_time_str:
                            try:
                                lead_time = int(lead_time_str)
                            except (ValueError, TypeError):
                                pass

                        # データの準備
                        part_data = {
                            'product': product.id,
                            'supplier_branch': supplier_branch.id,
                            'part_number': row.get('part_number', '').strip(),
                            'part_name': row.get('part_name', '').strip(),
                            'supplier_part_name': row.get('supplier_part_name', '').strip() or None,
                            'specification': row.get('specification', '').strip() or '',
                            'unit': row.get('unit', '個').strip(),
                            'order_type': row.get('order_type', 'MOQ').strip(),
                            'minimum_order_quantity': min_order_qty,
                            'lead_time_days': lead_time,
                            'is_active': row.get('is_active', 'true').lower() in ['true', '1', 'yes', 'はい'],
                            'notes': row.get('notes', '').strip() or '',
                        }

                        # シリアライザーでバリデーション
                        serializer = PartCreateUpdateSerializer(data=part_data)
                        if serializer.is_valid():
                            part = serializer.save(created_by=request.user)
                            created_items.append({
                                'row': row_num,
                                'part_number': part.part_number,
                                'part_name': part.part_name
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
                'message': f'{success_count}件の部品を登録しました',
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


class PartCSVTemplateView(APIView):
    """部品CSVテンプレートダウンロードビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """CSVテンプレートをダウンロード"""
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="part_template.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'product_number', 'supplier_branch_code', 'part_number', 'part_name',
            'supplier_part_name', 'specification', 'unit', 'order_type',
            'minimum_order_quantity', 'lead_time_days', 'is_active', 'notes'
        ])
        writer.writerow([
            'PROD001', 'HQ', 'PART001', 'サンプル部品', 'Sample Part',
            '仕様説明', '個', 'MOQ', '100', '30', 'true', '備考欄'
        ])

        return response


class PriceHistoryBulkImportView(APIView):
    """価格履歴一括登録ビュー"""
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
            decoded_file = decode_csv_file(csv_file)
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)

            errors = []
            success_count = 0
            created_items = []

            with transaction.atomic():
                for row_num, row in enumerate(reader, start=2):
                    try:
                        # 必須フィールドのチェック
                        if not row.get('part_number'):
                            errors.append({
                                'row': row_num,
                                'error': '部品品番は必須です'
                            })
                            continue

                        if not row.get('price'):
                            errors.append({
                                'row': row_num,
                                'error': '単価は必須です'
                            })
                            continue

                        if not row.get('start_date'):
                            errors.append({
                                'row': row_num,
                                'error': '開始日は必須です'
                            })
                            continue

                        # 部品の検索
                        try:
                            part = Part.objects.get(
                                part_number=row.get('part_number', '').strip()
                            )
                        except Part.DoesNotExist:
                            errors.append({
                                'row': row_num,
                                'error': f"部品品番 '{row.get('part_number')}' が見つかりません"
                            })
                            continue

                        # 価格のパース
                        try:
                            price = Decimal(row.get('price', '0').strip())
                        except (InvalidOperation, ValueError):
                            errors.append({
                                'row': row_num,
                                'error': '単価の形式が不正です'
                            })
                            continue

                        # 日付のパース
                        try:
                            start_date = datetime.strptime(row.get('start_date', '').strip(), '%Y-%m-%d').date()
                        except ValueError:
                            errors.append({
                                'row': row_num,
                                'error': '開始日の形式が不正です（YYYY-MM-DD形式で入力してください）'
                            })
                            continue

                        end_date = None
                        end_date_str = row.get('end_date', '').strip()
                        if end_date_str:
                            try:
                                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                            except ValueError:
                                errors.append({
                                    'row': row_num,
                                    'error': '終了日の形式が不正です（YYYY-MM-DD形式で入力してください）'
                                })
                                continue

                        # データの準備
                        price_history_data = {
                            'part': part.id,
                            'price': price,
                            'start_date': start_date,
                            'end_date': end_date,
                            'is_active': row.get('is_active', 'true').lower() in ['true', '1', 'yes', 'はい'],
                            'change_reason': row.get('change_reason', '').strip() or '',
                            'notes': row.get('notes', '').strip() or '',
                        }

                        # シリアライザーでバリデーション
                        serializer = PriceHistoryCreateUpdateSerializer(data=price_history_data)
                        if serializer.is_valid():
                            price_history = serializer.save(created_by=request.user)
                            created_items.append({
                                'row': row_num,
                                'part_number': part.part_number,
                                'price': str(price_history.price),
                                'start_date': str(price_history.start_date)
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
                'message': f'{success_count}件の価格履歴を登録しました',
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


class PriceHistoryCSVTemplateView(APIView):
    """価格履歴CSVテンプレートダウンロードビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """CSVテンプレートをダウンロード"""
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="price_history_template.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'part_number', 'price', 'start_date', 'end_date',
            'is_active', 'change_reason', 'notes'
        ])
        writer.writerow([
            'PART001', '1500.00', '2024-01-01', '2024-12-31',
            'true', '価格改定', '備考欄'
        ])

        return response


# ==================== SuppliedItem Views ====================

class SuppliedItemListCreateView(generics.ListCreateAPIView):
    """支給品一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = SuppliedItem.objects.select_related(
            'product',
            'created_by'
        ).annotate(
            price_history_count=Count('supplied_item_price_histories')
        )

        # フィルタリング
        product_id = self.request.query_params.get('product', None)
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(item_number__icontains=search) |
                Q(item_name__icontains=search) |
                Q(product__product_number__icontains=search) |
                Q(product__product_name__icontains=search)
            )

        return queryset.order_by('item_number')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SuppliedItemCreateUpdateSerializer
        return SuppliedItemListSerializer

    def create(self, request, *args, **kwargs):
        """支給品作成（デバッグログ付き）"""
        logger.info(f"[SuppliedItem Create] User: {request.user}")
        logger.info(f"[SuppliedItem Create] Data: {request.data}")

        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            self.perform_create(serializer)

            headers = self.get_success_headers(serializer.data)
            logger.info(
                f"[SuppliedItem Create] Success: SuppliedItem ID {serializer.data.get('id')}")

            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            logger.error(f"[SuppliedItem Create] Error: {str(e)}")
            logger.error(f"[SuppliedItem Create] Error type: {type(e).__name__}")
            if hasattr(e, 'detail'):
                logger.error(f"[SuppliedItem Create] Error detail: {e.detail}")
            raise

    def perform_create(self, serializer):
        """支給品作成時に作成者を設定"""
        serializer.save()


class SuppliedItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """支給品詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        # 価格履歴を最適化して取得
        price_histories_prefetch = Prefetch(
            'supplied_item_price_histories',
            queryset=SuppliedItemPriceHistory.objects.select_related(
                'created_by').order_by('-start_date', '-created_at')
        )

        return SuppliedItem.objects.select_related(
            'product',
            'product__customer_branch',
            'product__customer_branch__customer',
            'created_by'
        ).prefetch_related(
            price_histories_prefetch
        ).annotate(
            price_history_count=Count('supplied_item_price_histories')
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SuppliedItemCreateUpdateSerializer
        return SuppliedItemDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """支給品の削除（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"},
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()

        # 価格履歴が存在するかチェック
        if instance.supplied_item_price_histories.exists():
            return Response(
                {"error": "価格履歴が存在するため削除できません。無効化を検討してください。"},
                status=status.HTTP_400_BAD_REQUEST
            )

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== SuppliedItemPriceHistory Views ====================

class SuppliedItemPriceHistoryListCreateView(generics.ListCreateAPIView):
    """支給品価格履歴一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = SuppliedItemPriceHistory.objects.select_related(
            'supplied_item__product',
            'created_by'
        )

        supplied_item_id = self.request.query_params.get('supplied_item', None)
        if supplied_item_id:
            queryset = queryset.filter(supplied_item_id=supplied_item_id)

        product_id = self.request.query_params.get('product', None)
        if product_id:
            queryset = queryset.filter(supplied_item__product_id=product_id)

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
            return SuppliedItemPriceHistoryCreateUpdateSerializer
        return SuppliedItemPriceHistoryListSerializer

    def create(self, request, *args, **kwargs):
        """支給品価格履歴作成（デバッグログ付き）"""
        logger.info(f"[SuppliedItemPriceHistory Create] User: {request.user}")
        logger.info(
            f"[SuppliedItemPriceHistory Create] User authenticated: {request.user.is_authenticated}")
        logger.info(
            f"[SuppliedItemPriceHistory Create] Content-Type: {request.content_type}")
        logger.info(
            f"[SuppliedItemPriceHistory Create] Request data keys: {request.data.keys()}")
        logger.info(
            f"[SuppliedItemPriceHistory Create] Request data: {dict(request.data)}")
        logger.info(f"[SuppliedItemPriceHistory Create] Files: {request.FILES}")

        # ファイルの詳細ログ
        if 'quote_file' in request.FILES:
            file = request.FILES['quote_file']
            logger.info(f"[SuppliedItemPriceHistory Create] File name: {file.name}")
            logger.info(f"[SuppliedItemPriceHistory Create] File size: {file.size}")
            logger.info(
                f"[SuppliedItemPriceHistory Create] File content_type: {file.content_type}")

        try:
            serializer = self.get_serializer(
                data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)

            logger.info(
                f"[SuppliedItemPriceHistory Create] Validated data: {serializer.validated_data}")

            self.perform_create(serializer)

            # 保存後のファイル情報をログ
            instance = serializer.instance
            logger.info(
                f"[SuppliedItemPriceHistory Create] Saved instance ID: {instance.id}")
            logger.info(
                f"[SuppliedItemPriceHistory Create] Saved quote_file: {instance.quote_file}")

            headers = self.get_success_headers(serializer.data)
            logger.info(
                f"[SuppliedItemPriceHistory Create] Success: SuppliedItemPriceHistory ID {serializer.data.get('id')}")

            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            logger.error(f"[SuppliedItemPriceHistory Create] Error: {str(e)}")
            logger.error(
                f"[SuppliedItemPriceHistory Create] Error type: {type(e).__name__}")
            if hasattr(e, 'detail'):
                logger.error(f"[SuppliedItemPriceHistory Create] Error detail: {e.detail}")
            import traceback
            logger.error(
                f"[SuppliedItemPriceHistory Create] Traceback: {traceback.format_exc()}")
            raise

    def perform_create(self, serializer):
        """支給品価格履歴作成時に作成者を設定"""
        serializer.save()


class SuppliedItemPriceHistoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """支給品価格履歴詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return SuppliedItemPriceHistory.objects.select_related(
            'supplied_item__product',
            'created_by'
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SuppliedItemPriceHistoryCreateUpdateSerializer
        return SuppliedItemPriceHistoryDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """支給品価格履歴の削除（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"},
                status=status.HTTP_403_FORBIDDEN
            )

        self.perform_destroy(self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== SuppliedItem Quote File Download ====================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_supplied_item_quote_file(request, pk):
    """支給品見積書ファイルのダウンロード"""
    try:
        logger.info(f"[SuppliedItem Quote File Download] Request from user: {request.user}")
        logger.info(f"[SuppliedItem Quote File Download] Price history ID: {pk}")

        # 価格履歴を取得
        try:
            price_history = SuppliedItemPriceHistory.objects.get(pk=pk)
            logger.info(
                f"[SuppliedItem Quote File Download] Found price history: {price_history.id}")
        except SuppliedItemPriceHistory.DoesNotExist:
            logger.error(
                f"[SuppliedItem Quote File Download] Price history not found: {pk}")
            raise Http404("価格履歴が見つかりません")

        # ファイルが存在するかチェック
        if not price_history.quote_file:
            logger.error(
                f"[SuppliedItem Quote File Download] No file attached to price history: {pk}")
            raise Http404("見積書ファイルが存在しません")

        logger.info(
            f"[SuppliedItem Quote File Download] File field: {price_history.quote_file}")
        logger.info(
            f"[SuppliedItem Quote File Download] File name: {price_history.quote_file.name}")
        logger.info(
            f"[SuppliedItem Quote File Download] File path: {price_history.quote_file.path}")

        # ファイルが実際に存在するか確認
        if not os.path.isfile(price_history.quote_file.path):
            logger.error(
                f"[SuppliedItem Quote File Download] File not found on disk: {price_history.quote_file.path}")
            raise Http404("見積書ファイルが見つかりません")

        logger.info(
            f"[SuppliedItem Quote File Download] File exists, size: {os.path.getsize(price_history.quote_file.path)} bytes")

        # ファイル名を取得
        file_name = price_history.quote_file_name or os.path.basename(
            price_history.quote_file.name)
        logger.info(f"[SuppliedItem Quote File Download] Returning file: {file_name}")

        # ファイルレスポンスを返す
        response = FileResponse(
            price_history.quote_file.open('rb'),
            as_attachment=True,
            filename=file_name
        )

        # Content-Dispositionヘッダーを明示的に設定
        response['Content-Disposition'] = f'attachment; filename="{file_name}"'

        logger.info(f"[SuppliedItem Quote File Download] Success")
        return response

    except Http404:
        raise
    except Exception as e:
        logger.error(f"[SuppliedItem Quote File Download] Unexpected error: {str(e)}")
        logger.error(f"[SuppliedItem Quote File Download] Error type: {type(e).__name__}")
        import traceback
        logger.error(
            f"[SuppliedItem Quote File Download] Traceback: {traceback.format_exc()}")
        raise Http404("ファイルのダウンロードに失敗しました")


# ==================== 在庫管理 Views ====================

class SuppliedItemListListCreateView(generics.ListCreateAPIView):
    """支給品リスト一覧取得・作成ビュー

    最適化: アノテーションでカウントを事前計算し、N+1問題を解消
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = SuppliedItemList.objects.select_related(
            'product',
            'product__customer_branch',
            'product__customer_branch__customer',
            'created_by'
        ).annotate(
            # 項目数と確認済み数をアノテーションで計算（N+1問題の解消）
            total_items_count=Count('items'),
            total_quantity_sum=Sum('items__quantity'),
            received_items_annotated=Count(
                Case(
                    When(items__receiving_confirmed=True, then=1),
                    output_field=IntegerField()
                )
            ),
            count_confirmed_items_annotated=Count(
                Case(
                    When(items__count_confirmed=True, then=1),
                    output_field=IntegerField()
                )
            )
        )

        # フィルタリング
        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(product__customer_branch__customer_id=customer_id)

        product_id = self.request.query_params.get('product', None)
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # 検索
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(list_number__icontains=search) |
                Q(product__product_number__icontains=search) |
                Q(product__product_name__icontains=search) |
                Q(product__customer_branch__customer__name__icontains=search)
            )

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SuppliedItemListCreateSerializer
        return SuppliedItemListListSerializer


class SuppliedItemListDetailView(generics.RetrieveUpdateDestroyAPIView):
    """支給品リスト詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return SuppliedItemList.objects.select_related(
            'product',
            'product__customer_branch',
            'product__customer_branch__customer',
            'created_by'
        ).prefetch_related(
            'items',
            'items__supplied_item',
            'items__receiving_confirmed_by',
            'items__count_confirmed_by'
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SuppliedItemListUpdateSerializer
        return SuppliedItemListDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """支給品リストの削除（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"},
                status=status.HTTP_403_FORBIDDEN
            )

        self.perform_destroy(self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)


class SuppliedItemListItemListCreateView(generics.ListCreateAPIView):
    """支給品リスト項目一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = SuppliedItemListItem.objects.select_related(
            'supplied_item_list',
            'supplied_item',
            'receiving_confirmed_by',
            'count_confirmed_by'
        )

        list_id = self.request.query_params.get('list', None)
        if list_id:
            queryset = queryset.filter(supplied_item_list_id=list_id)

        receiving_confirmed = self.request.query_params.get('receiving_confirmed', None)
        if receiving_confirmed is not None:
            queryset = queryset.filter(receiving_confirmed=receiving_confirmed.lower() == 'true')

        count_confirmed = self.request.query_params.get('count_confirmed', None)
        if count_confirmed is not None:
            queryset = queryset.filter(count_confirmed=count_confirmed.lower() == 'true')

        return queryset.order_by('id')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SuppliedItemListItemCreateSerializer
        return SuppliedItemListItemSerializer


class SuppliedItemListItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """支給品リスト項目詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return SuppliedItemListItem.objects.select_related(
            'supplied_item_list',
            'supplied_item',
            'receiving_confirmed_by',
            'count_confirmed_by'
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SuppliedItemListItemCreateSerializer
        return SuppliedItemListItemSerializer


class SuppliedItemListItemReceivingConfirmView(generics.UpdateAPIView):
    """支給品リスト項目の受入確認ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SuppliedItemListItemReceivingConfirmSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        return SuppliedItemListItem.objects.select_related(
            'supplied_item_list',
            'receiving_confirmed_by'
        )


class SuppliedItemListItemCountConfirmView(generics.UpdateAPIView):
    """支給品リスト項目の員数確認ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SuppliedItemListItemCountConfirmSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        return SuppliedItemListItem.objects.select_related(
            'supplied_item_list',
            'count_confirmed_by'
        )


# ==================== 受入確認 Views ====================

class SuppliedItemReceivingListCreateView(generics.ListCreateAPIView):
    """支給品受入確認一覧取得・作成ビュー

    リスト登録前でも受入れ登録が可能。
    productフィルタでリスト未紐付けの受入れ登録を取得可能。
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = SuppliedItemReceiving.objects.select_related(
            'supplied_item_list__product',
            'supplied_item_list__product__customer_branch',
            'supplied_item_list__product__customer_branch__customer',
            'product',
            'product__customer_branch',
            'product__customer_branch__customer',
            'created_by'
        ).prefetch_related('items', 'items__supplied_item')

        list_id = self.request.query_params.get('list', None)
        if list_id:
            queryset = queryset.filter(supplied_item_list_id=list_id)

        # 製品でフィルタ（リスト経由またはproduct直接）
        product_id = self.request.query_params.get('product', None)
        if product_id:
            queryset = queryset.filter(
                Q(supplied_item_list__product_id=product_id) |
                Q(product_id=product_id)
            )

        # リスト未紐付けのみ取得
        unlinked = self.request.query_params.get('unlinked', None)
        if unlinked and unlinked.lower() == 'true':
            queryset = queryset.filter(supplied_item_list__isnull=True)

        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SuppliedItemReceivingCreateSerializer
        return SuppliedItemReceivingListSerializer


class SuppliedItemReceivingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """支給品受入確認詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return SuppliedItemReceiving.objects.select_related(
            'supplied_item_list__product',
            'supplied_item_list__product__customer_branch',
            'supplied_item_list__product__customer_branch__customer',
            'product',
            'product__customer_branch',
            'product__customer_branch__customer',
            'created_by'
        ).prefetch_related(
            'items',
            'items__list_item',
            'items__supplied_item'
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SuppliedItemReceivingUpdateSerializer
        return SuppliedItemReceivingDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """受入確認の削除時にリスト項目のステータスを再計算する

        削除された受入れ登録の品番について、残りの受入れ数量を再計算し、
        リスト数量を満たさなくなった項目のreceiving_confirmedをリセットする。
        """
        receiving = self.get_object()

        # 削除前に必要な情報を収集
        product_id = receiving.product_id or (
            receiving.supplied_item_list.product_id if receiving.supplied_item_list else None
        )
        affected_item_numbers = set(item.item_number for item in receiving.items.all())
        supplied_list = receiving.supplied_item_list

        with transaction.atomic():
            # 受入れ登録を削除
            self.perform_destroy(receiving)

            # 製品IDがある場合のみ、関連するリスト項目のステータスを再計算
            if product_id and affected_item_numbers:
                # 削除後の品番ごとの受入れ数量を再計算
                remaining_quantities = SuppliedItemReceivingItem.objects.filter(
                    receiving__status='completed'
                ).filter(
                    Q(receiving__supplied_item_list__product_id=product_id) |
                    Q(receiving__product_id=product_id)
                ).filter(
                    item_number__in=affected_item_numbers
                ).values('item_number').annotate(
                    total_received=Sum('calculated_quantity')
                )

                remaining_qty_map = {
                    item['item_number']: item['total_received'] or 0
                    for item in remaining_quantities
                }

                # 影響を受けるすべてのリスト項目を取得して更新
                affected_list_items = SuppliedItemListItem.objects.filter(
                    supplied_item_list__product_id=product_id,
                    item_number__in=affected_item_numbers
                )

                items_to_update = []
                for list_item in affected_list_items:
                    total_received = remaining_qty_map.get(list_item.item_number, 0)

                    # 受入れ数量がリスト数量を満たさなくなった場合はステータスをリセット
                    if total_received < list_item.quantity and list_item.receiving_confirmed:
                        list_item.receiving_confirmed = False
                        list_item.receiving_confirmed_at = None
                        list_item.receiving_confirmed_by = None
                        list_item.received_quantity = total_received if total_received > 0 else None
                        list_item.quantity_per_box = None
                        list_item.box_count = None
                        items_to_update.append(list_item)
                    elif total_received != (list_item.received_quantity or 0):
                        # 数量のみ更新
                        list_item.received_quantity = total_received if total_received > 0 else None
                        items_to_update.append(list_item)

                # 一括更新
                if items_to_update:
                    SuppliedItemListItem.objects.bulk_update(
                        items_to_update,
                        ['receiving_confirmed', 'receiving_confirmed_at', 'receiving_confirmed_by',
                         'received_quantity', 'quantity_per_box', 'box_count']
                    )

                # リストのステータスも必要に応じて更新
                if supplied_list:
                    # 受入確認済みの項目数を再計算
                    received_count = supplied_list.items.filter(receiving_confirmed=True).count()
                    total_items = supplied_list.items.count()

                    if received_count == 0:
                        supplied_list.status = 'pending_receiving'
                    elif received_count < total_items:
                        supplied_list.status = 'receiving'
                    supplied_list.save()

        return Response(status=status.HTTP_204_NO_CONTENT)


def auto_update_receiving_status(product_id, user, list_ids=None):
    """受入れ数量に基づいて自動的にリスト項目のステータスを更新する

    Args:
        product_id: 製品ID
        user: リクエストユーザー
        list_ids: 更新対象のリストID一覧（Noneの場合は製品に関連する全リスト）

    Returns:
        dict: 更新結果の情報
    """
    from django.utils import timezone
    now = timezone.now()

    # 品番ごとの完了済み受入れ数量を集計
    receiving_aggregation = SuppliedItemReceivingItem.objects.filter(
        receiving__status='completed'
    ).filter(
        Q(receiving__supplied_item_list__product_id=product_id) |
        Q(receiving__product_id=product_id)
    ).values('item_number').annotate(
        total_received=Sum('calculated_quantity')
    )

    received_quantities = {
        item['item_number']: item['total_received'] or 0
        for item in receiving_aggregation
    }

    # 対象リストを取得
    if list_ids:
        lists = SuppliedItemList.objects.filter(id__in=list_ids, product_id=product_id)
    else:
        lists = SuppliedItemList.objects.filter(product_id=product_id).exclude(
            status__in=['completed', 'cancelled']
        )

    updated_items = []
    updated_lists = []

    for supplied_list in lists:
        list_items = list(supplied_list.items.all())
        items_to_update = []

        for list_item in list_items:
            total_received = received_quantities.get(list_item.item_number, 0)

            # 受入れ数量 >= リスト数量 なら自動的に受入確認済みにする
            if total_received >= list_item.quantity and not list_item.receiving_confirmed:
                list_item.receiving_confirmed = True
                list_item.receiving_confirmed_at = now
                list_item.receiving_confirmed_by = user
                list_item.received_quantity = total_received
                items_to_update.append(list_item)
            elif list_item.received_quantity != total_received:
                # 数量のみ更新
                list_item.received_quantity = total_received if total_received > 0 else None
                items_to_update.append(list_item)

        if items_to_update:
            SuppliedItemListItem.objects.bulk_update(
                items_to_update,
                ['receiving_confirmed', 'receiving_confirmed_at',
                 'receiving_confirmed_by', 'received_quantity']
            )
            updated_items.extend(items_to_update)

        # リストのステータスを更新
        received_count = supplied_list.items.filter(receiving_confirmed=True).count()
        count_confirmed_count = supplied_list.items.filter(count_confirmed=True).count()
        total_count = supplied_list.items.count()

        new_status = supplied_list.status

        # 全アイテムが受入確認済み AND 員数確認済みなら完了
        if received_count == total_count and count_confirmed_count == total_count:
            new_status = 'completed'
        # 全アイテムが受入確認済みなら員数確認待ち
        elif received_count == total_count:
            new_status = 'pending_count'
        # 一部受入確認済みなら受入中
        elif received_count > 0:
            new_status = 'receiving'
        # 受入確認なしなら受入待ち
        else:
            new_status = 'pending_receiving'

        if supplied_list.status != new_status:
            supplied_list.status = new_status
            supplied_list.save()
            updated_lists.append(supplied_list)

    return {
        'updated_items_count': len(updated_items),
        'updated_lists': [{'id': l.id, 'status': l.status} for l in updated_lists]
    }


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def complete_receiving(request, pk):
    """受入確認を完了し、自動的にリスト項目のステータスを更新する

    改善点:
    - 受入れ数量 >= リスト数量 の項目は自動的に受入確認済みに
    - 多対多紐づけ（supplied_item_lists）に対応
    - 全アイテム完了時にリストを「完了」状態に更新
    """
    try:
        receiving = SuppliedItemReceiving.objects.get(pk=pk)

        if receiving.status == 'completed':
            return Response(
                {"error": "この受入確認は既に完了しています"},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # 受入確認ステータスを完了に
            receiving.status = 'completed'
            receiving.save()

            # 製品IDを取得（リスト経由またはproduct直接）
            product_id = receiving.product_id
            if not product_id and receiving.supplied_item_list:
                product_id = receiving.supplied_item_list.product_id

            # 多対多紐づけのリストIDを取得
            list_ids = list(receiving.supplied_item_lists.values_list('id', flat=True))

            # 後方互換：単一リストも含める
            if receiving.supplied_item_list_id and receiving.supplied_item_list_id not in list_ids:
                list_ids.append(receiving.supplied_item_list_id)

            # 自動ステータス更新を実行
            if product_id:
                auto_update_receiving_status(
                    product_id=product_id,
                    user=request.user,
                    list_ids=list_ids if list_ids else None
                )

        return Response(
            SuppliedItemReceivingDetailSerializer(receiving).data,
            status=status.HTTP_200_OK
        )

    except SuppliedItemReceiving.DoesNotExist:
        return Response(
            {"error": "受入確認が見つかりません"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def compare_receiving_with_list(request, list_id):
    """リスト項目と受入れ数量を比較する

    製品の完了済み受入れ登録（リスト紐付け・未紐付け含む）から、
    品番ごとの受入れ数量合計を計算し、リスト項目と比較する。

    最適化: データベースレベルで集計を行い、N+1問題を解消
    """
    try:
        supplied_list = SuppliedItemList.objects.select_related('product').get(pk=list_id)
        product_id = supplied_list.product_id

        # データベースレベルで品番ごとの受入れ数量を集計（N+1問題の解消）
        receiving_aggregation = SuppliedItemReceivingItem.objects.filter(
            receiving__status='completed'
        ).filter(
            Q(receiving__supplied_item_list__product_id=product_id) |
            Q(receiving__product_id=product_id)
        ).values('item_number').annotate(
            total_received=Sum('calculated_quantity'),
            item_name_first=F('item_name')
        )

        # 辞書に変換（高速ルックアップ用）
        received_quantities = {
            item['item_number']: {
                'total_received': item['total_received'] or 0,
                'item_name': item['item_name_first'] or ''
            }
            for item in receiving_aggregation
        }

        # リスト項目を一括取得（prefetch不要、単一クエリ）
        list_items = list(supplied_list.items.only(
            'id', 'item_number', 'item_name', 'quantity',
            'receiving_confirmed', 'count_confirmed'
        ))

        # リスト項目との比較
        comparison_results = []
        list_item_numbers = set()

        for list_item in list_items:
            list_item_numbers.add(list_item.item_number)
            received_info = received_quantities.get(list_item.item_number, {})
            total_received = received_info.get('total_received', 0)

            comparison_results.append({
                'list_item_id': list_item.id,
                'item_number': list_item.item_number,
                'item_name': list_item.item_name,
                'list_quantity': list_item.quantity,
                'total_received': total_received,
                'is_sufficient': total_received >= list_item.quantity,
                'difference': total_received - list_item.quantity,
                'receiving_confirmed': list_item.receiving_confirmed,
                'count_confirmed': list_item.count_confirmed,
            })

        # リストにない受入れ品番（リスト未登録品番）
        unregistered_items = [
            {
                'item_number': item_number,
                'item_name': info['item_name'],
                'total_received': info['total_received'],
            }
            for item_number, info in received_quantities.items()
            if item_number not in list_item_numbers
        ]

        # サマリー（Pythonで高速計算）
        total_items = len(comparison_results)
        sufficient_items = sum(1 for r in comparison_results if r['is_sufficient'])
        confirmed_items = sum(1 for r in comparison_results if r['receiving_confirmed'])

        return Response({
            'list_id': list_id,
            'list_number': supplied_list.list_number,
            'product_id': product_id,
            'comparison': comparison_results,
            'unregistered_items': unregistered_items,
            'summary': {
                'total_items': total_items,
                'sufficient_items': sufficient_items,
                'confirmed_items': confirmed_items,
                'unregistered_count': len(unregistered_items),
            }
        }, status=status.HTTP_200_OK)

    except SuppliedItemList.DoesNotExist:
        return Response(
            {"error": "リストが見つかりません"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def bulk_confirm_receiving(request, list_id):
    """受入れ数量が十分な項目を一括で受入確認済みにする

    受入れ数量 >= リスト数量 の項目を一括で receiving_confirmed = True に設定。
    exclude_item_ids パラメータで除外する項目を指定可能。

    最適化: データベースレベルで集計を行い、bulk_updateで一括更新
    """
    try:
        supplied_list = SuppliedItemList.objects.get(pk=list_id)
        exclude_item_ids = set(request.data.get('exclude_item_ids', []))
        product_id = supplied_list.product_id

        # データベースレベルで品番ごとの受入れ数量を集計
        receiving_aggregation = SuppliedItemReceivingItem.objects.filter(
            receiving__status='completed'
        ).filter(
            Q(receiving__supplied_item_list__product_id=product_id) |
            Q(receiving__product_id=product_id)
        ).values('item_number').annotate(
            total_received=Sum('calculated_quantity')
        )

        received_quantities = {
            item['item_number']: item['total_received'] or 0
            for item in receiving_aggregation
        }

        # 更新対象の項目を収集
        items_to_update = []
        confirmed_count = 0
        skipped_count = 0
        now = timezone.now()

        list_items = list(supplied_list.items.only(
            'id', 'item_number', 'quantity', 'receiving_confirmed',
            'receiving_confirmed_at', 'receiving_confirmed_by', 'received_quantity'
        ))

        with transaction.atomic():
            for list_item in list_items:
                # 除外リストにある場合はスキップ
                if list_item.id in exclude_item_ids:
                    skipped_count += 1
                    continue

                # 既に確認済みの場合はスキップ
                if list_item.receiving_confirmed:
                    continue

                total_received = received_quantities.get(list_item.item_number, 0)

                # 受入れ数量がリスト数量以上の場合、確認済みに
                if total_received >= list_item.quantity:
                    list_item.receiving_confirmed = True
                    list_item.receiving_confirmed_at = now
                    list_item.receiving_confirmed_by = request.user
                    list_item.received_quantity = total_received
                    items_to_update.append(list_item)
                    confirmed_count += 1

            # bulk_updateで一括更新
            if items_to_update:
                SuppliedItemListItem.objects.bulk_update(
                    items_to_update,
                    ['receiving_confirmed', 'receiving_confirmed_at',
                     'receiving_confirmed_by', 'received_quantity']
                )

            # リストのステータス更新（DBから再取得してカウント）
            received_count = supplied_list.items.filter(receiving_confirmed=True).count()
            total_count = supplied_list.items.count()

            if received_count == total_count:
                supplied_list.status = 'pending_count'
            else:
                supplied_list.status = 'receiving'
            supplied_list.save(update_fields=['status', 'updated_at'])

        return Response({
            'message': f'{confirmed_count}件の項目を受入確認済みにしました',
            'confirmed_count': confirmed_count,
            'skipped_count': skipped_count,
            'list_status': supplied_list.status,
        }, status=status.HTTP_200_OK)

    except SuppliedItemList.DoesNotExist:
        return Response(
            {"error": "リストが見つかりません"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_unregistered_receiving_items(request, list_id):
    """リストにない受入れ品番を取得する

    リストの製品に紐づく完了済み受入れ登録から、
    リスト項目に存在しない品番を抽出する。

    最適化: データベースレベルで集計を行い、N+1問題を解消
    """
    try:
        supplied_list = SuppliedItemList.objects.get(pk=list_id)
        product_id = supplied_list.product_id

        # リスト項目の品番セット（単一クエリで取得）
        list_item_numbers = set(
            supplied_list.items.values_list('item_number', flat=True)
        )

        # データベースレベルで品番ごとの受入れ数量を集計
        receiving_items = SuppliedItemReceivingItem.objects.filter(
            receiving__status='completed'
        ).filter(
            Q(receiving__supplied_item_list__product_id=product_id) |
            Q(receiving__product_id=product_id)
        ).exclude(
            item_number__in=list_item_numbers
        ).values('item_number').annotate(
            total_received=Sum('calculated_quantity'),
            item_name_first=F('item_name')
        )

        # 結果をリストに変換
        unregistered_items = [
            {
                'item_number': item['item_number'],
                'item_name': item['item_name_first'] or '',
                'total_received': item['total_received'] or 0,
            }
            for item in receiving_items
        ]

        return Response({
            'list_id': list_id,
            'list_number': supplied_list.list_number,
            'unregistered_items': unregistered_items,
            'total_count': len(unregistered_items),
        }, status=status.HTTP_200_OK)

    except SuppliedItemList.DoesNotExist:
        return Response(
            {"error": "リストが見つかりません"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_receiving_summary_for_list(request, list_id):
    """リストの受入状況サマリーを取得する

    リストの予定数量と実際の受入数量の差異をサマリーとして返す。
    フロントエンドのリスト一覧ページでの差異表示に使用。
    """
    try:
        supplied_list = SuppliedItemList.objects.get(pk=list_id)
        product_id = supplied_list.product_id

        # リスト項目の合計数量を取得
        list_totals = supplied_list.items.aggregate(
            total_list_quantity=Sum('quantity'),
            total_items=Count('id')
        )

        # 受入数量の集計（データベースレベル）
        receiving_totals = SuppliedItemReceivingItem.objects.filter(
            receiving__status='completed'
        ).filter(
            Q(receiving__supplied_item_list__product_id=product_id) |
            Q(receiving__product_id=product_id)
        ).aggregate(
            total_received_quantity=Sum('calculated_quantity')
        )

        total_list_quantity = list_totals['total_list_quantity'] or 0
        total_received = receiving_totals['total_received_quantity'] or 0
        difference = total_received - total_list_quantity

        return Response({
            'list_id': list_id,
            'list_number': supplied_list.list_number,
            'total_list_quantity': total_list_quantity,
            'total_received_quantity': total_received,
            'difference': difference,
            'is_sufficient': total_received >= total_list_quantity,
            'has_shortage': difference < 0,
            'has_excess': difference > 0,
        }, status=status.HTTP_200_OK)

    except SuppliedItemList.DoesNotExist:
        return Response(
            {"error": "リストが見つかりません"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_receiving_summaries_bulk(request):
    """複数リストの受入状況サマリーを一括取得する

    リスト一覧ページで効率的に差異を表示するためのバルクエンドポイント。
    """
    list_ids = request.query_params.getlist('list_ids[]')
    if not list_ids:
        list_ids_str = request.query_params.get('list_ids', '')
        if list_ids_str:
            list_ids = [int(id.strip()) for id in list_ids_str.split(',') if id.strip()]

    if not list_ids:
        return Response(
            {"error": "list_ids パラメータが必要です"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # リストを取得
    lists = SuppliedItemList.objects.filter(id__in=list_ids).values(
        'id', 'list_number', 'product_id'
    )
    list_map = {l['id']: l for l in lists}

    # 各リストの製品IDを収集
    product_ids = set(l['product_id'] for l in lists)

    # リスト項目の合計数量とSKU数を集計
    list_item_totals = SuppliedItemListItem.objects.filter(
        supplied_item_list_id__in=list_ids
    ).values('supplied_item_list_id').annotate(
        total_list_quantity=Sum('quantity'),
        total_sku_count=Count('id'),
        completed_sku_count=Count('id', filter=Q(receiving_confirmed=True)),
    )
    list_quantity_map = {
        item['supplied_item_list_id']: item['total_list_quantity'] or 0
        for item in list_item_totals
    }
    list_sku_map = {
        item['supplied_item_list_id']: {
            'total_sku_count': item['total_sku_count'] or 0,
            'completed_sku_count': item['completed_sku_count'] or 0,
        }
        for item in list_item_totals
    }

    # 製品ごとの受入総数を集計
    receiving_totals = SuppliedItemReceivingItem.objects.filter(
        receiving__status='completed'
    ).filter(
        Q(receiving__supplied_item_list__product_id__in=product_ids) |
        Q(receiving__product_id__in=product_ids)
    ).values(
        product_id=Case(
            When(receiving__product_id__isnull=False, then=F('receiving__product_id')),
            default=F('receiving__supplied_item_list__product_id'),
        )
    ).annotate(
        total_received=Sum('calculated_quantity')
    )
    product_received_map = {
        item['product_id']: item['total_received'] or 0
        for item in receiving_totals
    }

    # 結果を構築
    results = []
    for list_id in list_ids:
        list_id = int(list_id)
        if list_id not in list_map:
            continue

        list_info = list_map[list_id]
        total_list_quantity = list_quantity_map.get(list_id, 0)
        total_received = product_received_map.get(list_info['product_id'], 0)
        difference = total_received - total_list_quantity

        # SKU情報を取得
        sku_info = list_sku_map.get(list_id, {'total_sku_count': 0, 'completed_sku_count': 0})
        total_sku_count = sku_info['total_sku_count']
        completed_sku_count = sku_info['completed_sku_count']
        incomplete_sku_count = total_sku_count - completed_sku_count

        results.append({
            'list_id': list_id,
            'list_number': list_info['list_number'],
            'total_list_quantity': total_list_quantity,
            'total_received_quantity': total_received,
            'difference': difference,
            'is_sufficient': total_received >= total_list_quantity,
            'has_shortage': difference < 0,
            'has_excess': difference > 0,
            # SKUベースのカウント
            'total_sku_count': total_sku_count,
            'completed_sku_count': completed_sku_count,
            'incomplete_sku_count': incomplete_sku_count,
        })

    return Response({
        'summaries': results
    }, status=status.HTTP_200_OK)


# ==================== 在庫 Views ====================

class SuppliedItemInventoryListCreateView(generics.ListCreateAPIView):
    """支給品在庫一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = SuppliedItemInventory.objects.select_related(
            'supplied_item__product__customer_branch__customer',
            'list_item__supplied_item_list',
            'created_by'
        )

        # フィルタリング
        supplied_item_id = self.request.query_params.get('supplied_item', None)
        if supplied_item_id:
            queryset = queryset.filter(supplied_item_id=supplied_item_id)

        product_id = self.request.query_params.get('product', None)
        if product_id:
            queryset = queryset.filter(supplied_item__product_id=product_id)

        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(
                supplied_item__product__customer_branch__customer_id=customer_id
            )

        # 検索
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(supplied_item__item_number__icontains=search) |
                Q(supplied_item__item_name__icontains=search) |
                Q(lot_number__icontains=search)
            )

        return queryset.order_by('-received_date', '-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SuppliedItemInventoryCreateSerializer
        return SuppliedItemInventoryListSerializer


class SuppliedItemInventoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """支給品在庫詳細取得・更新・削除ビュー"""
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        """クエリセットを取得"""
        return SuppliedItemInventory.objects.select_related(
            'supplied_item__product__customer_branch__customer',
            'list_item__supplied_item_list',
            'created_by'
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SuppliedItemInventoryUpdateSerializer
        return SuppliedItemInventoryDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """支給品在庫の削除（管理者のみ）"""
        if not request.user.is_administrator:
            return Response(
                {"error": "削除権限がありません"},
                status=status.HTTP_403_FORBIDDEN
            )

        self.perform_destroy(self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def register_inventory_from_list(request, list_id):
    """リストから在庫を一括登録する

    最適化: bulk_create()で一括INSERT、必要なフィールドのみ取得
    """
    try:
        supplied_list = SuppliedItemList.objects.get(pk=list_id)

        # 員数確認が完了していない項目があるかチェック
        unconfirmed_count = supplied_list.items.filter(count_confirmed=False).count()
        if unconfirmed_count > 0:
            return Response(
                {"error": f"{unconfirmed_count}件の項目が員数確認されていません"},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # 支給品マスタに紐付いている項目のみ取得（必要なフィールドのみ）
            items_with_supplied_item = list(
                supplied_list.items.filter(
                    count_confirmed=True,
                    supplied_item__isnull=False
                ).select_related('supplied_item').only(
                    'id', 'supplied_item_id', 'received_quantity', 'quantity'
                )
            )

            # 在庫オブジェクトを事前に構築
            inventory_objects = [
                SuppliedItemInventory(
                    supplied_item=item.supplied_item,
                    list_item=item,
                    quantity=item.received_quantity or item.quantity,
                    received_date=supplied_list.delivery_date,
                    created_by=request.user
                )
                for item in items_with_supplied_item
            ]

            # bulk_createで一括INSERT
            created_inventories = SuppliedItemInventory.objects.bulk_create(
                inventory_objects
            )

            # リストステータスを完了に
            supplied_list.status = 'completed'
            supplied_list.save(update_fields=['status', 'updated_at'])

        return Response(
            {
                "message": f"{len(created_inventories)}件の在庫を登録しました",
                "inventories": SuppliedItemInventoryListSerializer(
                    created_inventories, many=True
                ).data
            },
            status=status.HTTP_201_CREATED
        )

    except SuppliedItemList.DoesNotExist:
        return Response(
            {"error": "リストが見つかりません"},
            status=status.HTTP_404_NOT_FOUND
        )


# ==================== CSV インポート ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_supplied_item_list_csv(request, list_id):
    """
    支給品リストにCSVからデータをインポート（旧バージョン - 互換性のため残す）
    新しいインポートは parse_supplied_item_csv と create_supplied_item_list_from_csv を使用
    """
    try:
        supplied_list = SuppliedItemList.objects.get(pk=list_id)
    except SuppliedItemList.DoesNotExist:
        return Response(
            {"error": "リストが見つかりません"},
            status=status.HTTP_404_NOT_FOUND
        )

    csv_file = request.FILES.get('csv_file')
    if not csv_file:
        return Response(
            {"error": "CSVファイルが必要です"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # CSVファイルを読み込む
        decoded_file = decode_csv_file(csv_file)
        io_string = io.StringIO(decoded_file)
        reader = csv.reader(io_string)

        created_items = []
        errors = []
        items_by_part_number = {}

        with transaction.atomic():
            for row_num, row in enumerate(reader, start=1):
                try:
                    # ヘッダー行をスキップ
                    if row_num == 1:
                        continue

                    # 列数チェック（最低27列必要）
                    if len(row) < 27:
                        errors.append(f"行{row_num}: 列数が不足しています（最低27列必要）")
                        continue

                    # 指定された列のみを読み取り
                    # 1列目: 発行日, 6列目: 品番, 7列目: 品名, 23列目: 支給数, 24列目: 単位, 27列目: 機種情報
                    issue_date_str = row[0].strip() if len(row) > 0 else ''
                    item_number = row[5].strip() if len(row) > 5 else ''  # 6列目 (0-indexed: 5)
                    item_name = row[6].strip() if len(row) > 6 else ''    # 7列目
                    quantity_str = row[22].strip() if len(row) > 22 else ''  # 23列目 (0-indexed: 22)
                    unit = row[23].strip() if len(row) > 23 else '個'    # 24列目
                    product_info = row[26].strip() if len(row) > 26 else ''  # 27列目 (0-indexed: 26)

                    # 品番が空の場合はスキップ
                    if not item_number:
                        continue

                    # 数量を解析
                    try:
                        quantity = int(quantity_str) if quantity_str else 0
                    except ValueError:
                        errors.append(f"行{row_num}: 数量が不正です: {quantity_str}")
                        continue

                    # 同じ品番が存在する場合は数量を合計
                    if item_number in items_by_part_number:
                        items_by_part_number[item_number]['quantity'] += quantity
                    else:
                        items_by_part_number[item_number] = {
                            'item_number': item_number,
                            'item_name': item_name,
                            'quantity': quantity,
                            'unit': unit or '個',
                            'product_info': product_info
                        }

                except Exception as e:
                    errors.append(f"行{row_num}: エラー - {str(e)}")

            # 集計したデータからリスト項目を作成
            for item_number, item_data in items_by_part_number.items():
                # 支給品マスタとの紐付け（存在する場合）
                supplied_item = SuppliedItem.objects.filter(
                    item_number=item_number,
                    is_active=True
                ).first()

                # リスト項目を作成
                list_item = SuppliedItemListItem.objects.create(
                    supplied_item_list=supplied_list,
                    supplied_item=supplied_item,
                    item_number=item_data['item_number'],
                    item_name=item_data['item_name'],
                    quantity=item_data['quantity'],
                    unit=item_data['unit'],
                    notes=f"機種: {item_data['product_info']}" if item_data['product_info'] else ''
                )
                created_items.append(list_item)

            # CSVファイルを保存
            supplied_list.csv_file = csv_file
            supplied_list.status = 'pending_receiving'
            supplied_list.save()

        response_data = {
            "message": f"{len(created_items)}件のデータをインポートしました",
            "created_count": len(created_items),
            "items": SuppliedItemListItemSerializer(created_items, many=True).data
        }

        if errors:
            response_data["errors"] = errors

        return Response(response_data, status=status.HTTP_201_CREATED)

    except UnicodeDecodeError as e:
        return Response(
            {"error": "CSVファイルの文字コードが読み取れません。UTF-8またはShift-JISで保存されたCSVファイルをアップロードしてください。"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"CSV import error: {str(e)}")
        return Response(
            {"error": f"インポートエラー: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parse_supplied_item_csv(request):
    """
    CSVファイルを解析し、未登録の品番とProduct情報を返す

    このエンドポイントは以下を行う:
    1. CSVから指定列を読み取り
    2. 品番ごとに集計
    3. マスターチェック（未登録品番の確認）
    4. Product情報の抽出（27列目）

    Returns:
        - items: 集計された品目リスト
        - unregistered_part_numbers: 未登録の品番リスト
        - product_info: CSV 27列目の機種情報
        - suggested_products: マッチする可能性のある製品リスト
        - issue_date: CSV 1列目の発行日
    """
    csv_file = request.FILES.get('csv_file')
    if not csv_file:
        return Response(
            {"error": "CSVファイルが必要です"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # CSVファイルを読み込む
        decoded_file = decode_csv_file(csv_file)
        io_string = io.StringIO(decoded_file)
        reader = csv.reader(io_string)

        # model_info ごとにアイテムをグループ化
        items_by_model_info = {}  # {model_info: {item_number: item_data}}
        items_without_model_info = {}  # model_info が空のアイテム
        issue_date = None
        errors = []

        for row_num, row in enumerate(reader, start=1):
            try:
                # ヘッダー行をスキップ
                if row_num == 1:
                    continue

                # 列数チェック（最低27列必要）
                if len(row) < 27:
                    if any(cell.strip() for cell in row):  # 空行でない場合のみエラー
                        errors.append(f"行{row_num}: 列数が不足しています（最低27列必要）")
                    continue

                # 指定された列のみを読み取り
                # 1列目: 発行日, 6列目: 品番, 7列目: 品名, 23列目: 支給数, 24列目: 単位, 27列目: 機種情報
                issue_date_str = row[0].strip() if len(row) > 0 else ''
                item_number = row[5].strip() if len(row) > 5 else ''  # 6列目 (0-indexed: 5)
                item_name = row[6].strip() if len(row) > 6 else ''    # 7列目
                quantity_str = row[22].strip() if len(row) > 22 else ''  # 23列目 (0-indexed: 22)
                unit = row[23].strip() if len(row) > 23 else '個'    # 24列目
                product_info = row[26].strip() if len(row) > 26 else ''  # 27列目 (0-indexed: 26)

                # 発行日を保存（最初の行から）
                if issue_date_str and not issue_date:
                    try:
                        # 日付形式を解析 (YYYY-MM-DD, YYYY/MM/DD など)
                        from datetime import datetime
                        for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%Y%m%d']:
                            try:
                                issue_date = datetime.strptime(issue_date_str, fmt).date().isoformat()
                                break
                            except ValueError:
                                continue
                    except:
                        pass

                # 品番が空の場合はスキップ
                if not item_number:
                    continue

                # 数量を解析
                try:
                    quantity = int(float(quantity_str)) if quantity_str else 0
                except ValueError:
                    errors.append(f"行{row_num}: 数量が不正です: {quantity_str}")
                    continue

                item_data = {
                    'item_number': item_number,
                    'item_name': item_name,
                    'quantity': quantity,
                    'unit': unit or '個',
                }

                # model_info の有無でグループ分け
                if product_info:
                    # model_info がある場合
                    if product_info not in items_by_model_info:
                        items_by_model_info[product_info] = {}

                    # 同じ品番が存在する場合は数量を合算
                    if item_number in items_by_model_info[product_info]:
                        items_by_model_info[product_info][item_number]['quantity'] += quantity
                    else:
                        items_by_model_info[product_info][item_number] = item_data
                else:
                    # model_info が空の場合
                    if item_number in items_without_model_info:
                        items_without_model_info[item_number]['quantity'] += quantity
                    else:
                        items_without_model_info[item_number] = item_data

            except Exception as e:
                errors.append(f"行{row_num}: エラー - {str(e)}")

        # model_info ごとにグループデータを作成
        from api.products.models import Product
        model_info_groups = []

        for model_info, items_dict in items_by_model_info.items():
            items_list = list(items_dict.values())
            all_item_numbers = list(items_dict.keys())

            # マスターチェック: 未登録の品番を確認
            registered_items = SuppliedItem.objects.filter(
                item_number__in=all_item_numbers,
                is_active=True
            ).values_list('item_number', flat=True)

            unregistered_items = [
                {
                    'item_number': num,
                    'item_name': items_dict[num]['item_name'],
                    'quantity': items_dict[num]['quantity'],
                    'unit': items_dict[num]['unit'],
                }
                for num in all_item_numbers if num not in registered_items
            ]

            # model_info でマッチする製品を検索（model_info フィールドで完全一致優先）
            suggested_product = None

            # まず model_info フィールドで完全一致を検索
            exact_match = Product.objects.filter(
                model_info=model_info,
                status='ACTIVE'
            ).first()

            if exact_match:
                suggested_product = {
                    'id': exact_match.id,
                    'product_number': exact_match.product_number,
                    'product_name': exact_match.product_name,
                    'model_info': exact_match.model_info,
                    'match_type': 'exact'
                }
            else:
                # 完全一致がない場合は部分一致を検索
                partial_match = Product.objects.filter(
                    Q(product_number__icontains=model_info) |
                    Q(product_name__icontains=model_info) |
                    Q(model_info__icontains=model_info),
                    status='ACTIVE'
                ).first()

                if partial_match:
                    suggested_product = {
                        'id': partial_match.id,
                        'product_number': partial_match.product_number,
                        'product_name': partial_match.product_name,
                        'model_info': partial_match.model_info or '',
                        'match_type': 'partial'
                    }

            model_info_groups.append({
                'model_info': model_info,
                'items': items_list,
                'total_items': len(items_list),
                'unregistered_items': unregistered_items,
                'suggested_product': suggested_product,
            })

        # model_info なしのグループ
        items_without_model_info_group = None
        if items_without_model_info:
            items_list = list(items_without_model_info.values())
            all_item_numbers = list(items_without_model_info.keys())

            # マスターチェック
            registered_items = SuppliedItem.objects.filter(
                item_number__in=all_item_numbers,
                is_active=True
            ).values_list('item_number', flat=True)

            unregistered_items = [
                {
                    'item_number': num,
                    'item_name': items_without_model_info[num]['item_name'],
                    'quantity': items_without_model_info[num]['quantity'],
                    'unit': items_without_model_info[num]['unit'],
                }
                for num in all_item_numbers if num not in registered_items
            ]

            items_without_model_info_group = {
                'items': items_list,
                'total_items': len(items_list),
                'unregistered_items': unregistered_items,
            }

        response_data = {
            'model_info_groups': model_info_groups,
            'items_without_model_info': items_without_model_info_group,
            'issue_date': issue_date,
            'errors': errors if errors else None,
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except UnicodeDecodeError as e:
        return Response(
            {"error": "CSVファイルの文字コードが読み取れません。UTF-8またはShift-JISで保存されたCSVファイルをアップロードしてください。"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"CSV parse error: {str(e)}")
        return Response(
            {"error": f"CSV解析エラー: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_supplied_item_list_from_csv(request):
    """
    解析済みCSVデータから支給品リストを作成

    Required fields:
        - product_id: 製品ID
        - issue_date: 発行日
        - items: 品目リスト (item_number, item_name, quantity, unit)
        - csv_file: CSVファイル
        - register_unregistered: 未登録品番をマスターに登録するか (boolean)
        - unregistered_items: 未登録品番のリスト（register_unregistered=Trueの場合）
        - product_info: CSV 27列目の機種情報（リスト）
    """
    try:
        import json

        # FormDataから送信されたデータを取得してパース
        product_id = request.data.get('product_id')
        issue_date = request.data.get('issue_date')

        # JSON文字列をパース
        items_data_str = request.data.get('items', '[]')
        items_data = json.loads(items_data_str) if isinstance(items_data_str, str) else items_data_str

        register_unregistered_str = request.data.get('register_unregistered', 'false')
        register_unregistered = register_unregistered_str.lower() == 'true' if isinstance(register_unregistered_str, str) else bool(register_unregistered_str)

        unregistered_items_str = request.data.get('unregistered_items')
        unregistered_items = json.loads(unregistered_items_str) if unregistered_items_str and isinstance(unregistered_items_str, str) else (unregistered_items_str or [])

        product_info_str = request.data.get('product_info')
        product_info_list = json.loads(product_info_str) if product_info_str and isinstance(product_info_str, str) else (product_info_str or [])

        csv_file = request.FILES.get('csv_file')

        # バリデーション
        if not product_id:
            return Response(
                {"error": "製品IDが必要です"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not issue_date:
            return Response(
                {"error": "発行日が必要です"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not items_data:
            return Response(
                {"error": "品目データが必要です"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Productの存在確認
        from api.products.models import Product
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "指定された製品が見つかりません"},
                status=status.HTTP_404_NOT_FOUND
            )

        with transaction.atomic():
            # Productのmodel_infoを更新（機種情報がある場合）
            if product_info_list and len(product_info_list) > 0:
                # 複数の機種情報がある場合は最初のものを使用
                model_info = product_info_list[0] if isinstance(product_info_list, list) else product_info_list
                # Productのmodel_infoが空の場合のみ更新
                if not product.model_info:
                    product.model_info = model_info
                    product.save(update_fields=['model_info'])
                    logger.info(f"Product {product.id} model_info updated to: {model_info}")

            # 未登録品番をマスターに登録
            if register_unregistered and unregistered_items:
                logger.info(f"Registering {len(unregistered_items)} unregistered items")
                for item in unregistered_items:
                    # itemが辞書であることを確認
                    if isinstance(item, str):
                        logger.error(f"Unexpected string item in unregistered_items: {item}")
                        continue

                    try:
                        SuppliedItem.objects.get_or_create(
                            item_number=item.get('item_number') if isinstance(item, dict) else item,
                            defaults={
                                'product': product,
                                'item_name': item.get('item_name', '') if isinstance(item, dict) else '',
                                'unit': item.get('unit', '個') if isinstance(item, dict) else '個',
                                'standard_quantity': item.get('quantity', 1) if isinstance(item, dict) else 1,
                                'is_active': True,
                                'created_by': request.user
                            }
                        )
                    except Exception as e:
                        logger.error(f"Error creating SuppliedItem for {item}: {str(e)}")

            # SuppliedItemListを作成
            supplied_list = SuppliedItemList.objects.create(
                product=product,
                issue_date=issue_date,
                delivery_date=None,  # nullable
                csv_file=csv_file,
                status='draft',
                created_by=request.user
            )

            # リスト項目を作成
            created_items = []
            for item_data in items_data:
                # 支給品マスタとの紐付け
                supplied_item = SuppliedItem.objects.filter(
                    item_number=item_data['item_number'],
                    is_active=True
                ).first()

                list_item = SuppliedItemListItem.objects.create(
                    supplied_item_list=supplied_list,
                    supplied_item=supplied_item,
                    item_number=item_data['item_number'],
                    item_name=item_data.get('item_name', ''),
                    quantity=item_data['quantity'],
                    unit=item_data.get('unit', '個'),
                )
                created_items.append(list_item)

        # レスポンスを返す前に関連データをロード
        supplied_list = SuppliedItemList.objects.select_related(
            'product',
            'product__customer_branch',
            'product__customer_branch__customer',
            'created_by'
        ).prefetch_related(
            'items',
            'items__supplied_item',
            'items__receiving_confirmed_by',
            'items__count_confirmed_by'
        ).get(pk=supplied_list.id)

        serializer = SuppliedItemListDetailSerializer(supplied_list)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Create supplied item list error: {str(e)}")
        return Response(
            {"error": f"リスト作成エラー: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )


# timezoneインポートを追加
from django.utils import timezone


# ==================== 品番検索API ====================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def lookup_item_by_number(request):
    """品番から支給品情報を検索する

    クエリパラメータ:
    - item_number: 品番（必須）
    - product_id: 製品ID（任意、指定すると製品に紐づく支給品を優先検索）

    レスポンス:
    - found: true/false
    - item_number: 品番
    - item_name: 品名（見つかった場合）
    - supplied_item_id: 支給品ID（見つかった場合）
    - product_id: 製品ID（見つかった場合）
    """
    item_number = request.query_params.get('item_number', '').strip()
    product_id = request.query_params.get('product_id')

    if not item_number:
        return Response(
            {"error": "品番を指定してください"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 検索クエリを構築
    queryset = SuppliedItem.objects.filter(
        item_number=item_number,
        is_active=True
    )

    # 製品IDが指定されている場合、その製品に紐づく支給品を優先
    if product_id:
        product_specific = queryset.filter(product_id=product_id).first()
        if product_specific:
            return Response({
                "found": True,
                "item_number": product_specific.item_number,
                "item_name": product_specific.item_name,
                "supplied_item_id": product_specific.id,
                "product_id": product_specific.product_id,
            }, status=status.HTTP_200_OK)

    # 製品に関係なく最初に見つかった支給品を返す
    supplied_item = queryset.first()

    if supplied_item:
        return Response({
            "found": True,
            "item_number": supplied_item.item_number,
            "item_name": supplied_item.item_name,
            "supplied_item_id": supplied_item.id,
            "product_id": supplied_item.product_id,
        }, status=status.HTTP_200_OK)

    # 見つからなかった場合
    return Response({
        "found": False,
        "item_number": item_number,
        "item_name": None,
        "supplied_item_id": None,
        "product_id": None,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_receiving_items_list(request):
    """
    受入れ登録された部品（SuppliedItemReceivingItem）の一覧を取得

    クエリパラメータ:
    - product: 製品ID
    - status: 受入ステータス（draft, completed）
    - count_confirmed: 員数確認済みかどうか（true/false）
    - exclude_count_confirmed: 員数確認済み数量を除外するかどうか（true/false）
    """
    from django.db.models import F, Sum

    queryset = SuppliedItemReceivingItem.objects.select_related(
        'receiving',
        'receiving__supplied_item_list',
        'receiving__supplied_item_list__product',
        'receiving__product',
        'supplied_item',
    ).order_by('-receiving__receiving_date', 'item_number')

    # 製品でフィルタ
    product_id = request.query_params.get('product', None)
    if product_id:
        queryset = queryset.filter(
            Q(receiving__supplied_item_list__product_id=product_id) |
            Q(receiving__product_id=product_id)
        )

    # 受入ステータスでフィルタ
    status_filter = request.query_params.get('status', None)
    if status_filter:
        queryset = queryset.filter(receiving__status=status_filter)

    # 員数確認済みフィルタ（未確認のみ表示する場合）
    count_confirmed = request.query_params.get('count_confirmed', None)
    if count_confirmed is not None:
        if count_confirmed.lower() == 'false':
            # 員数確認が済んでいない部品のみ
            # 対応するリスト項目がcount_confirmed=Falseのものを取得
            # または、リストに紐づいていないもの
            queryset = queryset.filter(
                Q(receiving__supplied_item_list__items__item_number=F('item_number'),
                  receiving__supplied_item_list__items__count_confirmed=False) |
                Q(receiving__supplied_item_list__isnull=True)
            ).distinct()

    # 員数確認済み数量を除外するかどうか
    exclude_count_confirmed = request.query_params.get('exclude_count_confirmed', 'false')
    should_exclude = exclude_count_confirmed.lower() == 'true'

    # 員数確認済みの数量を品番・製品ごとに集計
    confirmed_quantities = {}  # type: dict
    if should_exclude:
        # 製品IDでフィルタされている場合はその製品の確認済み数量を取得
        confirmed_items = SuppliedItemListItem.objects.filter(
            count_confirmed=True
        ).select_related('supplied_item_list', 'supplied_item_list__product')

        if product_id:
            confirmed_items = confirmed_items.filter(supplied_item_list__product_id=product_id)

        for item in confirmed_items:
            key = (item.item_number, item.supplied_item_list.product_id)
            if key not in confirmed_quantities:
                confirmed_quantities[key] = 0
            # リスト項目の数量を員数確認済みとして計上
            confirmed_quantities[key] += item.quantity or 0

    # 結果をシリアライズ
    result = []
    for item in queryset:
        receiving = item.receiving
        supplied_list = receiving.supplied_item_list
        product = supplied_list.product if supplied_list else receiving.product
        product_id_val = product.id if product else None

        # 員数確認済み数量を取得
        confirmed_qty = 0
        if should_exclude and product_id_val:
            key = (item.item_number, product_id_val)
            confirmed_qty = confirmed_quantities.get(key, 0)

        result.append({
            'id': item.id,
            'item_number': item.item_number,
            'item_name': item.item_name or '',
            'quantity_per_box': item.quantity_per_box,
            'box_count': item.box_count,
            'calculated_quantity': item.calculated_quantity,
            'notes': item.notes or '',
            'receiving_id': receiving.id,
            'receiving_date': receiving.receiving_date.isoformat(),
            'receiving_status': receiving.status,
            'receiving_status_display': receiving.get_status_display(),
            'list_number': supplied_list.list_number if supplied_list else None,
            'list_id': supplied_list.id if supplied_list else None,
            'product_id': product_id_val,
            'product_number': product.product_number if product else None,
            'product_name': product.product_name if product else None,
            'confirmed_quantity_for_item_number': confirmed_qty,
        })

    return Response({
        'count': len(result),
        'results': result
    }, status=status.HTTP_200_OK)
