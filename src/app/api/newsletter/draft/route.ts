import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft, renderNewsletterBlocks } from "@/lib/newsletter";

// GET - the current in-progress draft, plus a live-rendered preview of
// what it would look like in the actual parent email if published right
// now (rendered fresh every request, since a draft is meant to always
// reflect current data - e.g. an "events" block shows whatever's upcoming
// today, not whatever was upcoming when the block was added).
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const draft = await getOrCreateDraft(classroomId);
  const preview = await renderNewsletterBlocks(draft.blocks, classroomId);

  return NextResponse.json({ newsletter: draft, preview });
}
