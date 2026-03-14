"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your workspace settings.
        </p>
      </div>

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
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="My Organization"
              />
            </div>
            <Button>Save</Button>
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
          <Button variant="outline">Create workspace</Button>
        </CardContent>
      </Card>
    </div>
  );
}
