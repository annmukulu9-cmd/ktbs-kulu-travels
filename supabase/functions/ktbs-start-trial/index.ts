import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 42) || "travel-company";
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "KTBS registration is not configured yet. Please contact support." }, 503);
  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return json({ error: "Please submit valid registration details." }, 400); }
  if (String(input.website || "").trim()) return json({ error: "Registration could not be completed." }, 400);

  const fullName = String(input.full_name || "").trim().slice(0, 100);
  const companyName = String(input.company_name || "").trim().slice(0, 120);
  const email = String(input.email || "").trim().toLowerCase().slice(0, 254);
  const country = String(input.country || "Kenya").trim().slice(0, 80);
  const currency = String(input.currency || "KES").trim().toUpperCase().slice(0, 3);
  if (fullName.length < 2 || companyName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[A-Z]{3}$/.test(currency)) {
    return json({ error: "Enter a valid name, company, email and 3-letter currency code." }, 400);
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim();
  const ipHash = await sha256(ip || "unknown");
  try {
    await admin.from("ktbs_signup_attempts").delete().lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    const { error: logError } = await admin.from("ktbs_signup_attempts").insert({ ip_hash: ipHash });
    if (logError) throw logError;
    const { count, error: countError } = await admin.from("ktbs_signup_attempts")
      .select("id", { count: "exact", head: true }).eq("ip_hash", ipHash)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if (countError) throw countError;
    if ((count || 0) > 5) return json({ error: "Too many trial requests from this connection. Please try again in an hour." }, 429);
  } catch (error) {
    console.error("KTBS signup rate limit check failed", error);
    return json({ error: "Registration is temporarily unavailable. Please try again later." }, 503);
  }

  let userId: string | null = null;
  let orgId: string | null = null;
  try {
    const baseSlug = slugify(companyName);
    let slug = baseSlug;
    const { data: existingSlug, error: slugError } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (slugError) throw slugError;
    if (existingSlug) slug = `${baseSlug}-${crypto.randomUUID().slice(0, 5)}`;

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, organization_name: companyName },
      redirectTo: "https://ktbs-kulu-travels.vercel.app/",
    });
    if (inviteError) {
      const message = /already|registered|exists/i.test(inviteError.message)
        ? "An account may already exist for this email. Try signing in or contact support."
        : "We could not send your invitation. Please try again later or contact support.";
      return json({ error: message }, 400);
    }
    userId = invited.user?.id || null;
    if (!userId) throw new Error("The account invitation did not return a user.");

    const { data: org, error: orgError } = await admin.from("organizations").insert({
      name: companyName, slug, status: "trial", country, currency,
    }).select("id").single();
    if (orgError) throw orgError;
    orgId = org.id;
    const started = new Date();
    const ends = new Date(started.getTime() + 14 * 24 * 60 * 60 * 1000);
    const { error: subError } = await admin.from("organization_subscriptions").insert({
      organization_id: orgId, plan_code: "trial", status: "trial",
      trial_started_at: started.toISOString(), trial_ends_at: ends.toISOString(),
    });
    if (subError) throw subError;
    const { error: profileError } = await admin.from("profiles").insert({
      id: userId, full_name: fullName, role: "admin", active: true,
    });
    if (profileError) throw profileError;
    const { error: memberError } = await admin.from("organization_memberships").insert({
      organization_id: orgId, user_id: userId, role: "owner", active: true, is_primary: true,
    });
    if (memberError) throw memberError;
    return json({
      success: true,
      message: "Your KTBS trial workspace has been created. Check your email for the secure invitation link to set up your account.",
      trial_days: 14, limits: { staff: 2, clients: 100, quotations: 25, bookings: 10 },
    }, 201);
  } catch (error) {
    if (orgId) await admin.from("organizations").delete().eq("id", orgId);
    if (userId) await admin.auth.admin.deleteUser(userId);
    console.error("KTBS signup failed", error);
    return json({ error: "We could not finish setting up your workspace. Please try again or contact support." }, 500);
  }
});