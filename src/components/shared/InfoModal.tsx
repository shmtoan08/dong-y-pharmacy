"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

interface InfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
}

/**
 * Modal thông báo dùng chung toàn hệ thống.
 * Không dùng window.alert — dùng component này thay thế.
 */
export function InfoModal({ open, onOpenChange, title, description }: InfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Info className="h-5 w-5 text-amber-700" />
          </span>
          <div>
            <DialogTitle className="text-left">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-left">{description}</DialogDescription>
            )}
          </div>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} className="bg-emerald-800 hover:bg-emerald-900">
            Đã hiểu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
