# api/supplier/views.py

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q
from django.http import HttpResponse
from django.db import transaction
import csv
import io
import logging

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

logger = logging.getLogger(__name__)


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


# ==================== CSV Bulk Import/Export Views ====================

class SupplierBulkImportView(APIView):
    """サプライヤー一括登録ビュー（仕入先＋拠点情報を統合）"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """CSVファイルから一括登録（仕入先情報と拠点情報を同時に登録）"""
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
            created_suppliers = {}  # supplier_code -> Supplier instance cache

            with transaction.atomic():
                for row_num, row in enumerate(reader, start=2):
                    try:
                        # 必須フィールドのチェック
                        supplier_code = row.get('supplier_code', '').strip()
                        if not supplier_code:
                            errors.append({
                                'row': row_num,
                                'error': 'サプライヤーコードは必須です'
                            })
                            continue

                        if not row.get('company_name'):
                            errors.append({
                                'row': row_num,
                                'error': '企業名は必須です'
                            })
                            continue

                        # 拠点情報がある場合は必須チェック
                        branch_code = row.get('branch_code', '').strip()
                        branch_name = row.get('branch_name', '').strip()
                        has_branch_info = branch_code or branch_name

                        if has_branch_info:
                            if not branch_code:
                                errors.append({
                                    'row': row_num,
                                    'error': '拠点コードは必須です（拠点情報を入力する場合）'
                                })
                                continue
                            if not branch_name:
                                errors.append({
                                    'row': row_num,
                                    'error': '拠点名は必須です（拠点情報を入力する場合）'
                                })
                                continue

                        # サプライヤーの検索または作成
                        supplier = None

                        # まずキャッシュから検索
                        if supplier_code in created_suppliers:
                            supplier = created_suppliers[supplier_code]
                        else:
                            # DBから検索
                            try:
                                supplier = Supplier.objects.get(supplier_code=supplier_code)
                            except Supplier.DoesNotExist:
                                # 新規作成
                                supplier_data = {
                                    'supplier_code': supplier_code,
                                    'company_name': row.get('company_name', '').strip(),
                                    'website': row.get('website', '').strip() or None,
                                    'notes': row.get('supplier_notes', '').strip() or None,
                                    'is_active': row.get('is_active', 'true').lower() in ['true', '1', 'yes', 'はい']
                                }

                                serializer = SupplierCreateUpdateSerializer(data=supplier_data)
                                if serializer.is_valid():
                                    supplier = serializer.save()
                                    created_suppliers[supplier_code] = supplier
                                else:
                                    errors.append({
                                        'row': row_num,
                                        'error': serializer.errors
                                    })
                                    continue

                        # 拠点情報があれば登録
                        if has_branch_info:
                            # 既存の拠点コードチェック
                            if SupplierBranch.objects.filter(branch_code=branch_code).exists():
                                errors.append({
                                    'row': row_num,
                                    'error': f"拠点コード '{branch_code}' は既に存在します"
                                })
                                continue

                            branch_data = {
                                'supplier': supplier.id,
                                'branch_code': branch_code,
                                'branch_name': branch_name,
                                'branch_type': row.get('branch_type', 'BRANCH').strip(),
                                'postal_code': row.get('postal_code', '').strip() or None,
                                'address': row.get('address', '').strip() or None,
                                'phone_number': row.get('phone_number', '').strip() or None,
                                'fax_number': row.get('fax_number', '').strip() or None,
                                'email': row.get('email', '').strip() or None,
                                'notes': row.get('branch_notes', '').strip() or None,
                                'is_active': row.get('is_active', 'true').lower() in ['true', '1', 'yes', 'はい']
                            }

                            branch_serializer = SupplierBranchCreateUpdateSerializer(data=branch_data)
                            if branch_serializer.is_valid():
                                branch = branch_serializer.save()
                                created_items.append({
                                    'row': row_num,
                                    'supplier_code': supplier.supplier_code,
                                    'company_name': supplier.company_name,
                                    'branch_code': branch.branch_code,
                                    'branch_name': branch.branch_name
                                })
                            else:
                                errors.append({
                                    'row': row_num,
                                    'error': branch_serializer.errors
                                })
                                continue
                        else:
                            # 拠点情報なしの場合（仕入先のみ登録）
                            created_items.append({
                                'row': row_num,
                                'supplier_code': supplier.supplier_code,
                                'company_name': supplier.company_name,
                                'branch_code': None,
                                'branch_name': None
                            })

                        success_count += 1

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
                'message': f'{success_count}件のサプライヤー/拠点を登録しました',
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


class SupplierCSVTemplateView(APIView):
    """サプライヤーCSVテンプレートダウンロードビュー（仕入先＋拠点情報統合）"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """CSVテンプレートをダウンロード"""
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="supplier_template.csv"'

        writer = csv.writer(response)
        # ヘッダー行（仕入先情報 + 拠点情報）
        writer.writerow([
            'supplier_code', 'company_name', 'website', 'supplier_notes',
            'branch_code', 'branch_name', 'branch_type',
            'postal_code', 'address', 'phone_number', 'fax_number', 'email',
            'branch_notes', 'is_active'
        ])
        # 説明行（日本語）
        writer.writerow([
            '# 仕入先コード（必須）', '企業名（必須）', 'ウェブサイト', '仕入先備考',
            '拠点コード', '拠点名', '拠点種別（HEAD_OFFICE/BRANCH/FACTORY等）',
            '郵便番号', '住所', '電話番号', 'FAX番号', 'メール',
            '拠点備考', '有効（true/false）'
        ])
        # サンプルデータ行1（仕入先 + 拠点）
        writer.writerow([
            'SUP001', '株式会社サプライヤー', 'https://example.com', '主要取引先',
            'SUP001-HQ', '本社', 'HEAD_OFFICE',
            '100-0001', '東京都千代田区千代田1-1', '03-1234-5678', '03-1234-5679',
            'info@supplier.com', '主要拠点', 'true'
        ])
        # サンプルデータ行2（同じ仕入先の別拠点）
        writer.writerow([
            'SUP001', '株式会社サプライヤー', '', '',
            'SUP001-OSK', '大阪支店', 'BRANCH',
            '530-0001', '大阪府大阪市北区1-1', '06-1234-5678', '',
            'osaka@supplier.com', '', 'true'
        ])

        return response


class SupplierBranchBulkImportView(APIView):
    """サプライヤー拠点一括登録ビュー"""
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
                        if not row.get('supplier_code'):
                            errors.append({
                                'row': row_num,
                                'error': 'サプライヤーコードは必須です'
                            })
                            continue

                        if not row.get('branch_code'):
                            errors.append({
                                'row': row_num,
                                'error': '拠点コードは必須です'
                            })
                            continue

                        if not row.get('branch_name'):
                            errors.append({
                                'row': row_num,
                                'error': '拠点名は必須です'
                            })
                            continue

                        # サプライヤーの検索
                        try:
                            supplier = Supplier.objects.get(
                                supplier_code=row.get('supplier_code', '').strip()
                            )
                        except Supplier.DoesNotExist:
                            errors.append({
                                'row': row_num,
                                'error': f"サプライヤーコード '{row.get('supplier_code')}' が見つかりません"
                            })
                            continue

                        # データの準備
                        branch_data = {
                            'supplier': supplier.id,
                            'branch_code': row.get('branch_code', '').strip(),
                            'branch_name': row.get('branch_name', '').strip(),
                            'branch_type': row.get('branch_type', 'BRANCH').strip(),
                            'postal_code': row.get('postal_code', '').strip() or None,
                            'address': row.get('address', '').strip() or None,
                            'phone_number': row.get('phone_number', '').strip() or None,
                            'fax_number': row.get('fax_number', '').strip() or None,
                            'email': row.get('email', '').strip() or None,
                            'notes': row.get('notes', '').strip() or None,
                            'is_active': row.get('is_active', 'true').lower() in ['true', '1', 'yes', 'はい']
                        }

                        # シリアライザーでバリデーション
                        serializer = SupplierBranchCreateUpdateSerializer(data=branch_data)
                        if serializer.is_valid():
                            branch = serializer.save()
                            created_items.append({
                                'row': row_num,
                                'branch_code': branch.branch_code,
                                'branch_name': branch.branch_name
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
                'message': f'{success_count}件の拠点を登録しました',
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


class SupplierBranchCSVTemplateView(APIView):
    """サプライヤー拠点CSVテンプレートダウンロードビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """CSVテンプレートをダウンロード"""
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="supplier_branch_template.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'supplier_code', 'branch_code', 'branch_name', 'branch_type',
            'postal_code', 'address', 'phone_number', 'fax_number', 'email', 'notes', 'is_active'
        ])
        writer.writerow([
            'SUP001', 'HQ', '本社', 'HEAD_OFFICE', '100-0001',
            '東京都千代田区千代田1-1', '03-1234-5678', '03-1234-5679',
            'info@example.com', '備考欄', 'true'
        ])

        return response


