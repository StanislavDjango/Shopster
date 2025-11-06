import pytest


@pytest.fixture(autouse=True)
def configure_static_storage(settings):
    # For Django 4+ the STORAGES setting takes precedence over STATICFILES_STORAGE.
    storages = settings.STORAGES.copy() if hasattr(settings, "STORAGES") else {}
    storages["staticfiles"] = {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    }
    settings.STORAGES = storages
    settings.STATICFILES_STORAGE = (
        "django.contrib.staticfiles.storage.StaticFilesStorage"
    )
