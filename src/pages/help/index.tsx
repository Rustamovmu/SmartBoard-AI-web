import Link from "next/link";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import type { GetServerSidePropsContext } from "next";
import { Layout } from "@/components/Layout";
import { HelpMarkdown } from "@/components/HelpMarkdown";
import {
  HelpEntriesDocument,
  HelpEntryDocument,
  type HelpEntriesQuery,
} from "@/graphql/generated";
import { publicHelpQuery } from "@/help/public";
import { helpDate, helpFilters, topicLabel, topics } from "@/help/shared";

type Result = HelpEntriesQuery["helpEntries"];
type Summary = Result["items"][number];
export async function getServerSideProps({
  query,
  res,
}: GetServerSidePropsContext) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  const input = helpFilters(query);
  try {
    const data = await publicHelpQuery(HelpEntriesDocument, { input });
    return { props: { input, result: data.helpEntries, error: false } };
  } catch {
    res.statusCode = 503;
    return { props: { input, result: null, error: true } };
  }
}
function Faq({ entry }: { entry: Summary }) {
  const [body, setBody] = useState<string | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const busy = useRef(false);
  async function load() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      setBody(
        (await publicHelpQuery(HelpEntryDocument, { id: entry.id })).helpEntry
          .bodyMarkdown,
      );
    } catch {
      setError(
        "This answer is unavailable or no longer published. Please retry or refresh Help.",
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  return (
    <details
      className="faq-entry"
      onToggle={(event) => {
        if (event.currentTarget.open && body === null && !busy.current)
          void load();
      }}
    >
      <summary>{entry.title}</summary>
      <div>
        {loading ? (
          <p role="status">Loading answer…</p>
        ) : error ? (
          <p role="alert">
            {error} <button onClick={() => void load()}>Retry answer</button>
          </p>
        ) : body !== null ? (
          <HelpMarkdown body={body} />
        ) : null}
        <Link className="text-link" href={`/help/${entry.id}`} prefetch={false}>
          Open answer page
        </Link>
      </div>
    </details>
  );
}
export default function Help({
  input,
  result,
  error,
}: {
  input: ReturnType<typeof helpFilters>;
  result: Result | null;
  error: boolean;
}) {
  const router = useRouter();
  const kind = input.kind;
  const href = (next: typeof input) => ({ pathname: "/help", query: next });
  return (
    <Layout title="Help and announcements">
      <section className="help-shell">
        <span className="eyebrow">SMARTBORD HELP CENTER</span>
        <h1>Answers and updates.</h1>
        <p>
          Help with your account and platform access. Private lecture files stay
          on your device.
        </p>
        <nav className="help-tabs" aria-label="Help sections">
          <Link
            href="/help?kind=FAQ"
            aria-current={kind === "FAQ" ? "page" : undefined}
            prefetch={false}
          >
            FAQs
          </Link>
          <Link
            href="/help?kind=ANNOUNCEMENT"
            aria-current={kind === "ANNOUNCEMENT" ? "page" : undefined}
            prefetch={false}
          >
            Announcements
          </Link>
        </nav>
        {kind === "FAQ" && (
          <label className="help-topic-filter">
            FAQ topic
            <select
              value={input.topic || ""}
              onChange={(e) =>
                void router.push(
                  href({
                    ...input,
                    page: 1,
                    topic: (e.target.value || undefined) as typeof input.topic,
                  }),
                )
              }
            >
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topicLabel(topic)}
                </option>
              ))}
            </select>
          </label>
        )}
        {error ? (
          <div className="error" role="alert">
            Help is temporarily unavailable.{" "}
            <button className="inline-button" onClick={() => router.reload()}>
              Retry Help
            </button>
          </div>
        ) : (
          result && (
            <>
              {!result.items.length ? (
                <p role="status">
                  {kind === "FAQ"
                    ? "No FAQs published yet for this selection."
                    : "No announcements published yet."}
                </p>
              ) : kind === "FAQ" ? (
                <div>
                  {result.items.map((entry) => (
                    <Faq key={entry.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <div className="announcement-list">
                  {result.items.map((entry) => (
                    <article key={entry.id}>
                      <time>{helpDate(entry.publishedAt)}</time>
                      <h2>
                        <Link href={`/help/${entry.id}`} prefetch={false}>
                          {entry.title}
                        </Link>
                      </h2>
                    </article>
                  ))}
                </div>
              )}
              <nav className="admin-pagination" aria-label="Help pagination">
                <span>
                  {result.total} published entries · Page {result.page}
                </span>
                <div>
                  {result.page > 1 && (
                    <Link
                      className="text-link"
                      href={href({ ...input, page: result.page - 1 })}
                      prefetch={false}
                    >
                      Previous
                    </Link>
                  )}
                  {result.page < 10000 &&
                    result.page * result.pageSize < result.total && (
                      <Link
                        className="text-link"
                        href={href({ ...input, page: result.page + 1 })}
                        prefetch={false}
                      >
                        Next
                      </Link>
                    )}
                </div>
              </nav>
            </>
          )
        )}
      </section>
    </Layout>
  );
}
