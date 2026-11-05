-- Add the new palette without replacing existing theme choices, content, or media.
-- Legacy accent data is deliberately retained, but is no longer used by the UI.
update public.site_settings
set data=jsonb_build_object(
 'blue','#075AA6','deep_blue','#073B73','yellow','#F4E52C',
 'background','#F5F8FC','surface','#FFFFFF','text','#172B46'
) || data
where key='identity';
