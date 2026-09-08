import { BitacoraTabs } from "@/components/bitacora/BitacoraTabs";

/**
 * Without this, the challenge detail inherits `bitacora/loading.tsx` — the full-screen
 * rarity flower — which blanks the tab strip too, so opening a reto reads as leaving
 * Bitácora and coming back reads as re-entering it. Keeping the strip mounted and
 * greying only the content that is actually being fetched keeps the screen still.
 */
export default function ChallengeDetailLoading() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", background: "#F4F7FA", minHeight: "100%" }}>
      <BitacoraTabs active="challenges" />

      <div style={{ padding: "14px 16px 2px" }}>
        <Bone w={64} h={11} />
        <div style={{ marginTop: 8 }}><Bone w={190} h={20} /></div>
      </div>

      <div style={{ padding: "16px 16px 4px", display: "flex", justifyContent: "space-between" }}>
        <div><Bone w={52} h={9} /><div style={{ marginTop: 8 }}><Bone w={120} h={26} /></div></div>
        <div style={{ textAlign: "right" }}><Bone w={52} h={9} /><div style={{ marginTop: 8 }}><Bone w={70} h={18} /></div></div>
      </div>
      <div style={{ padding: "12px 16px 0" }}><Bone w="100%" h={6} /></div>

      <div style={{ padding: "16px 16px 0", display: "flex", gap: 8 }}>
        <Bone w="100%" h={44} r={12} />
        <Bone w={104} h={44} r={12} />
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[0, 1, 2, 3].map((i) => <Bone key={i} w="100%" h={100} r={16} />)}
      </div>
    </div>
  );
}

/** Placeholder block. Static, not shimmering: the detail resolves fast enough that a
 *  looping animation reads as more waiting than there actually is. */
function Bone({ w, h, r = 6 }: { w: number | string; h: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "rgba(13,37,56,0.06)",
    }} />
  );
}
