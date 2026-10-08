"use client";

export function PrintButton({ label = "In" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-emerald-800 px-6 py-2 text-white hover:bg-emerald-900"
    >
      {label}
    </button>
  );
}
