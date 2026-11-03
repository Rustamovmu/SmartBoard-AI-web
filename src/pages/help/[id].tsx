import Link from "next/link";
import { useRouter } from "next/router";
import type { GetServerSidePropsContext } from "next";
import { Layout } from "@/components/Layout";
import { HelpMarkdown } from "@/components/HelpMarkdown";
import { HelpEntryDocument, type HelpEntryQuery } from "@/graphql/generated";
import { publicHelpQuery, PublicHelpError } from "@/help/public";
import { helpDate } from "@/help/shared";
export async function getServerSideProps({
  params,
  res,
}: GetServerSidePropsContext) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  const id = params?.id;
  if (
    typeof id !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      id,
    )
  )
    return { notFound: true };
  try {
    return {
      props: {
        entry: (await publicHelpQuery(HelpEntryDocument, { id })).helpEntry,
        error: false,
      },
    };
  } catch (error) {
    if (error instanceof PublicHelpError && error.code === "NOT_FOUND")
      return { notFound: true };
    res.statusCode = 503;
    return { props: { entry: null, error: true } };
  }
}
export default function HelpDetail({
  entry,
  error,
}: {
  entry: HelpEntryQuery["helpEntry"] | null;
  error: boolean;
}) {
  const router = useRouter();
  return (
    <Layout title={entry?.title || "Help unavailable"}>
      <article className="help-shell">
        <Link
          className="text-link"
          href={entry ? `/help?kind=${entry.kind}` : "/help"}
          prefetch={false}
        >
          ← Back to Help
        </Link>
        {error || !entry ? (
          <div className="error" role="alert">
            This entry is temporarily unavailable.{" "}
            <button onClick={() => router.reload()}>Retry entry</button>
          </div>
        ) : (
          <>
            <span className="eyebrow">
              {entry.kind === "FAQ"
                ? "FREQUENTLY ASKED QUESTION"
                : "ANNOUNCEMENT"}
            </span>
            <h1>{entry.title}</h1>
            <p className="help-date">
              Published {helpDate(entry.publishedAt)} · Updated{" "}
              {helpDate(entry.updatedAt)}
            </p>
            <HelpMarkdown body={entry.bodyMarkdown} />
          </>
        )}
      </article>
    </Layout>
  );
}
