export const FOUNDER_EMAIL = "gowangareb4@gmail.com";

export function isFounder(email) {
  return typeof email === "string" && email.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
}
