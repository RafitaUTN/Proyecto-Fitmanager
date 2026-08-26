-- Keep internal metadata inaccessible through Supabase's public Data API.
-- The backend connects directly as the database owner and remains able to use both tables.
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ejercicio_media_cache" ENABLE ROW LEVEL SECURITY;
