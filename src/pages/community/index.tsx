import Link from "next/link";
import { useRouter } from "next/router";
import type { GetServerSidePropsContext } from "next";
import { Layout } from "@/components/Layout";
import {
  CommunityPostsDocument,
  type CommunityPostsQuery,
} from "@/graphql/generated";
import { publicHelpQuery as publicQuery } from "@/help/public";
import { communityFilters } from "@/community/shared";
import { helpDate } from "@/help/shared";
export async function getServerSideProps({
  query,
  res,
}: GetServerSidePropsContext) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  const { page, pageSize } = communityFilters(query);
  const input = { page, pageSize };
  try {
    return {
      props: {
        input,
        result: (await publicQuery(CommunityPostsDocument, { input }))
          .communityPosts,
        error: false,
      },
    };
  } catch {
    res.statusCode = 503;
    return { props: { input, result: null, error: true } };
  }
}
export default function Community({
  input,
  result,
  error,
}: {
  input: { page: number; pageSize: number };
  result: CommunityPostsQuery["communityPosts"] | null;
  error: boolean;
}) {
  const router = useRouter();
  const href = (page: number) => ({
    pathname: "/community",
    query: { ...input, page },
  });
  return (
    <Layout title="Community">
      <section className="help-shell">
        <span className="eyebrow">SMARTBORD COMMUNITY</span>
        <h1>Ideas worth sharing.</h1>
        <p style={{ overflowWrap: "anywhere" }}>
          General text deliberately published by members. Private recordings,
          images and transcripts stay on your device.
        </p>
        <Link className="text-link" href="/account/posts" prefetch={false}>
          Write and manage your posts
        </Link>
        {error ? (
          <div className="error" role="alert">
            Community is temporarily unavailable.{" "}
            <button onClick={() => router.reload()}>Retry community</button>
          </div>
        ) : (
          result && (
            <>
              {!result.items.length ? (
                <p role="status">No community posts published yet.</p>
              ) : (
                <div className="announcement-list">
                  {result.items.map((post) => (
                    <article key={post.id}>
                      <h2>
                        <Link href={`/community/${post.id}`} prefetch={false}>
                          {post.title}
                        </Link>
                      </h2>
                      <p style={{ overflowWrap: "anywhere" }}>
                        By {post.publicDisplayName} ·{" "}
                        <time>{helpDate(post.publishedAt)}</time>
                      </p>
                    </article>
                  ))}
                </div>
              )}
              <nav
                className="admin-pagination"
                aria-label="Community pagination"
              >
                <span>
                  {result.total} published posts · Page {result.page}
                </span>
                <div>
                  {result.page > 1 && (
                    <Link href={href(result.page - 1)} prefetch={false}>
                      Previous
                    </Link>
                  )}
                  {result.page < 10000 &&
                    result.page * result.pageSize < result.total && (
                      <Link href={href(result.page + 1)} prefetch={false}>
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
