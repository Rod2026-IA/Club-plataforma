import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensurePushSubscription } from "@/lib/pushNotifications";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any | null;
  role: string | null;
  signUp: (email: string, password: string, metadata: Record<string, any>) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const authLoadSeq = useRef(0);

  const fetchProfile = async (userId: string, seq = authLoadSeq.current) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id, first_name, second_name, first_last_name, second_last_name, phone, birthday, email, avatar_url, banner_url, banner_position_y, banner_position_x, avatar_position_y, avatar_position_x, banner_scale, avatar_scale")
      .eq("user_id", userId)
      .single();
    if (seq !== authLoadSeq.current) return;
    setProfile(profileData);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    if (seq !== authLoadSeq.current) return;
    setRole(roleData?.role || null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const seq = authLoadSeq.current + 1;
        authLoadSeq.current = seq;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setLoading(true);
          setTimeout(() => {
            fetchProfile(session.user.id, seq)
              .catch(() => {
                if (seq === authLoadSeq.current) {
                  setProfile(null);
                  setRole(null);
                }
              })
              .finally(() => {
                if (seq === authLoadSeq.current) setLoading(false);
              });
          }, 0);
          setTimeout(() => { ensurePushSubscription(session.user.id).catch(() => {}); }, 1500);
          setTimeout(() => {
            supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("user_id", session.user.id).then(() => {});
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Heartbeat: actualiza last_seen_at cada 60s mientras el usuario tiene la app abierta
  useEffect(() => {
    if (!user) return;
    const ping = () => {
      supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("user_id", user.id).then(() => {});
    };
    ping();
    const interval = setInterval(ping, 60_000);
    const onVisibility = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", ping);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", ping);
    };
  }, [user?.id]);

  const signUp = async (email: string, password: string, metadata: Record<string, any>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, role, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
