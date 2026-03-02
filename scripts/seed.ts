import "dotenv/config";
import { createPrismaClient } from "../lib/prisma";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const prisma = createPrismaClient();
  await prisma.$connect();

  // Cities
  const cities = [
    { name: "São Paulo", state: "SP" },
    { name: "Rio de Janeiro", state: "RJ" },
    { name: "Belo Horizonte", state: "MG" },
  ];

  const createdCities: { id: string; name: string; state: string }[] = [];
  for (const c of cities) {
    let city = await prisma.city.findFirst({ where: { name: c.name, state: c.state } });
    if (!city) {
      city = await prisma.city.create({ data: c });
    }
    createdCities.push(city as any);
  }

  // Users
  const sampleUsers = [
    { name: "Alice Silva", email: "alice@example.com", phone: "+5511999000001" },
    { name: "Bruno Costa", email: "bruno@example.com", phone: "+5511999000002" },
    { name: "Carla Souza", email: "carla@example.com", phone: "+5511999000003" },
    { name: "Diego Lima", email: "diego@example.com", phone: "+5511999000004" },
    { name: "Eva Pereira", email: "eva@example.com", phone: "+5511999000005" },
  ];

  const createdUsers: { id: string; name: string; email?: string }[] = [];
  for (const u of sampleUsers) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await prisma.user.create({ data: u });
    }
    createdUsers.push(user as any);
  }

  // Clubs and courts
  const clubs: { id: string; name: string; cityId: string; ownerId: string }[] = [];
  for (const city of createdCities) {
    const owner = pick(createdUsers);
    const clubName = `${city.name} Sports Club`;
    let club = await prisma.club.findFirst({ where: { name: clubName, cityId: city.id } });
    if (!club) {
      club = await prisma.club.create({ data: { name: clubName, cityId: city.id, ownerId: owner.id } });
    }
    clubs.push(club as any);

    // create 2 courts per club
    for (let i = 1; i <= 2; i++) {
      const courtName = `Quadra ${i}`;
      const existing = await prisma.court.findFirst({ where: { clubId: club.id, name: courtName } });
      if (!existing) {
        await prisma.court.create({ data: { name: courtName, clubId: club.id } });
      }
    }
  }

  // Matches
  const sports = ["TENNIS", "PADEL"] as const;

  const createdMatches: any[] = [];
  for (let i = 0; i < 6; i++) {
    const city = pick(createdCities);
    const organizer = pick(createdUsers);
    const club = pick(clubs);
    const courts = await prisma.court.findMany({ where: { clubId: club.id } });
    const court = pick(courts);

    const dateTime = daysFromNow(randInt(1, 20));

    const match = await prisma.match.create({
      data: {
        sport: pick(sports) as any,
        dateTime,
        location: `${club.name} - ${court.name}`,
        maxPlayers: pick([4, 6, 8, 10]),
        organizerId: organizer.id,
        cityId: city.id,
        courtId: court.id,
      },
    });
    createdMatches.push(match);
  }

  // Participants and Payments
  for (const m of createdMatches) {
    // choose some participants (including organizer)
    const shuffled = createdUsers.slice().sort(() => Math.random() - 0.5);
    const num = Math.min(m.maxPlayers, randInt(2, createdUsers.length));
    const chosen = shuffled.slice(0, num);

    for (const u of chosen) {
      const exists = await prisma.matchParticipant.findFirst({ where: { matchId: m.id, userId: u.id } });
      if (!exists) {
        await prisma.matchParticipant.create({ data: { matchId: m.id, userId: u.id } });
      }

      // create a payment for some participants
      if (Math.random() < 0.6) {
        const hasPayment = await prisma.payment.findFirst({ where: { matchId: m.id, userId: u.id } });
        if (!hasPayment) {
          await prisma.payment.create({
            data: {
              matchId: m.id,
              userId: u.id,
              amount: (randInt(10, 50) + ".00") as any,
              status: Math.random() < 0.9 ? "PAID" : "PENDING",
              provider: "manual",
            },
          });
        }
      }
    }

    // update match status if full
    const participantsCount = await prisma.matchParticipant.count({ where: { matchId: m.id, status: "CONFIRMED" } });
    if (participantsCount >= m.maxPlayers) {
      await prisma.match.update({ where: { id: m.id }, data: { status: "FULL" } });
    }
  }

  // PlayerStats and Reputations (basic)
  for (const u of createdUsers) {
    for (const s of sports) {
      const existing = await prisma.playerStats.findFirst({ where: { userId: u.id, sport: s as any } });
      if (!existing) {
        await prisma.playerStats.create({ data: { userId: u.id, sport: s as any, matchesPlayed: randInt(0, 30), wins: randInt(0, 20), losses: randInt(0, 20) } });
      }
    }

    const rep = await prisma.userReputation.findFirst({ where: { userId: u.id } });
    if (!rep) {
      await prisma.userReputation.create({ data: { userId: u.id, noShows: randInt(0, 5), cancellations: randInt(0, 3) } });
    }
  }

  console.log("Seeding concluído.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
