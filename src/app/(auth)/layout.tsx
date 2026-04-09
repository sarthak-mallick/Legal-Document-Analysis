import { Scale } from "lucide-react";

// Split-screen layout for auth pages with branding panel.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Branding panel */}
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex lg:w-1/2">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          <span className="text-sm font-semibold">Legal AI</span>
        </div>
        <div className="space-y-4">
          <blockquote className="text-lg font-medium leading-relaxed">
            &ldquo;This platform transformed how our team reviews contracts. What took days now
            takes minutes with cited, accurate answers.&rdquo;
          </blockquote>
          <p className="text-sm text-primary-foreground/70">— Legal Operations Team</p>
        </div>
        <p className="text-xs text-primary-foreground/50">AI-powered legal document analysis</p>
      </div>
      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
