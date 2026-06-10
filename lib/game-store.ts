"use client";

import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

export type Contestant = {
  id: string;
  name: string;
  username: string;
};

export type EvidenceStatus = "pending" | "approved" | "rejected";
export type TemptationChoice = "accepted" | "rejected" | null;

export type Evidence = {
  id: string;
  day: number;
  contestantId: string;
  contestantName: string;
  missionTitle: string;
  photoDataUrl: string;
  fileName: string;
  submittedAt: string;
  status: EvidenceStatus;
};

export type GameDay = {
  title: string;
  missionTitle: string;
  missionDescription: string;
  temptationTitle: string;
  temptationDescription?: string;
  temptationCost: number;
};

export type PrizeTransaction = {
  id: number;
  day_number: number;
  reason: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  created_at: string;
};

export type ExtraTemptation = {
  id: string;
  day_number: number;
  title: string;
  description: string;
  cost: number;
  choice: "accepted" | "rejected" | null;
  created_at: string;
};

export type RemoteEvidence = {
  id: string;
  day_number: number;
  mission_title: string;
  file_name: string;
  status: EvidenceStatus;
  submitted_at: string;
  photo_url: string | null;
};

export type GameState = {
  currentDay: number;
  dayTitle: string;
  initialPrizePool: number;
  prizePool: number;
  directorOrgasms: number;
  contestantOrgasms: number;
  notes: string;
  updatedAt: string | null;
  missionTitle: string;
  missionDescription: string;
  temptationTitle: string;
  temptationDescription: string;
  temptationCost: number;
  temptationChoices: TemptationChoice[];
  days: GameDay[];
  contestant: Contestant;
  evidence: Evidence[];
  rules: string;
  prizePoolHistory: Array<number | null>;
  contractSigned: boolean;
  contractSignedAt: string | null;
  contractSigner: string;
  gameCompleted: boolean;
  completedAt: string | null;
  prizeTransactions: PrizeTransaction[];
  extraTemptations: ExtraTemptation[];
  remoteEvidence: RemoteEvidence[];
};

const STORAGE_KEY = "hot-money-game-state";
const EVENT_NAME = "hot-money-game-state-change";

const initialRules = `HOT MONEY – BLACK EDITION

Il gioco dura 7 giorni.
Il montepremi iniziale è di 300€.
La concorrente deve conservare il montepremi più alto possibile.
Ogni giorno prevede una missione e una tentazione.
Le tentazioni sono facoltative.
Se la concorrente accetta una tentazione, il costo viene scalato dal montepremi.
Il Direttore gestisce giorno, missione, tentazione e montepremi.
La concorrente può visualizzare il giorno corrente, accettare o rifiutare la tentazione e inviare la prova fotografica del giorno.
Al termine del Giorno 7 viene assegnato il premio finale residuo.`;

export const officialDays: GameDay[] = [
  {
    title: "Seduzione",
    missionTitle: "Il primo sguardo",
    missionDescription: "Conquista l'attenzione con fascino, intuito e strategia.",
    temptationTitle: "Un vantaggio irresistibile",
    temptationDescription: "Ottieni un indizio esclusivo che può rendere più semplice la missione di oggi.",
    temptationCost: 2000,
  },
  {
    title: "Trasgressione",
    missionTitle: "Oltre il limite",
    missionDescription: "Rompi una regola della routine e completa una sfida che nessuno si aspetta.",
    temptationTitle: "La scorciatoia proibita",
    temptationDescription: "Salta una parte della missione in cambio di una riduzione del montepremi.",
    temptationCost: 3000,
  },
  {
    title: "Mistero",
    missionTitle: "Segreto di mezzanotte",
    missionDescription: "Scopri l'indizio nascosto e completa la sfida prima dello scoccare della mezzanotte.",
    temptationTitle: "Apri la busta proibita",
    temptationDescription: "Scopri subito un segreto utile, ma il montepremi ne pagherà il prezzo.",
    temptationCost: 5000,
  },
  {
    title: "Provocazione",
    missionTitle: "Senza filtri",
    missionDescription: "Affronta una provocazione diretta e trasforma la pressione in un vantaggio.",
    temptationTitle: "La verità ha un prezzo",
    temptationCost: 6000,
    temptationDescription: "Ricevi una rivelazione privata che può cambiare la tua strategia.",
  },
  {
    title: "Tentazione",
    missionTitle: "Resisti o cedi",
    missionDescription: "Scegli se proteggere il montepremi o accettare un vantaggio personale decisivo.",
    temptationTitle: "Il privilegio segreto",
    temptationDescription: "Accetta un privilegio esclusivo e rinuncia a una parte del montepremi.",
    temptationCost: 8000,
  },
  {
    title: "Doppio",
    missionTitle: "Due facce, una scelta",
    missionDescription: "Collabora con un alleato, ma preparati a prendere una decisione che cambierà entrambi.",
    temptationTitle: "Raddoppia la posta",
    temptationDescription: "Ottieni un doppio vantaggio immediato pagando un costo importante.",
    temptationCost: 10000,
  },
  {
    title: "Notte Black",
    missionTitle: "L'ultima notte",
    missionDescription: "Affronta la prova finale e dimostra di meritare la vittoria di HOT MONEY.",
    temptationTitle: "La tentazione finale",
    temptationDescription: "Accetta l'ultimo vantaggio prima della conclusione del gioco.",
    temptationCost: 15000,
  },
];

