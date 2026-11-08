import { PublicComments } from "@/discussion/PublicComments";
import Link from "next/link";
import { useRouter } from "next/router";
import type { GetServerSidePropsContext } from "next";
import { Layout } from "@/components/Layout";
import { HelpMarkdown } from "@/components/HelpMarkdown";
import {
  CommunityPostDocument,
  type CommunityPostQuery,
} from "@/graphql/generated";
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
        entry: (await publicHelpQuery(CommunityPostDocument, { id }))
          .communityPost,
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
export default function CommunityDetail({
  entry,
  error,
}: {
  entry: CommunityPostQuery["communityPost"] | null;
  error: boolean;
}) {
  const router = useRouter();
  return (
    <Layout title={entry?.title || "Community unavailable"}>
      <article className="help-shell">
        <Link className="text-link" href="/community" prefetch={false}>
          ← Back to Community
        </Link>
        {error || !entry ? (
          <div className="error" role="alert">
            This entry is temporarily unavailable.{" "}
            <button onClick={() => router.reload()}>Retry entry</button>
          </div>
        ) : (
          <>
            <span className="eyebrow">COMMUNITY POST</span>
            <h1>{entry.title}</h1>
            <p className="help-date" style={{ overflowWrap: "anywhere" }}>
              By {entry.publicDisplayName} · Published{" "}
              {helpDate(entry.publishedAt)} · Updated{" "}
              {helpDate(entry.updatedAt)}
            </p>
            <HelpMarkdown body={entry.bodyMarkdown} />
            <PublicComments key={entry.id} postId={entry.id} />
          </>
        )}
      </article>
    </Layout>
  );
}
