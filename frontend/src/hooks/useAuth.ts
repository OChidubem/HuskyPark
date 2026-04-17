import { useState } from "react";
import { login, logout, register } from "../lib/auth";

export function useAuth() {
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem("huskypark_user_id");
    return stored ? parseInt(stored, 10) : null;
  });

  const [role, setRole] = useState<string | null>(() =>
    localStorage.getItem("huskypark_role")
  );

  const signIn = async (email: string, password: string) => {
    const data = await login(email, password);
    setUserId(data.user_id);
    setRole(data.role);
    localStorage.setItem("huskypark_user_id", String(data.user_id));
    localStorage.setItem("huskypark_role", data.role);
  };

  const signOut = async () => {
    await logout();
    setUserId(null);
    setRole(null);
    localStorage.removeItem("huskypark_user_id");
    localStorage.removeItem("huskypark_role");
  };

  return {
    userId,
    role,
    isAuthenticated: userId !== null,
    isAdmin: role === "admin",
    signIn,
    signOut,
    register,
  };
}
