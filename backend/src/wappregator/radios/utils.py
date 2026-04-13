import warnings

import bs4
from bs4 import BeautifulSoup

warnings.filterwarnings("ignore", category=bs4.MarkupResemblesLocatorWarning)


def sanitize_value(value: str | None) -> str | None:
    """Sanitize a value.

    Turns <p> and <br> into appropriate newlines,
    strips HTML tags and turns empty strings into None.

    Args:
        value: The value to sanitize.

    Returns:
        The sanitized value.
    """
    if value is None:
        return None

    soup = BeautifulSoup(value, "html.parser")

    for br in soup.find_all("br"):
        br.replace_with("\n")

    for p in soup.find_all("p"):
        p.append("\n")

    lines = soup.get_text().splitlines()
    stripped_lines = [line.strip() for line in lines]
    res = "\n".join(line for line in stripped_lines if line).strip()

    if res == "":
        return None

    return res
