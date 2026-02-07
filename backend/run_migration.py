#!/usr/bin/env python
"""
マイグレーション実行スクリプト
Djangoのマイグレーションを実行します
"""
import os
import sys
import django

# Django設定
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.core.management import call_command
from django.db import connection

def run_migration():
    """マイグレーションを実行"""
    print("=" * 60)
    print("マイグレーション実行中...")
    print("=" * 60)

    try:
        # マイグレーションを実行
        call_command('migrate', 'imports', verbosity=2)
        print("\n" + "=" * 60)
        print("マイグレーション完了!")
        print("=" * 60)

        # テーブル確認
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'import_invoice_items'
                AND COLUMN_NAME = 'manufacturing_item_id'
            """)
            result = cursor.fetchone()
            if result:
                print(f"\n✓ manufacturing_item_idカラムが正常に追加されました")
                print(f"  カラム名: {result[0]}")
                print(f"  データ型: {result[1]}")
                print(f"  NULL許可: {result[2]}")
            else:
                print("\n✗ manufacturing_item_idカラムが見つかりません")

    except Exception as e:
        print(f"\n✗ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)
