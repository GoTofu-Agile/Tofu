"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [name, setName] = useState(orgName);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleSave() {
    if (!name.trim() || name === orgName) return;
    setSaving(true);
    const result = await updateWorkspaceName(orgId, name);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Workspace name updated");
      router.refresh();
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const result = await createWorkspace(newName);
    setCreating(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Workspace created");
      setNewName("");
      router.refresh();
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
          <div className="flex items-end gap-4">
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
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
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
          <div className="flex items-end gap-4">
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
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
