"""Supported programming languages for submissions and code snippets."""

from enum import Enum


class Language(str, Enum):
    """Enum of supported programming languages."""

    PYTHON = "python3"
    JAVA = "java"
    CPP = "cpp"
    C = "c"

    @classmethod
    def values(cls) -> list[str]:
        """Return list of all supported language values."""
        return [lang.value for lang in cls]

    @classmethod
    def is_valid(cls, value: str) -> bool:
        """Check if a language value is valid."""
        return value in cls.values()


# Judge0 language IDs mapping
JUDGE0_LANGUAGE_IDS: dict[str, int] = {
    Language.PYTHON.value: 71,  # Python 3
    Language.JAVA.value: 62,  # Java (OpenJDK 17.0.3)
    Language.CPP.value: 54,  # C++ (GCC 11.2.0)
    Language.C.value: 50,  # C (GCC 11.2.0)
}

# Human-readable labels for each language
LANGUAGE_LABELS: dict[str, str] = {
    Language.PYTHON.value: "Python",
    Language.JAVA.value: "Java",
    Language.CPP.value: "C++",
    Language.C.value: "C",
}

# Code length limits (in characters)
MAX_CODE_LENGTH = 50000  # 50KB should be more than enough
MIN_CODE_LENGTH = 1  # At least one character
