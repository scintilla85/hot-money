import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type PushRole = "director" | "contestant";

type PushSubscriptionPayload = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  if (!supabaseServer) {
    return NextResponse.json({ error: "Supabase server client not configured" }, { status: 500 });
  }

  const body = (await request.json()) as {
    role?: PushRole;
    subscription?: PushSubscriptionPayload;
  };
  const { role, subscription } = body;

  if (
    !role ||
    !["director", "contestant"].includes(role) ||
    !subscription?.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }

  const { error } = await supabaseServer.from("push_subscriptions").upsert(
    {
      role,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      subscription,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
