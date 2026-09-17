import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell py-28">
      <div className="mx-auto max-w-md text-center">
        <p className="eyebrow">404</p>
        <h1 className="display mt-5 text-[34px] text-cardinal">
          We could not find that page.
        </h1>
        <div className="mx-auto mt-5 h-1 w-[54px] bg-gold" />
        <p className="mt-5 text-[15.5px] leading-relaxed text-ink-soft">
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
