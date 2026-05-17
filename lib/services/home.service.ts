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
  cairns: number;          // total cairns earned from badges
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

  // Altitude stats — unique peaks only (deduplicated by peakId)
  const maxAltitude = myAscents.length > 0 ? Math.max(...myAscents.map((a) => a.peak.altitudeM)) : 0;
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

  // Unique peaks by rarity tier (altitude-based thresholds)
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

  // 5. Leaderboard (me + friends)
  const allUserIds = [userId, ...friendUserIds];

  // Fetch ascents with peak data for all users (EP + altitude stats for cairns)
  const [lbAscents, friendUsers] = await Promise.all([
    prisma.ascent.findMany({
      where: { createdBy: { in: allUserIds } },
      select: {
        createdBy: true,
        peakId: true,
        peak: {
          select: {
            altitudeM: true,
            isMythic: true,
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

  // Aggregate per-user stats — altitude counts are unique peaks only
  type LbUserStats = {
    count: number; ep: number; mythic: number;
    seenPeaks: Set<string>;
    u2000: number; u3000: number; u4000: number;
    u5000: number; u6500: number; u8000: number;
  };
  const lbMap = new Map<string, LbUserStats>(
    allUserIds.map((uid) => [uid, {
      count: 0, ep: 0, mythic: 0,
      seenPeaks: new Set(),
      u2000: 0, u3000: 0, u4000: 0, u5000: 0, u6500: 0, u8000: 0,
    }])
  );
  for (const a of lbAscents) {
    const s = lbMap.get(a.createdBy);
    if (!s) continue;
    s.count++;
    s.ep += a.peak.rarity?.ep ?? 1;
    if (a.peak.isMythic) s.mythic++;
    if (!s.seenPeaks.has(a.peakId)) {
      s.seenPeaks.add(a.peakId);
      const m = a.peak.altitudeM;
      if (m >= 2000) s.u2000++;
      if (m >= 3000) s.u3000++;
      if (m >= 4000) s.u4000++;
      if (m >= 5000) s.u5000++;
      if (m >= 6500) s.u6500++;
      if (m >= 8000) s.u8000++;
    }
  }

  function lbCairns(s: LbUserStats): number {
    return s.mythic; // +1 cairn per mythic peak ascent
  }

  // Level index based on unique peaks + altitude requirements (mirrors LEVEL_DEFS)
  function computeLevelIdx(s: LbUserStats): number {
    const u = s.seenPeaks.size;
    if (u >= 300 && s.u8000 >= 1) return 6;
    if (u >= 220 && s.u6500 >= 1) return 5;
    if (u >= 150 && s.u5000 >= 1) return 4;
    if (u >= 100 && s.u4000 >= 1) return 3;
    if (u >= 50  && s.u3000 >= 1) return 2;
    if (u >= 20  && s.u2000 >= 1) return 1;
    return 1; // pre-level 1 shows as level 1 badge
  }

  const friendUserMap = new Map(friendUsers.map((u) => [u.id, u]));
  // Unique-peak targets per level index (index = levelIdx - 1); null = Zenith achieved
  const LEVEL_TARGETS: (number | null)[] = [20, 50, 100, 150, 220, 300, null];

  const leaderboard: LeaderboardEntry[] = allUserIds
    .map((uid) => {
      const s = lbMap.get(uid) ?? {
        count: 0, ep: 0, mythic: 0,
        seenPeaks: new Set<string>(),
        u2000: 0, u3000: 0, u4000: 0, u5000: 0, u6500: 0, u8000: 0,
      };
      const lvl = computeLevelIdx(s);
      const isMe = uid === userId;
      return {
        userId: uid,
        name: isMe ? (user?.name ?? "You") : (friendUserMap.get(uid)?.name ?? "?"),
        avatarUrl: isMe ? (user?.avatarUrl ?? null) : (friendUserMap.get(uid)?.avatarUrl ?? null),
        ascentCount: s.count,
        uniquePeakCount: s.seenPeaks.size,
        ep: s.ep,
        cairns: lbCairns(s),
        levelIdx: lvl,
        nextLevelTarget: LEVEL_TARGETS[lvl] ?? null,
        isCurrentUser: isMe,
      };
    })
    .sort((a, b) =>
      b.ascentCount - a.ascentCount ||
      b.cairns - a.cairns ||
      b.ep - a.ep
    );

  const userRank = leaderboard.findIndex((e) => e.isCurrentUser) + 1;

  // Next rank up
  const personAhead = userRank > 1 ? leaderboard[userRank - 2] : null;
  const myAscents2 = lbMap.get(userId)?.count ?? 0;
  const nextRankName = personAhead?.name ?? null;
  const nextRankGap = personAhead ? personAhead.ascentCount - myAscents2 + 1 : 0;

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
