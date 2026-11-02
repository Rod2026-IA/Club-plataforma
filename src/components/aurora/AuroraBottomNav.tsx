import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, Settings, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const HIDDEN_ROUTES = ["/", "/register", "/recuperar-pin", "/login"];

export default function AuroraBottomNav() {
  const { pathname, search } = useLocation();
  const [hidden, setHidden] = useState(false);
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (Math.abs(dy) > 6) {
          setHidden(dy > 0 && y > 40);
          lastY = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Conteo de notificaciones (mensajes de racha sin leer)
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: streaks } = await supabase.rpc("get_my_streaks");
      const partnerIds = ((streaks || []) as Array<{ other_user_id: string }>).map((s) => s.other_user_id);
      if (partnerIds.length === 0) { setUnread(0); return; }
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false)
        .in("sender_id", partnerIds);
      setUnread(count || 0);
    };
    load();
    const channel = supabase
      .channel(`bn-msgs-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  if (HIDDEN_ROUTES.includes(pathname) || pathname.startsWith("/scan/")) return null;
  // Ocultar en vista de chat de Racha (deja libre el input)
  if (pathname.startsWith("/racha") && new URLSearchParams(search).get("partner")) return null;

  const items = [
    { id: "settings", to: "/configuracion", Icon: Settings, label: "Ajustes",
      routes: ["/configuracion"], badge: 0, center: false },
    { id: "home", to: "/dashboard", Icon: Home, label: "Inicio",
      routes: ["/dashboard"], badge: 0, center: true },
    { id: "notif", to: "/racha", Icon: Bell, label: "Notificaciones",
      routes: ["/racha"], badge: unread, center: false },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-3 left-3 right-3 z-50"
      style={{
        height: 62,
        background: "var(--aurora-nav-bg)",
        borderRadius: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 14px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.08)",
        transform: hidden ? "translateY(140%)" : "translateY(0)",
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
        transition: "transform 260ms ease, opacity 200ms ease",
      }}
      aria-label="Navegación principal"
    >
      {items.map((it) => {
        const Icon = it.Icon;
        const active = it.routes.some((r) => pathname.startsWith(r));
        return (
          <NavLink
            key={it.id}
            to={it.to}
            className="aurora-tap"
            style={{
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: active ? "var(--aurora-lavender)" : "rgba(255,255,255,0.7)",
              position: "relative",
              textDecoration: "none",
              padding: "8px 14px",
            }}
            aria-label={it.label}
            title={it.label}
          >
            {active && (
              <span
                style={{
                  position: "absolute",
                  top: -14,
                  width: 26,
                  height: 3,
                  borderRadius: 999,
                  background: "var(--aurora-lavender)",
                }}
              />
            )}
            <Icon size={24} />
            {it.badge > 0 && (
              <span
                style={{
                  position: "absolute", top: -2, right: 2,
                  minWidth: 16, height: 16, padding: "0 4px",
                  borderRadius: 999, background: "var(--aurora-peach)",
                  color: "#fff", fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                }}
              >
                {it.badge > 9 ? "9+" : it.badge}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}