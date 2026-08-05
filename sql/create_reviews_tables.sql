-- SQL Migration: Add review_titles and leader_reviews tables for Admin Review & Rating module

-- Table 1: Review Aspects / Titles defined by Admin (e.g. Ambience, Hospitality, Food, Organization)
CREATE TABLE IF NOT EXISTS public.review_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 2: Reviews and ratings submitted by Student Leaders
CREATE TABLE IF NOT EXISTS public.leader_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leader_id UUID REFERENCES public.student_leaders(id) ON DELETE CASCADE,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    college_name TEXT,
    department TEXT,
    leader_name TEXT,
    ratings JSONB NOT NULL DEFAULT '{}'::jsonb, -- Map of { title_id: rating_score_1_to_5 }
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.review_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leader_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_titles
CREATE POLICY "Allow public read on review_titles" ON public.review_titles FOR SELECT USING (true);
CREATE POLICY "Allow admin all on review_titles" ON public.review_titles FOR ALL USING (true);

-- RLS Policies for leader_reviews
CREATE POLICY "Allow public read on leader_reviews" ON public.leader_reviews FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on leader_reviews" ON public.leader_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin all on leader_reviews" ON public.leader_reviews FOR ALL USING (true);
