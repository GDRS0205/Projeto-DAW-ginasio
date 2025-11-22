// src/api/auth.ts
import { http } from "./http";

export async function login(email: string, password: string): Promise<{ token: string; email: string }> {
  const { data } = await http.post("/auth/login", {
    email: email.trim().toLowerCase(),
    password
  });
  return data;
}

export async function register(email: string, password: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  const { data } = await http.post("/auth/register", {
    email: email.trim().toLowerCase(),
    password
  });
  return data;
}
