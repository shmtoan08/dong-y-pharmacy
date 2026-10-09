"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { WeekRibbon } from "@/components/shared/WeekRibbon";

export function AppointmentsWeekRibbon({ selectedDate }: { selectedDate: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSelect(date: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", date);
    router.push(`?${params.toString()}`);
  }

  return <WeekRibbon selectedDate={selectedDate} onSelect={handleSelect} />;
}

export function OnlineWeekRibbon({ selectedDate }: { selectedDate: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSelect(date: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "all");
    params.set("date", date);
    router.push(`/appointments/online?${params.toString()}`);
  }

  return <WeekRibbon selectedDate={selectedDate} onSelect={handleSelect} onlineOnly />;
}
