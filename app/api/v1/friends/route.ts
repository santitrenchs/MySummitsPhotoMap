import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getV1Session } from "@/lib/api-v1/auth";
import {
  listFriends,
  listIncomingRequests,
  listSentRequests,
  sendFriendRequest,
} from "@/lib/services/friendship.service";
import { prisma } from "@/lib/db/client";
import { notifyFriendRequest } from "@/lib/services/notify.service";

const SendSchema = z.object({ addresseeId: z.string().min(1) });

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [friends, incoming, sent] = await Promise.all([
    listFriends(session.userId),
    listIncomingRequests(session.userId),
    listSentRequests(session.userId),
  ]);

  return NextResponse.json({ friends, incoming, sent });
}

export async function POST(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = SendSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { addresseeId } = parsed.data;
  try {
    const friendship = await sendFriendRequest(session.userId, addresseeId);

    notifyFriendRequest(addresseeId, session.userId);

    return NextResponse.json({ friendship }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
