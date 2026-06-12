import Link from "next/link";

const articles = [
  { title: "Articolo 1 - Durata del gioco", paragraphs: ["Il gioco dura 7 giorni."] },
  {
    title: "Articolo 2 - Montepremi",
    paragraphs: [
      "Il montepremi iniziale è di 300€.",
      "La concorrente deve conservare il montepremi più alto possibile.",
    ],
  },
  {
    title: "Articolo 3 - Missioni e Tentazioni",
    paragraphs: [
      "Ogni giorno prevede una missione e una tentazione.",
      "Le tentazioni sono facoltative.",
      "Se la concorrente accetta una tentazione, il costo viene scalato dal montepremi.",
    ],
  },
  {
    title: "Articolo 4 - Rapporto Giornaliero",
    paragraphs: [
      "Ogni giornata deve concludersi con un rapporto fisico tra concorrente e Direttore.",
      "Il rapporto deve avvenire nell'arco della giornata oppure nelle fasce orarie stabilite nella descrizione dell'obiettivo giornaliero.",
      "Per rapporto fisico si intende tutto ciò che riguarda il sesso, quindi penetrazione oppure masturbazione, a discrezione della concorrente, purché venga raggiunto almeno un orgasmo al giorno.",
    ],
  },
  {
    title: "Articolo 5 - Prove Fotografiche",
    paragraphs: [
      "Ogni giorno, nell'arco della giornata e a missione completata, la concorrente dovrà inviare una foto prova della missione nell'apposita sezione.",
      "La concorrente può visualizzare il giorno corrente, accettare o rifiutare la tentazione e inviare la prova fotografica del giorno.",
    ],
  },
  {
    title: "Articolo 6 - Ruolo del Direttore",
    paragraphs: ["Il Direttore gestisce giorno, missione, tentazione e montepremi."],
  },
  {
    title: "Articolo 7 - Premio Finale",
    paragraphs: ["Al termine del Giorno 7 viene assegnato il premio finale residuo."],
  },
];

export default function RegolamentoPage() {
  return (
    <main className="official-rules-page">
      <div className="home__frame" aria-hidden="true">
        <span className="home__corner home__corner--top-left" />
        <span className="home__corner home__corner--top-right" />
        <span className="home__corner home__corner--bottom-left" />
        <span className="home__corner home__corner--bottom-right" />
      </div>

      <section className="official-rules" aria-labelledby="official-rules-title">
        <header className="official-rules__header">
          <div className="hero__edition"><span /><p>Black Edition</p><span /></div>
          <h1>Hot Money</h1>
          <h2 id="official-rules-title">Regolamento Ufficiale</h2>
        </header>

        <div className="official-rules__articles">
          {articles.map((article, index) => (
            <article className="official-rules__article" key={article.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{article.title}</h3>
                {article.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </article>
          ))}
        </div>

        <Link className="contestant__button official-rules__back" href="/concorrente">
          <span>Torna al Contratto</span><span aria-hidden="true">&larr;</span>
        </Link>
      </section>
    </main>
  );
}
