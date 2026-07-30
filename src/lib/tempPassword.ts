// Generates a random, readable-enough temporary password for a
// Principal-provisioned Teacher account. Not meant to be memorized long
// term - mustChangePassword nudges the Teacher to pick their own after
// first login.
const CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/l/I to avoid confusion

export function generateTempPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}
