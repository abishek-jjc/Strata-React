-- Migration: Add show_winners_page default setting record
INSERT INTO public.settings (key_name, value)
VALUES ('show_winners_page', 'false')
ON CONFLICT (key_name) DO NOTHING;
