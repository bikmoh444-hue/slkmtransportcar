-- Replace the superseded palette only. Keep copy, media, contacts and other settings.
-- Idempotence preserves deliberate administrator color edits made after this redesign.
update public.site_settings
set data=(data-'yellow') || jsonb_build_object(
 'theme_version',2,
 'blue','#08648B','logo_blue','#0865B8','deep_blue','#101C33',
 'orange','#C46200','orange_hover','#A95000',
 'background','#F6F8FA','surface','#FFFFFF','border','#E3E8EF',
 'text','#111827','muted','#6B7789'
)
where key='identity' and data->>'theme_version' is distinct from '2';
