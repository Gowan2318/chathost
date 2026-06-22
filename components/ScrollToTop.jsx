"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  // Disable browser scroll restoration so it never re-positions the page
  useEffect(() => {
    history.scrollRestoration = "manual";
  }, []);

  const pathname = usePathname();

  // On every route change, scroll to top — but only when there's no hash
  // (hash links like /#pricing need the browser to jump to the anchor instead)
  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
