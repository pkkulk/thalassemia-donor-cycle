import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
console.log("GMAIL_USER:", Deno.env.get("GMAIL_USER"));

serve(async (req) => {
  try {
    const { data, error } = await supabase.from("donors").select("*").limit(1);

    if (error) {
      console.error("❌ Supabase connection error:", error);
      return new Response(JSON.stringify({ error }), { status: 500 });
    }

    console.log("✅ Supabase connected! Example donor data:", data);

    return new Response(JSON.stringify({ message: "Supabase connected", data }), { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
