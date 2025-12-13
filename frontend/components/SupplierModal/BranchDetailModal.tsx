// components/SupplierModal/BranchDetailModal.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    Typography,
    Box,
    CircularProgress,
    Paper,
    TextField,
    Chip,
    FormControlLabel,
    Checkbox,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
} from '@mui/material';

import {
    Close as CloseIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Info as InfoIcon,
    Business as BusinessIcon,
    ContactPhone as ContactPhoneIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';

import { SupplierBranch, SupplierContact, BranchType } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import toast from 'react-hot-toast';
import { InfoRow } from '@/components/common/display/InfoRow';
import { SectionCard } from '@/components/common/display/SectionCard';
import { ContactFormModal } from '@/components/SupplierModal/ContactFormModal';

interface BranchDetailModalProps {
    open: boolean;
    onClose: () => void;
    branchId: number | null;
    onSuccess?: () => void;
    onDuplicate?: (branch: SupplierBranch) => void;
    initialEditMode?: boolean;
}

const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
    [BranchType.HEAD_OFFICE]: '本社',
    [BranchType.BRANCH]: '支店',
    [BranchType.SALES_OFFICE]: '営業所',
    [BranchType.FACTORY]: '工場',
    [BranchType.WAREHOUSE]: '倉庫',
    [BranchType.OTHER]: 'その他',
};

const RESPONSIBILITY_LABELS: Record<string, string> = {
    'QUOTATION': '見積',
    'ORDER': '発注',
    'DELIVERY': '納品',
    'TECHNICAL': '技術',
    'QUALITY': '品質',
    'ACCOUNTING': '経理',
    'GENERAL': '全般',
    'OTHER': 'その他',
};

const MemoizedTextField = React.memo(TextField);