const initialDay = officialDays[0];

const initialState: GameState = {
  currentDay: 1,
  dayTitle: initialDay.title,
  initialPrizePool: 300,
  prizePool: 300,
  directorOrgasms: 0,
  contestantOrgasms: 0,
  notes: "",
  updatedAt: null,
  missionTitle: initialDay.missionTitle,
  missionDescription: initialDay.missionDescription,
  temptationTitle: initialDay.temptationTitle,
  temptationDescription: initialDay.temptationDescription ?? "",
  temptationCost: initialDay.temptationCost,
  temptationChoices: Array<TemptationChoice>(7).fill(null),
  days: officialDays,
  contestant: { id: "alice", name: "ALICE", username: "concorrente" },
  evidence: [],
  rules: initialRules,
  prizePoolHistory: Array<number | null>(7).fill(null),
  contractSigned: false,
  contractSignedAt: null,
  contractSigner: "",
  gameCompleted: false,
  completedAt: null,
  prizeTransactions: [],
  extraTemptations: [],
  remoteEvidence: [],
};

let state = initialState;
let hydrated = false;
let realtimeSubscribers = 0;
let realtimeChannel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;

export type RemoteGameState = {
  current_day: number;
  prize_pool: number;
  director_orgasms: number;
  contestant_orgasms: number;
  notes: string | null;
  updated_at: string | null;
  contract_signed?: boolean;
  contract_signed_at?: string | null;
  contract_signer?: string | null;
  game_completed?: boolean;
  completed_at?: string | null;
};

type RemoteDailyChallenge = {
  id: number;
  day_number: number;
  title: string;
  objective: string;
  description: string;
  temptation_text: string;
  temptation_value: number;
  updated_at: string | null;
};

function normalizeState(value: Partial<GameState>): GameState {
  const currentDay = Math.min(7, Math.max(1, Number(value.currentDay) || initialState.currentDay));
  const days = value.days ?? officialDays;
  const activeDay = days[currentDay - 1] ?? officialDays[currentDay - 1];

  return {
    ...initialState,
    ...value,
    ...activeDay,
    dayTitle: activeDay.title,
    temptationDescription: activeDay.temptationDescription ?? "",
    days,
    temptationChoices: value.temptationChoices ?? initialState.temptationChoices,
    contestant: initialState.contestant,
    evidence: (value.evidence ?? initialState.evidence).filter(
      (item) => item.photoDataUrl && item.day >= 1 && item.day <= 7,
    ),
    prizePoolHistory: value.prizePoolHistory ?? initialState.prizePoolHistory,
    currentDay,
  };
}

function persist() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(EVENT_NAME));
}

function remoteUpdates(updates: Partial<GameState>) {
  const remote: Partial<RemoteGameState> = {};

  if (updates.currentDay !== undefined) remote.current_day = updates.currentDay;
  if (updates.prizePool !== undefined) remote.prize_pool = updates.prizePool;
  if (updates.directorOrgasms !== undefined) remote.director_orgasms = updates.directorOrgasms;
  if (updates.contestantOrgasms !== undefined) remote.contestant_orgasms = updates.contestantOrgasms;
  if (updates.notes !== undefined) remote.notes = updates.notes;
  if (updates.contractSigned !== undefined) remote.contract_signed = updates.contractSigned;
  if (updates.contractSignedAt !== undefined) remote.contract_signed_at = updates.contractSignedAt;
  if (updates.contractSigner !== undefined) remote.contract_signer = updates.contractSigner;
  if (updates.gameCompleted !== undefined) remote.game_completed = updates.gameCompleted;
  if (updates.completedAt !== undefined) remote.completed_at = updates.completedAt;

  return remote;
}

async function syncToSupabase(updates: Partial<GameState>) {
  if (!supabase) return;
  const remote = remoteUpdates(updates);
  if (Object.keys(remote).length === 0) return;

  try {
    await supabase.from("game_state").update(remote).eq("id", 1);
  } catch {
    // The local state remains the fallback when Supabase is unavailable.
  }
}

function encodeTemptation(day: GameDay) {
  return JSON.stringify({
    title: day.temptationTitle,
    description: day.temptationDescription ?? "",
  });
}

function decodeTemptation(value: string) {
  try {
    const parsed = JSON.parse(value) as { title?: string; description?: string };
    return {
      title: parsed.title ?? "",
      description: parsed.description ?? "",
    };
  } catch {
    return { title: value, description: "" };
  }
}

function applyRemoteChallenge(challenge: RemoteDailyChallenge) {
  if (challenge.day_number < 1 || challenge.day_number > 7) return;
  const days = [...state.days];
  const temptation = decodeTemptation(challenge.temptation_text);

  days[challenge.day_number - 1] = {
    title: challenge.title,
    missionTitle: challenge.objective,
    missionDescription: challenge.description,
    temptationTitle: temptation.title,
    temptationDescription: temptation.description,
    temptationCost: challenge.temptation_value,
  };
  state = normalizeState({ ...state, days });
  persist();
}

export async function loadRemoteDailyChallenges() {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from("daily_challenges")
      .select("id, day_number, title, objective, description, temptation_text, temptation_value, updated_at")
      .order("day_number")
      .returns<RemoteDailyChallenge[]>();

    if (error || !data?.length) return false;
    data.forEach(applyRemoteChallenge);
    return true;
  } catch {
    return false;
  }
}

async function syncDailyChallenge(dayNumber: number, day: GameDay) {
  if (!supabase) return;

  try {
    await supabase.from("daily_challenges").upsert(
      {
        day_number: dayNumber,
        title: day.title,
        objective: day.missionTitle,
        description: day.missionDescription,
        temptation_text: encodeTemptation(day),
        temptation_value: day.temptationCost,
      },
      { onConflict: "day_number" },
    );
  } catch {
    // Local state remains available if Supabase cannot save the challenge.
  }
}

export async function loadRemoteGameState() {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from("game_state")
      .select("current_day, prize_pool, director_orgasms, contestant_orgasms, notes, updated_at, contract_signed, contract_signed_at, contract_signer, game_completed, completed_at")
      .eq("id", 1)
      .limit(1)
      .returns<RemoteGameState[]>();

    if (error || !data?.[0]) return false;
    applyRemoteState(data[0]);
    console.log("Supabase game_state loaded");
    return data[0];
  } catch {
    // The local state remains the fallback when Supabase is unavailable.
    return false;
  }
}

export async function loadAdvancedGameData() {
  try {
    const response = await fetch("/api/game/advanced", { cache: "no-store" });
    if (!response.ok) return false;
    const data = (await response.json()) as {
      transactions: PrizeTransaction[];
      temptations: ExtraTemptation[];
      evidence: RemoteEvidence[];
    };
    state = normalizeState({
      ...state,
      prizeTransactions: data.transactions,
      extraTemptations: data.temptations,
      remoteEvidence: data.evidence,
    });
    persist();
    return true;
  } catch {
    return false;
  }
}

async function advancedAction(body: Record<string, unknown>) {
  const response = await fetch("/api/game/advanced", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Operazione non riuscita");
  await Promise.all([loadRemoteGameState(), loadAdvancedGameData()]);
}

export async function changePrizePoolAtomic(amount: number, reason: string) {
  await advancedAction({
    action: "change_prize",
    amount,
    reason,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function createExtraTemptation(title: string, description: string, cost: number) {
  await advancedAction({ action: "create_extra", dayNumber: state.currentDay, title, description, cost });
}

export async function chooseExtraTemptation(id: string, choice: "accepted" | "rejected") {
  await advancedAction({ action: "choose_extra", id, choice, idempotencyKey: crypto.randomUUID() });
}

export async function reviewRemoteEvidence(id: string, status: Exclude<EvidenceStatus, "pending">) {
  await advancedAction({ action: "review_evidence", id, status });
}

function applyRemoteState(data: RemoteGameState) {
  state = normalizeState({
    ...state,
    currentDay: data.current_day,
    prizePool: data.prize_pool,
    directorOrgasms: data.director_orgasms,
    contestantOrgasms: data.contestant_orgasms,
    notes: data.notes ?? "",
    updatedAt: data.updated_at,
    contractSigned: data.contract_signed ?? state.contractSigned,
    contractSignedAt: data.contract_signed_at ?? state.contractSignedAt,
    contractSigner: data.contract_signer ?? state.contractSigner,
    gameCompleted: data.game_completed ?? state.gameCompleted,
    completedAt: data.completed_at ?? state.completedAt,
  });
  persist();
}

export function subscribeToRemoteGameState() {
  if (!supabase) return () => undefined;
  const client = supabase;
  realtimeSubscribers += 1;

  if (!realtimeChannel) {
    realtimeChannel = client
    .channel("hot-money-game-state")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "game_state", filter: "id=eq.1" },
      (payload) => applyRemoteState(payload.new as RemoteGameState),
    )
    .subscribe();
  }

  return () => {
    realtimeSubscribers = Math.max(0, realtimeSubscribers - 1);
    if (realtimeSubscribers === 0 && realtimeChannel) {
      void client.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  };
}

export function subscribeToRemoteDailyChallenges() {
  if (!supabase) return () => undefined;
  const client = supabase;
  const channel = client
    .channel(`hot-money-daily-challenges-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "daily_challenges" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          void loadRemoteDailyChallenges();
          return;
        }
        applyRemoteChallenge(payload.new as RemoteDailyChallenge);
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

function readStoredState() {
  if (typeof window === "undefined" || hydrated) return;
  hydrated = true;

  try {
    const storedState = window.localStorage.getItem(STORAGE_KEY);
    if (storedState) state = normalizeState(JSON.parse(storedState));
  } catch {
    state = initialState;
  }
}

function getSnapshot() {
  readStoredState();
  return state;
}

function getServerSnapshot() {
  return initialState;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  void loadRemoteGameState();

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;

    try {
      state = event.newValue ? normalizeState(JSON.parse(event.newValue)) : initialState;
    } catch {
      state = initialState;
    }
    callback();
  };

  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function updateGameState(updates: Partial<GameState>) {
  readStoredState();
  const nextDay = Math.min(7, Math.max(1, Number(updates.currentDay) || state.currentDay));
  const days = [...state.days];
  const temptationChoices = [...state.temptationChoices];
  const prizePoolHistory = [...state.prizePoolHistory];
  const changesTemptation =
    updates.temptationTitle !== undefined ||
    updates.temptationDescription !== undefined ||
    updates.temptationCost !== undefined;
  const changesDayContent =
    updates.dayTitle !== undefined ||
    updates.missionTitle !== undefined ||
    updates.missionDescription !== undefined ||
    updates.temptationTitle !== undefined ||
    updates.temptationDescription !== undefined ||
    updates.temptationCost !== undefined;

  if (changesDayContent) {
    days[state.currentDay - 1] = {
      ...days[state.currentDay - 1],
      title: updates.dayTitle ?? state.dayTitle,
      missionTitle: updates.missionTitle ?? state.missionTitle,
      missionDescription: updates.missionDescription ?? state.missionDescription,
      temptationTitle: updates.temptationTitle ?? state.temptationTitle,
      temptationDescription: updates.temptationDescription ?? state.temptationDescription,
      temptationCost: updates.temptationCost ?? state.temptationCost,
    };
  }

  if (changesTemptation) {
    temptationChoices[state.currentDay - 1] = null;
  }

  if (updates.prizePool !== undefined) {
    prizePoolHistory[state.currentDay - 1] = updates.prizePool;
  }

  state = normalizeState({
    ...state,
    ...updates,
    currentDay: nextDay,
    days,
    temptationChoices,
    prizePoolHistory,
  });
  persist();
  void syncToSupabase(updates);
  if (changesDayContent) void syncDailyChallenge(state.currentDay, days[state.currentDay - 1]);
}

export function chooseTemptation(choice: Exclude<TemptationChoice, null>) {
  readStoredState();
  if (state.temptationChoices[state.currentDay - 1]) return;
  if (choice === "accepted" && state.temptationCost > state.prizePool) return;

  const temptationChoices = [...state.temptationChoices];
  const prizePoolHistory = [...state.prizePoolHistory];
  temptationChoices[state.currentDay - 1] = choice;
  const nextPrizePool =
    choice === "accepted"
      ? Math.max(0, state.prizePool - state.temptationCost)
      : state.prizePool;
  prizePoolHistory[state.currentDay - 1] = nextPrizePool;
  state = normalizeState({
    ...state,
    temptationChoices,
    prizePool: nextPrizePool,
    prizePoolHistory,
  });
  persist();
  void advancedAction({
    action: "choose_daily",
    dayNumber: state.currentDay,
    choice,
    cost: state.temptationCost,
    idempotencyKey: `daily-temptation-${state.currentDay}`,
  });
}

export function submitEvidence(
  evidence: Omit<Evidence, "id" | "submittedAt" | "status">,
) {
  readStoredState();
  const submission: Evidence = {
    ...evidence,
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    status: "pending",
  };
  state = { ...state, evidence: [submission, ...state.evidence] };
  persist();
  void advancedAction({
    action: "submit_evidence",
    dayNumber: evidence.day,
    missionTitle: evidence.missionTitle,
    dataUrl: evidence.photoDataUrl,
    fileName: evidence.fileName,
  });
}

export function reviewEvidence(id: string, status: Exclude<EvidenceStatus, "pending">) {
  readStoredState();
  const submission = state.evidence.find((item) => item.id === id);
  if (!submission || submission.status !== "pending") return;

  state = {
    ...state,
    evidence: state.evidence.map((item) => (item.id === id ? { ...item, status } : item)),
  };
  persist();
}

export function resetEvidence(id: string) {
  readStoredState();
  state = { ...state, evidence: state.evidence.filter((item) => item.id !== id) };
  persist();
}

export async function signContract(signer: string) {
  readStoredState();
  if (state.contractSigned || !signer.trim()) return false;

  const response = await fetch("/api/game/advanced", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "sign_contract", signer: signer.trim() }),
  });
  const result = (await response.json()) as { data?: RemoteGameState; error?: string };

  if (!response.ok || !result.data) {
    throw new Error(result.error ?? "Firma non salvata");
  }

  applyRemoteState(result.data);
  await loadRemoteGameState();
  return true;
}

export function resetContract() {
  readStoredState();
  state = {
    ...state,
    contractSigned: false,
    contractSignedAt: null,
    contractSigner: "",
  };
  persist();
  void syncToSupabase({
    contractSigned: false,
    contractSignedAt: null,
    contractSigner: "",
  });
}

export function completeGame() {
  readStoredState();
  if (state.currentDay !== 7 || state.gameCompleted) return;
  state = {
    ...state,
    gameCompleted: true,
    completedAt: new Date().toISOString(),
  };
  persist();
  void syncToSupabase({ gameCompleted: true, completedAt: state.completedAt });
}

export function resetGame() {
  readStoredState();
  const savedRules = state.rules;

  state = {
    ...initialState,
    temptationChoices: Array<TemptationChoice>(7).fill(null),
    days: officialDays.map((day) => ({ ...day })),
    evidence: [],
    rules: savedRules,
    prizePoolHistory: Array<number | null>(7).fill(null),
  };
  persist();
  void syncToSupabase({
    currentDay: state.currentDay,
    prizePool: state.prizePool,
    directorOrgasms: state.directorOrgasms,
    contestantOrgasms: state.contestantOrgasms,
    notes: state.notes,
    contractSigned: false,
    contractSignedAt: null,
    contractSigner: "",
    gameCompleted: false,
    completedAt: null,
  });
  void advancedAction({ action: "reset_advanced" });
}

export function useGameStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const dayThemes = [
  "Seduzione",
  "Trasgressione",
  "Mistero",
  "Provocazione",
  "Tentazione",
  "Doppio",
  "Notte Black",
] as const;

export function getDayTheme(day: number) {
  return dayThemes[Math.min(7, Math.max(1, day)) - 1];
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
