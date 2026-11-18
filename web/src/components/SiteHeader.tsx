import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <nav aria-label="Main" className="mx-auto flex w-full max-w-5xl items-center gap-5 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-accent" />
          GreenFN
        </Link>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/" className="text-muted hover:text-foreground">
            Search
          </Link>
          <Link href="/map" className="text-muted hover:text-foreground">
            Map
          </Link>
          <Link href="/about" className="text-muted hover:text-foreground">
            About
          </Link>
        </div>
      </nav>
    </header>
  );
}
