import { requireRole } from "@/lib/auth";
import { getMappings, getMappingStats } from "@/features/herbs/actions";
import { MigrateClient } from "./MigrateClient";
import { BackButton } from "@/components/shared/BackButton";

export default async function MigratePage() {
  await requireRole("admin", "practitioner");
  const [mappings, stats] = await Promise.all([getMappings(), getMappingStats()]);

  return (
    <div className="space-y-4">
      <BackButton href="/herbs" />
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Chuẩn hóa tên vị thuốc</h1>
        <p className="text-sm text-stone-500">
          Map tên text tự do sang danh mục — cần thầy thuốc duyệt từng cái
        </p>
      </div>
      <MigrateClient initialMappings={mappings} stats={stats} />
    </div>
  );
}
