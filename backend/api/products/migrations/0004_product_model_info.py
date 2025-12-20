# Generated migration for adding model_info field to Product

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0003_remove_product_customer_product_customer_branch_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="model_info",
            field=models.CharField(
                blank=True,
                default="",
                help_text="製品の機種情報（製品名）",
                max_length=200,
                verbose_name="機種情報",
            ),
        ),
        migrations.AddIndex(
            model_name="product",
            index=models.Index(
                fields=["model_info"], name="products_model_i_a1b2c3_idx"
            ),
        ),
    ]
