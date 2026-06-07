"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import PushNotifications from "@/components/push-notifications";
import {
  chooseTemptation,
  formatCurrency,
  loadRemoteDailyChallenges,
  loadRemoteGameState,
  signContract,
  subscribeToRemoteDailyChallenges,
  subscribeToRemoteGameState,
  submitEvidence,
  useGameStore,
} from "@/lib/game-store";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export default function ConcorrentePage() {
  const game = useGameStore();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [accessError, setAccessError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [media, setMedia] = useState<{
    dataUrl: string;
    fileName: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [showRules, setShowRules] = useState(false);
  const contestant = game.contestant;
  const currentDayTheme = game.dayTitle;
  const temptationChoice = game.temptationChoices[game.currentDay - 1];

  useEffect(() => {
    setAuthorized(window.localStorage.getItem("hot-money-contestant-access") === "true");
  }, []);

  useEffect(() => {
    if (!authorized) return;
    void loadRemoteGameState();
    void loadRemoteDailyChallenges();
    const unsubscribeGameState = subscribeToRemoteGameState();
    const unsubscribeChallenges = subscribeToRemoteDailyChallenges();
    return () => {
      unsubscribeGameState();
      unsubscribeChallenges();
    };
  }, [authorized]);

  function handleAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");

    if (password !== "alice1990") {
      setAccessError("Password non valida");
      return;
    }

    window.localStorage.setItem("hot-money-contestant-access", "true");
    setAccessError("");
    setAuthorized(true);
  }

  function logout() {
    window.localStorage.removeItem("hot-money-contestant-access");
    setAuthorized(false);
  }

  function handleContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    signContract(String(data.get("signature") ?? ""));
  }

  function selectMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setMessage("");

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMedia(null);
      setMessage("Seleziona esclusivamente una foto.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMedia(null);
      setMessage("Il file supera il limite locale di 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMedia({
        dataUrl: String(reader.result),
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!media) {
      setMessage("Seleziona una foto o un video.");
      return;
    }

    try {
      submitEvidence({
        day: game.currentDay,
        contestantId: contestant.id,
        contestantName: contestant.name,
        missionTitle: game.missionTitle,
        photoDataUrl: media.dataUrl,
        fileName: media.fileName,
      });
      formRef.current?.reset();
      setMedia(null);
      setMessage("Prova inviata. In attesa di approvazione.");
    } catch {
      setMessage("Spazio locale insufficiente. Prova con un file più piccolo.");
    }
  }

  if (!authorized) {
    return (
      <main className="login-page">
        <div className="home__frame" aria-hidden="true">
          <span className="home__corner home__corner--top-left" />
          <span className="home__corner home__corner--top-right" />
          <span className="home__corner home__corner--bottom-left" />
          <span className="home__corner home__corner--bottom-right" />
        </div>
        <section className="login" aria-labelledby="contestant-login-title">
          <div className="hero__edition"><span /><p>Black Edition</p><span /></div>
          <h1 id="contestant-login-title" className="login__logo">Hot Money</h1>
          <div className="login__diamond" aria-hidden="true" />
          <form className="login__card" onSubmit={handleAccess}>
            <div className="login__field">
              <label htmlFor="contestant-password">Accesso Concorrente</label>
              <input id="contestant-password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {accessError && <p className="login__error" role="alert">{accessError}</p>}
            <button className="login__button" type="submit"><span>Accedi</span><span className="hero__button-arrow">&rarr;</span></button>
          </form>
        </section>
      </main>
    );
  }

  if (!game.contractSigned) {
    return (
      <main className="contract-page">
        <section className="contract-card" aria-labelledby="contract-title">
          <div className="hero__edition"><span /><p>Black Edition</p><span /></div>
          <h1 id="contract-title">Hot Money</h1>
          <h2>Contratto di partecipazione</h2>
          <div className="rules-copy contract-rules">{game.rules}</div>
          <form className="contract-form" onSubmit={handleContract}>
            <label className="contract-accept"><input name="accepted" type="checkbox" required /><span>Accetto il regolamento</span></label>
            <label><span>Firma concorrente</span><input name="signature" type="text" autoComplete="name" required /></label>
            <button className="contestant__button" type="submit"><span>Firma e inizia il gioco</span><span>→</span></button>
          </form>
          <button className="admin-button" type="button" onClick={logout}>Esci</button>
        </section>
      </main>
    );
  }

  return (
    <main className="contestant-page">
      <div className="contestant-page__glow" aria-hidden="true" />
      <div className="contestant">
        <header className="contestant__header">
          <p>Black Edition</p>
          <h1>Hot Money</h1>
          <PushNotifications role="contestant" className="admin-button" />
          <button className="admin-button" type="button" onClick={logout}>Esci</button>
        </header>

        <button className="contestant__button rules-toggle" type="button" aria-expanded={showRules} onClick={() => setShowRules((visible) => !visible)}>
          <span>Regolamento</span><span aria-hidden="true">{showRules ? "−" : "+"}</span>
        </button>

        {showRules && (
          <section className="contestant-card rules-reader" aria-labelledby="rules-title">
            <div className="contestant-card__heading"><p id="rules-title">Regolamento gioco</p><span>◆</span></div>
            <div className="rules-copy">{game.rules}</div>
          </section>
        )}

        <section className="contestant-card contestant-profile">
          <div className="contestant-card__heading"><p>Profilo concorrente</p><span>◆</span></div>
          <h2>{contestant.name}</h2>
          <div className="contestant-profile__stats">
            <div><span>Nome concorrente</span><strong>{contestant.name}</strong></div>
            <div><span>Stato</span><strong>Attiva</strong></div>
          </div>
        </section>

        <section className="contestant-card contestant-mission">
          <div className="contestant-card__heading"><p>Missione del giorno</p><span>◆</span></div>
          <p className="contestant-mission__day">Giorno {game.currentDay} · {currentDayTheme}</p>
          <h2>{game.missionTitle}</h2>
          <p className="contestant-mission__copy">{game.missionDescription}</p>
        </section>

        <section className="contestant-card contestant-temptation">
          <div className="contestant-card__heading"><p>Tentazione del giorno</p><span>◆</span></div>
          <h2>{game.temptationTitle}</h2>
          <p className="contestant-mission__copy">{game.temptationDescription}</p>
          <div className="contestant-mission__reward"><span>Costo</span><strong>{formatCurrency(game.temptationCost)}</strong></div>
          <div className="temptation-actions">
            <button className="contestant__button" type="button" disabled={temptationChoice !== null} onClick={() => chooseTemptation("accepted")}><span>Accetta tentazione</span></button>
            <button className="contestant__button temptation-actions__reject" type="button" disabled={temptationChoice !== null} onClick={() => chooseTemptation("rejected")}><span>Rifiuta tentazione</span></button>
          </div>
          {temptationChoice && <p className="temptation-status" role="status">Tentazione già {temptationChoice === "accepted" ? "accettata" : "rifiutata"}</p>}
        </section>

        <section className="contestant-card contestant-prize">
          <div><p>Montepremi attuale</p><strong>{formatCurrency(game.prizePool)}</strong></div>
          <span className="contestant-prize__diamond" aria-hidden="true" />
        </section>

        <section className="contestant-card evidence-form-card">
          <div className="contestant-card__heading"><p>Invia prova</p><span>◆</span></div>
          <form ref={formRef} className="evidence-form" onSubmit={handleSubmit}>
            <label className="evidence-upload">
              <span>Foto prova</span>
              <input type="file" accept="image/*" onChange={selectMedia} />
              <b>{media ? media.fileName : "Seleziona file"}</b>
              <small>Dimensione massima locale: 2 MB</small>
            </label>
            {media && (
              <div className="evidence-preview">
                <img src={media.dataUrl} alt="Anteprima prova selezionata" />
              </div>
            )}
            {message && <p className="evidence-message" role="status">{message}</p>}
            <button className="contestant__button" type="submit"><span>Invia prova</span><span>→</span></button>
          </form>
        </section>
      </div>
    </main>
  );
}
