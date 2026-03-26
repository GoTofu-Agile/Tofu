"use client";

import { useEffect } from "react";

type WorkspaceCookieRedirectProps = {
  activeOrgId: string;
  activeOrgSlug: string;
  redirectTo: string;
};

export function WorkspaceCookieRedirect({
  activeOrgId,
  activeOrgSlug,
  redirectTo,
}: WorkspaceCookieRedirectProps) {
  useEffect(() => {
    document.cookie = `activeOrgId=${activeOrgId}; path=/; max-age=31536000`;
    document.cookie = `activeOrgSlug=${activeOrgSlug}; path=/; max-age=31536000`;
    window.location.replace(redirectTo);
  }, [activeOrgId, activeOrgSlug, redirectTo]);

  return null;
}
