"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { editGroup, removeGroup } from "@/app/(dashboard)/personas/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function PersonaGroupActions(props: {
  groupId: string;
  initialName: string;
  initialDescription?: string | null;
}) {
  const { groupId, initialName, initialDescription } = props;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit group
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(true)}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit persona group</DialogTitle>
            <DialogDescription>Update group name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              disabled={submitting}
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              disabled={submitting}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting || name.trim().length < 2}
              onClick={async () => {
                setSubmitting(true);
                const result = await editGroup(groupId, {
                  name,
                  description,
                });
                setSubmitting(false);
                if ("error" in result) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Persona group updated");
                setEditing(false);
                router.refresh();
              }}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete persona group?</DialogTitle>
            <DialogDescription>
              This permanently deletes the group and all personas in it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleting(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                const result = await removeGroup(groupId);
                setSubmitting(false);
                if ("error" in result) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Persona group deleted");
                router.push("/personas");
                router.refresh();
              }}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
