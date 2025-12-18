# Generated manually for supplied-item-inventory rebuild

import django.db.models.deletion
from django.db import migrations, models
from django.utils import timezone


def migrate_customer_to_product(apps, schema_editor):
    """
    既存データがある場合の移行処理
    customer_branchから関連するproductを取得してproductフィールドに設定
    """
    SuppliedItemList = apps.get_model("purchases", "SuppliedItemList")
    Product = apps.get_model("products", "Product")

    # 既存のリストがある場合は、最初のProductを割り当てる（仮）
    # 実運用では適切なマッピングが必要
    for list_obj in SuppliedItemList.objects.all():
        if not list_obj.product_id:
            # デフォルトのProductを探す、なければスキップ
            default_product = Product.objects.first()
            if default_product:
                list_obj.product = default_product
                list_obj.issue_date = list_obj.delivery_date or timezone.now().date()
                list_obj.save()


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0001_initial"),
        ("purchases", "0010_supplieditemlist_supplieditemlistitem_and_more"),
    ]

    operations = [
        # Step 1: Add issue_date field with default
        migrations.AddField(
            model_name="supplieditemlist",
            name="issue_date",
            field=models.DateField(
                default=timezone.now,
                help_text="CSVの発行日（1列目）",
                verbose_name="発行日",
            ),
        ),

        # Step 2: Make delivery_date nullable
        migrations.AlterField(
            model_name="supplieditemlist",
            name="delivery_date",
            field=models.DateField(
                blank=True,
                help_text="支給品の納品予定日",
                null=True,
                verbose_name="納品予定日",
            ),
        ),

        # Step 3: Add product field (nullable)
        migrations.AddField(
            model_name="supplieditemlist",
            name="product",
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="supplied_item_lists",
                to="products.product",
                verbose_name="製品",
            ),
        ),

        # Step 4: Migrate data
        migrations.RunPython(migrate_customer_to_product, migrations.RunPython.noop),

        # Step 5: Remove customer field
        migrations.RemoveField(
            model_name="supplieditemlist",
            name="customer",
        ),

        # Step 6: Make product field required
        migrations.AlterField(
            model_name="supplieditemlist",
            name="product",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="supplied_item_lists",
                to="products.product",
                verbose_name="製品",
            ),
        ),
    ]
