"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { HerbAutocomplete } from "@/components/prescriptions/HerbAutocomplete";
import { getHerb } from "@/features/herbs/actions";

interface Item {
  herb_id: string;
  herb_name: string;
  base_unit: string;
  quantity: string;
  unit_price: string;
  expiry_date: string;
  supplier_lot_code: string;
}

export function ReceiptItemEditor() {
  const [items, setItems] = useState<Item[]>([]);

  const addItem = async (herbId: string | null, herbName: string) => {
    if (!herbId) return;
    if (items.some((i) => i.herb_id === herbId)) return;
    const herb = await getHerb(herbId);
    if (!herb) return;
    setItems([...items, {
      herb_id: herbId,
      herb_name: herb.name_common,
      base_unit: herb.base_unit,
      quantity: "",
      unit_price: "",
      expiry_date: "",
      supplier_lot_code: "",
    }]);
  };

  const update = (idx: number, field: keyof Item, value: string) => {
    setItems(items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const remove = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {items.map((it, idx) => {
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unit_price) || 0;
        const lineTotal = qty * price;
        return (
          <div key={it.herb_id} className="rounded-lg border border-stone-200 p-3">
            <input type="hidden" name={`items[${idx}][herb_id]`} value={it.herb_id} />
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">{it.herb_name}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-600"
                onClick={() => remove(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Số lượng ({it.base_unit}) *</Label>
                <Input
                  type="number" min={0} step={0.01} required
                  name={`items[${idx}][quantity]`}
                  value={it.quantity}
                  onChange={(e) => update(idx, "quantity", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Đơn giá (đ)</Label>
                <Input
                  type="number" min={0} step={1}
                  name={`items[${idx}][unit_price]`}
                  value={it.unit_price}
                  onChange={(e) => update(idx, "unit_price", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Số lô NCC</Label>
                <Input
                  name={`items[${idx}][supplier_lot_code]`}
                  value={it.supplier_lot_code}
                  onChange={(e) => update(idx, "supplier_lot_code", e.target.value)}
                  placeholder="Lô SX của NCC"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hạn sử dụng</Label>
                <Input
                  type="date"
                  name={`items[${idx}][expiry_date]`}
                  value={it.expiry_date}
                  onChange={(e) => update(idx, "expiry_date", e.target.value)}
                />
              </div>
            </div>
            {lineTotal > 0 && (
              <p className="mt-2 text-right text-sm">
                <span className="text-stone-500">Thành tiền: </span>
                <span className="font-semibold">{lineTotal.toLocaleString("vi-VN")} đ</span>
              </p>
            )}
          </div>
        );
      })}

      <HerbAutocomplete
        name="herb_search"
        onHerbChange={addItem}
        placeholder="Tìm vị thuốc để thêm vào phiếu..."
      />
      {items.length === 0 && (
        <p className="text-sm text-stone-400">Chưa có dòng nào. Tìm vị thuốc ở trên để thêm.</p>
      )}
    </div>
  );
}
