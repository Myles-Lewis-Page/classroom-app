import { prisma } from "@/lib/prisma";

export type ChaperoneShortfall = {
  id: string;
  name: string;
  date: Date;
  needed: number;
  confirmed: number;
};

/**
 * Every upcoming event in this classroom that still needs more confirmed
 * chaperones than it currently has. Single source of truth for this
 * calculation - used by the Weekly Report's shortfall banner and the
 * newsletter's "chaperones needed" block, so the two can never disagree
 * about which events are actually short.
 */
export async function getChaperoneShortfalls(
  classroomId: string,
  fromDate: Date = new Date()
): Promise<ChaperoneShortfall[]> {
  const events = await prisma.event.findMany({
    where: { classroomId, date: { gte: fromDate }, chaperonesNeeded: { not: null } },
    include: { chaperones: true },
  });

  return events
    .map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      needed: e.chaperonesNeeded as number,
      confirmed: e.chaperones.filter((c) => c.confirmed).length,
    }))
    .filter((e) => e.confirmed < e.needed);
}
