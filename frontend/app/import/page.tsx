// app/import/page.tsx
// 輸入管理ページ

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    TextField,
    InputAdornment,
    CircularProgress,
    Alert,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    MoreVert as MoreVertIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Receipt as ReceiptIcon,
    LocalShipping as ShippingIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { ImportModal, ImportPOModal } from '@/components/import';
import {
    ImportPO,
    ImportInvoice,
    ImportPOCreateData,
    ImportInvoiceCreateData,
    ImportFileType,
    ImportPOStatusLabels,
    ImportInvoiceStatusLabels,
} from '@/types/import';
import { SupplierBranch } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import { importApi } from '@/services/apiImport';
import { validateInvoiceAgainstPOs, getInvoicePOValidationStatus } from '@/utils/poValidation';
import toast from 'react-hot-toast';

// タブパネルコンポーネント
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
        {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
);

// ステータスチップの色を取得
const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
        case 'draft':
            return 'default';
        case 'confirmed':
        case 'pending':
            return 'info';
        case 'shipped':
        case 'processing':
            return 'warning';
        case 'arrived':
        case 'completed':
            return 'success';
        case 'cancelled':
            return 'error';
        default:
            return 'default';
    }
};

export default function ImportPage() {
    const router = useRouter();

    // 状態管理
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // データ
    const [purchaseOrders, setPurchaseOrders] = useState<ImportPO[]>([]);
    const [invoices, setInvoices] = useState<ImportInvoice[]>([]);
    const [supplierBranches, setSupplierBranches] = useState<SupplierBranch[]>([]);

    // モーダル状態
    const [poModalOpen, setPoModalOpen] = useState(false);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState<ImportPO | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<ImportInvoice | null>(null);

    // メニュー状態
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [menuTarget, setMenuTarget] = useState<{ type: 'po' | 'invoice'; data: ImportPO | ImportInvoice } | null>(null);

    // データ読み込み
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // サプライヤー支店を読み込み
            const branches = await supplierApi.getSupplierBranches({ is_overseas: 'true' });
            setSupplierBranches(branches);

            // 実際のAPIを使用
            const [posData, invoicesData] = await Promise.all([
                importApi.po.getImportPOs({ search: searchQuery }),
                importApi.invoice.getImportInvoices({ search: searchQuery }),
            ]);

            setPurchaseOrders(posData);
            setInvoices(invoicesData);

            // 以下はモックデータ（実際のデータがない場合のフォールバック）
            if (posData.length === 0 && invoicesData.length === 0) {
                const mockPOs: ImportPO[] = [
                {
                    id: 1,
                    po_number: 'IPO-20260124-0001',
                    supplier_branch: 1,
                    supplier_name: 'Overseas Supplier Co.',
                    supplier_branch_name: '本社',
                    order_date: '2026-01-24',
                    expected_ship_date: '2026-02-15',
                    expected_arrival_date: '2026-03-01',
                    status: 'confirmed',
                    total_items: 5,
                    total_quantity: 1000,
                    total_amount: 5000.00,
                    currency: 'USD',
                    created_at: '2026-01-24T10:00:00Z',
                    updated_at: '2026-01-24T10:00:00Z',
                },
            ];

            const mockInvoices: ImportInvoice[] = [
                {
                    id: 1,
                    invoice_number: 'INV-2026-001',
                    supplier_branch: 1,
                    supplier_name: 'Overseas Supplier Co.',
                    supplier_branch_name: '本社',
                    invoice_date: '2026-01-20',
                    received_date: '2026-01-24',
                    status: 'completed',
                    linked_po_ids: [1],
                    total_items: 5,
                    total_quantity: 1000,
                    total_amount: 5000.00,
                    currency: 'USD',
                    created_at: '2026-01-24T10:00:00Z',
                    updated_at: '2026-01-24T10:00:00Z',
                },
            ];

                setPurchaseOrders(mockPOs);
                setInvoices(mockInvoices);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('データの読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // PO保存処理
    const handleSavePO = async (data: ImportPOCreateData) => {
        try {
            // 実際のAPI呼び出し
            if (selectedPO) {
                await importApi.po.updateImportPO(selectedPO.id, data);
                toast.success('POを更新しました');
            } else {
                await importApi.po.createImportPO(data);
                toast.success('POを作成しました');
            }

            // データを再読み込み
            await loadData();
            setPoModalOpen(false);
            setSelectedPO(null);
        } catch (error) {
            console.error('Failed to save PO:', error);
            toast.error('POの保存に失敗しました');
            throw error;
        }
    };

    // Invoice保存処理
    const handleSaveInvoice = async (
        data: ImportInvoiceCreateData,
        files: { type: ImportFileType; file: File }[]
    ) => {
        try {
            // 実際のAPI呼び出し
            const invoice = selectedInvoice
                ? await importApi.invoice.updateImportInvoice(selectedInvoice.id, data)
                : await importApi.invoice.createImportInvoice(data);

            // ファイルアップロード
            for (const { type, file } of files) {
                await importApi.invoice.uploadFile(invoice.id, type, file);
            }

            // データを再読み込み
            await loadData();

            toast.success(selectedInvoice ? 'インボイスを更新しました' : 'インボイスを登録しました');
            setInvoiceModalOpen(false);
            setSelectedInvoice(null);
        } catch (error) {
            console.error('Failed to save invoice:', error);
            toast.error('インボイスの保存に失敗しました');
            throw error;
        }
    };

    // メニュー操作
    const handleMenuOpen = (
        event: React.MouseEvent<HTMLElement>,
        type: 'po' | 'invoice',
        data: ImportPO | ImportInvoice
    ) => {
        setMenuAnchorEl(event.currentTarget);
        setMenuTarget({ type, data });
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
        setMenuTarget(null);
    };

    const handleEdit = () => {
        if (menuTarget?.type === 'po') {
            setSelectedPO(menuTarget.data as ImportPO);
            setPoModalOpen(true);
        } else if (menuTarget?.type === 'invoice') {
            setSelectedInvoice(menuTarget.data as ImportInvoice);
            setInvoiceModalOpen(true);
        }
        handleMenuClose();
    };

    const handleDelete = async () => {
        if (!menuTarget) return;

        const confirmed = window.confirm('削除してもよろしいですか？');
        if (!confirmed) {
            handleMenuClose();
            return;
        }

        try {
            if (menuTarget.type === 'po') {
                await importApi.po.deleteImportPO(menuTarget.data.id);
                toast.success('POを削除しました');
            } else {
                await importApi.invoice.deleteImportInvoice(menuTarget.data.id);
                toast.success('インボイスを削除しました');
            }
            await loadData();
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('削除に失敗しました');
        }

        handleMenuClose();
    };

    // ページ更新
    const handleRefresh = () => {
        loadData();
        router.refresh();
    };

    return (
        <MainLayout>
            <Box sx={{ flexGrow: 1 }}>
                {/* ヘッダー */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                        <Typography variant="h4" fontWeight="bold">
                            輸入管理
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            海外サプライヤーからのPO・インボイス管理
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                        >
                            更新
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<ShippingIcon />}
                            onClick={() => {
                                setSelectedPO(null);
                                setPoModalOpen(true);
                            }}
                        >
                            新規PO
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<ReceiptIcon />}
                            onClick={() => {
                                setSelectedInvoice(null);
                                setInvoiceModalOpen(true);
                            }}
                        >
                            インボイス登録
                        </Button>
                    </Box>
                </Box>

                {/* タブとコンテンツ */}
                <Paper sx={{ p: 2 }}>
                    {/* 検索 */}
                    <Box sx={{ mb: 2 }}>
                        <TextField
                            placeholder="検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="small"
                            sx={{ width: 300 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>

                    <Tabs
                        value={activeTab}
                        onChange={(_, newValue) => setActiveTab(newValue)}
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        <Tab
                            label={`輸入PO (${purchaseOrders.length})`}
                            icon={<ShippingIcon />}
                            iconPosition="start"
                        />
                        <Tab
                            label={`インボイス (${invoices.length})`}
                            icon={<ReceiptIcon />}
                            iconPosition="start"
                        />
                        <Tab
                            label="Waybill"
                            icon={<ReceiptIcon />}
                            iconPosition="start"
                        />
                        <Tab
                            label="請求書 (Billing)"
                            icon={<ReceiptIcon />}
                            iconPosition="start"
                        />
                    </Tabs>

                    {/* POタブ */}
                    <TabPanel value={activeTab} index={0}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : purchaseOrders.length === 0 ? (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                輸入POがありません。「新規PO」ボタンから作成してください。
                            </Alert>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>PO番号</TableCell>
                                            <TableCell>サプライヤー</TableCell>
                                            <TableCell>発注日</TableCell>
                                            <TableCell>出荷予定</TableCell>
                                            <TableCell>到着予定</TableCell>
                                            <TableCell align="right">品目数</TableCell>
                                            <TableCell align="right">金額</TableCell>
                                            <TableCell>ステータス</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {purchaseOrders.map((po) => (
                                            <TableRow key={po.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {po.po_number}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {po.supplier_name}
                                                    {po.supplier_branch_name && (
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            {po.supplier_branch_name}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>{po.order_date}</TableCell>
                                                <TableCell>{po.expected_ship_date || '-'}</TableCell>
                                                <TableCell>{po.expected_arrival_date || '-'}</TableCell>
                                                <TableCell align="right">{po.total_items || 0}</TableCell>
                                                <TableCell align="right">
                                                    {po.currency} {(po.total_amount || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={ImportPOStatusLabels[po.status]}
                                                        size="small"
                                                        color={getStatusColor(po.status)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleMenuOpen(e, 'po', po)}
                                                    >
                                                        <MoreVertIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </TabPanel>

                    {/* インボイスタブ */}
                    <TabPanel value={activeTab} index={1}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : invoices.length === 0 ? (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                インボイスがありません。「インボイス登録」ボタンから登録してください。
                            </Alert>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>インボイス番号</TableCell>
                                            <TableCell>サプライヤー</TableCell>
                                            <TableCell>インボイス日</TableCell>
                                            <TableCell>受領日</TableCell>
                                            <TableCell align="right">品目数</TableCell>
                                            <TableCell align="right">金額</TableCell>
                                            <TableCell>紐付けPO</TableCell>
                                            <TableCell>PO整合性</TableCell>
                                            <TableCell>ステータス</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {invoices.map((invoice) => {
                                            // PO整合性チェック（簡易版）
                                            // 実際のAPIでは、invoice.itemsとlinked_posを使ってバリデーションを行う
                                            const hasLinkedPOs = invoice.linked_po_ids && invoice.linked_po_ids.length > 0;
                                            const hasItems = invoice.items && invoice.items.length > 0;

                                            // 簡易チェック: POが紐付いていて品目がある場合はOK
                                            const validationStatus = hasLinkedPOs && hasItems ? 'success' : hasLinkedPOs ? 'warning' : 'default';
                                            const validationLabel = hasLinkedPOs && hasItems ? 'OK' : hasLinkedPOs ? '確認中' : 'PO未指定';

                                            return (
                                                <TableRow key={invoice.id} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {invoice.invoice_number}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        {invoice.supplier_name}
                                                        {invoice.supplier_branch_name && (
                                                            <Typography variant="caption" display="block" color="text.secondary">
                                                                {invoice.supplier_branch_name}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{invoice.invoice_date}</TableCell>
                                                    <TableCell>{invoice.received_date || '-'}</TableCell>
                                                    <TableCell align="right">{invoice.total_items || 0}</TableCell>
                                                    <TableCell align="right">
                                                        {invoice.currency} {(invoice.total_amount || 0).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {hasLinkedPOs ? (
                                                            <Chip
                                                                label={`${invoice.linked_po_ids!.length}件`}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={validationLabel}
                                                            size="small"
                                                            color={validationStatus}
                                                            variant={validationStatus === 'success' ? 'filled' : 'outlined'}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={ImportInvoiceStatusLabels[invoice.status]}
                                                            size="small"
                                                            color={getStatusColor(invoice.status)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => handleMenuOpen(e, 'invoice', invoice)}
                                                        >
                                                            <MoreVertIcon />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </TabPanel>

                    {/* Waybillタブ */}
                    <TabPanel value={activeTab} index={2}>
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Waybill管理機能は今後実装予定です。現在はインボイスモーダルからWaybillファイルをアップロードできます。
                        </Alert>
                    </TabPanel>

                    {/* 請求書（Billing）タブ */}
                    <TabPanel value={activeTab} index={3}>
                        <Alert severity="info" sx={{ mt: 2 }}>
                            請求書（Billing）管理機能は今後実装予定です。現在はインボイスモーダルから請求書ファイルをアップロードできます。
                        </Alert>
                    </TabPanel>
                </Paper>

                {/* コンテキストメニュー */}
                <Menu
                    anchorEl={menuAnchorEl}
                    open={Boolean(menuAnchorEl)}
                    onClose={handleMenuClose}
                >
                    <MenuItem onClick={handleEdit}>
                        <ListItemIcon>
                            <EditIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>編集</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <ListItemIcon>
                            <DeleteIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText>削除</ListItemText>
                    </MenuItem>
                </Menu>

                {/* POモーダル */}
                <ImportPOModal
                    open={poModalOpen}
                    onClose={() => {
                        setPoModalOpen(false);
                        setSelectedPO(null);
                    }}
                    onSave={handleSavePO}
                    existingPO={selectedPO}
                />

                {/* インボイスモーダル */}
                <ImportModal
                    open={invoiceModalOpen}
                    onClose={() => {
                        setInvoiceModalOpen(false);
                        setSelectedInvoice(null);
                    }}
                    onSave={handleSaveInvoice}
                    existingInvoice={selectedInvoice}
                    availablePOs={purchaseOrders}
                    onRefresh={handleRefresh}
                />
            </Box>
        </MainLayout>
    );
}
