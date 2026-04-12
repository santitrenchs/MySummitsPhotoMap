import { prisma } from "@/lib/db/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  ascentCount: number;
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

  // 5. Leaderboard (me + friends)
  const allUserIds = [userId, ...friendUserIds];

  const [countRows, friendUsers] = await Promise.all([
    prisma.ascent.groupBy({
      by: ["createdBy"],
      where: { createdBy: { in: allUserIds } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _count: { _all: true } as any,
    }),
    prisma.user.findMany({
      where: { id: { in: friendUserIds } },
      select: { id: true, name: true, avatarUrl: true },
    }),
  ]);

  const countMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (countRows as any[]).map((r) => [r.createdBy, r._count._all as number])
  );

  const friendUserMap = new Map(friendUsers.map((u) => [u.id, u]));

  const leaderboard: LeaderboardEntry[] = allUserIds
    .map((uid) => {
      if (uid === userId) {
        return {
          userId,
          name: user?.name ?? "You",
          avatarUrl: user?.avatarUrl ?? null,
          ascentCount: countMap.get(uid) ?? 0,
          isCurrentUser: true,
        };
      }
      const fu = friendUserMap.get(uid);
      return {
        userId: uid,
        name: fu?.name ?? "?",
        avatarUrl: fu?.avatarUrl ?? null,
        ascentCount: countMap.get(uid) ?? 0,
        isCurrentUser: false,
      };
    })
    .sort((a, b) => b.ascentCount - a.ascentCount);

  const userRank = leaderboard.findIndex((e) => e.isCurrentUser) + 1;

  // Next rank up
  const personAhead = userRank > 1 ? leaderboard[userRank - 2] : null;
  const nextRankName = personAhead?.name ?? null;
  const nextRankGap = personAhead
    ? personAhead.ascentCount - (countMap.get(userId) ?? 0) + 1
    : 0;

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
    stats: { totalAscents, uniquePeaks, totalPhotos, totalRegions, friendsCount },
    leaderboard,
    userRank,
    nextRankName,
    nextRankGap,
    recentAscents,
    friendsActivity,
  };
}
