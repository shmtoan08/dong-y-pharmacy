import Link from "next/link";
import { BackButton } from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction } from "lucide-react";

/**
 * Trang trống cho tính năng chưa phát triển — giữ chỗ trong menu
 * để không quên roadmap.
 */
export function ComingSoon({
  title,
  description,
  plannedPhase,
  backHref = "/",
}: {
  title: string;
  description?: string;
  plannedPhase?: string;
  backHref?: string;
}) {
  return (
    <div className="space-y-4">
      <BackButton href={backHref} />
      <Card className="mx-auto max-w-lg border-dashed">
        <CardHeader className="items-center pb-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <Construction className="h-7 w-7" />
          </span>
          <CardTitle className="mt-2">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {description && <p className="text-sm text-stone-500">{description}</p>}
          <div>
            <Badge variant="secondary" className="bg-stone-100 text-stone-600">
              Sắp phát triển{plannedPhase ? ` · ${plannedPhase}` : ""}
            </Badge>
          </div>
          <Link href={backHref}>
            <Button variant="outline" size="sm" className="mt-2">
              Về trang chủ
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
