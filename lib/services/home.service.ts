import { prisma } from "@/lib/db/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  ascentCount: number;
  ep: number;              // elevation points (rarity-based, fallback 1/ascent)
  cairns: number;          // total cairns earned from badges
  levelIdx: number;        // 1–5 (current level working toward)
  nextLevelTarget: number | null; // EP needed for next level (null = max level)
  isCurrentUser: boolean;
};

export type RecentAscent = {
  id: string;
  date: string;
  peakName: string;
  altitudeM: number;
  mountainRange: string | null;
  photoUrl: string | null;
};

export type FriendActivity = {
  ascentId: string;
  userName: string;
  userAvatarUrl: string | null;
  peakName: string;
  altitudeM: number;
  date: string;
  photoUrl: string | null;
};

export type HomeData = {
  user: { name: string; username: string | null; avatarUrl: string | null };
  stats: {
    totalAscents: number;
    uniquePeaks: number;
    totalPhotos: number;
    totalRegions: number;
    friendsCount: number;
    maxAltitude: number;
    peaks1000plus: number;
    peaks2000plus: number;
    peaks3000plus: number;
    peaks4000plus: number;
    peaks5000plus: number;
  };
  leaderboard: LeaderboardEntry[];
  userRank: number; // 1-based
  nextRankName: string | null;
  nextRankGap: number; // summits needed to beat next rank up
  recentAscents: RecentAscent[];
  friendsActivity: FriendActivity[];
};

// ─── Service ──────────────────────────────────────────────────────────────────

