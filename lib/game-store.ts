"use client";

import { useSyncExternalStore } from "react";

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

export type GameState = {
  currentDay: number;
  dayTitle: string;
  initialPrizePool: number;
  prizePool: number;
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
};

let state = initialState;
let hydrated = false;

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
}

export function chooseTemptation(choice: Exclude<TemptationChoice, null>) {
  readStoredState();
  if (state.temptationChoices[state.currentDay - 1]) return;

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

export function signContract(signer: string) {
  readStoredState();
  if (state.contractSigned || !signer.trim()) return;
  state = {
    ...state,
    contractSigned: true,
    contractSignedAt: new Date().toISOString(),
    contractSigner: signer.trim(),
  };
  persist();
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
