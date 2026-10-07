"use client";

import { useRouter, useSearchParams } from "next/navigation";

/** Chọn số dòng hiển thị mỗi trang */
export function PageSizeSelect({
  value,
  options,
  basePath = "/visits",
}: {
  value: number;
  options: number[];
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (size: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("size", size);
    params.set("page", "1");
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <label className="flex items-center gap-1.5 text-xs">
      Hiển thị
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs"
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      dòng
    </label>
  );
}
