import Link from "next/link";

// Custom 404 page.
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <p className="text-7xl font-bold text-foreground">404</p>
        <p className="mt-4 text-muted-foreground">The page you are looking for does not exist.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
