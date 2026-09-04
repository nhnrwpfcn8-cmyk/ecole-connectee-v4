import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Vérification de la configuration.
// La clé elle-même n'est jamais affichée.
console.log(
  'SUPABASE URL présente =',
  Boolean(supabaseUrl),
  '| CLÉ SUPABASE présente =',
  Boolean(supabasePublishableKey)
)

if (!supabaseUrl) {
  console.error('ERREUR : VITE_SUPABASE_URL est absente.')
}

if (!supabasePublishableKey) {
  console.error('ERREUR : VITE_SUPABASE_PUBLISHABLE_KEY est absente.')
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
)