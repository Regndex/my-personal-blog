import { createClient } from '@supabase/supabase-js'

// These are read from your .env file at build time by Vite.
// Copy .env.example to .env and fill in your project's real values —
// see README.md for exactly where to find them in your Supabase dashboard.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaced in the browser console — the app still renders so you can see
  // this warning instead of a blank white screen, but no data will load
  // until real credentials are provided.
  console.warn(
    '[Supabase] لم يتم العثور على متغيرات البيئة. الرجاء إضافة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف .env (انظر .env.example)'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)

// Name of the Supabase Storage bucket used for cover images.
// Must match the bucket created via supabase/schema.sql (or the dashboard).
export const BLOG_IMAGES_BUCKET = 'blog-images'
