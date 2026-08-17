import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted border border-border/40",
        "bg-gradient-to-r from-transparent via-primary/15 to-transparent",
        "animate-shimmer",
        className
      )}
      style={{ backgroundSize: '1000px 100%' }}
      {...props}
    />
  )
}

export { Skeleton }
