-- Workspace branding for generated PDFs. Keep the small PNG/JPEG data URL
-- on the workspace row so no Storage bucket, object policy, or new secret is
-- needed. Upload validation additionally decodes the actual image in the
-- server action; this CHECK pins the stored MIME prefix and hard size limit.

alter table public.workspaces
  add column logo_data_url text;

alter table public.workspaces
  add constraint workspaces_logo_data_url_check
  check (
    logo_data_url is null
    or (
      char_length(logo_data_url) <= 350000
      and logo_data_url ~ '^data:image/(png|jpeg);base64,([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$'
    )
  );

comment on column public.workspaces.logo_data_url is
  'Optional <=256 KiB PNG/JPEG data URL, owner-managed and embedded in generated PDF letterheads.';

-- PostgreSQL cannot CREATE OR REPLACE a function with a changed TABLE return
-- type, so replace the public-safe invoice payload to add the optional logo.
-- The token remains the credential; draft, void, revoked, and unknown tokens
-- still produce zero rows, and the RPC exposes display fields only.
drop function if exists public.get_shared_invoice(uuid);

create function public.get_shared_invoice(p_token uuid)
returns table (
  invoice_number integer,
  title text,
  client_name text,
  status text,
  items jsonb,
  tax_percent numeric,
  notes text,
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  workspace_name text,
  logo_data_url text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
    select i.invoice_number, i.title, i.client_name, i.status, i.items,
           i.tax_percent, i.notes, i.due_date, i.sent_at, i.paid_at,
           w.name, w.logo_data_url
      from public.invoice_links il
      join public.invoices i on i.id = il.invoice_id
      join public.workspaces w on w.id = i.workspace_id
     where il.token = p_token
       and il.revoked_at is null
       and i.status in ('sent', 'paid');
end;
$$;
