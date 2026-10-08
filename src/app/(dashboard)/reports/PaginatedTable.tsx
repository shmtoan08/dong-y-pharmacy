"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PaginatedTable<T>({
  rows,
  pageSize = 10,
  renderHeader,
  renderRow,
  emptyText,
}: {
  rows: T[];
  pageSize?: number;
  renderHeader: () => React.ReactNode;
  renderRow: (row: T, index: number) => React.ReactNode;
  emptyText: string;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-left">
              {renderHeader()}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => renderRow(r, (safePage - 1) * pageSize + i))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-stone-500">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3">
          <p className="text-sm text-stone-500">
            Hiển thị {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, rows.length)} trên {rows.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="h-8 w-8 p-0">
              {"<"}
            </Button>
            <span className="px-2 text-sm text-stone-600">{safePage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="h-8 w-8 p-0">
              {">"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
