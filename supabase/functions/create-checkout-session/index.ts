import { createClient } from "npm:@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "https://xerius1973.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Connexion NP7 requise." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const siteUrl = Deno.env.get("NP7_SITE_URL");
    if (!supabaseUrl || !anonKey || !stripeSecret || !siteUrl) return json({ error: "Configuration serveur incomplète." }, 500);
    const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Session invalide. Reconnecte-toi." }, 401);
    const body = await req.json().catch(() => ({}));
    const plan = body?.plan;
    const prices: Record<string, string | undefined> = {
      month: Deno.env.get("STRIPE_PRICE_MONTH"),
      year: Deno.env.get("STRIPE_PRICE_YEAR"),
      lifetime: Deno.env.get("STRIPE_PRICE_LIFETIME"),
    };
    if (typeof plan !== "string" || !(plan in prices) || !prices[plan]) return json({ error: "Offre inconnue ou prix Stripe non configuré." }, 400);
    const base = siteUrl.replace(/\/$/, "");
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", base + "/?premium=success");
    params.set("cancel_url", base + "/?premium=cancel");
    params.set("client_reference_id", authData.user.id);
    if (authData.user.email) params.set("customer_email", authData.user.email);
    params.set("metadata[user_id]", authData.user.id);
    params.set("metadata[plan]", plan);
    params.set("line_items[0][price]", prices[plan]!);
    params.set("line_items[0][quantity]", "1");
    params.set("payment_intent_data[metadata][user_id]", authData.user.id);
    params.set("payment_intent_data[metadata][plan]", plan);
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: "Bearer " + stripeSecret, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const session = await response.json();
    if (!response.ok || !session.url) {
      console.error("Stripe Checkout creation failed", session?.error?.type || response.status);
      return json({ error: "Stripe n’a pas pu créer le paiement. Vérifie les prix et les clés Stripe." }, 502);
    }
    return json({ url: session.url });
  } catch (error) {
    console.error("Checkout error", error);
    return json({ error: "Erreur serveur pendant la préparation du paiement." }, 500);
  }
});
