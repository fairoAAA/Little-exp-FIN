import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

export type AdminRole = "admin" | "moderator";

export interface AdminSession {
  id: string;
  email: string;
  role: AdminRole;
  displayName: string;
}

export interface StaffUser {
  id: string;
  email: string;
  role: AdminRole;
  displayName: string;
}

interface AdminAuthContextType {
  session: AdminSession | null;
  loading: boolean;
  users: StaffUser[];
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  inviteUser: (
    email: string,
    displayName: string,
    role: AdminRole
  ) => Promise<{ ok: boolean; error?: string }>;
  removeUser: (id: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
  isAdmin: boolean;
  isModerator: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

async function loadProfile(userId: string, email: string): Promise<AdminSession | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    email,
    role: data.role as AdminRole,
    displayName: data.display_name || email,
  };
}

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<StaffUser[]>([]);

  const hydrateFromAuthSession = useCallback(async (authSession: Session | null) => {
    if (!authSession?.user) {
      setSession(null);
      setLoading(false);
      return;
    }
    const profile = await loadProfile(authSession.user.id, authSession.user.email ?? "");
    setSession(profile);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => hydrateFromAuthSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, authSession) => {
      hydrateFromAuthSession(authSession);
    });

    return () => listener.subscription.unsubscribe();
  }, [hydrateFromAuthSession]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const refreshUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role")
      .order("display_name");
    if (error || !data) return;
    setUsers(
      data.map((row) => ({
        id: row.id,
        email: "",
        role: row.role as AdminRole,
        displayName: row.display_name,
      }))
    );
  }, []);

  // Yangi xodim qo'shish real loyihada Supabase Admin API (service role,
  // faqat serverda/Edge Function ichida) yoki Supabase Dashboard orqali
  // amalga oshiriladi — anon kalit bilan boshqa foydalanuvchi yarata olmaymiz.
  // Shu sababli bu funksiya foydalanuvchini taklif qilish uchun ko'rsatma qaytaradi.
  const inviteUser = useCallback(async (email: string, _displayName: string, _role: AdminRole) => {
    return {
      ok: false,
      error:
        `Yangi xodim qo'shish uchun Supabase Dashboard > Authentication > Users bo'limidan ` +
        `"${email}" manzilini taklif qiling, so'ng profiles jadvalida uning rolini belgilang. ` +
        `(Xavfsizlik sababli bu amal frontenddan bajarilmaydi.)`,
    };
  }, []);

  const removeUser = useCallback(async (id: string) => {
    await supabase.from("profiles").delete().eq("id", id);
    await refreshUsers();
  }, [refreshUsers]);

  const value: AdminAuthContextType = {
    session,
    loading,
    users,
    login,
    logout,
    inviteUser,
    removeUser,
    refreshUsers,
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
