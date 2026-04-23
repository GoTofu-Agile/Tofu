"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateNotificationPrefs } from "@/app/(dashboard)/settings/actions";

export function NotificationSettings({
  notifyPersonaGenComplete,
}: {
  notifyPersonaGenComplete: boolean;
}) {
  const [enabled, setEnabled] = useState(notifyPersonaGenComplete);
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    const result = await updateNotificationPrefs({ notifyPersonaGenComplete: next });
    setSaving(false);
    if (result.error) {
      setEnabled(!next); // revert
      toast.error(result.error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>
          Choose which emails GoTofu sends you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggle}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-foreground peer-disabled:opacity-50" />
            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium leading-none">
              Persona generation complete
              {saving && <Loader2 className="inline ml-2 h-3 w-3 animate-spin text-muted-foreground" />}
            </p>
            <p className="text-sm text-muted-foreground">
              Email me when a persona group finishes generating, so I can check back later.
            </p>
          </div>
        </label>
      </CardContent>
    </Card>
  );
}
