/**
 * Returns a URL that renders as a QR code image encoding the given data.
 * Uses a public QR-generation image service rather than adding a QR
 * library/dependency - consistent with how the newsletter's Image block
 * already just points at an external image URL. Works anywhere an <img>
 * tag or a PDF Image component can load a remote image.
 */
export function qrCodeImageUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

/**
 * Builds the full public chaperone-interest link for a given event.
 * IMPORTANT: only call this from server code (API routes) with an
 * explicit baseUrl - process.env.NEXTAUTH_URL isn't available in the
 * browser bundle, so this must never be called from a "use client"
 * component. Client components should receive the already-built link from
 * the API response instead (see /api/newsletter/draft).
 */
export function chaperoneInterestUrl(eventId: string, baseUrl: string): string {
  return `${baseUrl}/chaperone-interest/${eventId}`;
}
