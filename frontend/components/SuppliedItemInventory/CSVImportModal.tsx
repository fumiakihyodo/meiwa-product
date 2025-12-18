'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Stepper,
    Step,
    StepLabel,
    Alert,
    Typography,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Chip,
} from '@mui/material';
import { Upload as UploadIcon, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { purchasesApi } from '@/services/apiPurchases';
import { productApi } from '@/services/apiProduct';
import type {
    CSVParseResult,
    CSVParsedItem,
    UnregisteredPartNumber,
    SuggestedProduct,
    SuppliedItemList,
} from '@/types/purchases';
import type { Product } from '@/types/product';

interface CSVImportModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (list: SuppliedItemList) => void;
}

const steps = ['CSVアップロード', '製品選択', '確認', '完了'];

export default function CSVImportModal({ open, onClose, onSuccess }: CSVImportModalProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Product selection
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [registerUnregistered, setRegisterUnregistered] = useState(true);

    // 初期化
    React.useEffect(() => {
        if (open) {
            fetchProducts();
            resetState();
        }
    }, [open]);

    const resetState = () => {
        setActiveStep(0);
        setCsvFile(null);
        setParseResult(null);
        setError(null);
        setSelectedProductId(null);
        setRegisterUnregistered(true);
    };

    const fetchProducts = async () => {
        try {
            const data = await productApi.getProducts();
            setProducts(data);
        } catch (err) {
            console.error('製品取得エラー:', err);
        }
    };

    // Step 1: ファイルアップロード
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setCsvFile(file);
            setError(null);
        }
    };

    const handleParseCSV = async () => {
        if (!csvFile) return;

        setParsing(true);
        setError(null);

        try {
            const result = await purchasesApi.parseSuppliedItemCsv(csvFile);
            setParseResult(result);

            // 推奨製品があれば自動選択
            if (result.suggested_products && result.suggested_products.length > 0) {
                setSelectedProductId(result.suggested_products[0].id);
            }

            setActiveStep(1); // 次のステップへ
        } catch (err: any) {
            setError(err.response?.data?.error || 'CSVの解析に失敗しました');
        } finally {
            setParsing(false);
        }
    };

    // Step 2: 製品選択の確認
    const handleProductConfirm = () => {
        if (!selectedProductId) {
            setError('製品を選択してください');
            return;
        }
        setError(null);
        setActiveStep(2); // 確認ステップへ
    };

    // Step 3: リスト作成
    const handleCreateList = async () => {
        if (!csvFile || !parseResult || !selectedProductId) return;

        setCreating(true);
        setError(null);

        try {
            const result = await purchasesApi.createSuppliedItemListFromCsv({
                product_id: selectedProductId,
                issue_date: parseResult.issue_date || new Date().toISOString().split('T')[0],
                items: parseResult.items,
                csv_file: csvFile,
                register_unregistered: registerUnregistered,
                unregistered_items: registerUnregistered ? parseResult.unregistered_part_numbers : undefined,
            });

            setActiveStep(3); // 完了ステップへ
            setTimeout(() => {
                onSuccess(result);
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'リストの作成に失敗しました');
        } finally {
            setCreating(false);
        }
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
        setError(null);
    };

    const handleCloseModal = () => {
        if (!creating && !parsing) {
            onClose();
        }
    };

    const selectedProduct = products.find(p => p.id === selectedProductId);

    return (
        <Dialog open={open} onClose={handleCloseModal} maxWidth="md" fullWidth>
            <DialogTitle>支給品リスト CSVインポート</DialogTitle>

            <DialogContent>
                <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Step 0: CSVアップロード */}
                {activeStep === 0 && (
                    <Box>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            <Typography variant="body2" gutterBottom>
                                <strong>CSVファイル形式：</strong>
                            </Typography>
                            <Typography variant="body2" component="div">
                                • 1列目: 発行日<br />
                                • 6列目: 品番<br />
                                • 7列目: 品名<br />
                                • 23列目: 支給数<br />
                                • 24列目: 単位<br />
                                • 27列目: 機種情報（製品名）
                            </Typography>
                        </Alert>

                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={<UploadIcon />}
                            fullWidth
                            sx={{ mb: 2, py: 2 }}
                        >
                            CSVファイルを選択
                            <input
                                type="file"
                                accept=".csv"
                                hidden
                                onChange={handleFileSelect}
                            />
                        </Button>

                        {csvFile && (
                            <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                                <Typography variant="body2">
                                    <CheckCircle color="success" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                    選択されたファイル: <strong>{csvFile.name}</strong>
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    サイズ: {(csvFile.size / 1024).toFixed(2)} KB
                                </Typography>
                            </Paper>
                        )}
                    </Box>
                )}

                {/* Step 1: 製品選択 */}
                {activeStep === 1 && parseResult && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            CSVから抽出された情報
                        </Typography>

                        <Box sx={{ mb: 3 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                発行日: {parseResult.issue_date || '不明'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                品目数: {parseResult.total_items}件
                            </Typography>
                            {parseResult.product_info && parseResult.product_info.length > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    CSV記載機種: {parseResult.product_info.join(', ')}
                                </Typography>
                            )}
                        </Box>

                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>製品を選択 *</InputLabel>
                            <Select
                                value={selectedProductId || ''}
                                label="製品を選択 *"
                                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                            >
                                {parseResult.suggested_products && parseResult.suggested_products.length > 0 && (
                                    <MenuItem disabled>
                                        <em>--- 推奨製品 ---</em>
                                    </MenuItem>
                                )}
                                {parseResult.suggested_products?.map((product) => (
                                    <MenuItem key={`suggested-${product.id}`} value={product.id}>
                                        <Chip label="推奨" color="primary" size="small" sx={{ mr: 1 }} />
                                        {product.product_number} - {product.product_name}
                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                            (マッチ: {product.matched_keyword})
                                        </Typography>
                                    </MenuItem>
                                ))}
                                {parseResult.suggested_products && parseResult.suggested_products.length > 0 && products.length > 0 && (
                                    <MenuItem disabled>
                                        <em>--- すべての製品 ---</em>
                                    </MenuItem>
                                )}
                                {products.map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_number} - {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {parseResult.unregistered_part_numbers && parseResult.unregistered_part_numbers.length > 0 && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <Typography variant="body2" gutterBottom>
                                    <strong>{parseResult.unregistered_part_numbers.length}件の未登録品番があります</strong>
                                </Typography>
                                <TableContainer sx={{ maxHeight: 200, mt: 1 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>品番</TableCell>
                                                <TableCell>品名</TableCell>
                                                <TableCell align="right">数量</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {parseResult.unregistered_part_numbers.slice(0, 5).map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.item_number}</TableCell>
                                                    <TableCell>{item.item_name}</TableCell>
                                                    <TableCell align="right">{item.quantity}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {parseResult.unregistered_part_numbers.length > 5 && (
                                    <Typography variant="caption" color="text.secondary">
                                        ... 他 {parseResult.unregistered_part_numbers.length - 5} 件
                                    </Typography>
                                )}
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={registerUnregistered}
                                            onChange={(e) => setRegisterUnregistered(e.target.checked)}
                                        />
                                    }
                                    label="未登録品番をマスターに自動登録する"
                                    sx={{ mt: 1 }}
                                />
                            </Alert>
                        )}
                    </Box>
                )}

                {/* Step 2: 確認 */}
                {activeStep === 2 && parseResult && (
                    <Box>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            以下の内容で支給品リストを作成します。
                        </Alert>

                        <Paper sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>製品情報</Typography>
                            <Typography variant="body2">
                                {selectedProduct?.product_number} - {selectedProduct?.product_name}
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>リスト情報</Typography>
                            <Typography variant="body2">発行日: {parseResult.issue_date}</Typography>
                            <Typography variant="body2">品目数: {parseResult.total_items}件</Typography>
                            {parseResult.unregistered_part_numbers && parseResult.unregistered_part_numbers.length > 0 && (
                                <Typography variant="body2" color="warning.main">
                                    未登録品番: {parseResult.unregistered_part_numbers.length}件
                                    {registerUnregistered && ' (自動登録されます)'}
                                </Typography>
                            )}
                        </Paper>

                        <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>品番</TableCell>
                                        <TableCell>品名</TableCell>
                                        <TableCell align="right">数量</TableCell>
                                        <TableCell>単位</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {parseResult.items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.item_number}</TableCell>
                                            <TableCell>{item.item_name}</TableCell>
                                            <TableCell align="right">{item.quantity}</TableCell>
                                            <TableCell>{item.unit}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* Step 3: 完了 */}
                {activeStep === 3 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            インポート完了
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            支給品リストが正常に作成されました。
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                {activeStep < 3 && (
                    <>
                        <Button onClick={handleCloseModal} disabled={parsing || creating}>
                            キャンセル
                        </Button>
                        {activeStep > 0 && activeStep < 2 && (
                            <Button onClick={handleBack} disabled={parsing || creating}>
                                戻る
                            </Button>
                        )}
                        {activeStep === 0 && (
                            <Button
                                variant="contained"
                                onClick={handleParseCSV}
                                disabled={!csvFile || parsing}
                                startIcon={parsing ? <CircularProgress size={20} /> : null}
                            >
                                {parsing ? '解析中...' : '次へ'}
                            </Button>
                        )}
                        {activeStep === 1 && (
                            <Button
                                variant="contained"
                                onClick={handleProductConfirm}
                                disabled={!selectedProductId}
                            >
                                次へ
                            </Button>
                        )}
                        {activeStep === 2 && (
                            <Button
                                variant="contained"
                                onClick={handleCreateList}
                                disabled={creating}
                                startIcon={creating ? <CircularProgress size={20} /> : null}
                            >
                                {creating ? '作成中...' : 'リスト作成'}
                            </Button>
                        )}
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}
