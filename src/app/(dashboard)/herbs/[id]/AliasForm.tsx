"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addAlias, type ActionState } from "@/features/herbs/actions";

export function AliasForm({ herbId }: { herbId: string }) {
  const [state, formAction, isPending] = useActionState(
    addAlias.bind(null, herbId),
    {} as ActionState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <Input name="alias_name" maxLength={100} placeholder="Thêm tên khác..." className="max-w-xs" />
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          {isPending ? "Đang thêm..." : "Thêm"}
        </Button>
      </div>
      {state.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
    </form>
  );
}
