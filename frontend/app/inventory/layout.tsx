import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '在庫管理 | Meiwa Product',
    description: '在庫管理ダッシュボード',
};

export default function InventoryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
