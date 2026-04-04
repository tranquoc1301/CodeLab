"""Tests for language constants and validation."""

import pytest

from app.constants import Language, JUDGE0_LANGUAGE_IDS, LANGUAGE_LABELS


class TestLanguageEnum:
    """Test cases for Language enum."""

    def test_language_values(self):
        """Test that Language.values() returns all supported languages."""
        values = Language.values()
        assert "python3" in values
        assert "java" in values
        assert "cpp" in values
        assert "c" in values
        assert len(values) == 4

    def test_language_is_valid_valid(self):
        """Test that valid languages return True."""
        assert Language.is_valid("python3") is True
        assert Language.is_valid("java") is True
        assert Language.is_valid("cpp") is True
        assert Language.is_valid("c") is True

    def test_language_is_valid_invalid(self):
        """Test that invalid languages return False."""
        assert Language.is_valid("ruby") is False
        assert Language.is_valid("go") is False
        assert Language.is_valid("rust") is False
        assert Language.is_valid("javascript") is False
        assert Language.is_valid("") is False

    def test_language_enum_values(self):
        """Test Language enum members."""
        assert Language.PYTHON.value == "python3"
        assert Language.JAVA.value == "java"
        assert Language.CPP.value == "cpp"
        assert Language.C.value == "c"


class TestJudge0Ids:
    """Test cases for Judge0 language ID mapping."""

    def test_all_languages_have_judge0_ids(self):
        """Test that all supported languages have Judge0 IDs."""
        for lang in Language.values():
            assert lang in JUDGE0_LANGUAGE_IDS
            assert JUDGE0_LANGUAGE_IDS[lang] > 0

    def test_judge0_ids_are_correct(self):
        """Test Judge0 language IDs are as expected."""
        assert JUDGE0_LANGUAGE_IDS["python3"] == 71
        assert JUDGE0_LANGUAGE_IDS["java"] == 62
        assert JUDGE0_LANGUAGE_IDS["cpp"] == 54
        assert JUDGE0_LANGUAGE_IDS["c"] == 75  # C (GCC 11.2.0)


class TestLanguageLabels:
    """Test cases for language labels."""

    def test_all_languages_have_labels(self):
        """Test that all languages have human-readable labels."""
        for lang in Language.values():
            assert lang in LANGUAGE_LABELS
            assert LANGUAGE_LABELS[lang]

    def test_labels_are_readable(self):
        """Test that labels are properly formatted."""
        assert LANGUAGE_LABELS["python3"] == "Python"
        assert LANGUAGE_LABELS["java"] == "Java"
        assert LANGUAGE_LABELS["cpp"] == "C++"
        assert LANGUAGE_LABELS["c"] == "C"
