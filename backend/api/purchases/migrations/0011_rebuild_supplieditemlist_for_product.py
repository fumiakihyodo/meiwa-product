# Generated manually for supplied-item-inventory rebuild

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0001_initial"),
        ("purchases", "0010_supplieditemlist_supplieditemlistitem_and_more"),
    ]

    operations = [
        # Add issue_date field
        migrations.AddField(
            model_name="supplieditemlist",
            name="issue_date",
            field=models.DateField(
                default="2025-01-01",  # Temporary default, will be removed
                help_text="CSVの発行日（1列目）",
                verbose_name="発行日",
            ),
            preserve_default=False,
        ),
        # Make delivery_date nullable
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
        # Add product field (nullable temporarily for migration)
        migrations.AddField(
            model_name="supplieditemlist",
            name="product",
            field=models.ForeignKey(
                null=True,  # Temporarily nullable for migration
                on_delete=django.db.models.deletion.PROTECT,
                related_name="supplied_item_lists",
                to="products.product",
                verbose_name="製品",
            ),
        ),
        # Remove old customer field (after data migration if needed)
        migrations.RemoveField(
            model_name="supplieditemlist",
            name="customer",
        ),
        # Make product field non-nullable
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
        # Update indexes
        migrations.AlterIndexTogether(
            name="supplieditemlist",
            index_together=set(),
        ),
        # Remove old indexes
        migrations.RemoveIndex(
            model_name="supplieditemlist",
            name="supplied_it_custome_41e2ae_idx",
        ),
        # Add new indexes
        migrations.AddIndex(
            model_name="supplieditemlist",
            index=models.Index(fields=["list_number"], name="supplied_it_list_nu_7a1b2c_idx"),
        ),
        migrations.AddIndex(
            model_name="supplieditemlist",
            index=models.Index(fields=["product", "status"], name="supplied_it_product_3d4e5f_idx"),
        ),
        migrations.AddIndex(
            model_name="supplieditemlist",
            index=models.Index(fields=["issue_date"], name="supplied_it_issue_d_6g7h8i_idx"),
        ),
        migrations.AddIndex(
            model_name="supplieditemlist",
            index=models.Index(fields=["delivery_date"], name="supplied_it_deliver_9j0k1l_idx"),
        ),
        migrations.AddIndex(
            model_name="supplieditemlist",
            index=models.Index(fields=["status"], name="supplied_it_status_2m3n4o_idx"),
        ),
    ]