export const BranchDetailModal: React.FC<BranchDetailModalProps> = ({
    open,
    onClose,
    branchId,
    onSuccess,
    onDuplicate,
    initialEditMode = false,
}) => {
    const [branch, setBranch] = useState<SupplierBranch | null>(null);
    const [contacts, setContacts] = useState<SupplierContact[]>([]);
    const [editedBranch, setEditedBranch] = useState<Partial<SupplierBranch>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(initialEditMode);
    
    // 連絡先モーダル管理
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [editContact, setEditContact] = useState<SupplierContact | null>(null);

    // 拠点詳細取得
    const fetchBranchDetails = useCallback(async () => {
        if (!branchId) return;

        setLoading(true);
        try {
            const branchData = await supplierApi.getSupplierBranch(branchId);
            setBranch(branchData);
            setEditedBranch(branchData);
            
            // 連絡先一覧取得
            const contactsData = await supplierApi.getSupplierContacts({ branch: branchId });
            setContacts(contactsData);
        } catch (error) {
            console.error('Branch fetch error:', error);
            toast.error('拠点詳細の取得に失敗しました');
            onClose();
        } finally {
            setLoading(false);
        }
    }, [branchId, onClose]);

    useEffect(() => {
        if (open && branchId) {
            fetchBranchDetails();
            setIsEditMode(initialEditMode);
        } else if (!open) {
            setBranch(null);
            setContacts([]);
            setIsEditMode(initialEditMode);
        }
    }, [open, branchId, fetchBranchDetails, initialEditMode]);

    // 編集モード切り替え
    const handleEditToggle = useCallback(() => {
        if (isEditMode && branch) {
            setEditedBranch({ ...branch });
        }
        setIsEditMode(!isEditMode);
    }, [isEditMode, branch]);

    // 保存処理
    const handleSave = useCallback(async () => {
        if (!branchId || !editedBranch) return;

        setSaving(true);
        try {
            await supplierApi.updateSupplierBranch(branchId, editedBranch);
            toast.success('拠点情報を更新しました');
            setIsEditMode(false);
            await fetchBranchDetails();
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Branch update error:', error);
            toast.error('拠点情報の更新に失敗しました');
        } finally {
            setSaving(false);
        }
    }, [branchId, editedBranch, fetchBranchDetails, onSuccess]);

    // 複製処理
    const handleDuplicate = useCallback(() => {
        if (branch && onDuplicate) {
            onDuplicate(branch);
        }
    }, [branch, onDuplicate]);

    // フィールド変更ハンドラー
    const handleFieldChange = useCallback((field: keyof SupplierBranch) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setEditedBranch(prev => ({ ...prev, [field]: e.target.value }));
    }, []);

    const handleIsActiveChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedBranch(prev => ({ ...prev, is_active: e.target.checked }));
    }, []);

    // 連絡先モーダル管理
    const handleOpenContactModal = useCallback((contact?: SupplierContact) => {
        setEditContact(contact || null);
        setContactModalOpen(true);
    }, []);

    const handleCloseContactModal = useCallback(() => {
        setContactModalOpen(false);
        setEditContact(null);
    }, []);

    const handleContactSuccess = useCallback(() => {
        fetchBranchDetails();
    }, [fetchBranchDetails]);

    // 連絡先削除
    const handleDeleteContact = useCallback(async (contactId: number) => {
        if (!window.confirm('この連絡先を削除してもよろしいですか?')) return;

        try {
            await supplierApi.deleteSupplierContact(contactId);
            toast.success('連絡先を削除しました');
            fetchBranchDetails();
        } catch (error) {
            console.error('Contact delete error:', error);
            toast.error('連絡先の削除に失敗しました');
        }
    }, [fetchBranchDetails]);

    if (!branch && !loading) return null;

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        maxHeight: '90vh',
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        pb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon color="primary" />
                        <Typography variant="h6">
                            {isEditMode ? '拠点編集' : '拠点詳細'}
                        </Typography>
                        {branch?.is_active !== undefined && (
                            <Chip
                                label={branch.is_active ? '有効' : '無効'}
                                color={branch.is_active ? 'success' : 'default'}
                                size="small"
                            />
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {!isEditMode && (
                            <>
                                <Tooltip title="複製">
                                    <IconButton onClick={handleDuplicate} size="small">
                                        <ContentCopyIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="編集">
                                    <IconButton onClick={handleEditToggle} size="small">
                                        <EditIcon />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ pt: 3 }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                            <CircularProgress />
                        </Box>
                    ) : branch ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* 基本情報 */}
                            <SectionCard isEditMode={isEditMode} icon={<InfoIcon />} title="基本情報">
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={isEditMode}
                                            label="仕入先名"
                                            value={branch.supplier_name || '-'}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={isEditMode}
                                            label="拠点コード"
                                            value={branch.branch_code || '-'}
                                            editComponent={
                                                <MemoizedTextField
                                                    fullWidth
                                                    size="small"
                                                    value={editedBranch.branch_code || ''}
                                                    onChange={handleFieldChange('branch_code')}
                                                    disabled={saving}
                                                />
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={isEditMode}
                                            label="拠点名"
                                            value={branch.branch_name || '-'}
                                            editComponent={
                                                <MemoizedTextField
                                                    fullWidth
                                                    size="small"
                                                    value={editedBranch.branch_name || ''}
                                                    onChange={handleFieldChange('branch_name')}
                                                    disabled={saving}
                                                />
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={isEditMode}
                                            label="拠点種別"
                                            value={BRANCH_TYPE_LABELS[branch.branch_type] || '-'}
                                        />
                                    </Grid>
                                </Grid>
                            </SectionCard>

                            {/* 連絡先情報 */}
                            <SectionCard isEditMode={isEditMode} icon={<ContactPhoneIcon />} title="連絡先情報">
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={isEditMode}
                                            label="郵便番号"
                                            value={branch.postal_code || '-'}
                                            editComponent={
                                                <MemoizedTextField
                                                    fullWidth
                                                    size="small"
                                                    value={editedBranch.postal_code || ''}
                                                    onChange={handleFieldChange('postal_code')}
                                                    disabled={saving}
                                                />
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <InfoRow
                                            isEditMode={isEditMode}
                                            label="住所"
                                            value={branch.address || '-'}
                                            editComponent={
                                                <MemoizedTextField
                                                    fullWidth
                                                    size="small"
                                                    multiline
                                                    rows={2}
                                                    value={editedBranch.address || ''}
                                                    onChange={handleFieldChange('address')}
                                                    disabled={saving}
                                                />
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={isEditMode}
                                            label="電話番号"
                                            value={branch.phone_number || '-'}
                                            editComponent={
                                                <MemoizedTextField
                                                    fullWidth
                                                    size="small"
                                                    value={editedBranch.phone_number || ''}
                                                    onChange={handleFieldChange('phone_number')}
                                                    disabled={saving}
                                                />
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={isEditMode}
                                            label="FAX番号"
                                            value={branch.fax_number || '-'}
                                            editComponent={
                                                <MemoizedTextField
                                                    fullWidth
                                                    size="small"
                                                    value={editedBranch.fax_number || ''}
                                                    onChange={handleFieldChange('fax_number')}
                                                    disabled={saving}
                                                />
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <InfoRow
                                            isEditMode={isEditMode}
                                            label="メールアドレス"
                                            value={branch.email || '-'}
                                            editComponent={
                                                <MemoizedTextField
                                                    fullWidth
                                                    size="small"
                                                    value={editedBranch.email || ''}
                                                    onChange={handleFieldChange('email')}
                                                    disabled={saving}
                                                />
                                            }
                                        />
                                    </Grid>
                                </Grid>
                            </SectionCard>

                            {/* 担当者一覧 */}
                            {!isEditMode && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <ContactPhoneIcon color="primary" />
                                            <Typography variant="h6">担当者一覧</Typography>
                                        </Box>
                                        <Button
                                            startIcon={<AddIcon />}
                                            variant="contained"
                                            size="small"
                                            onClick={() => handleOpenContactModal()}
                                        >
                                            担当者追加
                                        </Button>
                                    </Box>
                                    
                                    {contacts.length > 0 ? (
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>氏名</TableCell>
                                                        <TableCell>部署</TableCell>
                                                        <TableCell>役職</TableCell>
                                                        <TableCell>メール</TableCell>
                                                        <TableCell>電話番号</TableCell>
                                                        <TableCell>担当業務</TableCell>
                                                        <TableCell>状態</TableCell>
                                                        <TableCell align="right">操作</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {contacts.map((contact) => (
                                                        <TableRow key={contact.id}>
                                                            <TableCell>
                                                                {contact.name}
                                                                {contact.is_primary && (
                                                                    <Chip label="主担当" size="small" color="primary" sx={{ ml: 1 }} />
                                                                )}
                                                            </TableCell>
                                                            <TableCell>{contact.department || '-'}</TableCell>
                                                            <TableCell>{contact.position || '-'}</TableCell>
                                                            <TableCell>{contact.email || '-'}</TableCell>
                                                            <TableCell>{contact.phone_number || '-'}</TableCell>
                                                            <TableCell>{RESPONSIBILITY_LABELS[contact.responsibility] || contact.responsibility || '-'}</TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={contact.is_active ? '有効' : '無効'}
                                                                    color={contact.is_active ? 'success' : 'default'}
                                                                    size="small"
                                                                />
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleOpenContactModal(contact)}
                                                                >
                                                                    <EditIcon fontSize="small" />
                                                                </IconButton>
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => handleDeleteContact(contact.id)}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : (
                                        <Box sx={{ textAlign: 'center', py: 3 }}>
                                            <Typography color="text.secondary">
                                                担当者が登録されていません
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>
                            )}

                            {/* 備考 */}
                            <SectionCard isEditMode={isEditMode} icon={<InfoIcon />} title="備考">
                                <InfoRow
                                    isEditMode={isEditMode}
                                    label="備考詳細"
                                    value={
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                bgcolor: 'warning.50',
                                                borderRadius: 1.5,
                                                borderColor: 'warning.200',
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    whiteSpace: 'pre-wrap',
                                                    lineHeight: 1.8,
                                                }}
                                            >
                                                {branch.notes || '未設定'}
                                            </Typography>
                                        </Paper>
                                    }
                                    editComponent={
                                        <MemoizedTextField
                                            fullWidth
                                            multiline
                                            rows={4}
                                            value={editedBranch.notes || ''}
                                            onChange={handleFieldChange('notes')}
                                            disabled={saving}
                                            placeholder="備考を入力してください"
                                        />
                                    }
                                />
                            </SectionCard>

                            {/* メタ情報 */}
                            {!isEditMode && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        bgcolor: 'grey.100',
                                        border: '1px solid',
                                        borderColor: 'grey.300',
                                    }}
                                >
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                作成日時
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {new Date(branch.created_at).toLocaleString('ja-JP')}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                更新日時
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {new Date(branch.updated_at).toLocaleString('ja-JP')}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                            <Typography color="text.secondary" variant="h6">
                                拠点情報を読み込めませんでした
                            </Typography>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    {isEditMode ? (
                        <>
                            <Box sx={{ marginRight: 'auto', paddingLeft: 3 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={editedBranch.is_active || false}
                                            onChange={handleIsActiveChange}
                                            disabled={saving}
                                        />
                                    }
                                    label={editedBranch.is_active ? '有効' : '無効'}
                                />
                            </Box>
                            <Button
                                onClick={handleEditToggle}
                                startIcon={<CancelIcon />}
                                size="large"
                                disabled={saving}
                                sx={{ borderRadius: 1.5, px: 3 }}
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={handleSave}
                                startIcon={<SaveIcon />}
                                variant="contained"
                                size="large"
                                disabled={saving}
                                sx={{ borderRadius: 1.5, px: 3 }}
                            >
                                {saving ? '保存中...' : '更新'}
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={onClose}
                            startIcon={<CloseIcon />}
                            size="large"
                            sx={{ borderRadius: 1.5, px: 3 }}
                        >
                            閉じる
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* 連絡先追加・編集モーダル */}
            <ContactFormModal
                open={contactModalOpen}
                onClose={handleCloseContactModal}
                onSuccess={handleContactSuccess}
                editData={editContact}
                branchId={branchId || undefined}
            />
        </>
    );
};