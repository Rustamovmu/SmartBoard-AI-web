import Link from "next/link";
import { Layout } from "@/components/Layout";

export default function Home() {
  return (
    <Layout title="A clearer space to learn">
      <section className="home-hero">
        <div className="home-copy">
          <span className="eyebrow">
            <span className="mini-dot" /> LEARNING, WITH A LITTLE MORE CLARITY
          </span>
          <h1>
            Good ideas
            <br />
            deserve a<br />
            <em>clear space.</em>
          </h1>
          <p>
            Your SmartBord account brings connected services together. Your
            lecture recordings and notes belong on your device.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="button primary">
              Create your account <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/login" className="text-link">
              I already have an account →
            </Link>
          </div>
          <p className="hero-caption">
            A simple start. Your privacy stays part of the picture.
          </p>
        </div>
        <div
          className="board-art"
          role="img"
          aria-label="An illustrated green board with the words Your device, your ideas, your space."
        >
          <div className="board-top">
            <span>THE SMARTBORD WAY</span>
            <span aria-hidden="true">✳</span>
          </div>
          <div className="board-writing">
            Your device.
            <br />
            Your ideas.
            <br />
            <span>Your space.</span>
          </div>
          <div className="board-line" />
          <div className="board-bottom">
            <span>KEEP WHAT MATTERS CLOSE.</span>
            <span aria-hidden="true">↗</span>
          </div>
          <div className="board-sticker">
            A clearer
            <br />
            kind of learning.
          </div>
        </div>
      </section>
      <section className="home-principles" aria-label="Our principles">
        <div>
          <span>01 / ACCOUNT</span>
          <h2>A place to begin.</h2>
          <p>Sign up, log in and manage your platform identity.</p>
        </div>
        <div>
          <span>02 / OWNERSHIP</span>
          <h2>Your learning stays yours.</h2>
          <p>Signing in does not sync or restore a phone’s private library.</p>
        </div>
        <div>
          <span>03 / WHAT’S NEXT</span>
          <h2>Built one step at a time.</h2>
          <p>
            Account access is here. Web capture, community and admin screens are
            coming later.
          </p>
        </div>
      </section>
    </Layout>
  );
}
