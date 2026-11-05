-- Security hardening migration. Review, then run manually in the Supabase SQL Editor.
-- It is additive and idempotent: it does not delete content, accounts or storage objects.
begin;

-- Defence in depth: anon (public publishable key) must remain read-only on published rows.
do $$ declare t text; begin
  foreach t in array array[
    'site_settings','navigation_items','page_sections','hero_slides','services',
    'fleet_items','network_maps','cities','transport_lines','agencies','seo_settings',
    'complaints','media_assets','admin_users','site_visit_events','admin_activity_logs',
    'complaint_rate_limits','site_visit_limits','admin_login_limits'
  ] loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Only the select policies are meaningful for these tables.
revoke insert, update, delete, truncate on public.admin_users from authenticated;
revoke insert, update, delete, truncate on public.site_visit_events from authenticated;
revoke insert, update, delete, truncate on public.admin_activity_logs from authenticated;
revoke all on public.complaint_rate_limits, public.site_visit_limits, public.admin_login_limits from anon, authenticated;

-- is_admin() is needed by RLS policies; it only reveals the caller's own membership.
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Trigger helpers do not need to be callable through the API.
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.log_admin_change() from public, anon, authenticated;

-- Validate limiter inputs before touching tables.
create or replace function public.consume_complaint_limit(p_key text)
returns boolean language plpgsql security definer set search_path='' as $$
declare allowed boolean;begin
 if p_key is null or p_key !~ '^[0-9a-f]{64}$' then return false;end if;
 insert into public.complaint_rate_limits(key,window_start,attempts) values(p_key,now(),1)
 on conflict(key) do update set attempts=case when public.complaint_rate_limits.window_start<now()-interval '1 hour' then 1 else public.complaint_rate_limits.attempts+1 end,window_start=case when public.complaint_rate_limits.window_start<now()-interval '1 hour' then now() else public.complaint_rate_limits.window_start end returning attempts<=5 into allowed;
 delete from public.complaint_rate_limits where window_start<now()-interval '2 days';return allowed;end $$;
revoke all on function public.consume_complaint_limit(text) from public, anon, authenticated;
grant execute on function public.consume_complaint_limit(text) to service_role;

create or replace function public.record_site_visit(p_key text,p_visitor uuid,p_session uuid,p_path text)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if p_key is null or p_key !~ '^[0-9a-f]{64}$' or p_visitor is null or p_session is null
    or p_path is null or length(p_path)>200 or p_path !~ '^/(fr|ar)(/|$)' then return false;end if;
 insert into public.site_visit_limits(key) values(p_key) on conflict(key) do update set attempts=case when public.site_visit_limits.window_start<now()-interval '1 minute' then 1 else public.site_visit_limits.attempts+1 end,window_start=case when public.site_visit_limits.window_start<now()-interval '1 minute' then now() else public.site_visit_limits.window_start end returning attempts into n;
 if n>30 then return false;end if;
 if exists(select 1 from public.site_visit_events where session_id=p_session and page_path=p_path and created_at>now()-interval '30 seconds') then return true;end if;
 insert into public.site_visit_events(visitor_id,session_id,page_path) values(p_visitor,p_session,p_path);
 delete from public.site_visit_limits where window_start<now()-interval '1 day';
 return true;
end $$;
revoke all on function public.record_site_visit(text,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.record_site_visit(text,uuid,uuid,text) to service_role;

-- Login limiter inputs were already validated; re-assert its grants.
revoke all on function public.consume_admin_login_limit(text,text),public.complete_admin_login(text) from public, anon, authenticated;
grant execute on function public.consume_admin_login_limit(text,text),public.complete_admin_login(text) to service_role;

-- Analytics read functions are for authenticated admins only (RLS still applies to their queries).
revoke all on function public.admin_traffic_daily(),public.admin_traffic_summary() from public, anon;
grant execute on function public.admin_traffic_daily(),public.admin_traffic_summary() to authenticated;

commit;
