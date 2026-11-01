import { Badge } from "@/components/ui/badge";
import {
  JOB_STATUS_LABELS,
  isJobStatus,
  type JobStatus,
} from "@/lib/constants/status";

const STATUS_VARIANT: Record<
  JobStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  0: "warning",
  1: "default",
  2: "secondary",
  3: "success",
  4: "destructive",
  5: "success",
};

export function JobStatusBadge({ status }: { status: number }) {
  if (!isJobStatus(status)) {
    return <Badge variant="secondary">Unknown</Badge>;
  }
  return (
    <Badge variant={STATUS_VARIANT[status]}>{JOB_STATUS_LABELS[status]}</Badge>
  );
}