class SupplierContactBulkImportView(APIView):
    """サプライヤー担当者一括登録ビュー"""
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
                        if not row.get('branch_code'):
                            errors.append({
                                'row': row_num,
                                'error': '拠点コードは必須です'
                            })
                            continue

                        if not row.get('name'):
                            errors.append({
                                'row': row_num,
                                'error': '担当者名は必須です'
                            })
                            continue

                        # 拠点の検索
                        try:
                            branch = SupplierBranch.objects.get(
                                branch_code=row.get('branch_code', '').strip()
                            )
                        except SupplierBranch.DoesNotExist:
                            errors.append({
                                'row': row_num,
                                'error': f"拠点コード '{row.get('branch_code')}' が見つかりません"
                            })
                            continue

                        # データの準備
                        contact_data = {
                            'branch': branch.id,
                            'name': row.get('name', '').strip(),
                            'name_kana': row.get('name_kana', '').strip() or None,
                            'department': row.get('department', '').strip() or None,
                            'position': row.get('position', '').strip() or None,
                            'email': row.get('email', '').strip() or None,
                            'phone_number': row.get('phone_number', '').strip() or None,
                            'mobile_number': row.get('mobile_number', '').strip() or None,
                            'extension_number': row.get('extension_number', '').strip() or None,
                            'responsibility': row.get('responsibility', 'GENERAL').strip(),
                            'responsibility_detail': row.get('responsibility_detail', '').strip() or None,
                            'is_primary': row.get('is_primary', 'false').lower() in ['true', '1', 'yes', 'はい'],
                            'is_active': row.get('is_active', 'true').lower() in ['true', '1', 'yes', 'はい']
                        }

                        # シリアライザーでバリデーション
                        serializer = SupplierContactCreateUpdateSerializer(data=contact_data)
                        if serializer.is_valid():
                            contact = serializer.save()
                            created_items.append({
                                'row': row_num,
                                'name': contact.name,
                                'branch': branch.branch_name
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
                'message': f'{success_count}件の担当者を登録しました',
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


class SupplierContactCSVTemplateView(APIView):
    """サプライヤー担当者CSVテンプレートダウンロードビュー"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """CSVテンプレートをダウンロード"""
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="supplier_contact_template.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'branch_code', 'name', 'name_kana', 'department', 'position',
            'email', 'phone_number', 'mobile_number', 'extension_number',
            'responsibility', 'responsibility_detail', 'is_primary', 'is_active'
        ])
        writer.writerow([
            'HQ', '山田太郎', 'ヤマダタロウ', '営業部', '部長',
            'yamada@example.com', '03-1234-5678', '090-1234-5678', '101',
            'QUOTATION', '見積担当', 'true', 'true'
        ])

        return response
