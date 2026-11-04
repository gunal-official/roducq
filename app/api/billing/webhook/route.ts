import { handleBillingWebhook } from "@/lib/billing/webhook-handler";
import { ingestWebhook } from "@/lib/billing/stage1b-adapters";

export async function POST(request: Request) {
  return handleBillingWebhook(request, ingestWebhook);
}
