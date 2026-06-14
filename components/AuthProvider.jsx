"use client";

import { AuthProvider } from "../lib/AuthContext";

export default function AuthProviderWrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
