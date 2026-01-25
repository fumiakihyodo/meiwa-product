// app/import/page.tsx
// 輸入管理ページ

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Container,
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
    Tooltip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    MoreVert as MoreVertIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    Receipt as ReceiptIcon,
    LocalShipping as ShippingIcon,
    Description as DescriptionIcon,
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

    // モーダル状態
    const [poModalOpen, setPoModalOpen] = useState(false);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState<ImportPO | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<ImportInvoice | null>(null);

    // メニュー状態
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [menuTarget, setMenuTarget] = useState<{ type: 'po' | 'invoice'; data: ImportPO | ImportInvoice } | null>(null);

    // データ読み込み（モック）
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // 実際のAPIが実装されたらここを置き換える
            // const [posData, invoicesData] = await Promise.all([
            //     importApi.po.getImportPOs({ search: searchQuery }),
            //     importApi.invoice.getImportInvoices({ search: searchQuery }),
            // ]);

            // モックデータ
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
            // if (selectedPO) {
            //     await importApi.po.updateImportPO(selectedPO.id, data);
            // } else {
            //     await importApi.po.createImportPO(data);
            // }

            // モック処理
            const newPO: ImportPO = {
                id: Date.now(),
                po_number: `IPO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(purchaseOrders.length + 1).padStart(4, '0')}`,
                supplier_branch: data.supplier_branch,
                order_date: data.order_date || new Date().toISOString().split('T')[0],
                expected_ship_date: data.expected_ship_date,
                expected_arrival_date: data.expected_arrival_date,
                status: 'draft',
                total_items: data.items?.length || 0,
                total_quantity: data.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
                currency: data.currency,
                notes: data.notes,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            setPurchaseOrders((prev) => [...prev, newPO]);
            setPoModalOpen(false);
            setSelectedPO(null);
        } catch (error) {
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
            // const invoice = selectedInvoice
            //     ? await importApi.invoice.updateImportInvoice(selectedInvoice.id, data)
            //     : await importApi.invoice.createImportInvoice(data);
            //
            // // ファイルアップロード
            // for (const { type, file } of files) {
            //     await importApi.invoice.uploadFile(invoice.id, type, file);
            // }
            //
            // // 半製品在庫登録
            // if (registerAsSemiFinished) {
            //     await importApi.invoice.registerSemiFinishedInventory(invoice.id);
            // }

            // モック処理
            const newInvoice: ImportInvoice = {
                id: Date.now(),
                invoice_number: data.invoice_number || `INV-${Date.now()}`,
                supplier_branch: data.supplier_branch,
                invoice_date: data.invoice_date,
                received_date: data.received_date,
                status: 'completed',
                linked_po_ids: data.linked_po_ids,
                total_items: data.items?.length || 0,
                total_quantity: data.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
                currency: data.currency,
                notes: data.notes,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            setInvoices((prev) => [...prev, newInvoice]);
            setInvoiceModalOpen(false);
            setSelectedInvoice(null);
        } catch (error) {
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
                // await importApi.po.deleteImportPO(menuTarget.data.id);
                setPurchaseOrders((prev) => prev.filter((p) => p.id !== menuTarget.data.id));
                toast.success('POを削除しました');
            } else {
                // await importApi.invoice.deleteImportInvoice(menuTarget.data.id);
                setInvoices((prev) => prev.filter((i) => i.id !== menuTarget.data.id));
                toast.success('インボイスを削除しました');
            }
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
                            海外サプライヤーからのPO・インボイス管理、OCR登録
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
                            インボイス登録 (OCR)
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
                                インボイスがありません。「インボイス登録 (OCR)」ボタンから登録してください。
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
                                            <TableCell>ステータス</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {invoices.map((invoice) => (
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
                                                    {invoice.linked_po_ids && invoice.linked_po_ids.length > 0 ? (
                                                        <Chip
                                                            label={`${invoice.linked_po_ids.length}件`}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    ) : (
                                                        '-'
                                                    )}
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
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
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
