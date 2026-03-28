import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted [animation-delay:150ms] [animation-fill-mode:backwards]", className)}
      {...props}
    />
  )
}

export { Skeleton }
