import { Skeleton } from "@/components/ui/skeleton";

// Loading skeleton for the chat page.
export default function ChatLoading() {
  return (
    <div className="flex h-screen">
      {/* Sidebar skeleton */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card-bg p-4 md:block">
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="mt-6 h-4 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
      </aside>

      {/* Chat area skeleton */}
      <main className="flex flex-1 flex-col">
        <header className="border-b border-border bg-card-bg px-6 py-3">
          <Skeleton className="h-5 w-16" />
        </header>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      </main>
    </div>
  );
}
