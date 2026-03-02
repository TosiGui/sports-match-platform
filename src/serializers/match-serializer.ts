import { ParticipantStatus } from "../../generated/prisma/client";

type PrismaMatchWithRelations = {
  id: string;
  sport: string;
  dateTime: Date;
  location: string;
  maxPlayers: number;
  status: string;
  isPrivate: boolean;
  shareCode: string | null;
  organizerId: string;
  cityId: string;
  courtId: string | null;
  createdAt: Date;
  organizer: {
    id: string;
    name: string;
    avatar: string | null;
  };
  city: {
    id: string;
    name: string;
    state: string;
  };
  court: {
    id: string;
    name: string;
    club: {
      id: string;
      name: string;
    };
  } | null;
  participants: Array<{
    id: string;
    matchId: string;
    userId: string;
    status: string;
    joinedAt: Date;
    user: {
      id: string;
      name: string;
      avatar: string | null;
    };
  }>;
};

export type SerializedMatch = {
  id: string;
  sport: string;
  club: string;
  court: string;
  city: string;
  date: string;
  time: string;
  totalSlots: number;
  filledSlots: number;
  isPrivate: boolean;
  status: string;
  organizerId: string;
  organizerName: string;
  participants: Array<{
    userId: string;
    name: string;
    avatar?: string;
  }>;
  requests: Array<{
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    status: string;
    createdAt: string;
  }>;
  shareCode?: string;
};

export function serializeMatch(match: PrismaMatchWithRelations): SerializedMatch {
  const dateTime = new Date(match.dateTime);
  const date = dateTime.toISOString().slice(0, 10);
  const time = dateTime.toISOString().slice(11, 16);

  const confirmed = match.participants.filter(
    (p) => p.status === ParticipantStatus.CONFIRMED
  );
  const waiting = match.participants.filter(
    (p) => p.status === ParticipantStatus.WAITING
  );

  const statusMap: Record<string, string> = {
    OPEN: "open",
    FULL: "full",
    CANCELED: "closed",
    FINISHED: "closed",
  };

  return {
    id: match.id,
    sport: match.sport.toLowerCase(),
    club: match.court?.club?.name ?? match.location,
    court: match.court?.name ?? "",
    city: match.city.name,
    date,
    time,
    totalSlots: match.maxPlayers,
    filledSlots: confirmed.length,
    isPrivate: match.isPrivate,
    status: statusMap[match.status] ?? "open",
    organizerId: match.organizerId,
    organizerName: match.organizer.name,
    participants: confirmed.map((p) => ({
      userId: p.user.id,
      name: p.user.name,
      ...(p.user.avatar ? { avatar: p.user.avatar } : {}),
    })),
    requests: waiting.map((p) => ({
      id: p.id,
      userId: p.user.id,
      userName: p.user.name,
      ...(p.user.avatar ? { userAvatar: p.user.avatar } : {}),
      status: "pending",
      createdAt: p.joinedAt.toISOString(),
    })),
    ...(match.shareCode ? { shareCode: match.shareCode } : {}),
  };
}

export function serializeMatches(matches: PrismaMatchWithRelations[]): SerializedMatch[] {
  return matches.map(serializeMatch);
}
