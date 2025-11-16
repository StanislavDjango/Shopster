from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("shop", "0005_productreview_guest_comments"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="brand",
            field=models.CharField(blank=True, db_index=True, default="", max_length=255),
        ),
    ]
