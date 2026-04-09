"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateWorkspaceName, createWorkspace } from "./actions";

export function SettingsForm({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const [name, setName] = useState(orgName);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createState, setCreateState] = useState<"idle" | "creating" | "created" | "error">("idle");

  async function handleSave() {
    if (!name.trim() || name === orgName) return;
    setSaving(true);
    setSaveState("saving");
    const result = await updateWorkspaceName(orgId, name);
    setSaving(false);
    if (result.error) {
      setSaveState("error");
      toast.error(result.error);
    } else {
      setSaveState("saved");
      toast.success("Workspace name updated");
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateState("creating");
    const result = await createWorkspace(newName);
    setCreating(false);
    if (result.error) {
      setCreateState("error");
      toast.error(result.error);
    } else {
      setCreateState("created");
      toast.success("Workspace created");
      setNewName("");
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Workspace Name</CardTitle>
          <CardDescription>
            The name of your workspace as it appears across GoTofu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="orgName">Name</Label>
              <Input
                id="orgName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Organization"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim() || name === orgName}
              className="w-full sm:w-auto"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
            {saveState === "saving"
              ? "Saving workspace name..."
              : saveState === "saved"
                ? "Workspace name saved."
                : saveState === "error"
                  ? "Could not save changes. Please retry."
                  : "\u00a0"}
          </p>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Create New Workspace</CardTitle>
          <CardDescription>
            Create a new workspace for a different team or project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="newWorkspace">Workspace Name</Label>
              <Input
                id="newWorkspace"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. My Startup"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="w-full sm:w-auto"
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
            {createState === "creating"
              ? "Creating workspace..."
              : createState === "created"
                ? "Workspace created."
                : createState === "error"
                  ? "Could not create workspace. Please retry."
                  : "\u00a0"}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
