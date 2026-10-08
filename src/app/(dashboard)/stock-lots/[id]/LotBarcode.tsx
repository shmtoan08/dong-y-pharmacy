"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/** Render mã vạch Code128 cho mã lô */
export function LotBarcode({ code }: { code: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (ref.current) {
      JsBarcode(ref.current, code, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
      });
    }
  }, [code]);

  return <svg ref={ref} className="max-w-full" />;
}
