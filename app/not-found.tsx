import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell py-28">
      <div className="mx-auto max-w-md text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          404
        </p>
        <h1 className="mt-4 text-[30px] font-bold tracking-tight text-ink">
          We could not find that page.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
          The club or page you were looking for may have moved.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/explore" className="btn btn-primary">
            Browse all clubs
          </Link>
          <Link href="/" className="btn btn-secondary">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
