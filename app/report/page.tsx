"use client";

import { formatCurrency, formatDateTime, useGameStore } from "@/lib/game-store";

export default function ReportPage() {
  const game = useGameStore();

  function evidenceStatus(day: number) {
    const evidence = game.evidence.find((item) => item.day === day);
    if (!evidence) return "Non inviata";
    if (evidence.status === "approved") return "Approvata";
    if (evidence.status === "rejected") return "Rifiutata";
    return "Inviata";
  }

  function temptationStatus(day: number) {
    const choice = game.temptationChoices[day - 1];
    if (choice === "accepted") return "Accettata";
    if (choice === "rejected") return "Rifiutata";
    return "Non scelta";
  }

  return (
    <main className="report-page">
      <section className="report">
        <header className="report__header">
          <div><p>Black Edition</p><h1>Hot Money</h1></div>
          <button className="admin-button admin-button--primary report__export" type="button" onClick={() => window.print()}>Esporta PDF</button>
        </header>

        <div className="report__summary">
          <article><span>Nome concorrente</span><strong>{game.contestant.name}</strong></article>
          <article><span>Data inizio gioco</span><strong>{game.contractSignedAt ? formatDateTime(game.contractSignedAt) : "Non disponibile"}</strong></article>
          <article><span>Data fine gioco</span><strong>{game.completedAt ? formatDateTime(game.completedAt) : "Non disponibile"}</strong></article>
          <article><span>Montepremi iniziale</span><strong>{formatCurrency(game.initialPrizePool)}</strong></article>
          <article><span>Montepremi finale</span><strong>{formatCurrency(game.prizePool)}</strong></article>
        </div>

        <div className="report__days">
          {game.days.map((day, index) => (
            <article className="report-day" key={index}>
              <header><span>Giorno {index + 1}</span><h2>{day.title}</h2></header>
              <dl>
                <div><dt>Missione</dt><dd>{day.missionTitle}</dd></div>
                <div><dt>Tentazione</dt><dd>{day.temptationTitle}</dd></div>
                <div><dt>Scelta tentazione</dt><dd>{temptationStatus(index + 1)}</dd></div>
                <div><dt>Costo tentazione</dt><dd>{formatCurrency(day.temptationCost)}</dd></div>
                <div><dt>Stato prova fotografica</dt><dd>{evidenceStatus(index + 1)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
