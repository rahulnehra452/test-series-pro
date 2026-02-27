-- Secure question access so paid content cannot be fetched without entitlement.
-- Date: 2026-02-26

alter table public.questions enable row level security;

drop policy if exists "Questions are viewable by everyone." on public.questions;
drop policy if exists "Questions are viewable by everyone" on public.questions;
drop policy if exists "Questions are viewable by entitled users" on public.questions;

create policy "Questions are viewable by entitled users"
  on public.questions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tests t
      left join public.test_series ts
        on ts.id = t.series_id
      left join public.profiles p
        on p.id = auth.uid()
      where t.id = public.questions.test_id
        and (
          coalesce(ts.price, t.price, 0) <= 0
          or (
            coalesce(p.is_pro, false) = true
            and (
              p.pro_expires_at is null
              or p.pro_expires_at > timezone('utc'::text, now())
            )
          )
          or public.is_admin()
        )
    )
  );
