import { cn } from "@/lib/utils"

function Skeleton({
  className,
  variant = "pulse",
  ...props
}: React.ComponentProps<"div"> & {
  /** `shimmer` — premium loading strip; respects reduced motion via CSS. */
  variant?: "pulse" | "shimmer";
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        variant === "shimmer"
          ? "ds-skeleton-shimmer min-h-[1em]"
          : "animate-pulse rounded-md bg-muted [animation-delay:150ms] [animation-fill-mode:backwards]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
