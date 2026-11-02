import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlatformBrandingProvider } from "@/hooks/usePlatformBranding";
import AppSidebar, { AppShell } from "@/components/AppSidebar";
import AuroraBottomNav from "@/components/aurora/AuroraBottomNav";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy-load all non-critical routes so the initial mobile bundle stays small
const Register = lazy(() => import("./pages/Register"));
const RecoverPin = lazy(() => import("./pages/RecoverPin"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const MembersByRole = lazy(() => import("./pages/MembersByRole"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AnoBiblico = lazy(() => import("./pages/AnoBiblico"));
const MiUnidad = lazy(() => import("./pages/MiUnidad"));
const GuiaMayor = lazy(() => import("./pages/GuiaMayor"));
const Ideales = lazy(() => import("./pages/Ideales"));
const ClassCardPage = lazy(() => import("./pages/ClasesProgresivas"));
const MyQR = lazy(() => import("./pages/MyQR"));
const ScanQR = lazy(() => import("./pages/ScanQR"));
const ScanRegister = lazy(() => import("./pages/ScanRegister"));
const MyHistory = lazy(() => import("./pages/MyHistory"));
const UnitReports = lazy(() => import("./pages/UnitReports"));
const ConquiKash = lazy(() => import("./pages/ConquiKash"));
const Racha = lazy(() => import("./pages/Racha"));
const Formacion = lazy(() => import("./pages/Formacion"));
const CategoryHub = lazy(() => import("./pages/CategoryHub"));
const Comunidad = lazy(() => import("./pages/Comunidad"));
const UserPublicProfile = lazy(() => import("./pages/UserPublicProfile"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const Club = lazy(() => import("./pages/Club"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PlatformBrandingProvider>
          <AppSidebar />
          <AppShell>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/recuperar-pin" element={<RecoverPin />} />
            <Route path="/admin/usuarios" element={<AdminUsers />} />
            <Route path="/miembros/:roleSlug" element={<MembersByRole />} />
            <Route path="/perfil-miembro/:userId" element={<MemberProfile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ano-biblico" element={<AnoBiblico />} />
            <Route path="/mi-unidad" element={<MiUnidad />} />
            <Route path="/guia-mayor" element={<GuiaMayor />} />
            <Route path="/clases-progresivas" element={<ClassCardPage cardType="progresiva" title="Clases Progresivas" />} />
            <Route path="/clases-avanzadas" element={<ClassCardPage cardType="avanzada" title="Clases Avanzadas" />} />
            <Route path="/ideales" element={<Ideales />} />
            <Route path="/formacion" element={<Formacion />} />
            <Route path="/hub/:key" element={<CategoryHub />} />
            <Route path="/comunidad" element={<Comunidad />} />
            <Route path="/comunidad/:userId" element={<UserPublicProfile />} />
            <Route path="/conqui-kash" element={<ConquiKash />} />
            <Route path="/racha" element={<Racha />} />
            <Route path="/mi-qr" element={<MyQR />} />
            <Route path="/escanear" element={<ScanQR />} />
            <Route path="/scan/:userId" element={<ScanRegister />} />
            <Route path="/mi-historial" element={<MyHistory />} />
            <Route path="/reportes-unidad" element={<UnitReports />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/club" element={<Club />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </AppShell>
          <AuroraBottomNav />
          </PlatformBrandingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
