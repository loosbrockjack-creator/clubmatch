"use client";

import { useEffect } from "react";

/**
 * iOS Safari paints the strip under its toolbar (and any overscroll) with the
 * root background. While the footer is on screen, make that cardinal so the
 * footer runs to the bottom edge of the phone instead of ending on white.
 */
export function FooterCanvas() {
  useEffect(() => {
    const footer = document.querySelector(".site-footer");
    if (!footer) return;
    const root = document.documentElement;
    const observer = new IntersectionObserver(([entry]) => {
      root.toggleAttribute("data-footer-in-view", entry.isIntersecting);
    });
    observer.observe(footer);
    return () => {
      observer.disconnect();
      root.removeAttribute("data-footer-in-view");
    };
  }, []);
  return null;
}
