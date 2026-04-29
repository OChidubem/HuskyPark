import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { login, logout, register } from "../lib/auth";
import type { User } from "../types";

type Role = User["role"];

interface AuthContextValue {
  userId: number | null;
  role: Role | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  register: typeof register;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredNumber(key: string) {
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<number | null>(() => readStoredNumber("huskypark_user_id"));
  const [role, setRole] = useState<Role | null>(
    () => (localStorage.getItem("huskypark_role") as Role | null) ?? null
  );

  const signIn = async (email: string, password: string) => {
    const data = await login(email, password);
    setUserId(data.user_id);
    setRole(data.role as Role);
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

  return (
    <AuthContext.Provider
      value={{
        userId,
        role,
        isAuthenticated: userId !== null,
        isAdmin: role === "admin",
        signIn,
        signOut,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
