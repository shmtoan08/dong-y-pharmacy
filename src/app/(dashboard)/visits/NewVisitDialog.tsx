"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { searchPatients } from "@/features/patients/actions";

interface PatientHit {
  id: string;
  full_name: string;
  patient_code: string;
  phone: string | null;
}

/** Nút "+ Khám bệnh mới": tìm bệnh nhân rồi chuyển sang tạo lượt khám */
export function NewVisitDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientHit[]>([]);
  const [isPending, startTransition] = useTransition();

  const doSearch = (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const r = await searchPatients(q.trim());
      setResults(r);
    });
  };

  const pick = (p: PatientHit) => {
    setOpen(false);
    router.push(`/visits/new?patientId=${p.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900">
          <Plus className="mr-1 h-4 w-4" /> Khám bệnh mới
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chọn bệnh nhân để khám</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Gõ tên, SĐT hoặc mã BN... (ít nhất 2 ký tự)"
              value={query}
              onChange={(e) => doSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          {isPending && <p className="text-sm text-stone-500">Đang tìm...</p>}
          {!isPending && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-stone-500">
              Không tìm thấy.{" "}
              <Link href="/patients/new" className="font-medium text-emerald-700 hover:underline">
                Thêm bệnh nhân mới
              </Link>
            </p>
          )}
          <ul className="max-h-64 divide-y divide-stone-100 overflow-auto rounded-md border border-stone-200">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-stone-50"
                >
                  <span className="font-medium text-stone-900">
                    {p.full_name}
                    {p.phone && <span className="ml-2 font-normal text-stone-500">{p.phone}</span>}
                  </span>
                  <span className="font-mono text-xs text-stone-500">{p.patient_code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
