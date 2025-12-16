// components/SuppliedItemModal/SuppliedItemModalManager.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SuppliedItem } from '@/types/purchases';
import { SuppliedItemDetailModal } from './SuppliedItemDetailModal';
import { SuppliedItemPriceListModal } from './SuppliedItemPriceListModal';
import { SuppliedItemFormModal } from './SuppliedItemFormModal';

type ModalType = 'detail' | 'edit' | 'priceList' | 'duplicate' | null;

interface SuppliedItemModalManagerProps {
    open: boolean;
    onClose: () => void;
    suppliedItemId: number | null;
    onSuccess?: () => void;
    initialModal?: 'detail' | 'edit' | 'priceList' | null;
}

/**
 * 支給品詳細モーダル、価格履歴モーダル、複製モーダルの切り替えを管理するコンポーネント
 *
 * 使用例:
 * ```tsx
 * <SuppliedItemModalManager
 *   open={modalOpen}
 *   onClose={() => setModalOpen(false)}
 *   suppliedItemId={selectedSuppliedItemId}
 *   onSuccess={handleRefresh}
 *   initialModal="detail"
 * />
 * ```
 */
export const SuppliedItemModalManager: React.FC<SuppliedItemModalManagerProps> = ({
    open,
    onClose,
    suppliedItemId,
    onSuccess,
    initialModal = 'detail',
}) => {
    const [currentModal, setCurrentModal] = useState<ModalType>(initialModal);
    const [currentSuppliedItem, setCurrentSuppliedItem] = useState<SuppliedItem | null>(null);

    // モーダルが開かれた時に初期モーダルをセット
    useEffect(() => {
        if (open) {
            setCurrentModal(initialModal);
        }
    }, [open, initialModal]);

    // モーダルを閉じる時にリセット
    const handleClose = useCallback(() => {
        setCurrentModal(null);
        setCurrentSuppliedItem(null);
        onClose();
    }, [onClose]);

    // 詳細モーダルから価格履歴モーダルへ切り替え
    const handleSwitchToPriceList = useCallback((suppliedItem: SuppliedItem) => {
        setCurrentSuppliedItem(suppliedItem);
        setCurrentModal('priceList');
    }, []);

    // 価格履歴モーダルから詳細モーダルへ切り替え
    const handleSwitchToDetail = useCallback((suppliedItem: SuppliedItem) => {
        setCurrentSuppliedItem(suppliedItem);
        setCurrentModal('detail');
    }, []);

    // 詳細モーダルから複製モーダルへ切り替え
    const handleDuplicate = useCallback((suppliedItem: SuppliedItem) => {
        setCurrentSuppliedItem(suppliedItem);
        setCurrentModal('duplicate');
    }, []);

    // 複製モーダルを閉じる
    const handleCloseDuplicate = useCallback(() => {
        setCurrentModal('detail');
    }, []);

    // 複製成功時の処理
    const handleDuplicateSuccess = useCallback(() => {
        setCurrentModal(null);
        setCurrentSuppliedItem(null);
        if (onSuccess) {
            onSuccess();
        }
        onClose();
    }, [onSuccess, onClose]);

    // 詳細モーダルまたは編集モーダルの表示判定
    const isDetailOrEditMode = currentModal === 'detail' || currentModal === 'edit';

    return (
        <>
            <SuppliedItemDetailModal
                open={open && isDetailOrEditMode}
                onClose={handleClose}
                suppliedItemId={suppliedItemId}
                onSuccess={onSuccess}
                onSwitchToPriceList={handleSwitchToPriceList}
                onDuplicate={handleDuplicate}
                initialEditMode={currentModal === 'edit'}
            />

            <SuppliedItemPriceListModal
                open={open && currentModal === 'priceList'}
                onClose={handleClose}
                suppliedItem={currentSuppliedItem}
                onSwitchToDetail={handleSwitchToDetail}
            />

            {/* 複製モーダル */}
            {currentSuppliedItem && (
                <SuppliedItemFormModal
                    open={open && currentModal === 'duplicate'}
                    onClose={handleCloseDuplicate}
                    onSuccess={handleDuplicateSuccess}
                    productId={currentSuppliedItem.product}
                    duplicateFrom={currentSuppliedItem}
                />
            )}
        </>
    );
};
