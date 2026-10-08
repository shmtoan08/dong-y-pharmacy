"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoModal } from "@/components/shared/InfoModal";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchPatients } from "@/features/patients/actions";
import { createAppointment, quickCreatePatient } from "@/features/appointments/actions";

/** Nút tiếp đón nhanh bệnh nhân vãng lai (walk-in) */
export function WalkInButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [patientQ, setPatientQ] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([]);
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const onSearch = async (q: string) => {
    setPatientQ(q);
    if (q.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    const res = await searchPatients(q.trim());
    setPatientResults(res.slice(0, 8));
  };

  const onSubmit = async () => {
    if (!patientId) {
      setError("Chưa chọn bệnh nhân.");
      return;
    }
    setBusy(true);
    // Tạo lịch hẹn ngay giờ hiện tại, trạng thái checked_in luôn
    const now = new Date();
    const res = await createAppointment({
      patient_id: patientId,
      scheduled_at: now.toISOString(),
      reason,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else if (res.id) {
      // Check-in ngay
      const { checkInAppointment } = await import("@/features/appointments/actions");
      await checkInAppointment(res.id);
      setOpen(false);
      reset();
      router.refresh();
    }
  };

  const reset = () => {
    setPatientQ("");
    setPatientResults([]);
    setPatientId("");
    setPatientName("");
    setReason("");
    setShowNewPatient(false);
    setNewName("");
    setNewPhone("");
  };

  const onCreatePatient = async () => {
    if (!newName.trim()) {
      setError("Chưa nhập họ tên bệnh nhân.");
      return;
    }
    setCreating(true);
    const res = await quickCreatePatient(newName.trim(), newPhone.trim());
    setCreating(false);
    if (res.error) setError(res.error);
    else if (res.id) {
      setPatientId(res.id);
      setPatientName(newName.trim());
      setShowNewPatient(false);
      setNewName("");
      setNewPhone("");
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="mr-1 h-4 w-4" /> Tiếp đón
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tiếp đón bệnh nhân vãng lai</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Bệnh nhân đến trực tiếp không đặt lịch trước. Chọn hồ sơ và tiếp đón ngay.
            </p>
            <div className="space-y-1.5">
              <Label>Bệnh nhân *</Label>
              {patientId ? (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                  <span className="font-medium">{patientName}</span>
                  <button type="button" className="text-xs text-stone-500 hover:text-stone-700"
                    onClick={() => { setPatientId(""); setPatientName(""); setPatientQ(""); }}>
                    Đổi
                  </button>
                </div>
              ) : (
                <>
                  <Input
                    value={patientQ}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Gõ tên hoặc SĐT..."
                  />
                  {patientResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-stone-200">
                      {patientResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-50"
                          onClick={() => { setPatientId(p.id); setPatientName(p.full_name); setPatientResults([]); }}
                        >
                          {p.full_name}
                          {p.phone && <span className="text-stone-500"> · {p.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="mt-1 text-xs text-emerald-700 hover:underline"
                    onClick={() => setShowNewPatient(!showNewPatient)}
                  >
                    + Tạo nhanh bệnh nhân mới
                  </button>
                  {showNewPatient && (
                    <div className="mt-2 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Họ tên *" />
                        <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="SĐT" />
                      </div>
                      <Button size="sm" onClick={onCreatePatient} disabled={creating}
                        className="bg-emerald-800 hover:bg-emerald-900">
                        {creating ? "Đang tạo..." : "Tạo bệnh nhân"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Lý do khám</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Đau đầu, cảm cúm..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Hủy</Button>
            <Button className="bg-emerald-800 hover:bg-emerald-900" onClick={onSubmit} disabled={busy}>
              {busy ? "Đang xử lý..." : "Tiếp đón ngay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal open={error !== null} onOpenChange={(o) => !o && setError(null)} title={error ?? ""} />
    </>
  );
}
