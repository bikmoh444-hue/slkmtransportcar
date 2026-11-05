-- Typed structured fields, generated from their editor source to avoid two competing values.
alter table public.services add column slug text generated always as (key) stored unique;
alter table public.fleet_items add column service_id uuid references public.services(id) on delete restrict;
alter table public.fleet_items add column seats integer generated always as ((data->>'seats')::integer) stored check(seats between 1 and 100);
alter table public.fleet_items add column vehicle_type text generated always as (data->>'vehicle_type') stored check(vehicle_type is null or vehicle_type in ('minibus','coach','tipper','trailer'));
alter table public.fleet_items add constraint fleet_features_arrays check((not data ? 'features_fr' or jsonb_typeof(data->'features_fr')='array') and (not data ? 'features_ar' or jsonb_typeof(data->'features_ar')='array'));
create index fleet_service_idx on public.fleet_items(service_id);
alter table public.agencies add column city_id uuid references public.cities(id) on delete restrict;
alter table public.transport_lines add column origin_city_id uuid references public.cities(id) on delete restrict;
alter table public.transport_lines add column destination_city_id uuid references public.cities(id) on delete restrict;
alter table public.network_maps add column type text generated always as (key) stored check(type in ('voyageurs','messagerie'));
do $$ declare t text;begin foreach t in array array['cities','transport_lines','agencies'] loop
 execute format('alter table public.%I add column verified boolean generated always as (coalesce((data->>''verified'')::boolean,false)) stored',t);
end loop;end $$;
