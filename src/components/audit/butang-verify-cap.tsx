"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Butang } from "@/components/ui/butang";
import { verifyCap } from "@/app/(dashboard)/audit/actions";

interface Props {
  ncId: string;
  auditId: string;
}

export function ButangVerifyCap({ ncId, auditId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Butang
      type="button"
      disabled={pending}
      className="bg-emerald-600 text-white hover:bg-emerald-700"
      onClick={() => {
        startTransition(async () => {
          const hasil = await verifyCap(ncId, auditId);
          if (hasil.ok) router.refresh();
        });
      }}
    >
      {pending ? "Verifying..." : "Verify CAP"}
    </Butang>
  );
}
