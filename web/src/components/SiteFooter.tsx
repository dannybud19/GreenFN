export function SiteFooter({ attribution }: { attribution: string }) {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 text-xs leading-relaxed text-muted sm:px-6">
        <p>{attribution}</p>
        <p className="mt-1">
          <a className="underline hover:text-foreground" href="https://github.com/dannybud19/GreenFN">
            Source on GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
