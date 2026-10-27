import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
const cryptoProvider = Stripe.createSubtleCryptoProvider();
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!signature || !webhookSecret || !serviceKey || !supabaseUrl || !Deno.env.get("STRIPE_SECRET_KEY")) {
    return new Response("Webhook configuration incomplete", { status: 500 });
  }
  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret, undefined, cryptoProvider);
  } catch (_err) {
    return new Response("Invalid Stripe signature", { status: 400 });
  }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return new Response(JSON.stringify({ received: true, pending: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  const userId = session.metadata?.user_id || session.client_reference_id;
  const plan = session.metadata?.plan;
  if (!userId || !["month", "year", "lifetime"].includes(plan || "")) {
    console.error("Paid session missing valid NP7 metadata", session.id);
    return new Response("Missing NP7 purchase metadata", { status: 400 });
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const paidAt = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000);
  let expiresAt: string | null = null;
  if (plan === "month") expiresAt = new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  if (plan === "year") expiresAt = new Date(paidAt.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const { error: purchaseError } = await supabase.from("np7_purchases").upsert({
    stripe_checkout_session_id: session.id, user_id: userId, plan,
    amount_total: session.amount_total || 0, currency: session.currency || "eur",
    payment_status: "paid", paid_at: paidAt.toISOString(),
  }, { onConflict: "stripe_checkout_session_id" });
  if (purchaseError) {
    console.error("Could not save NP7 purchase", purchaseError.message);
    return new Response("Could not record purchase", { status: 500 });
  }
  const { error: entitlementError } = await supabase.from("np7_entitlements").upsert({
    user_id: userId, plan, expires_at: expiresAt, active: true,
    last_checkout_session_id: session.id, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (entitlementError) {
    console.error("Could not activate NP7 entitlement", entitlementError.message);
    return new Response("Could not activate entitlement", { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
