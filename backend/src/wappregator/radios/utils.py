import re

TAG_RE = re.compile(r"<[^>]+>")


def sanitize_value(value: str | None) -> str | None:
    """Sanitize a value.

    Removes HTML tags and turns empty strings into None.

    Args:
        value: The value to sanitize.

    Returns:
        The sanitized value.
    """
    if value is None:
        return None
    # Not the most sophisticated HTML sanitizer, but it will do for now.
    res = TAG_RE.sub("", value)
    if res == "":
        return None
    return res
