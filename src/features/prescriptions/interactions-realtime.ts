"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export interface RealtimeInteraction {
  herb_a_name: string;
  herb_b_name: string;
  severity: string;
  description: string | null;
}

/** Kiểm tra tương kỵ real-time cho danh sách herb IDs */
export async function checkInteractionsRealtime(
  herbIds: string[]
): Promise<RealtimeInteraction[]> {
  await requireRole("admin", "practitioner", "dispenser");
  if (herbIds.length < 2) return [];

  const { rows } = await db.query<RealtimeInteraction>(
    `SELECT DISTINCT ha.name_common AS herb_a_name, hb.name_common AS herb_b_name,
            ix.severity, ix.description
     FROM herb_interactions ix
     JOIN herbs ha ON ha.id = ix.herb_a_id
     JOIN herbs hb ON hb.id = ix.herb_b_id
     WHERE ix.verified = TRUE
       AND (
         (ix.herb_a_id = ANY($1) AND ix.herb_b_id = ANY($1))
       )
       AND ix.herb_a_id <> ix.herb_b_id`,
    [herbIds]
  );
  return rows;
}
