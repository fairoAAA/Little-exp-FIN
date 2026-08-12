import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type AdminRole = "admin" | "moderator";

export interface AdminUser {
  username: string;
  // OGOHLANTIRISH: bu parol butunlay frontendda (brauzer JS ichida) saqlanadi
  // va tekshiriladi - bu HAQIQIY xavfsizlik emas, chunki har kim brauzer
  // konsolidan buni ko'rishi mumkin. Bu faqat kichik jamoa ichida kontentni
  // tayyorlash/staging uchun oddiy kirish nazorati. Haqiqiy maxfiy
  // ma'lumotlarni himoya qilish uchun serverga asoslangan autentifikatsiya
  // (masalan Supabase Auth) kerak bo'ladi.
  password: string;
  role: AdminRole;
  displayName: string;
}

export interface AdminSession {
  username: string;
  role: AdminRole;
  displayName: string;
}

const USERS_KEY = "ecokids:admin:users";
const SESSION_KEY = "ecokids:admin:session";

function seedUsers(): AdminUser[] {
  return [
    { username: "admin", password: "admin123", role: "admin", displayName: "Bosh admin" },
  ];
}

function loadUsers(): AdminUser[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdminUser[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* fallback pastda */
  }
  const seeded = seedUsers();
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
  } catch {
    /* no-op */
  }
  return seeded;
}

function loadSession(): AdminSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

interface AdminAuthContextType {
  session: AdminSession | null;
  users: AdminUser[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: AdminUser) => { ok: boolean; error?: string };
  removeUser: (username: string) => void;
  isAdmin: boolean;
  isModerator: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<AdminUser[]>(() => (typeof window === "undefined" ? [] : loadUsers()));
  const [session, setSession] = useState<AdminSession | null>(() => (typeof window === "undefined" ? null : loadSession()));

  const persistUsers = useCallback((next: AdminUser[]) => {
    setUsers(next);
    try {
      window.localStorage.setItem(USERS_KEY, JSON.stringify(next));
    } catch {
      /* no-op */
    }
  }, []);

  const login = useCallback(
    (username: string, password: string) => {
      const found = users.find((u) => u.username === username && u.password === password);
      if (!found) return false;
      const newSession: AdminSession = { username: found.username, role: found.role, displayName: found.displayName };
      setSession(newSession);
      try {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      } catch {
        /* no-op */
      }
      return true;
    },
    [users]
  );

  const logout = useCallback(() => {
    setSession(null);
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* no-op */
    }
  }, []);

  const addUser = useCallback(
    (user: AdminUser) => {
      if (users.some((u) => u.username === user.username)) {
        return { ok: false, error: "Bu foydalanuvchi nomi band" };
      }
      persistUsers([...users, user]);
      return { ok: true };
    },
    [users, persistUsers]
  );

  const removeUser = useCallback(
    (username: string) => {
      persistUsers(users.filter((u) => u.username !== username));
    },
    [users, persistUsers]
  );

  const value: AdminAuthContextType = {
    session,
    users,
    login,
    logout,
    addUser,
    removeUser,
    isAdmin: session?.role === "admin",
    isModerator: session?.role === "moderator" || session?.role === "admin",
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth AdminAuthProvider ichida ishlatilishi kerak");
  return ctx;
};
