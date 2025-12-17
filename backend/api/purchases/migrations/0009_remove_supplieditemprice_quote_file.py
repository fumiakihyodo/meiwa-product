# Generated manually on 2025-12-17
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("purchases", "0008_remove_supplieditem_quantity_per_product_and_more"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="supplieditemprice​history",
            name="quote_file",
        ),
    ]
