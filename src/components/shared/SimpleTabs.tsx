"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabDef {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}

/** Tabs đơn giản cho mobile — không cần radix */
export function SimpleTabs({ tabs, defaultTab }: { tabs: TabDef[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-stone-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={cn(
              "whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors",
              active === t.id
                ? "border-b-2 border-emerald-700 text-emerald-800"
                : "text-stone-500 hover:text-stone-800",
            )}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className="ml-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="pt-4">
        {tabs.find((t) => t.id === active)?.content}
      </div>
    </div>
  );
}
