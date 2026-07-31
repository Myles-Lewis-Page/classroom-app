// Shared password strength check for every endpoint that sets a
// user-chosen password (Teacher/Principal/Admin self-serve password
// changes, the forgot-password reset flow). Deliberately NOT applied to
// generateTempPassword() output (tempPassword.ts) - those are
// system-generated, high-entropy, and the account is forced to change them
// on first login anyway.
//
// Keep this simple and centralized rather than duplicating a length check
// (and, if it ever grows, complexity rules) inline in six different route
// files - that duplication is exactly how one of them ends up with a
// weaker rule than the others by accident.

export const MIN_PASSWORD_LENGTH = 12;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  // Basic variety check - not full complexity rules (which tend to push
  // people toward predictable substitutions like "Password1!"), just a
  // guard against single-character-class passwords like "aaaaaaaaaaaa" or
  // "111111111111" that satisfy a pure length rule.
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNonLetter = /[^a-zA-Z]/.test(password);
  if (!hasLetter || !hasNonLetter) {
    return "Password must include both letters and at least one number or symbol.";
  }
  return null;
}
