import { notFound } from "next/navigation";
import { Sparkles, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Local design reference only (`next dev`). Hidden in production and preview builds.
 */
export default function DevUiGalleryPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <PageHeader
        title="UI patterns"
        description="Design-system primitives for development. This route is not available in production builds."
        actions={
          <Badge variant="secondary" className="font-mono text-xs">
            NODE_ENV=development
          </Badge>
        }
      />

      <div className="space-y-10">
        <section className="space-y-3">
          <h2 className="ds-section-label">Empty state</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <EmptyState
              icon={LayoutDashboard}
              title="Default empty"
              description="Full padding and typography for primary page regions."
            >
              <Button size="sm">Primary action</Button>
            </EmptyState>
            <EmptyState
              variant="compact"
              icon={Sparkles}
              title="Compact empty"
              description="Tighter spacing for panels and nested cards."
            >
              <Button variant="outline" size="sm">
                Secondary
              </Button>
            </EmptyState>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="ds-section-label">Skeleton</h2>
          <Card>
            <CardHeader>
              <CardTitle>Shimmer loading</CardTitle>
              <CardDescription>Use when layout is stable; pair with real progress where needed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full max-w-md" variant="shimmer" />
              <Skeleton className="h-4 w-full max-w-sm" variant="shimmer" />
              <Skeleton className="h-10 w-full" variant="shimmer" />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="ds-section-label">Buttons & badges</h2>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 pt-6">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Badge>New</Badge>
              <Badge variant="outline">Outline</Badge>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
