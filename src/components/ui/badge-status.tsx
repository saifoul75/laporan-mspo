import * as React from "react";
import { cn } from "@/lib/utils";
import type { StatusDapatan } from "@/types";
import { Badge } from "@/components/ui/badge";

const LABEL: Record<StatusDapatan, string> = {
  Y: "Y - Comply",
  N: "N - Tidak Patuh",
  NC: "NC",
  OFI: "OFI",
  NA: "N/A",
  Pending: "Pending",
};

const VARIAN: Record<StatusDapatan, "y" | "n" | "nc" | "ofi" | "na" | "pending"> = {
  Y: "y",
  N: "n",
  NC: "nc",
  OFI: "ofi",
  NA: "na",
  Pending: "pending",
};

export function BadgeStatus({
  status,
  className,
}: {
  status: StatusDapatan;
  className?: string;
}) {
  return (
    <Badge variant={VARIAN[status]} className={cn(className)}>
      {LABEL[status]}
    </Badge>
  );
}
