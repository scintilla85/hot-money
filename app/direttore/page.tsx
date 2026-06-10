"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PushNotifications from "@/components/push-notifications";
import {
  completeGame,
  createExtraTemptation,
  dayThemes,
  changePrizePoolAtomic,
  formatCurrency,
  formatDateTime,
  loadRemoteDailyChallenges,
  loadAdvancedGameData,
  loadRemoteGameState,
  resetContract,
  resetGame,
  reviewRemoteEvidence,
  subscribeToRemoteDailyChallenges,
  subscribeToRemoteGameState,
  updateGameState,
  useGameStore,
} from "@/lib/game-store";

export default function DirettorePage() {
  const router = useRouter();
  const game = useGameStore();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [accessError, setAccessError] = useState("");
  const [prizeChange, setPrizeChange] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    setAuthorized(window.localStorage.getItem("hot-money-director-access") === "server");
  }, []);

  useEffect(() => {
    if (!authorized) return;
    void loadRemoteGameState();
    void loadRemoteDailyChallenges();
    void loadAdvancedGameData();
    const advancedInterval = window.setInterval(() => void loadAdvancedGameData(), 15000);
    const unsubscribeGameState = subscribeToRemoteGameState();
    const unsubscribeChallenges = subscribeToRemoteDailyChallenges();
    return () => {
      unsubscribeGameState();
      unsubscribeChallenges();
      window.clearInterval(advancedInterval);
    };
  }, [authorized]);

  async function handleAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");

    const response = await fetch("/api/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "director", password }),
    });
    if (!response.ok) {
      setAccessError("Password non valida");
      return;
    }

    window.localStorage.setItem("hot-money-director-access", "server");
    setAccessError("");
    setAuthorized(true);
  }

  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    window.localStorage.removeItem("hot-money-director-access");
    setAuthorized(false);
  }

  function getEvidenceStatus(day: number) {
    const submission = game.remoteEvidence.find((item) => item.day_number === day);
    if (!submission) return "Non inviata";
    if (submission.status === "approved") return "Approvata";
    if (submission.status === "rejected") return "Rifiutata";
    return "Inviata";
  }

  function getTemptationStatus(day: number) {
    const choice = game.temptationChoices[day - 1];
    if (choice === "accepted") return "Accettata";
    if (choice === "rejected") return "Rifiutata";
    return "Non scelta";
  }

  function changeDay(day: number) {
    updateGameState({ currentDay: Math.min(7, Math.max(1, day)) });
  }

  function saveMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateGameState({
      missionTitle: String(data.get("missionTitle") ?? ""),
      missionDescription: String(data.get("missionDescription") ?? ""),
    });
  }

  function saveTemptation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateGameState({
      temptationTitle: String(data.get("temptationTitle") ?? ""),
      temptationDescription: String(data.get("temptationDescription") ?? ""),
      temptationCost: Number(data.get("temptationCost")) || 0,
    });
  }

  async function changePrizePool(direction: 1 | -1) {
    const amount = Number(prizeChange);
    if (amount > 0) {
      await changePrizePoolAtomic(amount * direction, direction < 0 ? "Riduzione Direttore" : "Aumento Direttore");
      setPrizeChange("");
    }
  }

  async function saveExtraTemptation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await createExtraTemptation(
      String(data.get("title") ?? ""),
      String(data.get("description") ?? ""),
      Number(data.get("cost")) || 0,
    );
    event.currentTarget.reset();
  }

  function saveRules(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateGameState({ rules: String(data.get("rules") ?? "") });
  }

  function finishGame() {
    completeGame();
    router.push("/finale");
  }

  async function confirmGameReset() {
    try {
      await resetGame();
      setShowResetConfirm(false);
      setResetSuccess(true);
      setPrizeChange("");
      router.push("/direttore#giorno");
      window.setTimeout(() => setResetSuccess(false), 4000);
    } catch (error) {
      console.error("Reset gioco non riuscito", error);
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
        <section className="login" aria-labelledby="director-login-title">
          <div className="hero__edition"><span /><p>Black Edition</p><span /></div>
          <h1 id="director-login-title" className="login__logo">Hot Money</h1>
          <div className="login__diamond" aria-hidden="true" />
          <form className="login__card" onSubmit={handleAccess}>
            <div className="login__field">
              <label htmlFor="director-password">Accesso Direttore</label>
              <input id="director-password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {accessError && <p className="login__error" role="alert">{accessError}</p>}
            <button className="login__button" type="submit"><span>Accedi</span><span className="hero__button-arrow">&rarr;</span></button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin">
        <header className="admin__header">
          <div><p>Black Edition · Pannello di controllo</p><h1>Hot Money</h1></div>
          <div className="admin__header-actions">
            <span className="admin__role">Direttore</span>
            <PushNotifications role="director" className="admin-button" />
            <button className="admin-button" type="button" onClick={logout}>Esci</button>
            <button className="admin-button admin-button--reset" type="button" onClick={() => setShowResetConfirm(true)}>
              &#8635; Reset gioco
            </button>
          </div>
        </header>

        <section className="admin__summary" aria-label="Riepilogo partita">
          <article><span>Giorno corrente</span><strong>{String(game.currentDay).padStart(2, "0")}</strong><small>{game.dayTitle}</small></article>
          <article><span>Concorrente</span><strong>{game.contestant.name}</strong><small>Attiva</small></article>
          <article><span>Stato concorrente</span><strong>Attiva</strong><small>{game.contestant.name}</small></article>
          <article><span>Montepremi</span><strong>{formatCurrency(game.prizePool)}</strong><small>Aggiornato ora</small></article>
        </section>

        <nav className="admin__nav" aria-label="Sezioni pannello">
          <a href="#giorno">Giorno</a><a href="#concorrente">Concorrente</a>
          <a href="#missione">Missione</a><a href="#tentazione">Tentazione</a>
          <a href="#prove">Prove</a><a href="#storico">Storico</a><a href="#contratto">Contratto</a><a href="#regolamento">Regolamento</a><a href="#montepremi">Montepremi</a>
        </nav>

        <div className="admin__grid">
          <section id="giorno" className="admin-card admin-card--wide admin-day">
            <div className="admin-card__header"><div><p>Controllo partita</p><h2>Giorno corrente</h2></div><span className="admin-badge">{game.dayTitle}</span></div>
            <div className="admin-day__controls">
              <button className="admin-button" type="button" disabled={game.currentDay === 1} onClick={() => changeDay(game.currentDay - 1)}>Giorno precedente</button>
              <label><span>Seleziona giorno</span><select value={game.currentDay} onChange={(event) => changeDay(Number(event.target.value))}>{dayThemes.map((theme, index) => <option key={theme} value={index + 1}>Giorno {index + 1} · {theme}</option>)}</select></label>
              <button className="admin-button admin-button--primary" type="button" disabled={game.currentDay === 7} onClick={() => changeDay(game.currentDay + 1)}>Giorno successivo</button>
            </div>
            {game.currentDay === 7 && (
              <button className="admin-button admin-button--primary admin-finish" type="button" disabled={game.gameCompleted} onClick={finishGame}>
                {game.gameCompleted ? "Gioco concluso" : "Concludi il gioco"}
              </button>
            )}
          </section>

          <section id="concorrente" className="admin-card admin-card--wide">
            <div className="admin-card__header"><div><p>Profilo di gioco</p><h2>Concorrente</h2></div><span className="admin-badge">Attiva</span></div>
            <article className="admin-person">
              <div className="admin-person__identity"><strong>{game.contestant.name}</strong><span>Stato · Attiva</span></div>
              <span className="admin-badge">Attiva</span>
            </article>
          </section>

          <section id="missione" className="admin-card">
            <div className="admin-card__header"><div><p>Giorno {game.currentDay} · {game.dayTitle}</p><h2>Missione attuale</h2></div></div>
            <form key={`mission-${game.currentDay}`} className="admin-form" onSubmit={saveMission}>
              <label><span>Titolo missione</span><input name="missionTitle" type="text" defaultValue={game.missionTitle} required /></label>
              <label><span>Descrizione</span><textarea name="missionDescription" defaultValue={game.missionDescription} required /></label>
              <button className="admin-button admin-button--primary" type="submit">Salva missione</button>
            </form>
          </section>

          <section id="tentazione" className="admin-card">
            <div className="admin-card__header"><div><p>Offerta del giorno</p><h2>Tentazione</h2></div><span className="admin-badge">{formatCurrency(game.temptationCost)}</span></div>
            <form key={`temptation-${game.currentDay}`} className="admin-form" onSubmit={saveTemptation}>
              <label><span>Titolo tentazione</span><input name="temptationTitle" type="text" defaultValue={game.temptationTitle} required /></label>
              <label><span>Descrizione tentazione</span><textarea name="temptationDescription" defaultValue={game.temptationDescription} required /></label>
              <label><span>Costo tentazione</span><input name="temptationCost" type="number" min="0" defaultValue={game.temptationCost} required /></label>
              <button className="admin-button admin-button--primary" type="submit">Salva tentazione</button>
            </form>
          </section>

          <section className="admin-card">
            <div className="admin-card__header"><div><p>Offerta immediata</p><h2>Tentazione Extra</h2></div></div>
            <form className="admin-form" onSubmit={saveExtraTemptation}>
              <label><span>Titolo</span><input name="title" required /></label>
              <label><span>Descrizione</span><textarea name="description" required /></label>
              <label><span>Costo</span><input name="cost" type="number" min="0" required /></label>
              <button className="admin-button admin-button--primary" type="submit">Crea tentazione extra</button>
            </form>
          </section>

          <section id="storico" className="admin-card admin-card--wide">
            <div className="admin-card__header"><div><p>Riepilogo completo</p><h2>Storico 7 Giorni</h2></div><span className="admin-badge">Black Edition</span></div>
            <div className="history-days">
              {game.days.map((day, index) => (
                <article className="history-day" key={index}>
                  <div className="history-day__header">
                    <span>Giorno {index + 1}</span>
                    <strong>{day.title}</strong>
                  </div>
                  <dl>
                    <div><dt>Missione</dt><dd>{day.missionTitle}</dd></div>
                    <div><dt>Tentazione</dt><dd>{day.temptationTitle}</dd></div>
                    <div><dt>Stato tentazione</dt><dd>{getTemptationStatus(index + 1)}</dd></div>
                    <div><dt>Costo tentazione</dt><dd>{formatCurrency(day.temptationCost)}</dd></div>
                    <div><dt>Montepremi dopo il giorno</dt><dd>{game.prizePoolHistory[index] === null ? "Non registrato" : formatCurrency(game.prizePoolHistory[index]!)}</dd></div>
                    <div><dt>Prova fotografica</dt><dd>{getEvidenceStatus(index + 1)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-card admin-card--wide">
            <div className="admin-card__header"><div><p>Movimenti montepremi</p><h2>Storico economico</h2></div></div>
            <div className="history-days">
              {game.prizeTransactions.map((item) => (
                <article className="history-day" key={item.id}>
                  <div className="history-day__header"><span>Giorno {item.day_number}</span><strong>{item.reason}</strong></div>
                  <dl>
                    <div><dt>Variazione</dt><dd>{formatCurrency(item.amount)}</dd></div>
                    <div><dt>Saldo prima</dt><dd>{formatCurrency(item.balance_before)}</dd></div>
                    <div><dt>Saldo dopo</dt><dd>{formatCurrency(item.balance_after)}</dd></div>
                    <div><dt>Data e ora</dt><dd>{formatDateTime(item.created_at)}</dd></div>
                  </dl>
                </article>
              ))}
              {game.prizeTransactions.length === 0 && <p className="admin-empty">Nessun movimento registrato.</p>}
            </div>
          </section>

          <section className="admin-card admin-card--wide">
            <div className="admin-card__header"><div><p>Prove private</p><h2>Archivio foto Giorni 1-7</h2></div></div>
            <div className="history-days">
              {dayThemes.map((theme, index) => {
                const proof = game.remoteEvidence.find((item) => item.day_number === index + 1);
                return (
                  <article className="history-day" key={theme}>
                    <div className="history-day__header"><span>Giorno {index + 1}</span><strong>{theme}</strong></div>
                    <p className="admin-empty">{proof ? proof.status : "Non inviata"}</p>
                    {proof?.photo_url && <div className="admin-evidence__preview"><img src={proof.photo_url} alt={`Prova Giorno ${index + 1}`} /></div>}
                    {proof?.status === "pending" && <div className="admin-evidence__actions">
                      <button className="admin-button admin-button--approve" onClick={() => void reviewRemoteEvidence(proof.id, "approved")}>Approva</button>
                      <button className="admin-button" onClick={() => void reviewRemoteEvidence(proof.id, "rejected")}>Rifiuta</button>
                    </div>}
                  </article>
                );
              })}
            </div>
          </section>

          <section id="regolamento" className="admin-card admin-card--wide">
            <div className="admin-card__header"><div><p>Impostazioni gioco</p><h2>Regolamento gioco</h2></div></div>
            <form className="admin-form" onSubmit={saveRules}>
              <label><span>Testo regolamento</span><textarea className="rules-editor" name="rules" defaultValue={game.rules} required /></label>
              <button className="admin-button admin-button--primary" type="submit">Salva regolamento</button>
            </form>
          </section>

          <section id="contratto" className="admin-card admin-card--wide">
            <div className="admin-card__header"><div><p>Partecipazione</p><h2>Contratto</h2></div><span className={`admin-status ${game.contractSigned ? "admin-status--approved" : "admin-status--rejected"}`}>{game.contractSigned ? "Firmato" : "Non firmato"}</span></div>
            <div className="contract-summary">
              <div><span>Stato firma</span><strong>{game.contractSigned ? "Firmato" : "Non firmato"}</strong></div>
              <div><span>Data firma</span><strong>{game.contractSignedAt ? formatDateTime(game.contractSignedAt) : "Non disponibile"}</strong></div>
              <div><span>Nome firmatario</span><strong>{game.contractSigner || "Non disponibile"}</strong></div>
            </div>
            <button className="admin-button" type="button" disabled={!game.contractSigned} onClick={resetContract}>Reset firma</button>
          </section>

          <section id="montepremi" className="admin-card admin-card--wide admin-prize">
            <div className="admin-card__header"><div><p>Gestione economica</p><h2>Montepremi</h2></div></div>
            <strong className="admin-prize__value">{formatCurrency(game.prizePool)}</strong>
            <div className="admin-prize__controls">
              <input type="number" min="1" placeholder="Importo" value={prizeChange} onChange={(event) => setPrizeChange(event.target.value)} />
              <button className="admin-button" type="button" onClick={() => changePrizePool(-1)}>- Riduci</button>
              <button className="admin-button admin-button--approve" type="button" onClick={() => changePrizePool(1)}>+ Aumenta</button>
            </div>
          </section>
        </div>
      </div>

      {resetSuccess && <div className="admin-toast" role="status">Gioco resettato con successo</div>}

      {showResetConfirm && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <div className="admin-modal__backdrop" onClick={() => setShowResetConfirm(false)} />
          <section className="admin-modal__card">
            <p>Reset completo</p>
            <h2 id="reset-title">Sei sicuro di voler resettare HOT MONEY?</h2>
            <span>Tutti i dati del gioco corrente verranno cancellati.</span>
            <div className="admin-modal__actions">
              <button className="admin-button" type="button" onClick={() => setShowResetConfirm(false)}>Annulla</button>
              <button className="admin-button admin-button--reset" type="button" onClick={confirmGameReset}>Conferma reset</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
