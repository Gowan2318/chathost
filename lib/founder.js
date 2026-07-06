export const FOUNDER_EMAIL = process.env.NEXT_PUBLIC_FOUNDER_EMAIL;

export function isFounder(email) {
  return (
    typeof email === "string" &&
    typeof FOUNDER_EMAIL === "string" &&
    FOUNDER_EMAIL.length > 0 &&
    email.toLowerCase() === FOUNDER_EMAIL.toLowerCase()
  );
}
