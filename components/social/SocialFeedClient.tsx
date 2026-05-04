"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { AscentCard } from "@/components/cards/AscentCard";
import type { FeedItem } from "@/lib/services/feed.service";

type FeedResponse = {
  unseen: FeedItem[];
  seen: FeedItem[];
  seenCursor: string | null;
};

// ─── SeenObserver ─────────────────────────────────────────────────────────────

function SeenObserver({
  ascentId,
  onSeen,
  children,
}: {
  ascentId: string;
  onSeen: (id: string) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSeenRef = useRef(onSeen);
  onSeenRef.current = onSeen;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timerRef.current = setTimeout(() => onSeenRef.current(ascentId), 1000);
        } else {
          if (timerRef.current) clearTimeout(timerRef.current);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ascentId]);

  return <div ref={ref}>{children}</div>;
}

// ─── LoadMoreSentinel ──────────────────────────────────────────────────────────

function LoadMoreSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisibleRef.current(); },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} style={{ height: 1 }} />;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      background: "#f3f4f6", animation: "azi-pulse 1.5s ease-in-out infinite",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e5e7eb" }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 11, width: "40%", borderRadius: 6, background: "#e5e7eb", marginBottom: 5 }} />
          <div style={{ height: 9, width: "25%", borderRadius: 6, background: "#e5e7eb" }} />
        </div>
      </div>
      <div style={{ aspectRatio: "4/5", background: "#e5e7eb" }} />
      <div style={{ padding: "12px 14px" }}>
        <div style={{ height: 10, width: "60%", borderRadius: 6, background: "#e5e7eb" }} />
      </div>
    </div>
  );
}

// ─── SocialFeedClient ─────────────────────────────────────────────────────────

export function SocialFeedClient() {
  const t = useT();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [seenCursor, setSeenCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Tracks which IDs have been sent to the seen API in this session
  const markedSeenRef = useRef(new Set<string>());
  const pendingSeenRef = useRef<string[]>([]);
  const seenFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch initial feed on mount
  useEffect(() => {
    fetch("/api/feed")
      .then((r) => r.json())
      .then((data: FeedResponse) => {
        setItems([...data.unseen, ...data.seen]);
        setSeenCursor(data.seenCursor);
        setHasMore(data.seenCursor !== null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Flush pending seen IDs to API (batched every 500 ms)
  const flushSeen = useCallback(() => {
    const ids = [...pendingSeenRef.current];
    pendingSeenRef.current = [];
    if (!ids.length) return;
    fetch("/api/feed/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ascentIds: ids }),
    }).catch(() => {/* fire and forget */});
  }, []);

  // Called by SeenObserver after 1 s of 50% visibility
  const markSeen = useCallback(
    (ascentId: string) => {
      if (markedSeenRef.current.has(ascentId)) return;
      markedSeenRef.current.add(ascentId);
      pendingSeenRef.current.push(ascentId);

      if (seenFlushTimerRef.current) clearTimeout(seenFlushTimerRef.current);
      seenFlushTimerRef.current = setTimeout(flushSeen, 500);
    },
    [flushSeen]
  );

  // Flush on unmount so we don't lose any pending seen events
  useEffect(() => () => flushSeen(), [flushSeen]);

  // Load next page of seen items
  const loadMore = useCallback(() => {
    if (!seenCursor || loadingMore) return;
    setLoadingMore(true);
    fetch(`/api/feed?cursor=${seenCursor}`)
      .then((r) => r.json())
      .then((data: FeedResponse) => {
        setItems((prev) => [...prev, ...data.seen]);
        setSeenCursor(data.seenCursor);
        setHasMore(data.seenCursor !== null);
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  }, [seenCursor, loadingMore]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes azi-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 12px 32px" }}>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "80px 24px", gap: 12, textAlign: "center",
          }}>
            <span style={{ fontSize: 48 }}>🏔️</span>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>
              {t.social_feedEmpty}
            </p>
            <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
              {t.social_feedEmptySub}
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {items.map((item, i) => (
              <SeenObserver key={item.id} ascentId={item.id} onSeen={markSeen}>
                <AscentCard
                  variant="social"
                  locale={t.dateLocale}
                  animationIndex={i}
                  ascent={{
                    id: item.id,
                    date: item.date,
                    route: item.route,
                    description: item.description,
                    peak: {
                      id: item.peak.id,
                      name: item.peak.name,
                      altitudeM: item.peak.altitudeM,
                      mountainRange: item.peak.mountainRange,
                      latitude: item.peak.latitude,
                      longitude: item.peak.longitude,
                      isMythic: item.peak.isMythic,
                    },
                    photoUrl: item.photoUrl,
                    photoId: item.photoId,
                    persons: item.persons,
                    user: item.user,
                  }}
                />
              </SeenObserver>
            ))}

            {loadingMore && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <SkeletonCard />
              </div>
            )}

            {hasMore && !loadingMore && (
              <LoadMoreSentinel onVisible={loadMore} />
            )}
          </div>
        )}
      </div>
    </>
  );
}
