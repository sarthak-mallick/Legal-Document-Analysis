"use client";

// Root-level error boundary — replaces the entire layout, so use inline styles.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          color: "#1e293b",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
          <h2 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
            A critical error occurred. Please try reloading the page.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              cursor: "pointer",
              backgroundColor: "white",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
