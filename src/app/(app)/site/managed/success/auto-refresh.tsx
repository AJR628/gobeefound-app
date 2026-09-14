"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ everyMs }: { everyMs: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), everyMs);
    const stop = setTimeout(() => clearInterval(t), 90_000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [router, everyMs]);
  return null;
}
