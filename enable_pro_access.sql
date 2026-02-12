-- Enable Pro Access for All Users (For Testing Only)
-- Run this in Supabase SQL Editor

update public.profiles
set is_pro = true;

-- Ideally, you'd target a specific user:
-- update public.profiles set is_pro = true where email = 'your_email@example.com';
