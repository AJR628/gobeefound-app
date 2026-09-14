-- GoBeeFound V1 — Row-Level Security (§16.6, §20.1). Defense in depth.
-- The application talks to Postgres through Prisma with the postgres role (bypasses RLS) and
-- enforces ownership in code on every query. These policies close the OTHER door: Supabase's
-- PostgREST / anon / authenticated roles can never read or write another owner's rows.
--
-- Apply once after the Prisma migration. Prisma table names are the model names (quoted).
-- Applied to project rkhiapendaxkreygtfhn on 2026-09-13; passes the Supabase security advisor.

-- Helper lives in a NON-exposed schema so it is never callable via /rest/v1/rpc.
-- (Advisor lints 0028/0029: SECURITY DEFINER functions in `public` are executable over REST.)
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon;

create or replace function private.owns_business(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from "Business" where id = b and "ownerId" = auth.uid());
$$;
revoke execute on function private.owns_business(uuid) from public;
grant execute on function private.owns_business(uuid) to authenticated, anon;

-- 1. User — a user sees only their own row.
alter table "User" enable row level security;
create policy "user_self_select" on "User" for select using (id = auth.uid());
create policy "user_self_update" on "User" for update using (id = auth.uid());

-- 2. Business
alter table "Business" enable row level security;
create policy "business_owner_all" on "Business" for all using ("ownerId" = auth.uid()) with check ("ownerId" = auth.uid());

-- 3–9, 11. Business-scoped tables
alter table "OnboardingAnswers" enable row level security;
create policy "onboarding_owner_all" on "OnboardingAnswers" for all using (private.owns_business("businessId")) with check (private.owns_business("businessId"));

alter table "BusinessProfile" enable row level security;
create policy "profile_owner_all" on "BusinessProfile" for all using (private.owns_business("businessId")) with check (private.owns_business("businessId"));

alter table "FieldProvenance" enable row level security;
create policy "provenance_owner_all" on "FieldProvenance" for all using (private.owns_business("businessId")) with check (private.owns_business("businessId"));

alter table "ConnectedAsset" enable row level security;
create policy "asset_owner_all" on "ConnectedAsset" for all using (private.owns_business("businessId")) with check (private.owns_business("businessId"));

alter table "TaskState" enable row level security;
create policy "taskstate_owner_all" on "TaskState" for all using (private.owns_business("businessId")) with check (private.owns_business("businessId"));

alter table "GeneratedContent" enable row level security;
create policy "generated_owner_all" on "GeneratedContent" for all using (private.owns_business("businessId")) with check (private.owns_business("businessId"));

alter table "Decision" enable row level security;
create policy "decision_owner_all" on "Decision" for all using (private.owns_business("businessId")) with check (private.owns_business("businessId"));

alter table "ServiceLead" enable row level security;
create policy "servicelead_owner_all" on "ServiceLead" for all using (private.owns_business("businessId")) with check (private.owns_business("businessId"));

-- 10. Purchase — readable by its owner; only the server (webhook, service role) writes it.
alter table "Purchase" enable row level security;
create policy "purchase_owner_select" on "Purchase" for select using ("userId" = auth.uid());

-- V4 §E — AI ledger and allowance. The owner may READ their own rows (the UI shows "32 AI edits left");
-- ONLY the server writes them. No insert/update/delete policy exists for any Supabase role.
alter table "AiUsage" enable row level security;
create policy "aiusage_owner_select" on "AiUsage" for select using (private.owns_business("businessId"));

alter table "AiAllowance" enable row level security;
create policy "aiallowance_owner_select" on "AiAllowance" for select using (private.owns_business("businessId"));

alter table "AiAllowanceAdjustment" enable row level security;
create policy "aiadjustment_owner_select" on "AiAllowanceAdjustment" for select using (private.owns_business("businessId"));

-- V4 §D — the website draft and approved versions. Owner may READ; only the server writes. A public
-- renderer never uses these policies (it reads SiteVersion through a server query with a read-only role).
alter table "SiteDraft" enable row level security;
create policy "sitedraft_owner_select" on "SiteDraft" for select using (private.owns_business("businessId"));

alter table "SiteVersion" enable row level security;
create policy "siteversion_owner_select" on "SiteVersion" for select using (private.owns_business("businessId"));

-- Prisma's own bookkeeping table: RLS on, no policies = not reachable over REST. Prisma is unaffected.
alter table "_prisma_migrations" enable row level security;

-- Storage: the assets bucket is PRIVATE (public=false, 4 MB, PNG/JPEG only). Objects live at
-- <businessId>/logo.<ext>, <businessId>/hero.<ext>, <businessId>/logo-candidates/<id>.png (V4 §A3).
-- Reads happen via server-issued signed URLs; only the service role touches the bucket, so no
-- storage.objects policies are needed. The 4 MB cap is the hero-photo limit; logos are capped at 2 MB in code.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos','logos',false,4194304,array['image/png','image/jpeg'])
on conflict (id) do update set public=false, file_size_limit=4194304, allowed_mime_types=array['image/png','image/jpeg'];
