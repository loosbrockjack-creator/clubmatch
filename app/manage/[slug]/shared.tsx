"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { apiFetch } from "@/lib/club-client";
import type { LeadStudent } from "@/lib/club-types";
import Link from "next/link";

/** Loads one panel endpoint with loading, error, and reload handled. */
export function usePanelData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await apiFetch<T>(path);
    if (res.data) {
      setData(res.data);
      setError(null);
    } else setError(res.error);
  }, [path]);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<T>(path).then((res) => {
      if (cancelled) return;
      if (res.data) {
        setData(res.data);
        setError(null);
      } else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { data, setData, error, reload };
}

export function PanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-32 rounded-[14px]" />
      <div className="skeleton h-56 rounded-[14px]" />
    </div>
  );
}

export function PanelError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card px-6 py-10 text-center">
      <p className="text-[15px] text-ink-soft">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary mt-5">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="text-[15.5px] font-semibold text-ink">{title}</p>
      <div className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

export function SectionTitle({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="mb-5">
      <h2 className="display text-[24px] text-ink">{title}</h2>
      {intro && <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-ink-soft">{intro}</p>}
    </div>
  );
}

/** Short-lived success or failure line next to a form's button. */
export function FormStatus({ error, success }: { error?: string | null; success?: string | null }) {
  if (error) {
    return (
      <p role="alert" className="text-[14px] font-medium text-cardinal">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="text-[14px] font-medium text-ink-soft">
        {success}
      </p>
    );
  }
  return null;
}

export function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-[12.5px] tabular-nums ${value.length > max ? "font-semibold text-cardinal" : "text-ink-muted"}`}>
      {value.length}/{max}
    </span>
  );
}

/** One student row, from public profile columns only. */
export function StudentRow({
  student,
  meta,
  children,
}: {
  student: LeadStudent;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={student.display_name} url={student.avatar_url} preset={student.avatar_preset} size={44} />
        <div className="min-w-0">
          <Link href={`/students/${student.id}`} className="block truncate text-[15px] font-semibold text-ink hover:text-cardinal">
            {student.display_name || "Iowa State student"}
          </Link>
          <p className="truncate text-[13px] text-ink-muted">
            {[student.major, student.class_year].filter(Boolean).join(" · ") || "No major listed"}
          </p>
          {meta}
        </div>
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </li>
  );
}
