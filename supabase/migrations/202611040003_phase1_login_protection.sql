-- Phase 1 only. New counter table; no existing content/account/storage changes.
begin;
create table public.admin_login_limits (
 key text primary key check(key ~ '^[np]_[0-9a-f]{64}$'),
 window_start timestamptz not null default now(),
 attempts integer not null default 0 check(attempts>=0),
 next_allowed_at timestamptz not null default now(),
 expires_at timestamptz not null
);
alter table public.admin_login_limits enable row level security;
revoke all on public.admin_login_limits from public,anon,authenticated;
create index admin_login_limits_expiry_idx on public.admin_login_limits(expires_at);

create function public.consume_admin_login_limit(p_network_key text,p_pair_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare network public.admin_login_limits%rowtype; pair public.admin_login_limits%rowtype; delay_seconds integer;
begin
 if p_network_key is null or p_pair_key is null or p_network_key !~ '^[0-9a-f]{64}$' or p_pair_key !~ '^[0-9a-f]{64}$' then
  raise exception 'Invalid limiter key';
 end if;
 -- Bounded, indexed expiry of NEW security counters, never business data.
 delete from public.admin_login_limits where key in
  (select key from public.admin_login_limits where expires_at<now() order by expires_at limit 100);
 insert into public.admin_login_limits(key,expires_at) values('n_'||p_network_key,now()+interval '10 minutes') on conflict(key) do nothing;
 select * into network from public.admin_login_limits where key='n_'||p_network_key for update;
 if network.expires_at<=now() then network.attempts:=0; network.window_start:=now(); network.expires_at:=now()+interval '10 minutes'; end if;
 if network.attempts>=30 then
  return jsonb_build_object('allowed',false,'retry_after',greatest(1,ceil(extract(epoch from network.expires_at-now()))::integer));
 end if;
 update public.admin_login_limits set attempts=network.attempts+1,window_start=network.window_start,expires_at=network.expires_at where key=network.key;
 insert into public.admin_login_limits(key,expires_at) values('p_'||p_pair_key,now()+interval '1 hour') on conflict(key) do nothing;
 select * into pair from public.admin_login_limits where key='p_'||p_pair_key for update;
 if pair.expires_at<=now() then pair.attempts:=0;pair.window_start:=now();pair.expires_at:=now()+interval '1 hour';pair.next_allowed_at:=now();end if;
 if pair.next_allowed_at>now() then
  return jsonb_build_object('allowed',false,'retry_after',greatest(1,ceil(extract(epoch from pair.next_allowed_at-now()))::integer));
 end if;
 pair.attempts:=pair.attempts+1;
 delay_seconds:=case when pair.attempts<5 then 0 else least(300,15*power(2,least(pair.attempts-5,5))::integer) end;
 update public.admin_login_limits set attempts=pair.attempts,window_start=pair.window_start,expires_at=pair.expires_at,next_allowed_at=now()+make_interval(secs=>delay_seconds) where key=pair.key;
 return jsonb_build_object('allowed',true,'retry_after',0);
end $$;

create function public.complete_admin_login(p_pair_key text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_pair_key is null or p_pair_key !~ '^[0-9a-f]{64}$' then raise exception 'Invalid limiter key';end if;
 -- A successful authorized login clears its own cooldown, not the network budget.
 delete from public.admin_login_limits where key='p_'||p_pair_key;
end $$;
revoke all on function public.consume_admin_login_limit(text,text),public.complete_admin_login(text) from public,anon,authenticated;
grant execute on function public.consume_admin_login_limit(text,text),public.complete_admin_login(text) to service_role;
commit;
