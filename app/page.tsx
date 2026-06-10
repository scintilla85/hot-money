import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home">
      <div className="home__frame" aria-hidden="true">
        <span className="home__corner home__corner--top-left" />
        <span className="home__corner home__corner--top-right" />
        <span className="home__corner home__corner--bottom-left" />
        <span className="home__corner home__corner--bottom-right" />
      </div>

      <nav className="hero hero__access" aria-label="Seleziona il ruolo">
        <Link className="hero__button" href="/direttore">
          <span>Accesso Direttore</span>
          <span className="hero__button-arrow" aria-hidden="true">
            &rarr;
          </span>
        </Link>

        <Link className="hero__button" href="/concorrente">
          <span>Accesso Concorrente</span>
          <span className="hero__button-arrow" aria-hidden="true">
            &rarr;
          </span>
        </Link>
      </nav>
    </main>
  );
}
