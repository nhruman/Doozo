
const { createClient } = require("@supabase/supabase-js");

// Get Supabase credentials from .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

// Check credentials
if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Supabase credentials are missing in .env");
}

// Connect Supabase
const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

module.exports = supabase;
