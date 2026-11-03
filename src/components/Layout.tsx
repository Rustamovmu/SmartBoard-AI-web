import Head from "next/head";
import Link from "next/link";
import type { ReactNode } from "react";

export function Layout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <Head>
        <title>{`${title} · SmartBord`}</title>
        <meta
          name="description"
          content="Your SmartBord account. Your lecture recordings stay on your device."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="referrer" content="same-origin" />
      </Head>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <Link href="/" className="brand" aria-label="SmartBord home">
          <span className="brand-mark" aria-hidden="true">
            s<span>·</span>
          </span>
          SmartBord<span className="brand-ai">AI</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/community" prefetch={false}>
            Community
          </Link>
          <Link href="/help" prefetch={false}>
            Help
          </Link>
          <Link href="/account" prefetch={false}>
            Account
          </Link>
          <Link href="/login" className="nav-login">
            Log in <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer>
        <span>© {new Date().getFullYear()} SmartBord</span>
        <span>Made for learning. Built around privacy.</span>
        <span className="footer-dot">Your device. Your notes.</span>
      </footer>
    </>
  );
}
