from http import HTTPStatus

import pytest
from django.urls import reverse

pytestmark = [pytest.mark.smoke, pytest.mark.django_db]


def test_home_page_available(client):
    response = client.get("/")
    assert response.status_code == HTTPStatus.OK


def test_products_endpoint_returns_json(client):
    url = reverse("product-list")
    response = client.get(url)
    assert response.status_code == HTTPStatus.OK
    assert response.headers["Content-Type"].startswith("application/json")
