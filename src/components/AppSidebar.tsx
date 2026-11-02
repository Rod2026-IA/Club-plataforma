import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Wallet,
  GraduationCap,
  Star,
  Award,
  UserPlus,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Año Bíblico", path: "/ano-biblico", icon: BookOpen },
  { label: "Mi Unidad", path: "/mi-unidad", icon: Users },
  { label: "ConquiKash", path: "/conqui-kash", icon: Wallet },
  { label: "Clases Progresivas", path: "/clases-progresivas", icon: GraduationCap },
  { label: "Ideales", path: "/ideales", icon: Star },
  { label: "Clases Avanzadas", path: "/clases-avanzadas", icon: Award },
  { label: "Aspirantes GM", path: "/miembros/aspirantes", icon: UserPlus, adminOnly: true },
  { label: "GM Investidos", path: "/miembros/investidos", icon: Shield, adminOnly: true },
];

const HIDDEN_ROUTES = ["/", "/register", "/recuperar-pin"];

export const SIDEBAR_WIDTH = 220;
export const SIDEBAR_COLLAPSED_WIDTH = 60;

export default function AppSidebar() {
  const { user, role } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar_collapsed") === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Cerrar overlay al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Notificar cambios al layout para ajustar margen
  useEffect(() => {
    const w = isMobile ? 0 : collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;
    document.documentElement.style.setProperty("--app-sidebar-w", `${w}px`);
  }, [collapsed, isMobile]);

  if (!user) return null;
  if (HIDDEN_ROUTES.includes(location.pathname)) return null;

  const isAdmin = ["super_admin", "director", "subdirector"].includes(role || "");
  const items = NAV_ITEMS.filter((it) => !it.adminOnly || isAdmin);

  const widthPx = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const showLabels = !collapsed;

  const sidebarVisible = isMobile ? mobileOpen : true;

  return (
    <>
      {/* Toggle button — only on desktop. On mobile we use AuroraBottomNav. */}
      <button
        onClick={() => (isMobile ? setMobileOpen((v) => !v) : setCollapsed((v) => !v))}
        className="hidden md:flex fixed top-3 z-50 h-9 w-9 rounded-lg bg-[#0f1117] text-white border border-white/10 items-center justify-center shadow-lg hover:bg-white/5 transition-colors"
        style={{
          left: isMobile ? 12 : (collapsed ? SIDEBAR_COLLAPSED_WIDTH + 8 : SIDEBAR_WIDTH + 8),
        }}
        aria-label="Abrir menú"
      >
        {isMobile && mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className="hidden md:block fixed top-0 left-0 h-screen z-40 transition-[width,transform] duration-200 ease-out"
        style={{
          width: isMobile ? SIDEBAR_WIDTH : widthPx,
          background: "#0f1117",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          transform: sidebarVisible ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div className="h-14 flex items-center justify-center border-b border-white/5">
          {(!collapsed || isMobile) ? (
            <span className="text-white font-bold text-sm tracking-wide">GuíaGo</span>
          ) : (
            <span className="text-white font-bold text-sm">G</span>
          )}
        </div>

        <nav className="py-2 overflow-y-auto h-[calc(100vh-3.5rem)]">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.path}
                to={it.path}
                title={collapsed && !isMobile ? it.label : undefined}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-secondary text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  } ${collapsed && !isMobile ? "justify-center px-2" : ""}`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {(showLabels || isMobile) && (
                  <span className="ml-3 truncate">{it.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

/** Wrapper que aplica margen al contenido principal en función del sidebar. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const hidden = HIDDEN_ROUTES.includes(location.pathname) || !user;

  return (
    <div
      className="min-h-screen aurora-page transition-[margin] duration-200"
      style={{
        marginLeft: hidden ? 0 : "var(--app-sidebar-w, 220px)",
      }}
    >
      {children}
    </div>
  );
}