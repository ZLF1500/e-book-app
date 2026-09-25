import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-xl bg-neutral-200/80 dark:bg-neutral-800/80 after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/30 dark:after:via-white/10 after:to-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }

