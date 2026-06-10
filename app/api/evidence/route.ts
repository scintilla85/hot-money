import { NextResponse } from "next/server";
import { getServerRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const role = await getServerRole();
  if (role !== "contestant" || !supabaseServer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;

  if (body.action === "prepare") {
    const dayNumber = Number(body.dayNumber);
    const fileName = String(body.fileName ?? "").trim();
    const fileType = String(body.fileType ?? "");
    const fileSize = Number(body.fileSize);

    if (!fileType.startsWith("image/") || !fileName) {
      return NextResponse.json({ error: "Foto non valida" }, { status: 400 });
    }
    if (!Number.isFinite(fileSize) || fileSize > MAX_EVIDENCE_FILE_SIZE) {
      return NextResponse.json({ error: "Il file supera il limite di 10 MB." }, { status: 413 });
    }
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) {
      return NextResponse.json({ error: "Giorno non valido" }, { status: 400 });
    }

    const extension = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
    const path = `alice/day-${dayNumber}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await supabaseServer.storage
      .from("evidence-proofs")
      .createSignedUploadUrl(path);

    return NextResponse.json(error ? { error: error.message } : { data }, { status: error ? 500 : 200 });
  }

  if (body.action === "finalize") {
    const dayNumber = Number(body.dayNumber);
    const missionTitle = String(body.missionTitle ?? "").trim();
    const storagePath = String(body.storagePath ?? "");
    const fileName = String(body.fileName ?? "").trim();
    const expectedPrefix = `alice/day-${dayNumber}/`;

    if (
      !Number.isInteger(dayNumber) ||
      dayNumber < 1 ||
      dayNumber > 7 ||
      !missionTitle ||
      !fileName ||
      !storagePath.startsWith(expectedPrefix)
    ) {
      return NextResponse.json({ error: "Dati prova non validi" }, { status: 400 });
    }

    const { error } = await supabaseServer.from("evidence_proofs").insert({
      day_number: dayNumber,
      mission_title: missionTitle,
      storage_path: storagePath,
      file_name: fileName,
    });

    if (error) {
      await supabaseServer.storage.from("evidence-proofs").remove([storagePath]);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
}
