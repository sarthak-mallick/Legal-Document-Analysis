import { Skeleton } from "@/components/ui/skeleton";

// Loading skeleton for the chat page.
export default function ChatLoading() {
  return (
    <div className="flex h-screen flex-col">
      {/* Header skeleton */}
      <header className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <Skeleton className="h-5 w-24" />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar p-4 md:block">
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
            <Skeleton className="mt-6 h-4 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-full rounded-md" />
              <Skeleton className="h-7 w-full rounded-md" />
            </div>
          </div>
        </aside>

        {/* Chat area skeleton */}
        <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading...
        </main>
      </div>
    </div>
  );
}
