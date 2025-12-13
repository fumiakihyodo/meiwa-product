// components/PartModalManager.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Part } from '@/types/purchases';
import { PartDetailModal } from './PartDetailModal';
import { PartPriceListModal } from './PartPriceListModal';
import { PartFormModal } from './PartFormModal';

type ModalType = 'detail' | 'edit' | 'priceList' | 'duplicate' | null; // 'edit'を追加

interface PartModalManagerProps {
    open: boolean;
    onClose: () => void;
    partId: number | null;
    onSuccess?: () => void;
    initialModal?: 'detail' | 'edit' | 'priceList' | null; 
}

/**
 * 部品詳細モーダル、価格履歴モーダル、複製モーダルの切り替えを管理するコンポーネント
 * 
 * 最適化ポイント:
 * - すべてのコールバック関数をuseCallbackでメモ化
 * - 不要な再レンダリングを防止
 * 
 * 使用例:
 * ```tsx
 * <PartModalManager
 *   open={modalOpen}
 *   onClose={() => setModalOpen(false)}
 *   partId={selectedPartId}
 *   onSuccess={handleRefresh}
 *   initialModal="detail" // または "edit" または "priceList"
 * />
 * ```
 */
export const PartModalManager: React.FC<PartModalManagerProps> = ({
    open,
    onClose,
    partId,
    onSuccess,
    initialModal = 'detail',
}) => {
    const [currentModal, setCurrentModal] = useState<ModalType>(initialModal);
    const [currentPart, setCurrentPart] = useState<Part | null>(null);

    // モーダルが開かれた時に初期モーダルをセット
    useEffect(() => {
        if (open) {
            setCurrentModal(initialModal);
        }
    }, [open, initialModal]);

    // モーダルを閉じる時にリセット（メモ化）
    const handleClose = useCallback(() => {
        setCurrentModal(null);
        setCurrentPart(null);
        onClose();
    }, [onClose]);

    // 詳細モーダルから価格履歴モーダルへ切り替え（メモ化）
    const handleSwitchToPriceList = useCallback((part: Part) => {
        setCurrentPart(part);
        setCurrentModal('priceList');
    }, []);

    // 価格履歴モーダルから詳細モーダルへ切り替え（メモ化）
    const handleSwitchToDetail = useCallback((part: Part) => {
        setCurrentPart(part);
        setCurrentModal('detail');
    }, []);

    // 詳細モーダルから複製モーダルへ切り替え（メモ化）
    const handleDuplicate = useCallback((part: Part) => {
        setCurrentPart(part);
        setCurrentModal('duplicate');
    }, []);

    // 複製モーダルを閉じる（メモ化）
    const handleCloseDuplicate = useCallback(() => {
        setCurrentModal('detail');
    }, []);

    // 複製成功時の処理（メモ化）
    const handleDuplicateSuccess = useCallback(() => {
        setCurrentModal(null);
        setCurrentPart(null);
        if (onSuccess) {
            onSuccess();
        }
        onClose();
    }, [onSuccess, onClose]);

    // 詳細モーダルまたは編集モーダルの表示判定
    const isDetailOrEditMode = currentModal === 'detail' || currentModal === 'edit';

    return (
        <>
            <PartDetailModal
                open={open && isDetailOrEditMode}
                onClose={handleClose}
                partId={partId}
                onSuccess={onSuccess}
                onSwitchToPriceList={handleSwitchToPriceList}
                onDuplicate={handleDuplicate}
                initialEditMode={currentModal === 'edit'} // editモードの場合はtrue
            />

            <PartPriceListModal
                open={open && currentModal === 'priceList'}
                onClose={handleClose}
                part={currentPart}
                onSwitchToDetail={handleSwitchToDetail}
            />

            {/* 複製モーダル */}
            {currentPart && (
                <PartFormModal
                    open={open && currentModal === 'duplicate'}
                    onClose={handleCloseDuplicate}
                    onSuccess={handleDuplicateSuccess}
                    productId={currentPart.product}
                    duplicateFrom={currentPart}
                />
            )}
        </>
    );
};