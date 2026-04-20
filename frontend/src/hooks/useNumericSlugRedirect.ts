import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api";

export function useNumericSlugRedirect(slug: string | undefined): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug || slug.includes("-") || isNaN(Number(slug))) return;
    api
      .get(`/problems/redirect/${slug}`)
      .then((res) => {
        navigate(`/problems/${res.data.slug}`, { replace: true });
      })
      .catch(() => navigate("/", { replace: true }));
  }, [slug, navigate]);
}