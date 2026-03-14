"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createGroupAndGenerate } from "@/app/(dashboard)/personas/actions";
import { Plus } from "lucide-react";

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const result = await createGroupAndGenerate(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Persona group created. Generation started!");
    setOpen(false);
    router.push(`/personas/${result.groupId}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 h-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        <Plus className="h-4 w-4" />
        Create Group
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Persona Group</DialogTitle>
          <DialogDescription>
            Generate a group of synthetic user personas using AI.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Midwives in Germany"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="Brief description of this persona group"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domainContext">Domain Context</Label>
            <Textarea
              id="domainContext"
              name="domainContext"
              placeholder="Describe the domain, target audience, and any specific characteristics you want the personas to have..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="count">Number of Personas</Label>
            <Input
              id="count"
              name="count"
              type="number"
              min={1}
              max={100}
              defaultValue={5}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create & Generate"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
