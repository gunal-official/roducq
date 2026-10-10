/**
 * GET /api/pdf/<kind>/<id> — download a workspace document as a PDF.
 * Supported kinds: invoice, contract, proposal, update, and plan.
 *
 * AUTH: session cookie only. Rows and workspace branding are resolved
 * through ordinary RLS-scoped data access, so foreign-workspace ids look
 * absent. Invoices additionally require `canSeeMoney`, matching the app's
 * viewer policy. Every generated file is private and non-cacheable.
 */

import { getBriefById } from "@/lib/data/briefs";
import { getContractById } from "@/lib/data/contracts";
import { getInvoiceById } from "@/lib/data/invoices";
import { getPlanById } from "@/lib/data/plans";
import { getProposalById } from "@/lib/data/proposals";
import { getUpdateById } from "@/lib/data/updates";
import { getWorkspaceBranding } from "@/lib/data/workspace-branding";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import {
  buildContractPdf,
  buildInvoicePdf,
  buildPlanPdf,
  buildProposalPdf,
  buildUpdatePdf,
  type PdfResult,
} from "@/lib/pdf/documents";
import { pdfResponse, requestedPageSize } from "@/lib/pdf/response";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isUuid } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KINDS = ["invoice", "contract", "proposal", "update", "plan"] as const;
type Kind = (typeof KINDS)[number];

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const { kind, id } = await params;
  if (!KINDS.includes(kind as Kind) || !isUuid(id)) return notFound();
  if (!isSupabaseConfigured()) return notFound();

  const context = await getWorkspaceContext();
  if (!context) return notFound();

  const pageSize = requestedPageSize(request);
  const generatedAt = new Date();
  let result: PdfResult;

  if (kind === "invoice") {
    // Viewers don't see money anywhere in the product — including here.
    if (!context.canSeeMoney) return notFound();
    const invoice = await getInvoiceById(id);
    if (!invoice) return notFound();
    const branding = await getWorkspaceBranding(invoice.workspace_id);
    if (!branding) return notFound();
    result = buildInvoicePdf({
      workspaceName: branding.name,
      logoDataUrl: branding.logoDataUrl,
      generatedAt,
      pageSize,
      invoiceNumber: invoice.invoice_number,
      title: invoice.title,
      clientName: invoice.client_name,
      status: invoice.status,
      items: invoice.items ?? [],
      taxPercent: invoice.tax_percent,
      notes: invoice.notes ?? "",
      dueDate: invoice.due_date,
      sentAt: invoice.sent_at,
      paidAt: invoice.paid_at,
    });
  } else if (kind === "contract") {
    const contract = await getContractById(id);
    if (!contract) return notFound();
    const branding = await getWorkspaceBranding(contract.workspace_id);
    if (!branding) return notFound();
    const brief = contract.brief_id ? await getBriefById(contract.brief_id) : null;
    result = buildContractPdf({
      workspaceName: branding.name,
      logoDataUrl: branding.logoDataUrl,
      generatedAt,
      pageSize,
      title: contract.title,
      clientName: contract.client_name,
      status: contract.status,
      terms: contract.terms ?? "",
      briefTitle: brief?.title ?? null,
      expiresOn: contract.expires_on,
      signedBy: contract.signed_by ?? "",
      sentAt: contract.sent_at,
      signedAt: contract.signed_at,
    });
  } else if (kind === "proposal") {
    const proposal = await getProposalById(id);
    if (!proposal) return notFound();
    const branding = await getWorkspaceBranding(proposal.workspace_id);
    if (!branding) return notFound();
    result = buildProposalPdf({
      workspaceName: branding.name,
      logoDataUrl: branding.logoDataUrl,
      generatedAt,
      pageSize,
      title: proposal.title,
      clientName: proposal.client_name,
      status: proposal.status,
      deliverables: (proposal.deliverables ?? []).map((deliverable) => ({
        text: deliverable.text,
        checked: deliverable.checked,
      })),
      budgetTimeline: proposal.budget_timeline,
      briefTitle: proposal.brief?.title ?? null,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
    });
  } else if (kind === "update") {
    const update = await getUpdateById(id);
    if (!update) return notFound();
    const branding = await getWorkspaceBranding(update.workspace_id);
    if (!branding) return notFound();
    result = buildUpdatePdf({
      workspaceName: branding.name,
      logoDataUrl: branding.logoDataUrl,
      generatedAt,
      pageSize,
      title: update.title,
      clientName: update.client_name,
      status: update.status,
      body: update.body ?? "",
      sourcePlanTitle: update.plan?.title ?? null,
      createdAt: update.created_at,
      updatedAt: update.updated_at,
    });
  } else {
    const plan = await getPlanById(id);
    if (!plan) return notFound();
    const branding = await getWorkspaceBranding(plan.workspace_id);
    if (!branding) return notFound();
    result = buildPlanPdf({
      workspaceName: branding.name,
      logoDataUrl: branding.logoDataUrl,
      generatedAt,
      pageSize,
      title: plan.title,
      clientName: plan.client_name,
      status: plan.status,
      budgetTimeline: plan.budget_timeline,
      tasks: (plan.tasks ?? []).map((task) => ({
        text: task.text,
        checked: task.checked,
      })),
      sourceProposalTitle: plan.proposal?.title ?? null,
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
    });
  }

  return pdfResponse(result);
}
