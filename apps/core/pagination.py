# apps/core/pagination.py
from rest_framework.pagination import PageNumberPagination


class LargeResultsSetPagination(PageNumberPagination):
    """
    A pagination class for endpoints that serve dropdown/select data.
    Allows clients to request up to 500 records per page to reduce
    the number of round-trips needed to populate UI dropdowns.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500
