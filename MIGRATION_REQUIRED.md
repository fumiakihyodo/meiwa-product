# データベースマイグレーションが必要です

## 概要
インボイス明細（ImportInvoiceItem）に海外製品（ManufacturingItem）を紐付けるためのフィールド`manufacturing_item`が追加されました。
このフィールドをデータベースに追加するために、マイグレーションを実行する必要があります。

## マイグレーション実行方法

### 方法1: Djangoマイグレーションコマンド（推奨）

バックエンドコンテナまたはバックエンド環境で以下のコマンドを実行してください：

```bash
cd backend
python manage.py migrate imports
```

### 方法2: SQLを直接実行

データベースに直接接続して、以下のSQLを実行してください：

```sql
-- manufacturing_item_idカラムを追加
ALTER TABLE import_invoice_items
ADD COLUMN manufacturing_item_id INT NULL;

-- 外部キー制約を追加
ALTER TABLE import_invoice_items
ADD CONSTRAINT import_invoice_items_manufacturing_item_id_fk
    FOREIGN KEY (manufacturing_item_id)
    REFERENCES manufacturing_items(id)
    ON DELETE SET NULL;

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX import_invoice_items_manufacturing_item_id_idx
    ON import_invoice_items(manufacturing_item_id);
```

### 方法3: Dockerコンテナ内で実行

Dockerを使用している場合：

```bash
# バックエンドコンテナに入る
docker exec -it <backend-container-name> bash

# コンテナ内でマイグレーション実行
cd /app
python manage.py migrate imports

# コンテナから出る
exit
```

## マイグレーション確認

マイグレーション実行後、以下のSQLでカラムが追加されたことを確認できます：

```sql
DESCRIBE import_invoice_items;
```

または：

```sql
SHOW COLUMNS FROM import_invoice_items WHERE Field = 'manufacturing_item_id';
```

## マイグレーション後の追加作業

マイグレーション完了後、以下のファイルを修正してください：

### backend/api/imports/views.py

`ImportInvoiceViewSet.get_queryset()`メソッド内のコメントアウトを解除：

```python
def get_queryset(self):
    queryset = ImportInvoice.objects.select_related(
        'supplier_branch',
        'supplier_branch__supplier',
        'created_by',
    ).prefetch_related(
        'items__material',
        'items__manufacturing_item',  # ← このコメントを解除
        'files',
        'linked_pos'
    )
```

## トラブルシューティング

### エラー: `Unknown column 'import_invoice_items.manufacturing_item_id'`

このエラーは、マイグレーションが実行されていないことを示しています。上記のいずれかの方法でマイグレーションを実行してください。

### エラー: `Table 'manufacturing_items' doesn't exist`

manufacturing_itemsテーブルが存在しない場合、先にmanufacturingアプリのマイグレーションを実行してください：

```bash
python manage.py migrate manufacturing
```

その後、再度importsのマイグレーションを実行してください。

## 現在の状態

- ✅ マイグレーションファイル作成済み: `backend/api/imports/migrations/0003_importinvoiceitem_manufacturing_item.py`
- ✅ モデル更新済み: `backend/api/imports/models.py`
- ✅ シリアライザー更新済み（マイグレーション前後の両方に対応）: `backend/api/imports/serializers.py`
- ✅ フロントエンド型定義更新済み: `frontend/types/import.ts`
- ✅ ImportModal更新済み: `frontend/components/import/ImportModal.tsx`
- ⏳ **データベースマイグレーション実行待ち** ← 今ここ

## 詳細

変更内容の詳細は、以下のコミットを参照してください：

- commit: ac02fd1 - "feat: 海外サプライヤー製品フィルタリング機能を追加"

---

**注意**: マイグレーション実行までは、海外製品の紐付け機能は動作しますが、データベースには保存されません。マイグレーション実行後、完全に機能するようになります。
