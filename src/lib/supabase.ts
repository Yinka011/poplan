import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://framesmhcepkdheoclsl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYW1lc21oY2Vwa2RoZW9jbHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDM4NDMsImV4cCI6MjA5ODY3OTg0M30.IlvDNTE-5ueUmfJde89oXCEbVsvGjlo5LeWI-q2kOto'

export const supabase = createClient(supabaseUrl, supabaseKey)
