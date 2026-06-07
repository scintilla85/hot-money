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

      <section className="hero" aria-labelledby="home-title">
        <div className="hero__edition">
          <span />
          <p>Black Edition</p>
          <span />
        </div>

        <h1 id="home-title" className="hero__title">
          Hot Money
        </h1>

        <div className="hero__diamond" aria-hidden="true" />

        <p className="hero__copy">
          7 giorni di sfide, tentazioni e strategia.
        </p>

        <Link className="hero__button" href="/login">
          <span>Entra nel gioco</span>
          <span className="hero__button-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </section>
    </main>
  );
}
