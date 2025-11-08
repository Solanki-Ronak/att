// Initialize Supabase with your credentials
const SUPABASE_URL = "https://znfyskpqbgcnxxhdwwqi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZnlza3BxYmdjbnh4aGR3d3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjQ5NTUsImV4cCI6MjA3NjM0MDk1NX0.oWup1BSPN3QM-Rpz7FScsyuBykFwAHy2uW8EYpi4R50";

// Create and export the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);