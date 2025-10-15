
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://vkxrjwjjfppdtfjltlrf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZreHJqd2pqZnBwZHRmamx0bHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MjY4OTYsImV4cCI6MjA3NDIwMjg5Nn0.sGtZjlK1HIB1ogODZS0qD0kaGS1JzOLSq4Zg6iXsU0s'

export const supabase = createClient(supabaseUrl, supabaseKey)