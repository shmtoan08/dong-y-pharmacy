"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { InfoModal } from "@/components/shared/InfoModal";
import { Plus } from "lucide-react";
import { createAppointment } from "@/features/appointments/actions";
import { quickCreatePatient } from "@/features/appointments/actions";
import { searchPatients } from "@/features/patients/actions";

interface Practitioner {
  id: string;
  full_name: string;
}

export function NewAppointmentButton({ practitioners }: { practitioners: Practitioner[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [patientQ, setPatientQ] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([]);
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [practitionerId, setPractitionerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("08:00");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const onSearchPatient = async (q: string) => {
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
    if (!date || !time) {
      setError("Chưa chọn ngày giờ.");
      return;
    }
    setBusy(true);
    const res = await createAppointment({
      patient_id: patientId,
      practitioner_id: practitionerId || null,
      scheduled_at: `${date}T${time}:00+07:00`,
      reason,
      note,
    });
    setBusy(false);
    if (res.error) setError(res.error);
    else {
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
    setPractitionerId("");
    setReason("");
    setNote("");
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
    if (res.error) {
      setError(res.error);
    } else if (res.id) {
      setPatientId(res.id);
      setPatientName(newName.trim());
      setShowNewPatient(false);
      setNewName("");
      setNewPhone("");
    }
  };

  return (
    <>
      <Button className="bg-emerald-800 hover:bg-emerald-900" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> Đặt lịch hẹn
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader><DialogTitle>Đặt lịch hẹn mới</DialogTitle></DialogHeader>
          <div className="space-y-3">
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
                    onChange={(e) => onSearchPatient(e.target.value)}
                    placeholder="Gõ tên hoặc SĐT (ít nhất 2 ký tự)..."
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ngày *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Giờ *</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Bác sĩ</Label>
              <Select value={practitionerId || "none"} onValueChange={(v) => setPractitionerId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Chọn bác sĩ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chưa chọn</SelectItem>
                  {practitioners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lý do khám</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Đau lưng, mất ngủ..." />
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Hủy</Button>
            <Button className="bg-emerald-800 hover:bg-emerald-900" onClick={onSubmit} disabled={busy}>
              {busy ? "Đang lưu..." : "Đặt lịch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal open={error !== null} onOpenChange={(o) => !o && setError(null)} title={error ?? ""} />
    </>
  );
}
