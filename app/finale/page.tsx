"use client";

import Link from "next/link";
import { formatCurrency, useGameStore } from "@/lib/game-store";

export default function FinalePage() {
  const game = useGameStore();
  const approvedEvidence = game.remoteEvidence.filter((item) => item.status === "approved").length;
  const acceptedTemptations =
    game.temptationChoices.filter((choice) => choice === "accepted").length +
    game.extraTemptations.filter((item) => item.choice === "accepted").length;
  const rejectedTemptations =
    game.temptationChoices.filter((choice) => choice === "rejected").length +
    game.extraTemptations.filter((item) => item.choice === "rejected").length;
  const completedDays = game.gameCompleted
    ? 7
    : Math.max(game.currentDay - 1, game.prizePoolHistory.filter((value) => value !== null).length);

  return (
    <main className="final-page">
      <section className="final-card">
        <div className="hero__edition"><span /><p>Black Edition</p><span /></div>
        <h1>Hot Money</h1>
        <p className="final-card__complete">Gioco concluso</p>

        <div className="final-trophy" aria-label="Trofeo">
          <span aria-hidden="true">🏆</span>
        </div>

        <p className="final-card__contestant">Concorrente</p>
        <h2>{game.contestant.name}</h2>

        <div className="final-prize">
          <span>Montepremi finale</span>
          <strong>{formatCurrency(game.prizePool)}</strong>
        </div>

        <div className="final-stats">
          <article><span>Giorni completati</span><strong>{completedDays}</strong></article>
          <article><span>Prove approvate</span><strong>{approvedEvidence}</strong></article>
          <article><span>Tentazioni accettate</span><strong>{acceptedTemptations}</strong></article>
          <article><span>Tentazioni rifiutate</span><strong>{rejectedTemptations}</strong></article>
        </div>

        <Link className="contestant__button final-report" href="/report">
          <span>Visualizza report</span><span aria-hidden="true">→</span>
        </Link>
        <p className="final-card__complete">Hai resistito alle tentazioni. Il montepremi rimasto è la tua vittoria.</p>
      </section>
    </main>
  );
}
