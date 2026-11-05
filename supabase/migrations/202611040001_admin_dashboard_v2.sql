-- Dashboard V2: additive only; preserves all existing editorial data.
begin;
create table public.site_visit_events (
 id uuid primary key default gen_random_uuid(), visitor_id uuid not null, session_id uuid not null,
 page_path text not null check(page_path ~ '^/(fr|ar)(/|$)' and length(page_path)<=200),
 created_at timestamptz not null default now()
);
create index site_visit_events_date_idx on public.site_visit_events(created_at desc);
create index site_visit_events_session_idx on public.site_visit_events(session_id,created_at desc);
alter table public.site_visit_events enable row level security;
create policy admin_analytics_read on public.site_visit_events for select to authenticated using((select public.is_admin()));
grant select on public.site_visit_events to authenticated;
create table public.site_visit_limits(key text primary key,window_start timestamptz not null default now(),attempts integer not null default 1);
alter table public.site_visit_limits enable row level security;
create function public.record_site_visit(p_key text,p_visitor uuid,p_session uuid,p_path text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if length(p_key)<>64 or length(p_path)>200 or p_path !~ '^/(fr|ar)(/|$)' then return false;end if;
 insert into public.site_visit_limits(key) values(p_key) on conflict(key) do update set attempts=case when public.site_visit_limits.window_start<now()-interval '1 minute' then 1 else public.site_visit_limits.attempts+1 end,window_start=case when public.site_visit_limits.window_start<now()-interval '1 minute' then now() else public.site_visit_limits.window_start end returning attempts into n;
 if n>30 then return false;end if;
 if exists(select 1 from public.site_visit_events where session_id=p_session and page_path=p_path and created_at>now()-interval '30 seconds') then return true;end if;
 insert into public.site_visit_events(visitor_id,session_id,page_path) values(p_visitor,p_session,p_path);
 delete from public.site_visit_limits where window_start<now()-interval '1 day';
 return true;
end $$;
revoke all on function public.record_site_visit(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_site_visit(text,uuid,uuid,text) to service_role;
create function public.admin_traffic_daily() returns table(day text,visits bigint,visitors bigint) language sql stable security invoker set search_path='' as $$
 select to_char(created_at at time zone 'UTC','YYYY-MM-DD'),count(*),count(distinct visitor_id) from public.site_visit_events where created_at>=current_date-365 group by 1 order by 1
$$;
create function public.admin_traffic_summary() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('total',count(*),'today',count(*) filter(where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),'week',count(*) filter(where created_at>=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC'),'month',count(*) filter(where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'),'previous_day',count(*) filter(where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'-interval '1 day' and created_at<date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')) from public.site_visit_events
$$;
revoke all on function public.admin_traffic_daily(),public.admin_traffic_summary() from public,anon;
grant execute on function public.admin_traffic_daily(),public.admin_traffic_summary() to authenticated;
create table public.admin_activity_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id) on delete set null,action text not null check(action in ('INSERT','UPDATE','DELETE')),table_name text not null,record_key text,created_at timestamptz not null default now());
create index admin_activity_logs_date_idx on public.admin_activity_logs(created_at desc);
alter table public.admin_activity_logs enable row level security;
create policy admin_activity_read on public.admin_activity_logs for select to authenticated using((select public.is_admin()));
grant select on public.admin_activity_logs to authenticated;
create function public.log_admin_change() returns trigger language plpgsql security definer set search_path='' as $$
declare record jsonb;
begin
 if not public.is_admin() then return null;end if;
 record=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 insert into public.admin_activity_logs(actor_id,action,table_name,record_key) values(auth.uid(),TG_OP,TG_TABLE_NAME,coalesce(record->>'key',record->>'id'));
 return null;
end $$;
revoke all on function public.log_admin_change() from public,anon,authenticated;
do $$ declare t text;begin foreach t in array array['site_settings','navigation_items','hero_slides','page_sections','services','fleet_items','network_maps','cities','transport_lines','agencies','seo_settings','complaints','media_assets'] loop execute format('create trigger dashboard_audit after insert or update or delete on public.%I for each row execute function public.log_admin_change()',t);end loop;end $$;
commit;
