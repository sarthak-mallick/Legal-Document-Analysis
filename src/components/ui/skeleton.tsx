import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

// Animated placeholder for loading states.
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton h-4 w-full bg-muted", className)} />;
}

// Document card loading skeleton.
export function DocumentCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full" />
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Message loading skeleton for chat.
export function MessageSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-2 rounded-lg bg-muted px-4 py-3">
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-56" />
      </div>
    </div>
  );
}
