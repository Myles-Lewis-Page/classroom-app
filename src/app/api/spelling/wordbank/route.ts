import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getWordBank } from "@/lib/spelling";

// GET ?sectionId=xxx - every word ever tested, aggregated class-wide by
// default, or scoped to one Period/Section when sectionId is provided
// ("period mode"). Sorted worst-known-first so she can quickly find words
// worth reusing in a future week.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json([]);

  const sectionId = req.nextUrl.searchParams.get("sectionId") || undefined;
  const bank = await getWordBank(classroomId, sectionId);
  return NextResponse.json(bank);
}
