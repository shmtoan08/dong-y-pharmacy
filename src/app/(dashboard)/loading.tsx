import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-stone-200 rounded-md" />
          <div className="h-4 w-72 bg-stone-100 rounded-md" />
        </div>
        <div className="h-9 w-32 bg-stone-200 rounded-md" />
      </div>

      {/* Filter toolbar skeleton */}
      <Card className="border-stone-200 shadow-2xs">
        <CardContent className="p-3.5 flex flex-wrap gap-3">
          <div className="h-9 flex-1 min-w-48 bg-stone-100 rounded-md" />
          <div className="h-9 w-32 bg-stone-100 rounded-md" />
          <div className="h-9 w-32 bg-stone-100 rounded-md" />
        </CardContent>
      </Card>

      {/* Table skeleton */}
      <Card className="border-stone-200 shadow-2xs">
        <CardHeader className="py-3 px-4 border-b border-stone-100">
          <div className="h-4 w-36 bg-stone-200 rounded" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-stone-100">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-1/4 bg-stone-200 rounded" />
                  <div className="h-3 w-1/2 bg-stone-100 rounded" />
                </div>
                <div className="h-6 w-20 bg-stone-100 rounded-full" />
                <div className="h-8 w-24 bg-stone-100 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
