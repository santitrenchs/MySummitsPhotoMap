import { prisma } from "@/lib/db/client";
import { getRarityId } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  ascentCount: number;
  uniquePeakCount: number; // distinct peaks climbed
  ep: number;              // elevation points (rarity-based, fallback 1/ascent)
  CS: number;          // total CS earned from badges
  levelIdx: number;        // 1–6, matches hero card logic (first unmet milestone)
  nextLevelTarget: number | null; // unique-peak target for current goal level (null = Zenith achieved)
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

export type MonthlyBar = {
  isoMonth: string;       // "YYYY-MM"
  summits: number;
  metersAscended: number;
  rarityBreakdown: Partial<Record<RarityId, number>>;
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
    peaks1500plus: number;
    peaks2000plus: number;
    peaks3000plus: number;
    peaks4000plus: number;
    peaks4500plus: number;
    peaks5000plus: number;
    peaks6000plus: number;
    peaks6500plus: number;
    peaks8000plus: number;
    rarityBreakdown: { daisy: number; heather: number; gentian: number; tundra: number; edelweiss: number; draba: number; saxifrage: number; cinquefoil: number; snow_lotus: number };
  };
  leaderboard: LeaderboardEntry[];
  userRank: number; // 1-based
  nextRankName: string | null;
  nextRankGap: number; // summits needed to beat next rank up
  recentAscents: RecentAscent[];
  friendsActivity: FriendActivity[];
  monthlyStats: MonthlyBar[];
  totalMetersAscended: number;
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

  // 3. My ascents (for charts + recent — stats come from user_stats)
  const [myAscents, totalPhotos] = await Promise.all([
    prisma.ascent.findMany({
      where: { createdBy: userId },
      orderBy: { date: "desc" },
      include: {
        peak: { select: { name: true, altitudeM: true, mountainRange: true } },
        photos: { take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
      },
    }),
    prisma.photo.count({ where: { ascent: { createdBy: userId } } }),
  ]);

  // 4. Derived stats from myAscents (still needed for web-only fields)
  const totalRegions = new Set(
    myAscents.map((a) => a.peak.mountainRange).filter(Boolean)
  ).size;

  const uniquePeakAltitudes = Array.from(
    new Map(myAscents.map((a) => [a.peakId, a.peak.altitudeM])).values()
  );
  const peaks1000plus = uniquePeakAltitudes.filter((m) => m >= 1000).length;
  const peaks1500plus = uniquePeakAltitudes.filter((m) => m >= 1500).length;
  const peaks2000plus = uniquePeakAltitudes.filter((m) => m >= 2000).length;
  const peaks3000plus = uniquePeakAltitudes.filter((m) => m >= 3000).length;
  const peaks4000plus = uniquePeakAltitudes.filter((m) => m >= 4000).length;
  const peaks4500plus = uniquePeakAltitudes.filter((m) => m >= 4500).length;
  const peaks5000plus = uniquePeakAltitudes.filter((m) => m >= 5000).length;
  const peaks6000plus = uniquePeakAltitudes.filter((m) => m >= 6000).length;
  const peaks6500plus = uniquePeakAltitudes.filter((m) => m >= 6500).length;
  const peaks8000plus = uniquePeakAltitudes.filter((m) => m >= 8000).length;

  function altToRarity(m: number): keyof typeof rarityBreakdown {
    if (m >= 8000) return "snow_lotus";
    if (m >= 7000) return "cinquefoil";
    if (m >= 6000) return "saxifrage";
    if (m >= 5000) return "draba";
    if (m >= 4000) return "edelweiss";
    if (m >= 3000) return "tundra";
    if (m >= 2000) return "gentian";
    if (m >= 1000) return "heather";
    return "daisy";
  }
  const rarityBreakdown = { daisy: 0, heather: 0, gentian: 0, tundra: 0, edelweiss: 0, draba: 0, saxifrage: 0, cinquefoil: 0, snow_lotus: 0 };
  const seenPeakIds = new Set<string>();
  for (const a of myAscents) {
    if (!seenPeakIds.has(a.peakId)) {
      seenPeakIds.add(a.peakId);
      rarityBreakdown[altToRarity(a.peak.altitudeM)]++;
    }
  }

  // 5. Leaderboard — reads pre-computed user_stats (replaces full ascent scan)
  const allUserIds = [userId, ...friendUserIds];
  const LEVEL_TARGETS: (number | null)[] = [20, 50, 100, 150, 220, 300, null];

  const [allUserStats, friendUsers] = await Promise.all([
    prisma.userStats.findMany({ where: { userId: { in: allUserIds } } }),
    prisma.user.findMany({
      where: { id: { in: friendUserIds } },
      select: { id: true, name: true, avatarUrl: true },
    }),
  ]);

  const statsMap    = new Map(allUserStats.map((s) => [s.userId, s]));
  const friendUserMap = new Map(friendUsers.map((u) => [u.id, u]));

  // Core stats — prefer user_stats, fall back to in-memory if row not yet created
  const myStats    = statsMap.get(userId);
  const totalAscents = myStats?.totalAscents ?? myAscents.length;
  const uniquePeaks  = myStats?.uniquePeaks  ?? seenPeakIds.size;
  const maxAltitude  = myStats?.maxAltitudeM ?? (uniquePeakAltitudes.length > 0 ? Math.max(...uniquePeakAltitudes) : 0);

  const leaderboard: LeaderboardEntry[] = allUserIds
    .map((uid) => {
      const s   = statsMap.get(uid);
      const lvl = s?.levelIdx ?? 0;
      const isMe = uid === userId;
      return {
        userId:         uid,
        name:           isMe ? (user?.name ?? "You") : (friendUserMap.get(uid)?.name ?? "?"),
        avatarUrl:      isMe ? (user?.avatarUrl ?? null) : (friendUserMap.get(uid)?.avatarUrl ?? null),
        ascentCount:    s?.totalAscents  ?? 0,
        uniquePeakCount: s?.uniquePeaks  ?? 0,
        ep:             s?.totalEp       ?? 0,
        CS:             s?.totalCairns   ?? 0,
        levelIdx:       lvl,
        nextLevelTarget: LEVEL_TARGETS[lvl] ?? null,
        isCurrentUser:  isMe,
      };
    })
    .sort((a, b) =>
      b.ascentCount - a.ascentCount ||
      b.CS - a.CS ||
      b.ep - a.ep
    );

  const userRank = leaderboard.findIndex((e) => e.isCurrentUser) + 1;

  const personAhead = userRank > 1 ? leaderboard[userRank - 2] : null;
  const nextRankName = personAhead?.name ?? null;
  const nextRankGap  = personAhead ? personAhead.ascentCount - totalAscents + 1 : 0;

  // 6. Monthly stats — last 6 months, derived from myAscents (no extra query)
  const totalMetersAscended = myAscents.reduce((sum, a) => sum + a.peak.altitudeM, 0);
  const now = new Date();
  const monthlyStats: MonthlyBar[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const isoMonth = `${y}-${String(m + 1).padStart(2, "0")}`;
    const bucket = myAscents.filter((a) => {
      const ad = new Date(a.date);
      return ad.getFullYear() === y && ad.getMonth() === m;
    });
    const rarityBreakdownMonth: Partial<Record<RarityId, number>> = {};
    for (const a of bucket) {
      const rid = getRarityId(a.peak.altitudeM);
      rarityBreakdownMonth[rid] = (rarityBreakdownMonth[rid] ?? 0) + 1;
    }
    monthlyStats.push({
      isoMonth,
      summits: bucket.length,
      metersAscended: bucket.reduce((s, a) => s + a.peak.altitudeM, 0),
      rarityBreakdown: rarityBreakdownMonth,
    });
  }

  // 7. Recent ascents (last 5)
  const recentAscents: RecentAscent[] = myAscents.slice(0, 5).map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    peakName: a.peak.name,
    altitudeM: a.peak.altitudeM,
    mountainRange: a.peak.mountainRange,
    photoUrl: a.photos[0]?.url ?? null,
  }));

  // 8. Friends activity (last 5 from friends)
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
    stats: { totalAscents, uniquePeaks, totalPhotos, totalRegions, friendsCount, maxAltitude, peaks1000plus, peaks1500plus, peaks2000plus, peaks3000plus, peaks4000plus, peaks4500plus, peaks5000plus, peaks6000plus, peaks6500plus, peaks8000plus, rarityBreakdown },
    leaderboard,
    userRank,
    nextRankName,
    nextRankGap,
    recentAscents,
    friendsActivity,
    monthlyStats,
    totalMetersAscended,
  };
}
