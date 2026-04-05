import Link from "next/link";

// Custom 404 page.
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-2 font-serif text-6xl text-foreground">404</h1>
        <p className="mb-6 text-muted-foreground">The page you are looking for does not exist.</p>
        <Link
          href="/dashboard"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
