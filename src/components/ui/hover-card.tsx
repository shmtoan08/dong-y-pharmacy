"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";

export function HoverCard({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <HoverCardPrimitive.Root openDelay={200}>
      <HoverCardPrimitive.Trigger asChild>
        <span className="cursor-help underline decoration-dotted decoration-stone-300 underline-offset-2">
          {trigger}
        </span>
      </HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          side="top"
          align="center"
          sideOffset={8}
          className={cn(
            "z-50 w-72 rounded-md border border-stone-200 bg-white p-3 shadow-lg",
            "animate-in fade-in-0 zoom-in-95",
          )}
        >
          {children}
          <HoverCardPrimitive.Arrow className="fill-white" />
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}
