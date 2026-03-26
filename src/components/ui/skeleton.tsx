import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

// Animated placeholder for loading states.
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton h-4 w-full bg-slate-200 dark:bg-slate-700",
        className,
      )}
    />
  );
}

// Document card loading skeleton.
export function DocumentCardSkeleton() {
  return (
    <div className="rounded-[28px] border border-border/80 bg-white/80 p-6 shadow-panel backdrop-blur dark:bg-slate-800/80">
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
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Message loading skeleton for chat.
export function MessageSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-2 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-56" />
      </div>
    </div>
  );
}
