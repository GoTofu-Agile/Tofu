"use client";

import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PersonaDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: {
    name: string;
    archetype: string | null;
    occupation: string | null;
    age: number | null;
    gender: string | null;
  } | null;
}

export function PersonaDetailModal({
  open,
  onOpenChange,
  persona,
}: PersonaDetailModalProps) {
  if (!persona) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10">
              <User className="h-5 w-5 text-foreground/60" />
            </div>
            <div>
              <DialogTitle>{persona.name}</DialogTitle>
              {persona.archetype && (
                <DialogDescription>{persona.archetype}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap gap-2">
            {persona.occupation && (
              <Badge variant="outline" className="text-xs">
                {persona.occupation}
              </Badge>
            )}
            {persona.age && (
              <Badge variant="outline" className="text-xs">
                {persona.age} years old
              </Badge>
            )}
            {persona.gender && (
              <Badge variant="outline" className="text-xs">
                {persona.gender}
              </Badge>
            )}
          </div>

          {!persona.occupation && !persona.age && !persona.gender && !persona.archetype && (
            <p className="text-sm text-muted-foreground">
              No additional details available for this persona.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