export async function getHomeData(userId: string): Promise<HomeData> {
  // 1. User info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true, avatarUrl: true },
  });

  // 2. Friendships
  const friendships = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  const friendUserIds = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );
  const friendsCount = friendUserIds.length;

  // 3. My ascents (for stats + recent)
  const myAscents = await prisma.ascent.findMany({
    where: { createdBy: userId },
    orderBy: { date: "desc" },
    include: {
      peak: { select: { name: true, altitudeM: true, mountainRange: true } },
      photos: { take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
    },
  });

  // 4. Stats
  const totalAscents = myAscents.length;
  const uniquePeaks = new Set(myAscents.map((a) => a.peakId)).size;
  const totalRegions = new Set(
    myAscents.map((a) => a.peak.mountainRange).filter(Boolean)
  ).size;
  const totalPhotos = await prisma.photo.count({ where: { ascent: { createdBy: userId } } });

  // Altitude stats (derived from myAscents, no extra query needed)
  const maxAltitude = myAscents.length > 0 ? Math.max(...myAscents.map((a) => a.peak.altitudeM)) : 0;
  const peaks1000plus = myAscents.filter((a) => a.peak.altitudeM >= 1000).length;
  const peaks2000plus = myAscents.filter((a) => a.peak.altitudeM >= 2000).length;
  const peaks3000plus = myAscents.filter((a) => a.peak.altitudeM >= 3000).length;
  const peaks4000plus = myAscents.filter((a) => a.peak.altitudeM >= 4000).length;
  const peaks5000plus = myAscents.filter((a) => a.peak.altitudeM >= 5000).length;

  // 5. Leaderboard (me + friends)
  const allUserIds = [userId, ...friendUserIds];

  // Fetch ascents with peak data for all users (EP + altitude stats for cairns)
  const [lbAscents, friendUsers] = await Promise.all([
    prisma.ascent.findMany({
      where: { createdBy: { in: allUserIds } },
      select: {
        createdBy: true,
        peak: {
          select: {
            altitudeM: true,
            rarity: { select: { ep: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { id: { in: friendUserIds } },
      select: { id: true, name: true, avatarUrl: true },
    }),
  ]);

  // Aggregate per-user stats
  type LbUserStats = { count: number; ep: number; a1000: number; a2000: number; a3000: number; a4000: number };
  const lbMap = new Map<string, LbUserStats>(
    allUserIds.map((uid) => [uid, { count: 0, ep: 0, a1000: 0, a2000: 0, a3000: 0, a4000: 0 }])
  );
  for (const a of lbAscents) {
    const s = lbMap.get(a.createdBy);
    if (!s) continue;
    s.count++;
    s.ep += a.peak.rarity?.ep ?? 1;
    if (a.peak.altitudeM >= 1000) s.a1000++;
    if (a.peak.altitudeM >= 2000) s.a2000++;
    if (a.peak.altitudeM >= 3000) s.a3000++;
    if (a.peak.altitudeM >= 4000) s.a4000++;
  }

  function lbCairns(s: LbUserStats): number {
    let c = 0;
    if (s.count >= 1) c += 3;
    if (s.count >= 3) c += 5;
    if (s.a1000 >= 3) c += 8;
    if (s.a2000 >= 1) c += 12;
    if (s.a3000 >= 1) c += 20;
    if (s.a4000 >= 1) c += 35;
    return c;
  }

  // Level thresholds (EP targets per level idx 1-5)
  const LEVEL_EP = [5, 15, 40, 70, null] as const;
  function levelIdx(ep: number): number {
    if (ep >= 70) return 5;
    if (ep >= 40) return 4;
    if (ep >= 15) return 3;
    if (ep >= 5) return 2;
    return 1;
  }

  const friendUserMap = new Map(friendUsers.map((u) => [u.id, u]));

  const leaderboard: LeaderboardEntry[] = allUserIds
    .map((uid) => {
      const s = lbMap.get(uid) ?? { count: 0, ep: 0, a1000: 0, a2000: 0, a3000: 0, a4000: 0 };
      const lvl = levelIdx(s.ep);
      const isMe = uid === userId;
      return {
        userId: uid,
        name: isMe ? (user?.name ?? "You") : (friendUserMap.get(uid)?.name ?? "?"),
        avatarUrl: isMe ? (user?.avatarUrl ?? null) : (friendUserMap.get(uid)?.avatarUrl ?? null),
        ascentCount: s.count,
        ep: s.ep,
        cairns: lbCairns(s),
        levelIdx: lvl,
        nextLevelTarget: LEVEL_EP[lvl - 1] ?? null,
        isCurrentUser: isMe,
      };
    })
    .sort((a, b) => b.ep - a.ep);

  const userRank = leaderboard.findIndex((e) => e.isCurrentUser) + 1;

  // Next rank up
  const personAhead = userRank > 1 ? leaderboard[userRank - 2] : null;
  const myEp = lbMap.get(userId)?.ep ?? 0;
  const nextRankName = personAhead?.name ?? null;
  const nextRankGap = personAhead ? personAhead.ep - myEp + 1 : 0;

  // 6. Recent ascents (last 5)
  const recentAscents: RecentAscent[] = myAscents.slice(0, 5).map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    peakName: a.peak.name,
    altitudeM: a.peak.altitudeM,
    mountainRange: a.peak.mountainRange,
    photoUrl: a.photos[0]?.url ?? null,
  }));

  // 7. Friends activity (last 5 from friends)
  const friendsActivity: FriendActivity[] = [];
  if (friendUserIds.length > 0) {
    const activityRows = await prisma.ascent.findMany({
      where: { createdBy: { in: friendUserIds } },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        peak: { select: { name: true, altitudeM: true } },
        photos: { take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
        user: { select: { name: true, avatarUrl: true } },
      },
    });
    for (const r of activityRows) {
      friendsActivity.push({
        ascentId: r.id,
        userName: r.user.name,
        userAvatarUrl: r.user.avatarUrl,
        peakName: r.peak.name,
        altitudeM: r.peak.altitudeM,
        date: r.date.toISOString(),
        photoUrl: r.photos[0]?.url ?? null,
      });
    }
  }

  return {
    user: { name: user?.name ?? "", username: user?.username ?? null, avatarUrl: user?.avatarUrl ?? null },
    stats: { totalAscents, uniquePeaks, totalPhotos, totalRegions, friendsCount, maxAltitude, peaks1000plus, peaks2000plus, peaks3000plus, peaks4000plus, peaks5000plus },
    leaderboard,
    userRank,
    nextRankName,
    nextRankGap,
    recentAscents,
    friendsActivity,
  };
}
