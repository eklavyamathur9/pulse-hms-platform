from flask import jsonify, request


def get_pagination_params():
    """Extract optional page/per_page from request.args."""
    page = request.args.get("page", None, type=int)
    per_page = request.args.get("per_page", None, type=int)
    if page is not None and page < 1:
        page = 1
    if per_page is not None:
        if per_page < 1:
            per_page = 20
        if per_page > 200:
            per_page = 200
    return page, per_page


def paginate(query, page=None, per_page=None):
    """Apply optional LIMIT/OFFSET to a query.

    When page/per_page are provided, returns a limited result set
    with pagination metadata. Otherwise returns all results unchanged.
    Returns (items, total, page, per_page, pages).
    """
    if page is not None or per_page is not None:
        if page is None:
            page = 1
        if per_page is None:
            per_page = 20
        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        pages = max(1, (total + per_page - 1) // per_page)
    else:
        items = query.all()
        total = len(items)
        page = 1
        per_page = total if total > 0 else 1
        pages = 1
    return items, total, page, per_page, pages


def paginated_response(items, total, page, per_page, pages):
    """Wrap items with pagination headers. Body stays as-is (array)."""
    headers = {
        "X-Total-Count": str(total),
        "X-Page": str(page),
        "X-Per-Page": str(per_page),
        "X-Pages": str(pages),
    }
    return jsonify(items), 200, headers
