-- READ ONLY. Run as project owner in SQL Editor, not from the public application.
-- No password hash, token, or private key is selected.
select id as auth_user_id,email,email_confirmed_at,last_sign_in_at
from auth.users where email='slkmtransport@gmail.com';

select table_name,column_name,data_type
from information_schema.columns
where table_schema='public' and table_name in ('admin_users','profiles')
order by table_name,ordinal_position;

select c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('admin_users','profiles');

select tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public' and tablename in ('admin_users','profiles');

select p.proname,p.prosecdef as security_definer,p.proconfig,
 pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='is_admin';

-- Run after confirming that admin_users has the user_id UUID column:
-- select a.user_id from public.admin_users a join auth.users u on u.id=a.user_id
-- where u.email='slkmtransport@gmail.com';
