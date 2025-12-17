# api/purchases/views.py

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.http import FileResponse, Http404, HttpResponse
from django.db.models import Count, Q, Prefetch
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
    """支給品リスト一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = SuppliedItemList.objects.select_related(
            'customer',
            'created_by'
        ).prefetch_related('items')

        # フィルタリング
        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # 検索
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(list_number__icontains=search) |
                Q(customer__name__icontains=search)
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
            'customer',
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
    """支給品受入確認一覧取得・作成ビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """クエリセットを取得"""
        queryset = SuppliedItemReceiving.objects.select_related(
            'supplied_item_list__customer',
            'created_by'
        ).prefetch_related('items')

        list_id = self.request.query_params.get('list', None)
        if list_id:
            queryset = queryset.filter(supplied_item_list_id=list_id)

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
            'supplied_item_list__customer',
            'created_by'
        ).prefetch_related(
            'items',
            'items__list_item'
        )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SuppliedItemReceivingUpdateSerializer
        return SuppliedItemReceivingDetailSerializer


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def complete_receiving(request, pk):
    """受入確認を完了し、リスト項目を更新する"""
    try:
        receiving = SuppliedItemReceiving.objects.get(pk=pk)

        if receiving.status == 'completed':
            return Response(
                {"error": "この受入確認は既に完了しています"},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # 受入確認項目をリスト項目に反映
            for item in receiving.items.all():
                if item.list_item:
                    list_item = item.list_item
                    list_item.receiving_confirmed = True
                    list_item.receiving_confirmed_at = timezone.now()
                    list_item.receiving_confirmed_by = request.user
                    list_item.received_quantity = item.calculated_quantity
                    list_item.quantity_per_box = item.quantity_per_box
                    list_item.box_count = item.box_count
                    list_item.save()

            # 受入確認ステータスを完了に
            receiving.status = 'completed'
            receiving.save()

            # リストのステータスも更新
            supplied_list = receiving.supplied_item_list
            if supplied_list.received_items_count == supplied_list.total_items:
                supplied_list.status = 'pending_count'
            else:
                supplied_list.status = 'receiving'
            supplied_list.save()

        return Response(
            SuppliedItemReceivingDetailSerializer(receiving).data,
            status=status.HTTP_200_OK
        )

    except SuppliedItemReceiving.DoesNotExist:
        return Response(
            {"error": "受入確認が見つかりません"},
            status=status.HTTP_404_NOT_FOUND
        )


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
    """リストから在庫を一括登録する"""
    try:
        supplied_list = SuppliedItemList.objects.get(pk=list_id)

        # 員数確認が完了していない項目があるかチェック
        unconfirmed_count = supplied_list.items.filter(count_confirmed=False).count()
        if unconfirmed_count > 0:
            return Response(
                {"error": f"{unconfirmed_count}件の項目が員数確認されていません"},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_inventories = []
        with transaction.atomic():
            for item in supplied_list.items.filter(count_confirmed=True):
                # 支給品マスタに紐付いている場合のみ在庫登録
                if item.supplied_item:
                    inventory = SuppliedItemInventory.objects.create(
                        supplied_item=item.supplied_item,
                        list_item=item,
                        quantity=item.received_quantity or item.quantity,
                        received_date=supplied_list.delivery_date,
                        created_by=request.user
                    )
                    created_inventories.append(inventory)

            # リストステータスを完了に
            supplied_list.status = 'completed'
            supplied_list.save()

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
@permission_classes([permissions.IsAuthenticated])
def import_supplied_item_list_csv(request, list_id):
    """支給品リストにCSVからデータをインポート"""
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
        decoded_file = csv_file.read().decode('utf-8-sig')
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)

        created_items = []
        errors = []

        with transaction.atomic():
            for row_num, row in enumerate(reader, start=2):
                try:
                    # 必須フィールドのチェック
                    item_number = row.get('品番', row.get('item_number', '')).strip()
                    item_name = row.get('品名', row.get('item_name', '')).strip()
                    quantity_str = row.get('数量', row.get('quantity', '')).strip()

                    if not item_number:
                        errors.append(f"行{row_num}: 品番が必要です")
                        continue
                    if not item_name:
                        errors.append(f"行{row_num}: 品名が必要です")
                        continue
                    if not quantity_str:
                        errors.append(f"行{row_num}: 数量が必要です")
                        continue

                    try:
                        quantity = int(quantity_str)
                    except ValueError:
                        errors.append(f"行{row_num}: 数量が不正です: {quantity_str}")
                        continue

                    # オプションフィールド
                    unit = row.get('単位', row.get('unit', '個')).strip() or '個'
                    quantity_per_box_str = row.get('入数', row.get('quantity_per_box', '')).strip()
                    box_count_str = row.get('箱数', row.get('box_count', '')).strip()
                    notes = row.get('備考', row.get('notes', '')).strip()

                    quantity_per_box = None
                    if quantity_per_box_str:
                        try:
                            quantity_per_box = int(quantity_per_box_str)
                        except ValueError:
                            pass

                    box_count = None
                    if box_count_str:
                        try:
                            box_count = int(box_count_str)
                        except ValueError:
                            pass

                    # 支給品マスタとの紐付け（存在する場合）
                    supplied_item = SuppliedItem.objects.filter(
                        item_number=item_number,
                        is_active=True
                    ).first()

                    # リスト項目を作成
                    list_item = SuppliedItemListItem.objects.create(
                        supplied_item_list=supplied_list,
                        supplied_item=supplied_item,
                        item_number=item_number,
                        item_name=item_name,
                        quantity=quantity,
                        quantity_per_box=quantity_per_box,
                        box_count=box_count,
                        unit=unit,
                        notes=notes
                    )
                    created_items.append(list_item)

                except Exception as e:
                    errors.append(f"行{row_num}: エラー - {str(e)}")

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

    except UnicodeDecodeError:
        return Response(
            {"error": "CSVファイルの文字コードがUTF-8ではありません"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"CSV import error: {str(e)}")
        return Response(
            {"error": f"インポートエラー: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )


# timezoneインポートを追加
from django.utils import timezone
