"use client";

import { Input } from "@/components/ui/input";

export function DateNavigator({ date }: { date: string }) {
  return (
    <form action="/appointments" method="get">
      <Input
        type="date"
        name="date"
        defaultValue={date}
        className="w-40"
        onChange={(e) => {
          (e.target.form as HTMLFormElement).submit();
        }}
      />
    </form>
  );
}
