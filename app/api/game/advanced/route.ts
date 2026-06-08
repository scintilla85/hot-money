import { NextResponse } from "next/server";
import { getServerRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

function nextDayAtFromSignature(signedAt: Date) {
  const minimum = signedAt.getTime() + 24 * 60 * 60 * 1000;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const candidate = new Date(minimum);
  candidate.setUTCMinutes(0, 0, 0);
  if (candidate.getTime() < minimum) candidate.setUTCHours(candidate.getUTCHours() + 1);
  for (let hour = 0; hour < 72; hour += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(candidate).map((part) => [part.type, part.value]));
    if (parts.hour === "06" && parts.minute === "00") return candidate.toISOString();
    candidate.setUTCHours(candidate.getUTCHours() + 1);
  }
  throw new Error("Impossibile calcolare il prossimo cambio giorno");
}

async function signedEvidenceUrl(path: string) {
  if (!supabaseServer) return null;
  const { data } = await supabaseServer.storage.from("evidence-proofs").createSignedUrl(path, 900);
  return data?.signedUrl ?? null;
}

export async function GET() {
  const role = await getServerRole();
  if (!role || !supabaseServer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: gameState } = await supabaseServer
    .from("game_state")
    .select("current_day, contract_signed")
    .eq("id", 1)
    .single<{ current_day: number; contract_signed: boolean }>();
  const currentDay = gameState?.current_day ?? 1;

  if (role === "contestant" && !gameState?.contract_signed) {
    return NextResponse.json({ transactions: [], temptations: [], evidence: [] });
  }

  const transactionsQuery = supabaseServer.from("prize_transactions").select("*").order("created_at", { ascending: false });
  const temptationsQuery = supabaseServer.from("extra_temptations").select("*").order("created_at", { ascending: false });
  const evidenceQuery = supabaseServer.from("evidence_proofs").select("*").order("submitted_at", { ascending: false });
  const [{ data: transactions }, { data: temptations }, { data: evidence }] = await Promise.all([
    role === "director" ? transactionsQuery : Promise.resolve({ data: [] }),
    role === "director" ? temptationsQuery : temptationsQuery.eq("day_number", currentDay),
    role === "director" ? evidenceQuery : evidenceQuery.lte("day_number", currentDay),
  ]);

  const evidenceWithUrls = await Promise.all(
    (evidence ?? []).map(async (item) => ({ ...item, photo_url: await signedEvidenceUrl(item.storage_path) })),
  );
  return NextResponse.json({ transactions: transactions ?? [], temptations: temptations ?? [], evidence: evidenceWithUrls });
}

export async function POST(request: Request) {
  const role = await getServerRole();
  if (!role || !supabaseServer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;

  if (body.action === "sign_contract" && role === "contestant") {
    const signer = String(body.signer ?? "").trim();
    if (!signer) return NextResponse.json({ error: "Firma richiesta" }, { status: 400 });
    const now = new Date();
    const nowIso = now.toISOString();
    const { data, error } = await supabaseServer
      .from("game_state")
      .update({
        contract_signed: true,
        contract_signed_at: nowIso,
        contract_signer: signer,
        game_started_at: nowIso,
        next_day_at: nextDayAtFromSignature(now),
        current_day: 1,
        updated_at: nowIso,
      })
      .eq("id", 1)
      .select(
        "current_day, prize_pool, director_orgasms, contestant_orgasms, notes, updated_at, contract_signed, contract_signed_at, contract_signer, game_completed, completed_at",
      )
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Firma non salvata" }, { status: 500 });
    }

    return NextResponse.json({ data });
  }

  if (body.action === "change_prize" && role === "director") {
    const { data, error } = await supabaseServer.rpc("change_hot_money_prize", {
      p_amount: Number(body.amount),
      p_reason: String(body.reason ?? "Modifica Direttore"),
      p_source_type: "director",
      p_source_id: null,
      p_idempotency_key: String(body.idempotencyKey),
    });
    return NextResponse.json(error ? { error: error.message } : { data }, { status: error ? 400 : 200 });
  }

  if (body.action === "create_extra" && role === "director") {
    const { data, error } = await supabaseServer.from("extra_temptations").insert({
      day_number: Number(body.dayNumber),
      title: String(body.title),
      description: String(body.description),
      cost: Number(body.cost),
    }).select().single();
    return NextResponse.json(error ? { error: error.message } : { data }, { status: error ? 400 : 200 });
  }

  if (body.action === "choose_extra" && role === "contestant") {
    const { data, error } = await supabaseServer.rpc("choose_extra_temptation", {
      p_temptation_id: String(body.id),
      p_choice: String(body.choice),
      p_idempotency_key: String(body.idempotencyKey),
    });
    return NextResponse.json(error ? { error: error.message } : { data }, { status: error ? 400 : 200 });
  }

  if (body.action === "choose_daily" && role === "contestant") {
    const { data, error } = await supabaseServer.rpc("choose_daily_temptation", {
      p_day_number: Number(body.dayNumber),
      p_choice: String(body.choice),
      p_cost: Number(body.cost),
      p_idempotency_key: String(body.idempotencyKey),
    });
    return NextResponse.json(error ? { error: error.message } : { data }, { status: error ? 400 : 200 });
  }

  if (body.action === "submit_evidence" && role === "contestant") {
    const dataUrl = String(body.dataUrl);
    const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match) return NextResponse.json({ error: "Foto non valida" }, { status: 400 });
    const path = `alice/day-${Number(body.dayNumber)}/${crypto.randomUUID()}`;
    const upload = await supabaseServer.storage.from("evidence-proofs").upload(path, Buffer.from(match[2], "base64"), {
      contentType: match[1],
    });
    if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 500 });
    const { error } = await supabaseServer.from("evidence_proofs").insert({
      day_number: Number(body.dayNumber), mission_title: String(body.missionTitle),
      storage_path: path, file_name: String(body.fileName),
    });
    return NextResponse.json(error ? { error: error.message } : { ok: true }, { status: error ? 500 : 200 });
  }

  if (body.action === "review_evidence" && role === "director") {
    const { error } = await supabaseServer.from("evidence_proofs").update({
      status: String(body.status), reviewed_at: new Date().toISOString(),
    }).eq("id", String(body.id));
    return NextResponse.json(error ? { error: error.message } : { ok: true }, { status: error ? 400 : 200 });
  }

  if (body.action === "reset_advanced" && role === "director") {
    const { data: evidencePaths } = await supabaseServer.from("evidence_proofs").select("storage_path");
    await Promise.all([
      supabaseServer.from("prize_transactions").delete().gte("id", 0),
      supabaseServer.from("extra_temptations").delete().not("id", "is", null),
      supabaseServer.from("daily_temptation_choices").delete().gte("day_number", 1),
      supabaseServer.from("evidence_proofs").delete().not("id", "is", null),
    ]);
    if (evidencePaths?.length) {
      await supabaseServer.storage.from("evidence-proofs").remove(evidencePaths.map((item) => item.storage_path));
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
}
