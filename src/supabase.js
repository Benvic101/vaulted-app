import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dasqimbfxcekhtzekvlz.supabase.co'
const supabaseKey = "sb_publishable_EMeA6a5XkP5gHI8aRswPkA_DECnmyYK"

export const supabase = createClient(supabaseUrl, supabaseKey)
