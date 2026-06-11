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


# Judge0 CE language IDs mapping (RapidAPI)
JUDGE0_LANGUAGE_IDS: dict[str, int] = {
    Language.PYTHON.value: 100,  # Python 3.12.5
    Language.JAVA.value: 91,     # Java (JDK 17.0.6)
    Language.CPP.value: 105,     # C++ (GCC 14.1.0)
    Language.C.value: 103,       # C (GCC 14.1.0)
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
