-- Atomic seed attachment: preserve concurrent administrator changes and custom captions.
create function public.attach_seed_media(p_seed_key text,p_media_id uuid,p_url text) returns integer language plpgsql security invoker set search_path='' as $$
declare t text;total integer:=0;changed integer;field_name text;
begin
 if not exists(select 1 from public.media_assets where id=p_media_id and seed_key=p_seed_key and storage_path is not null) then raise exception 'Unknown seed asset';end if;
 if p_url !~ '^https://' then raise exception 'Invalid media URL';end if;
 foreach t in array array['hero_slides','page_sections','services','fleet_items','network_maps'] loop
  execute format('update public.%I set data=jsonb_set(data,''{image}'',to_jsonb($1::text)),media_id=$2 where data->>''media_key''=$3 and coalesce(data->>''image'','''')=''''',t) using p_url,p_media_id,p_seed_key;
  get diagnostics changed=row_count;total=total+changed;
 end loop;
 if p_seed_key in ('logo','footer-logo') then
  field_name=case when p_seed_key='logo' then 'logo' else 'footer_logo' end;
  update public.site_settings set data=jsonb_set(data,array[field_name],to_jsonb(p_url)) where key='identity' and coalesce(data->>field_name,'')='';
  get diagnostics changed=row_count;total=total+changed;
 end if;
 return total;
end $$;
revoke all on function public.attach_seed_media(text,uuid,text) from public,anon,authenticated;
grant execute on function public.attach_seed_media(text,uuid,text) to service_role;
grant select,insert,update on public.media_assets to service_role;
grant select,insert on public.complaints to service_role;
grant select,insert,update,delete on public.complaint_rate_limits to service_role;
do $$ declare t text;begin foreach t in array array['site_settings','navigation_items','page_sections','hero_slides','services','fleet_items','network_maps','cities','transport_lines','agencies','seo_settings'] loop execute format('grant select,insert,update,delete on public.%I to service_role',t);end loop;end $$;
