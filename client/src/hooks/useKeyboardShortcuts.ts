import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("close-modals"));
        return;
      }

      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (location.pathname !== "/search") {
          navigate("/search");
        }
        requestAnimationFrame(() => {
          const input = document.getElementById("global-search-input");
          input?.focus();
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [location.pathname, navigate]);
}