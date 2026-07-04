export const FOUNDER_EMAIL = "gowanareb46+vesta3@gmail.com";

export function isFounder(email) {
  return typeof email === "string" && email.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
}
