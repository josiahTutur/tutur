/* ========================================================================== *
 *  Supabase client — the single connection the app uses for Auth + database.
 *
 *  Reads the project URL + publishable (anon) key from environment variables
 *  (.env.local locally, Vercel env vars in production). Both are browser-safe:
 *  the key is protected by Row-Level Security, so it can only ever touch the
 *  signed-in user's own rows.
 * ========================================================================== */
import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Loud, friendly warning during development if the env file isn't set up.
  console.warn(
    "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Add them to .env.local and restart the dev server (npm run dev)."
  )
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true, // keep the session across page reloads
    autoRefreshToken: true, // refresh the token before it expires
    detectSessionInUrl: true, // handle magic-link / OAuth redirects
  },
})
