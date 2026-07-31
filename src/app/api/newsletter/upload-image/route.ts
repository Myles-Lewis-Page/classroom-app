import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

// POST multipart/form-data { file } - accepts an uploaded image, resizes
// and compresses it, and returns a data: URI to store directly in a
// newsletter Image block's content.url. There's no cloud/object storage
// wired into this app, and Railway's own filesystem doesn't persist
// across redeploys anyway - storing a compact data URI straight in
// Postgres (via the block's JSON content) avoids needing either, at the
// cost of images needing to stay small. Resizing to a max width and
// re-encoding as JPEG keeps that cost reasonable even for a large photo
// straight off a phone.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB - generous headroom before compression
const MAX_WIDTH = 900;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 8MB)" }, { status: 400 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer)
      .rotate() // respect EXIF orientation (common with phone photos) before stripping it
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid image file." }, { status: 400 });
  }

  const dataUri = `data:image/jpeg;base64,${outputBuffer.toString("base64")}`;
  return NextResponse.json({ url: dataUri, sizeBytes: outputBuffer.length });
}
