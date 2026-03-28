"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/track";

interface TrackPageViewProps {
  page: string;
  area?: string;
}

export function TrackPageView({ page, area }: TrackPageViewProps) {
  useEffect(() => {
    trackEvent("page_view", { page, area: area ?? "app" });
  }, [page, area]);

  return null;
}
