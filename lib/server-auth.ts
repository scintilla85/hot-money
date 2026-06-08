import { cookies } from "next/headers";

export type AppRole = "director" | "contestant";

const COOKIE_NAME = "hot-money-role";

export async function getServerRole() {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return value === "director" || value === "contestant" ? value : null;
}

export async function setServerRole(role: AppRole) {
  (await cookies()).set(COOKIE_NAME, role, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearServerRole() {
  (await cookies()).delete(COOKIE_NAME);
}
