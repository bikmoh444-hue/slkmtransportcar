-- MANUAL ONLY: run in the SQL Editor of the same project as the application.
-- This script never creates an Auth account or sets a password.
begin;
do $$
declare
 target_email constant text := 'slkmtransport@gmail.com';
 matching_users uuid[];
 target_user uuid;
begin
 if to_regclass('public.admin_users') is null then
  raise exception 'Table public.admin_users absente. Vérifier le projet et appliquer les migrations SLKM avant de continuer.';
 end if;
 select array_agg(id) into matching_users from auth.users where email=target_email;
 if coalesce(cardinality(matching_users),0)=0 then
  raise exception 'Aucun compte Supabase Auth ne correspond exactement à %. Créer le compte dans Authentication > Users avec un mot de passe choisi par le propriétaire, puis relancer ce script.',target_email;
 end if;
 if cardinality(matching_users)<>1 then
  raise exception 'Plusieurs comptes correspondent à cet email. Arrêt sans attribution ; vérifier les UUID dans Authentication.';
 end if;
 target_user:=matching_users[1];
 insert into public.admin_users(user_id) values(target_user) on conflict(user_id) do nothing;
 raise notice 'Autorisation administrateur vérifiée pour UUID %. Aucun autre utilisateur modifié.',target_user;
end $$;
commit;
