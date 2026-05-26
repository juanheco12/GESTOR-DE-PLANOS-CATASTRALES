"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutos

export default function InactivityLogout() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, INACTIVITY_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  return null;
}
