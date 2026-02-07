# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('manufacturing', '0001_initial'),
        ('imports', '0002_importinvoice_transportation_fee'),
    ]

    operations = [
        migrations.AddField(
            model_name='importinvoiceitem',
            name='manufacturing_item',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='import_invoice_items',
                to='manufacturing.manufacturingitem',
                verbose_name='製品'
            ),
        ),
    ]
