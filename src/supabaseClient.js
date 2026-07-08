// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://olcxegspeetqjyfgyzga.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sY3hlZ3NwZWV0cWp5Zmd5emdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MjQzNTcsImV4cCI6MjA5OTAwMDM1N30.cIHANPQe7Z8UnRLR49lRDwFvZn7iYaYRu9h2mdhMylc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);