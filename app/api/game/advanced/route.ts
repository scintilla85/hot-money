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
    return NextResponse.json({ transactions: [], temptations: [], evidence: [], dailyChoices: [] });
  }

  const transactionsQuery = supabaseServer.from("prize_transactions").select("*").order("created_at", { ascending: false });
  const temptationsQuery = supabaseServer.from("extra_temptations").select("*").order("created_at", { ascending: false });
  const evidenceQuery = supabaseServer.from("evidence_proofs").select("*").order("submitted_at", { ascending: false });
  const dailyChoicesQuery = supabaseServer.from("daily_temptation_choices").select("day_number, choice, chosen_at").order("day_number");
  const [{ data: transactions }, { data: temptations }, { data: evidence }, { data: dailyChoices }] = await Promise.all([
    role === "director" ? transactionsQuery : Promise.resolve({ data: [] }),
    role === "director" ? temptationsQuery : temptationsQuery.eq("day_number", currentDay),
    role === "director" ? evidenceQuery : evidenceQuery.lte("day_number", currentDay),
    dailyChoicesQuery,
  ]);

  const evidenceWithUrls = await Promise.all(
    (evidence ?? []).map(async (item) => ({ ...item, photo_url: await signedEvidenceUrl(item.storage_path) })),
  );
  return NextResponse.json({
    transactions: transactions ?? [],
    temptations: temptations ?? [],
    evidence: evidenceWithUrls,
    dailyChoices: dailyChoices ?? [],
  });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const role = await getServerRole();
  if (!role || !supabaseServer) {
    console.error("[sign_contract] Request rejected before action", {
      requestId,
      role,
      hasSupabaseServer: Boolean(supabaseServer),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as Record<string, unknown>;

  if (body.action === "sign_contract" && role === "contestant") {
    const signer = String(body.signer ?? "").trim();
    if (!signer) return NextResponse.json({ error: "Firma richiesta" }, { status: 400 });
    const now = new Date();
    const nowIso = now.toISOString();
    const nextDayAt = nextDayAtFromSignature(now);

    console.info("[sign_contract] Starting atomic signature", {
      requestId,
      role,
      signerLength: signer.length,
      signedAt: nowIso,
      nextDayAt,
    });

    try {
      const { data, error } = await supabaseServer.rpc("sign_hot_money_contract", {
        p_signer: signer,
        p_signed_at: nowIso,
        p_next_day_at: nextDayAt,
      });
      const signedState = Array.isArray(data) ? data[0] : data;

      if (!error && signedState?.contract_signed === true) {
        console.info("[sign_contract] Contract signed", {
          requestId,
          contractSigned: signedState.contract_signed,
          contractSignedAt: signedState.contract_signed_at,
          gameStartedAt: signedState.game_started_at,
          currentDay: signedState.current_day,
        });
        return NextResponse.json({ data: signedState });
      }

      console.error("[sign_contract] Atomic signature returned an error", {
        requestId,
        message: error?.message ?? "No row returned",
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        returnedData: Boolean(signedState),
        returnedContractSigned: signedState?.contract_signed ?? null,
      });

      const { data: currentState, error: stateError } = await supabaseServer
        .from("game_state")
        .select(
          "current_day, prize_pool, director_orgasms, contestant_orgasms, notes, updated_at, contract_signed, contract_signed_at, contract_signer, game_started_at, game_completed, completed_at",
        )
        .eq("id", 1)
        .single();

      if (!stateError && currentState?.contract_signed) {
        console.info("[sign_contract] Signature confirmed after RPC response error", {
          requestId,
          contractSignedAt: currentState.contract_signed_at,
          gameStartedAt: currentState.game_started_at,
          currentDay: currentState.current_day,
        });
        return NextResponse.json({ data: currentState });
      }

      console.error("[sign_contract] Contract signature not confirmed", {
        requestId,
        rpcError: error?.message,
        rpcCode: error?.code,
        rpcReturnedData: Boolean(signedState),
        rpcContractSigned: signedState?.contract_signed ?? null,
        stateError: stateError?.message,
        stateErrorCode: stateError?.code,
        contractSigned: currentState?.contract_signed ?? false,
        contractSignedAt: currentState?.contract_signed_at ?? null,
        gameStartedAt: currentState?.game_started_at ?? null,
        currentDay: currentState?.current_day ?? null,
      });
      return NextResponse.json(
        { error: error?.message ?? stateError?.message ?? "Firma non salvata", requestId },
        { status: 500 },
      );
    } catch (error) {
      console.error("[sign_contract] Unexpected server error", {
        requestId,
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? String(error.cause ?? "") : "",
      });
      return NextResponse.json({ error: "Firma non salvata", requestId }, { status: 500 });
    }
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

  if (body.action === "review_evidence" && role === "director") {
    const { error } = await supabaseServer.from("evidence_proofs").update({
      status: String(body.status), reviewed_at: new Date().toISOString(),
    }).eq("id", String(body.id));
    return NextResponse.json(error ? { error: error.message } : { ok: true }, { status: error ? 400 : 200 });
  }

  if (body.action === "reset_advanced" && role === "director") {
    const { data: evidencePaths, error: evidencePathsError } = await supabaseServer
      .from("evidence_proofs")
      .select("storage_path");
    if (evidencePathsError) {
      return NextResponse.json({ error: evidencePathsError.message }, { status: 500 });
    }
    const { data, error } = await supabaseServer.rpc("reset_hot_money_game");
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Reset non riuscito" }, { status: 500 });
    }
    if (evidencePaths?.length) {
      const removal = await supabaseServer.storage
        .from("evidence-proofs")
        .remove(evidencePaths.map((item) => item.storage_path));
      if (removal.error) {
        return NextResponse.json({ error: removal.error.message }, { status: 500 });
      }
    }
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
}
