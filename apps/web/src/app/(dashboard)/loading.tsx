import { Skeleton } from "@linkedin-agent/shared";

export default function DashboardLoading() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
      <div>
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    </div>
  );
}
