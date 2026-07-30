import { NextResponse } from "next/server";

// Disabled for Teachers - holidays/teacher work days/half days are now
// managed by the Principal for the whole school. Kept as a route (rather
// than deleted) so it fails clearly instead of 404ing if anything still
// calls it.
export async function POST() {
  return NextResponse.json(
    { error: "Your principal manages the school calendar now - ask them to import this." },
    { status: 403 }
  );
}
