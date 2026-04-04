"""Generic driver generators for all supported languages.

Instead of relying on per-problem driver code stored in the database (which is
fragile and error-prone), this module generates executable wrappers at runtime
by parsing the method signature from the user-facing code snippet.

The stdin format is always JSON: {"param1": value1, "param2": value2, ...}
The driver reads JSON from stdin, calls the user's solution method, and prints
the result as JSON to stdout.

Usage:
    from app.services.drivers import generate_driver

    code = generate_driver("python3", user_code, snippet_code)
"""

import logging

from .python3 import generate as generate_python3
from .java import generate as generate_java
from .cpp import generate as generate_cpp
from .c import generate as generate_c

logger = logging.getLogger(__name__)


def generate_driver(
    language: str,
    user_code: str,
    snippet_code: str,
) -> str:
    """Generate an executable driver for the given language.

    Args:
        language: One of 'python3', 'java', 'cpp', 'c'
        user_code: The user's submitted code
        snippet_code: The starter code from code_snippets table (contains method signature)

    Returns:
        Complete executable source code
    """
    generators = {
        "python3": generate_python3,
        "java": generate_java,
        "cpp": generate_cpp,
        "c": generate_c,
    }

    generator = generators.get(language)
    if not generator:
        logger.warning(f"No generic driver for language: {language}")
        return user_code

    return generator(user_code, snippet_code)
