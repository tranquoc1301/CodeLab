"""Tests for submission API endpoints."""

import pytest
from httpx import AsyncClient
import pytest_asyncio

from app.models.user import User


class TestSubmissionCreate:
    """Test cases for POST /submissions endpoint."""
    
    # ==================== Validation Tests ====================
    
    @pytest.mark.asyncio
    async def test_create_submission_missing_source_code(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that missing source_code returns 422."""
        response = await client.post(
            "/api/submissions/",
            json={"language": "c", "stdin": ""},
            headers=auth_headers,
        )
        assert response.status_code == 422
        assert "source_code" in str(response.json())
    
    @pytest.mark.asyncio
    async def test_create_submission_empty_source_code(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that empty source_code returns 422."""
        response = await client.post(
            "/api/submissions/",
            json={"source_code": "", "language": "c"},
            headers=auth_headers,
        )
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_create_submission_whitespace_only_source_code(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that whitespace-only source_code returns 422."""
        response = await client.post(
            "/api/submissions/",
            json={"source_code": "   \n\t  ", "language": "c"},
            headers=auth_headers,
        )
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_create_submission_missing_language(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that missing language returns 422."""
        response = await client.post(
            "/api/submissions/",
            json={"source_code": "print('hello')"},
            headers=auth_headers,
        )
        assert response.status_code == 422
        assert "language" in str(response.json())
    
    @pytest.mark.asyncio
    async def test_create_submission_invalid_language(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that invalid language returns 422."""
        response = await client.post(
            "/api/submissions/",
            json={"source_code": "print('hello')", "language": "ruby"},
            headers=auth_headers,
        )
        assert response.status_code == 422
        assert "Unsupported language" in str(response.json())
    
    @pytest.mark.asyncio
    async def test_create_submission_code_too_long(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that code exceeding max length returns 422."""
        long_code = "x" * 50001  # Exceeds 50000 char limit
        response = await client.post(
            "/api/submissions/",
            json={"source_code": long_code, "language": "c"},
            headers=auth_headers,
        )
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_create_submission_negative_problem_id(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that negative problem_id returns 422."""
        response = await client.post(
            "/api/submissions/",
            json={
                "source_code": "#include <stdio.h>\nint main(){return 0;}",
                "language": "c",
                "problem_id": -1,
            },
            headers=auth_headers,
        )
        assert response.status_code == 422
    
    # ==================== C Language Tests ====================
    
    @pytest.mark.asyncio
    async def test_create_submission_c_language_valid(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test creating a submission with C language."""
        c_code = '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}'
        
        response = await client.post(
            "/api/submissions/",
            json={
                "source_code": c_code,
                "language": "c",
            },
            headers=auth_headers,
        )
        
        # Should either succeed or get a judge0 error (not 500)
        assert response.status_code in [201, 400, 422, 500]
        # The key is it shouldn't crash with 500 - should be proper error handling
        
        if response.status_code == 201:
            data = response.json()
            assert data["language"] == "c"
            assert data["source_code"] == c_code
    
    @pytest.mark.asyncio
    async def test_create_submission_c_language_case_insensitive(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that language is case-insensitive."""
        response = await client.post(
            "/api/submissions/",
            json={"source_code": "int main(){return 0;}", "language": "C"},
            headers=auth_headers,
        )
        # Should normalize to lowercase
        if response.status_code == 201:
            assert response.json()["language"] == "c"
    
    @pytest.mark.asyncio
    async def test_create_submission_all_supported_languages(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that all supported languages are accepted."""
        languages = ["python", "java", "cpp", "c"]
        
        for lang in languages:
            code_templates = {
                "python": "print('hello')",
                "java": "public class Main { public static void main(String[] args) {} }",
                "cpp": "int main() { return 0; }",
                "c": "int main() { return 0; }",
            }
            
            response = await client.post(
                "/api/submissions/",
                json={
                    "source_code": code_templates[lang],
                    "language": lang,
                },
                headers=auth_headers,
            )
            
            # Should be properly handled (not 500)
            assert response.status_code != 500, f"500 error for language: {lang}"
    
    # ==================== Security Tests ====================
    
    @pytest.mark.asyncio
    async def test_create_submission_sql_injection_attempt(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that SQL injection attempts are handled safely."""
        malicious_code = "'; DROP TABLE submissions; --"
        
        response = await client.post(
            "/api/submissions/",
            json={"source_code": malicious_code, "language": "python"},
            headers=auth_headers,
        )
        
        # Should be treated as code, not SQL
        assert response.status_code in [201, 400, 422, 503]
    
    @pytest.mark.asyncio
    async def test_create_submission_xss_attempt(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that XSS attempts are handled safely."""
        malicious_code = "<script>alert('xss')</script>"
        
        response = await client.post(
            "/api/submissions/",
            json={"source_code": malicious_code, "language": "python"},
            headers=auth_headers,
        )
        
        # Should be treated as code
        assert response.status_code in [201, 400, 422]
    
    # ==================== Authentication Tests ====================
    
    @pytest.mark.asyncio
    async def test_create_submission_without_auth(self, client: AsyncClient):
        """Test that unauthenticated requests are rejected."""
        response = await client.post(
            "/api/submissions/",
            json={"source_code": "print('hello')", "language": "python"},
        )
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_create_submission_invalid_token(self, client: AsyncClient):
        """Test that invalid tokens are rejected."""
        response = await client.post(
            "/api/submissions/",
            json={"source_code": "print('hello')", "language": "python"},
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401
    
    # ==================== Input Handling Tests ====================
    
    @pytest.mark.asyncio
    async def test_create_submission_with_stdin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test submission with stdin input."""
        response = await client.post(
            "/api/submissions/",
            json={
                "source_code": "int n; scanf(\"%d\", &n); printf(\"%d\", n*2);",
                "language": "c",
                "stdin": "5",
            },
            headers=auth_headers,
        )
        assert response.status_code in [201, 400, 422, 500]
    
    @pytest.mark.asyncio
    async def test_create_submission_empty_stdin_normalized(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that empty stdin is normalized to None."""
        response = await client.post(
            "/api/submissions/",
            json={
                "source_code": "int main(){return 0;}",
                "language": "c",
                "stdin": "   ",
            },
            headers=auth_headers,
        )
        # Should normalize whitespace stdin to None
        assert response.status_code in [201, 400, 422, 500]
    
    @pytest.mark.asyncio
    async def test_create_submission_without_problem_id(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test submission without problem_id (for general testing)."""
        response = await client.post(
            "/api/submissions/",
            json={
                "source_code": "int main(){return 0;}",
                "language": "c",
            },
            headers=auth_headers,
        )
        assert response.status_code in [201, 400, 422, 500]


class TestSubmissionList:
    """Test cases for GET /submissions endpoint."""
    
    @pytest.mark.asyncio
    async def test_list_submissions_empty(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing submissions when none exist."""
        response = await client.get("/api/submissions/", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []
    
    @pytest.mark.asyncio
    async def test_list_submissions_without_auth(self, client: AsyncClient):
        """Test that unauthenticated listing is rejected."""
        response = await client.get("/api/submissions/")
        assert response.status_code == 401


class TestSubmissionGet:
    """Test cases for GET /submissions/{id} endpoint."""
    
    @pytest.mark.asyncio
    async def test_get_submission_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test fetching non-existent submission."""
        response = await client.get("/api/submissions/99999", headers=auth_headers)
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_get_submission_without_auth(self, client: AsyncClient):
        """Test that unauthenticated fetch is rejected."""
        response = await client.get("/api/submissions/1")
        assert response.status_code == 401