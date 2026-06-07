"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (username === "andrea" && password === "19851985") {
      setError("");
      router.push("/direttore");
      return;
    }

    if (username === "concorrente" && password === "1990") {
      setError("");
      router.push("/concorrente");
      return;
    }

    setError("Credenziali non valide");
  }

  return (
    <main className="login-page">
      <div className="home__frame" aria-hidden="true">
        <span className="home__corner home__corner--top-left" />
        <span className="home__corner home__corner--top-right" />
        <span className="home__corner home__corner--bottom-left" />
        <span className="home__corner home__corner--bottom-right" />
      </div>

      <section className="login" aria-labelledby="login-title">
        <div className="hero__edition">
          <span />
          <p>Black Edition</p>
          <span />
        </div>

        <h1 id="login-title" className="login__logo">
          Hot Money
        </h1>

        <div className="login__diamond" aria-hidden="true" />

        <form className="login__card" onSubmit={handleSubmit}>
          <div className="login__field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
            />
          </div>

          <div className="login__field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )}

          <button className="login__button" type="submit">
            <span>Accedi</span>
            <span className="hero__button-arrow" aria-hidden="true">
              &rarr;
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}
