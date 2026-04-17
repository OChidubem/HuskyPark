import api from "./api";
import type { User } from "../types";

export async function login(email: string, password: string): Promise<{ user_id: number; role: string }> {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function register(payload: {
  full_name: string;
  email: string;
  password: string;
  role?: string;
}): Promise<User> {
  const { data } = await api.post("/auth/register", payload);
  return data;
}
