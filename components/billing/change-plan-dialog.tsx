"use client";

import { useState } from "react";
import { ArrowUpRight, CreditCard } from "lucide-react";

import { PricingTable } from "@/components/billing/pricing-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ChangePlanDialog({
  workspaceName,
  userEmail,
}: {
  workspaceName: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CreditCard aria-hidden="true" /> Change Plan
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] max-w-6xl overflow-y-auto p-5 sm:p-7">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <ArrowUpRight className="size-5 text-accent" aria-hidden="true" />
              Choose a plan
            </DialogTitle>
            <DialogDescription>
              Select Starter or Team to continue to secure Razorpay Test Mode checkout. Studio is contact-only.
            </DialogDescription>
          </DialogHeader>
          <PricingTable workspaceName={workspaceName} userEmail={userEmail} />
        </DialogContent>
      </Dialog>
    </>
  );
}
