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

    # operations = [
    #     # Add issue_date field
    #     migrations.AddField(
    #         model_name="supplieditemlist",
    #         name="issue_date",
    #         field=models.DateField(
    #             default="2025-01-01",  # Temporary default, will be removed
    #             help_text="CSVの発行日（1列目）",
    #             verbose_name="発行日",
    #         ),
    #         preserve_default=False,
    #     ),
    #     # Make delivery_date nullable
    #     migrations.AlterField(
    #         model_name="supplieditemlist",
    #         name="delivery_date",
    #         field=models.DateField(
    #             blank=True,
    #             help_text="支給品の納品予定日",
    #             null=True,
    #             verbose_name="納品予定日",
    #         ),
    #     ),
    #     # Add product field (nullable temporarily for migration)
    #     migrations.AddField(
    #         model_name="supplieditemlist",
    #         name="product",
    #         field=models.ForeignKey(
    #             null=True,  # Temporarily nullable for migration
    #             on_delete=django.db.models.deletion.PROTECT,
    #             related_name="supplied_item_lists",
    #             to="products.product",
    #             verbose_name="製品",
    #         ),
    #     ),
    #     # Remove old customer field (after data migration if needed)
    #     migrations.RemoveField(
    #         model_name="supplieditemlist",
    #         name="customer",
    #     ),
    #     # Make product field non-nullable
    #     migrations.AlterField(
    #         model_name="supplieditemlist",
    #         name="product",
    #         field=models.ForeignKey(
    #             on_delete=django.db.models.deletion.PROTECT,
    #             related_name="supplied_item_lists",
    #             to="products.product",
    #             verbose_name="製品",
    #         ),
    #     ),
    #     # Update indexes
    #     migrations.AlterIndexTogether(
    #         name="supplieditemlist",
    #         index_together=set(),
    #     ),
    #     # Remove old indexes
    #     migrations.RemoveIndex(
    #         model_name="supplieditemlist",
    #         name="supplied_it_custome_41e2ae_idx",
    #     ),
    #     # Add new indexes
    #     migrations.AddIndex(
    #         model_name="supplieditemlist",
    #         index=models.Index(fields=["list_number"], name="supplied_it_list_nu_7a1b2c_idx"),
    #     ),
    #     migrations.AddIndex(
    #         model_name="supplieditemlist",
    #         index=models.Index(fields=["product", "status"], name="supplied_it_product_3d4e5f_idx"),
    #     ),
    #     migrations.AddIndex(
    #         model_name="supplieditemlist",
    #         index=models.Index(fields=["issue_date"], name="supplied_it_issue_d_6g7h8i_idx"),
    #     ),
    #     migrations.AddIndex(
    #         model_name="supplieditemlist",
    #         index=models.Index(fields=["delivery_date"], name="supplied_it_deliver_9j0k1l_idx"),
    #     ),
    #     migrations.AddIndex(
    #         model_name="supplieditemlist",
    #         index=models.Index(fields=["status"], name="supplied_it_status_2m3n4o_idx"),
    #     ),
    # ]
