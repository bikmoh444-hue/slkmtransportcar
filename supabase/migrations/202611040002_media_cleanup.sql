-- Only authenticated administrators can remove unused objects. Shared images stay protected.
begin;
create function public.media_object_unused(p_path text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare t text; used boolean;
begin
 if not public.is_admin() then return false; end if;
 if exists(select 1 from public.media_assets where storage_path=p_path) then return false; end if;
 foreach t in array array['site_settings','navigation_items','hero_slides','page_sections','services','fleet_items','network_maps','cities','transport_lines','agencies','seo_settings'] loop
  execute format('select exists(select 1 from public.%I where position($1 in data::text)>0)',t) into used using p_path;
  if used then return false; end if;
 end loop;
 return true;
end $$;
revoke all on function public.media_object_unused(text) from public,anon;
grant execute on function public.media_object_unused(text) to authenticated;
create policy slkm_media_cleanup on storage.objects for delete to authenticated
 using(bucket_id='slkm-media' and name like 'uploads/%' and (select public.is_admin()) and public.media_object_unused(name));
commit;
       