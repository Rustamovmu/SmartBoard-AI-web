import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CommunityCommentsDocument,
  type CommunityCommentsQuery,
} from "@/graphql/generated";
import { publicHelpQuery } from "@/help/public";
import { helpDate } from "@/help/shared";
import { HelpMarkdown } from "@/components/HelpMarkdown";
export function PublicComments({ postId }: { postId: string }) {
  const [page, setPage] = useState(1),
    [version, setVersion] = useState(0);
  const [data, setData] = useState<
    CommunityCommentsQuery["communityComments"] | null
  >(null);
  const [error, setError] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    setData(null);
    publicHelpQuery(CommunityCommentsDocument, {
      input: { postId, page, pageSize: 20 },
    })
      .then((result) => {
        if (!live) return;
        const last = Math.max(
          1,
          Math.ceil(result.communityComments.total / 20),
        );
        if (page > last) setPage(last);
        else setData(result.communityComments);
      })
      .catch(() => {
        if (live) setError(true);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [postId, page, version]);
  return (
    <section className="discussion-section" aria-label="Comments">
      <h2>Discussion</h2>
      <p>
        General community text only. Keep private lecture notes and recordings
        on your device.
      </p>
      <div className="discussion-actions">
        <Link
          href={`/account/comments?postId=${postId}&compose=1`}
          prefetch={false}
        >
          Write a comment
        </Link>
        <Link
          href={`/account/reports?targetType=POST&targetId=${postId}`}
          prefetch={false}
        >
          Report post
        </Link>
        <button disabled={loading} onClick={() => setVersion((v) => v + 1)}>
          Refresh comments
        </button>
      </div>
      {loading && <p role="status">Loading comments…</p>}
      {error && (
        <p className="error" role="alert">
          Comments are unavailable. The post may have been withdrawn.{" "}
          <button onClick={() => setVersion((v) => v + 1)}>
            Retry comments
          </button>
        </p>
      )}
      {data && (
        <>
          {!data.items.length && <p>No published comments yet.</p>}
          <div className="discussion-list">
            {data.items.map((comment) => (
              <article key={comment.id} data-comment-id={comment.id}>
                <h3>{comment.publicDisplayName}</h3>
                <p className="help-date">
                  Published {helpDate(comment.publishedAt)} · Updated{" "}
                  {helpDate(comment.updatedAt)}
                </p>
                <HelpMarkdown body={comment.bodyMarkdown} />
                <Link
                  href={`/account/reports?targetType=COMMENT&targetId=${comment.id}`}
                  prefetch={false}
                >
                  Report comment
                </Link>
              </article>
            ))}
          </div>
          <nav aria-label="Comment pages" className="discussion-actions">
            <button
              disabled={loading || page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous comments
            </button>
            <span>
              Page {page} · {data.total} comments
            </span>
            <button
              disabled={loading || page * 20 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next comments
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
