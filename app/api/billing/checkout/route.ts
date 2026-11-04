import { NextResponse } from "next/server";

import { handleBillingCheckout } from "@/lib/billing/checkout-handler";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import {
  finishCreateFailure,
  recordCreatedSubscription,
  reserveIntent,
  startCheckoutCreate,
  createProviderSubscription,
} from "@/lib/billing/stage1b-adapters";
import { getRazorpayServerConfig } from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    const response = await handleBillingCheckout(request, {
      getContext: async () => {
        const context = await getWorkspaceContext();
        if (!context) return null;
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) return null;
        return { id: context.id, userId: data.user.id, role: context.role };
      },
      getConfig: getRazorpayServerConfig,
      liveModeEnabled: process.env.RAZORPAY_LIVE_MODE_ENABLED === "true",
      adapters: {
        reserveIntent,
        startCheckoutCreate,
        createProviderSubscription,
        recordCreatedSubscription,
        finishCreateFailure,
      },
    });
    return NextResponse.json(await response.json(), {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 500 });
  }
}
