import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/shared/api";
import { API } from "@/shared/config";
import { ROUTES } from "@/app/router";

export function useNumericSlugRedirect(slug: string | undefined): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug || slug.includes("-") || isNaN(Number(slug))) return;
    api
      .get(API.ENDPOINTS.PROBLEM_REDIRECT(slug))
      .then((res) => {
        navigate(`/problems/${res.data.slug}`, { replace: true });
      })
      .catch(() => navigate(ROUTES.HOME, { replace: true }));
  }, [slug, navigate]);
}
