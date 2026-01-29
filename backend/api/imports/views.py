# api/imports/views.py
# 輸入管理ビュー

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    ImportPurchaseOrder,
    ImportPurchaseOrderItem,
    ImportInvoice,
    ImportInvoiceItem,
    ImportFile,
)
from .serializers import (
    ImportPurchaseOrderListSerializer,
    ImportPurchaseOrderDetailSerializer,
    ImportPurchaseOrderCreateSerializer,
    ImportPurchaseOrderItemSerializer,
    ImportInvoiceListSerializer,
    ImportInvoiceDetailSerializer,
    ImportInvoiceCreateSerializer,
    ImportInvoiceItemSerializer,
    ImportFileSerializer,
    ImportFileUploadSerializer,
    RegisterSemiFinishedInventorySerializer,
    PartNumberMatchSerializer,
)


class ImportPurchaseOrderViewSet(viewsets.ModelViewSet):
    """輸入発注ViewSet"""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['supplier_branch', 'status', 'currency']
    search_fields = ['po_number', 'notes', 'tracking_number']
    ordering_fields = ['order_date', 'expected_arrival_date', 'created_at']
    ordering = ['-order_date', '-created_at']

    def get_queryset(self):
        queryset = ImportPurchaseOrder.objects.select_related(
            'supplier_branch',
            'supplier_branch__supplier',
            'created_by',
        ).prefetch_related('items')

        # 集計情報を付加
        queryset = queryset.annotate(
            total_items_count=Count('items'),
            total_quantity_sum=Sum('items__quantity'),
            total_amount_sum=Sum('items__amount'),
        )

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ImportPurchaseOrderListSerializer
        elif self.action == 'retrieve':
            return ImportPurchaseOrderDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ImportPurchaseOrderCreateSerializer
        return ImportPurchaseOrderDetailSerializer

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """ステータス更新"""
        po = self.get_object()
        new_status = request.data.get('status')

        if new_status not in dict(ImportPurchaseOrder.POStatus.choices):
            return Response(
                {'error': '無効なステータスです'},
                status=status.HTTP_400_BAD_REQUEST
            )

        po.status = new_status
        po.save(update_fields=['status', 'updated_at'])

        serializer = ImportPurchaseOrderDetailSerializer(po)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """PO明細一覧"""
        po = self.get_object()
        items = po.items.all()
        serializer = ImportPurchaseOrderItemSerializer(items, many=True)
        return Response(serializer.data)


class ImportInvoiceViewSet(viewsets.ModelViewSet):
    """インボイスViewSet"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['supplier_branch', 'status', 'currency', 'registered_as_semi_finished']
    search_fields = ['invoice_number', 'notes']
    ordering_fields = ['invoice_date', 'received_date', 'created_at']
    ordering = ['-invoice_date', '-created_at']

    def get_queryset(self):
        queryset = ImportInvoice.objects.select_related(
            'supplier_branch',
            'supplier_branch__supplier',
            'created_by',
        ).prefetch_related('items', 'files', 'linked_pos')

        # 集計情報を付加
        queryset = queryset.annotate(
            total_items_count=Count('items'),
            total_quantity_sum=Sum('items__quantity'),
        )

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ImportInvoiceListSerializer
        elif self.action == 'retrieve':
            return ImportInvoiceDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ImportInvoiceCreateSerializer
        return ImportInvoiceDetailSerializer

    @action(detail=True, methods=['post'], url_path='link-pos')
    def link_pos(self, request, pk=None):
        """PO紐付け"""
        invoice = self.get_object()
        po_ids = request.data.get('po_ids', [])

        pos = ImportPurchaseOrder.objects.filter(id__in=po_ids)
        invoice.linked_pos.set(pos)

        serializer = ImportInvoiceDetailSerializer(invoice)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='upload-file', parser_classes=[MultiPartParser, FormParser])
    def upload_file(self, request, pk=None):
        """ファイルアップロード"""
        invoice = self.get_object()

        serializer = ImportFileUploadSerializer(
            data=request.data,
            context={'request': request, 'invoice': invoice}
        )

        if serializer.is_valid():
            import_file = serializer.save()
            return Response(
                ImportFileSerializer(import_file).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """ファイル一覧"""
        invoice = self.get_object()
        files = invoice.files.all()
        serializer = ImportFileSerializer(files, many=True)
        return Response(serializer.data)

    @action(detail=True, url_path='files/(?P<file_id>[^/.]+)', methods=['get', 'delete'])
    def file_detail(self, request, pk=None, file_id=None):
        """ファイル詳細・削除"""
        invoice = self.get_object()
        import_file = get_object_or_404(ImportFile, id=file_id, import_invoice=invoice)

        if request.method == 'DELETE':
            # ファイル削除
            import_file.file.delete(save=False)
            import_file.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = ImportFileSerializer(import_file)
        return Response(serializer.data)

    @action(detail=True, url_path='files/(?P<file_id>[^/.]+)/download', methods=['get'])
    def download_file(self, request, pk=None, file_id=None):
        """ファイルダウンロード"""
        invoice = self.get_object()
        import_file = get_object_or_404(ImportFile, id=file_id, import_invoice=invoice)

        from django.http import FileResponse

        try:
            response = FileResponse(
                import_file.file.open('rb'),
                as_attachment=True,
                filename=import_file.original_filename
            )
            return response
        except Exception as e:
            return Response(
                {'error': f'ファイルのダウンロードに失敗しました: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='register-inventory')
    def register_inventory(self, request, pk=None):
        """半製品在庫登録"""
        invoice = self.get_object()

        serializer = RegisterSemiFinishedInventorySerializer()
        result = serializer.register_inventory(invoice)

        return Response(result)

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """インボイス明細一覧"""
        invoice = self.get_object()
        items = invoice.items.all()
        serializer = ImportInvoiceItemSerializer(items, many=True)
        return Response(serializer.data)


class ImportFileViewSet(viewsets.ModelViewSet):
    """インポートファイルViewSet"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    queryset = ImportFile.objects.select_related(
        'import_invoice',
        'uploaded_by',
    )
    serializer_class = ImportFileSerializer
    filterset_fields = ['import_invoice', 'file_type']
    ordering = ['-uploaded_at']


class OCRViewSet(viewsets.ViewSet):
    """OCR関連ViewSet"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def match_parts(self, request):
        """品番マッチング"""
        serializer = PartNumberMatchSerializer(data=request.data)

        if serializer.is_valid():
            results = serializer.match_parts(serializer.validated_data)
            return Response(results)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def extract(self, request):
        """OCR抽出（サーバーサイドOCR - 将来拡張用）

        現在はフロントエンドでtesseract.jsを使用してOCR処理を行っているため、
        このエンドポイントは将来のサーバーサイドOCR実装用に予約。
        """
        return Response({
            'message': 'OCR処理はクライアントサイドで実行されます。',
            'client_side': True,
        })
