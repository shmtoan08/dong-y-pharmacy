import { BackButton } from "@/components/shared/BackButton";
import { VisitTimelineItem } from "./VisitTimelineItem";
import { SimpleTabs } from "@/components/shared/SimpleTabs";
import { getPatient } from "@/features/patients/actions";
import { getVisitsByPatient } from "@/features/visits/actions";
import { getPrescriptionsByVisit } from "@/features/prescriptions/actions";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Stethoscope, FileText, Pencil, Printer } from "lucide-react";
import { STATUS_LABEL, STATUS_STYLE } from "@/features/prescriptions/constants";
import { notFound } from "next/navigation";

const SEX_LABEL: Record<string, string> = { male: "Nam", female: "Nữ", other: "Khác" };

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [patient, user] = await Promise.all([getPatient(id), getSessionUser()]);
  if (!patient || !user) notFound();

  const visits = await getVisitsByPatient(id);
  const prescriptionsByVisit = await Promise.all(
    visits.map(async (v) => ({ visit: v, prescriptions: await getPrescriptionsByVisit(v.id) })),
  );
  const allPrescriptions = prescriptionsByVisit.flatMap(({ visit, prescriptions }) =>
    prescriptions.map((pr) => ({ ...pr, visit })),
  );

  const canEdit = user.role === "admin" || user.role === "practitioner";
  const dob = patient.date_of_birth
    ? new Date(patient.date_of_birth).toLocaleDateString("vi-VN")
    : "—";

  const infoTab = (
    <Card>
      <CardContent className="grid gap-2 p-4 text-sm md:grid-cols-2">
        <p><span className="font-medium">Ngày sinh:</span> {dob}</p>
        <p><span className="font-medium">Giới tính:</span> {patient.sex ? SEX_LABEL[patient.sex] ?? patient.sex : "—"}</p>
        <p><span className="font-medium">SĐT:</span> {patient.phone ?? "—"}</p>
        <p><span className="font-medium">Địa chỉ:</span> {patient.address ?? "—"}</p>
        {patient.medical_history && (
          <p className="md:col-span-2"><span className="font-medium">Tiền sử:</span> {patient.medical_history}</p>
        )}
        {patient.allergies && (
          <p className="md:col-span-2"><span className="font-medium text-red-700">Dị ứng:</span> {patient.allergies}</p>
        )}
      </CardContent>
    </Card>
  );

  const visitsTab = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quá trình thăm khám ({visits.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {visits.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-500">Chưa có lượt khám nào.</p>
        ) : (
          <div className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-stone-200">
            {prescriptionsByVisit.map(({ visit, prescriptions }) => (
              <VisitTimelineItem
                key={visit.id}
                visitId={visit.id}
                visitedAt={visit.visited_at}
                practitionerName={visit.practitioner_name}
                diagnosis={visit.final_diagnosis}
                canPrescribe={canEdit && prescriptions.length === 0}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const prescriptionsTab = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lịch sử đơn thuốc ({allPrescriptions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {allPrescriptions.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-500">Chưa có đơn thuốc nào.</p>
        ) : (
          <div className="space-y-2">
            {allPrescriptions.map((pr) => (
              <Link
                key={pr.id}
                href={`/prescriptions/${pr.id}`}
                className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2.5 text-sm hover:bg-stone-50"
              >
                <FileText className="h-4 w-4 shrink-0 text-stone-400" />
                <div className="min-w-0">
                  <p className="font-medium">
                    {pr.prescription_code}
                    <span className="ml-2 font-normal text-stone-500">{pr.num_of_packs} thang</span>
                  </p>
                  <p className="truncate text-xs text-stone-500">
                    {new Date(pr.visit.visited_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <Badge className={`ml-auto shrink-0 ${STATUS_STYLE[pr.status]}`}>
                  {STATUS_LABEL[pr.status]}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <BackButton href="/patients" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
            {patient.full_name}
          </h1>
          <p className="text-sm text-stone-500">{patient.patient_code}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/patients/${id}/print`}>
            <Button variant="outline" size="sm">
              <Printer className="mr-1 h-4 w-4" /> In bệnh án
            </Button>
          </Link>
          {canEdit && (
            <>
              <Link href={`/patients/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-1 h-4 w-4" /> Sửa
                </Button>
              </Link>
              <Link href={`/visits/new?patientId=${id}`}>
                <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900">
                  <Plus className="mr-1 h-4 w-4" /> Khám mới
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <SimpleTabs
        tabs={[
          { id: "info", label: "Thông tin", content: infoTab },
          { id: "visits", label: "Lượt khám", count: visits.length, content: visitsTab },
          { id: "prescriptions", label: "Đơn thuốc", count: allPrescriptions.length, content: prescriptionsTab },
        ]}
      />
    </div>
  );
}
