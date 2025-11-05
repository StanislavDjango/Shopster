import pytest


@pytest.fixture(autouse=True)
def configure_static_storage(settings):
    settings.STATICFILES_STORAGE = (
        "django.contrib.staticfiles.storage.StaticFilesStorage"
    )
