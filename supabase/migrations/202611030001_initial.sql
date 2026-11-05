-- Additive migration. Apply only after reviewing the target project.
create extension if not exists pgcrypto;
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.admin_users where user_id=(select auth.uid())) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
alter table public.admin_users enable row level security;
create policy admin_self_read on public.admin_users for select to authenticated using(user_id=(select auth.uid()));
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end $$;
create table public.media_assets (
 id uuid primary key default gen_random_uuid(), seed_key text unique,
 bucket text not null default 'slkm-media' check(bucket='slkm-media'),
 storage_path text unique, local_path text unique,
 mime text not null check(mime in ('image/jpeg','image/png','image/webp','image/avif')),
 size integer not null check(size between 0 and 8388608),width integer check(width>0),height integer check(height>0),
 alt_fr text not null default '' check(length(alt_fr)<=300),alt_ar text not null default '' check(length(alt_ar)<=300),
 created_at timestamptz not null default now(),check(storage_path is not null or local_path is not null)
);
-- Shared bilingual editorial envelope. JSONB is limited to per-component display options
-- and translated blocks, validated again by the server; private business data is typed.
do $$ declare t text; begin
 foreach t in array array['site_settings','navigation_items','page_sections','hero_slides','services','fleet_items','network_maps','cities','transport_lines','agencies','seo_settings'] loop
 execute format('create table public.%I (id uuid primary key default gen_random_uuid(), key text not null unique check(key ~ ''^[a-z][a-z0-9_-]{0,79}$''),label_fr text not null default '''' check(length(label_fr)<=500),label_ar text not null default '''' check(length(label_ar)<=500),data jsonb not null default ''{}''::jsonb check(jsonb_typeof(data)=''object'' and octet_length(data::text)<=30000),media_id uuid references public.media_assets(id) on delete restrict,sort_order integer not null default 0 check(sort_order between 0 and 10000),is_active boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now())',t);
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy published_read on public.%I for select to anon,authenticated using (is_active or (select public.is_admin()))',t);
 execute format('create policy admin_write on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',t);
 execute format('create index %I on public.%I (is_active,sort_order)',t||'_publication_idx',t);
 execute format('create trigger updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
 end loop;end $$;
create table public.complaints (
 id uuid primary key default gen_random_uuid(),full_name text not null check(length(full_name) between 2 and 120),
 email text not null check(length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 message text not null check(length(message) between 10 and 5000),locale text not null check(locale in ('fr','ar')),
 status text not null default 'new' check(status in ('new','in_progress','resolved','archived')),
 internal_notes text not null default '' check(length(internal_notes)<=5000),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create trigger updated_at before update on public.complaints for each row execute function public.touch_updated_at();
create index complaints_status_date_idx on public.complaints(status,created_at desc);
alter table public.complaints enable row level security;
create policy admin_private on public.complaints for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- No anonymous insert policy. The validated server endpoint uses service_role.
create table public.complaint_rate_limits (key text primary key check(length(key)=64),window_start timestamptz not null,attempts integer not null check(attempts>0));
alter table public.complaint_rate_limits enable row level security;
create function public.consume_complaint_limit(p_key text) returns boolean language plpgsql security definer set search_path='' as $$
 declare allowed boolean;begin
 insert into public.complaint_rate_limits(key,window_start,attempts) values(p_key,now(),1)
 on conflict(key) do update set attempts=case when public.complaint_rate_limits.window_start<now()-interval '1 hour' then 1 else public.complaint_rate_limits.attempts+1 end,window_start=case when public.complaint_rate_limits.window_start<now()-interval '1 hour' then now() else public.complaint_rate_limits.window_start end returning attempts<=5 into allowed;
 delete from public.complaint_rate_limits where window_start<now()-interval '2 days';return allowed;end $$;
revoke all on function public.consume_complaint_limit(text) from public,anon,authenticated;
grant execute on function public.consume_complaint_limit(text) to service_role;
alter table public.media_assets enable row level security;
create policy public_media_read on public.media_assets for select to anon,authenticated using(true);
create policy admin_media_write on public.media_assets for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('slkm-media','slkm-media',true,8388608,array['image/jpeg','image/png','image/webp','image/avif']) on conflict(id) do nothing;
create policy slkm_media_read on storage.objects for select to anon,authenticated using(bucket_id='slkm-media');
create policy slkm_media_insert on storage.objects for insert to authenticated with check(bucket_id='slkm-media' and (select public.is_admin()));
-- Updates and deletes intentionally disallowed: immutable files preserve existing references.
grant select on public.admin_users to authenticated;
grant select,insert,update,delete on public.complaints to authenticated;
grant select on public.media_assets to anon,authenticated;
grant insert,update,delete on public.media_assets to authenticated;
do $$ declare t text;begin foreach t in array array['site_settings','navigation_items','page_sections','hero_slides','services','fleet_items','network_maps','cities','transport_lines','agencies','seo_settings'] loop execute format('grant select on public.%I to anon,authenticated',t);execute format('grant insert,update,delete on public.%I to authenticated',t);end loop;end $$;
