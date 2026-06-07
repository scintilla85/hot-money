import { NextResponse } from "next/server";
import webpush, { type PushSubscription } from "web-push";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

type GameStateRow = {
  current_day: number;
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  return authorization === `Bearer ${cronSecret}` || headerSecret === cronSecret;
}

function isSixInRome() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === "hour")?.value;
  return hour === "06";
}

async function sendDayChangedNotifications(day: number) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hotmoney@example.com";

  if (!supabaseServer || !publicKey || !privateKey) return;
  const client = supabaseServer;

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data } = await client
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .returns<PushSubscriptionRow[]>();

  await Promise.all(
    (data ?? []).map(async (row) => {
      const subscription: PushSubscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      };

      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: "HOT MONEY",
            body: `Giorno ${day} iniziato. Nuova missione disponibile.`,
            url: "/",
          }),
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await client
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", row.endpoint);
        }
      }
    }),
  );
}

async function handleCron(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseServer) {
    return NextResponse.json({ error: "Supabase server client not configured" }, { status: 500 });
  }

  if (!isSixInRome()) {
    return NextResponse.json({ ok: true, advanced: false, reason: "Not 06:00 Europe/Rome" });
  }

  const { data, error } = await supabaseServer
    .from("game_state")
    .select("current_day")
    .eq("id", 1)
    .limit(1)
    .returns<GameStateRow[]>();

  if (error || !data?.[0]) {
    return NextResponse.json({ error: error?.message ?? "game_state id=1 not found" }, { status: 500 });
  }

  const currentDay = data[0].current_day;
  if (currentDay >= 7) {
    return NextResponse.json({ ok: true, advanced: false, currentDay });
  }

  const nextDay = currentDay + 1;
  const { error: updateError } = await supabaseServer
    .from("game_state")
    .update({ current_day: nextDay, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await sendDayChangedNotifications(nextDay);

  return NextResponse.json({ ok: true, advanced: true, currentDay: nextDay });
}

export function GET(request: Request) {
  return handleCron(request);
}

export function POST(request: Request) {
  return handleCron(request);
}
