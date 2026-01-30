# Generated manually to add missing notes field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("supplier", "0004_remove_supplier_notes_supplier_currency"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="notes",
            field=models.TextField(
                blank=True,
                null=True,
                verbose_name="備考"
            ),
        ),
    ]
