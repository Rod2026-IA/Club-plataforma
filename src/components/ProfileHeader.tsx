import { useState, useRef, useEffect } from "react";
import { Camera, Move, Check, X, Settings, User as UserIcon, ZoomIn, IdCard, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  director: "Director",
  subdirector: "Sub Director",
  integrante: "Integrante",
};

type RepoMode = null | "banner" | "avatar";

const SidebarItem = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl hover:bg-white/15 transition-colors text-white text-sm font-medium"
  >
    <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
      {icon}
    </span>
    {label}
  </button>
);

const ProfileHeader = ({
  headerActions,
  bannerStats,
}: { headerActions?: React.ReactNode; bannerStats?: React.ReactNode } = {}) => {
  const { user, profile, role, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [repoMode, setRepoMode] = useState<RepoMode>(null);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    first_name: "",
    second_name: "",
    first_last_name: "",
    second_last_name: "",
    phone: "",
    birthday: "",
  });
  const [savingAccount, setSavingAccount] = useState(false);
  const [bannerPosY, setBannerPosY] = useState<number>(profile?.banner_position_y ?? 50);
  const [bannerPosX, setBannerPosX] = useState<number>(profile?.banner_position_x ?? 50);
  const [avatarPosY, setAvatarPosY] = useState<number>(profile?.avatar_position_y ?? 50);
  const [avatarPosX, setAvatarPosX] = useState<number>(profile?.avatar_position_x ?? 50);
  const [bannerScale, setBannerScale] = useState<number>(profile?.banner_scale ?? 1);
  const [avatarScale, setAvatarScale] = useState<number>(profile?.avatar_scale ?? 1);
  const [savingPos, setSavingPos] = useState(false);

  const bannerRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    refWidth: number;
    refHeight: number;
  } | null>(null);
  const bannerContainerRef = useRef<HTMLDivElement>(null);
  const avatarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBannerPosY(profile?.banner_position_y ?? 50);
    setBannerPosX(profile?.banner_position_x ?? 50);
    setAvatarPosY(profile?.avatar_position_y ?? 50);
    setAvatarPosX(profile?.avatar_position_x ?? 50);
    setBannerScale(profile?.banner_scale ?? 1);
    setAvatarScale(profile?.avatar_scale ?? 1);
  }, [
    profile?.banner_position_y,
    profile?.banner_position_x,
    profile?.avatar_position_y,
    profile?.avatar_position_x,
    profile?.banner_scale,
    profile?.avatar_scale,
  ]);

  useEffect(() => {
    if (accountInfoOpen) {
      setAccountForm({
        first_name: profile?.first_name ?? "",
        second_name: profile?.second_name ?? "",
        first_last_name: profile?.first_last_name ?? "",
        second_last_name: profile?.second_last_name ?? "",
        phone: profile?.phone ?? "",
        birthday: profile?.birthday
          ? new Date(profile.birthday).toISOString().slice(0, 10)
          : "",
      });
    }
  }, [accountInfoOpen, profile]);

  const saveAccountInfo = async () => {
    if (!user) return;
    if (!accountForm.first_name.trim() || !accountForm.first_last_name.trim()) {
      toast({ title: "Faltan datos", description: "Primer nombre y primer apellido son obligatorios", variant: "destructive" });
      return;
    }
    setSavingAccount(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: accountForm.first_name.trim(),
          second_name: accountForm.second_name.trim(),
          first_last_name: accountForm.first_last_name.trim(),
          second_last_name: accountForm.second_last_name.trim(),
          phone: accountForm.phone.trim(),
          birthday: accountForm.birthday ? accountForm.birthday : null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Información actualizada" });
      setAccountInfoOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingAccount(false);
    }
  };

  const displayName = profile
    ? `${profile.first_name} ${profile.first_last_name}`
    : "Conquistador";

  const uploadFile = async (
    file: File,
    bucket: string,
    field: "avatar_url" | "banner_url"
  ) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

      const updateData: any =
        field === "avatar_url"
          ? { avatar_url: publicUrl, avatar_position_y: 50, avatar_position_x: 50, avatar_scale: 1 }
          : { banner_url: publicUrl, banner_position_y: 50, banner_position_x: 50, banner_scale: 1 };
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: "Imagen actualizada" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!repoMode) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const container = repoMode === "banner" ? bannerContainerRef.current : avatarContainerRef.current;
    const w = container?.offsetWidth ?? 1;
    const h = container?.offsetHeight ?? 1;
    const startPosY = repoMode === "banner" ? bannerPosY : avatarPosY;
    const startPosX = repoMode === "banner" ? bannerPosX : avatarPosX;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX,
      startPosY,
      refWidth: w,
      refHeight: h,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!repoMode || !dragRef.current) return;
    const deltaPctY = ((e.clientY - dragRef.current.startY) / dragRef.current.refHeight) * 100;
    const deltaPctX = ((e.clientX - dragRef.current.startX) / dragRef.current.refWidth) * 100;
    let nextY = dragRef.current.startPosY - deltaPctY;
    let nextX = dragRef.current.startPosX - deltaPctX;
    nextY = Math.max(0, Math.min(100, nextY));
    nextX = Math.max(0, Math.min(100, nextX));
    if (repoMode === "banner") {
      setBannerPosY(nextY);
      setBannerPosX(nextX);
    } else {
      setAvatarPosY(nextY);
      setAvatarPosX(nextX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      dragRef.current = null;
    }
  };

  const savePosition = async () => {
    if (!user || !repoMode) return;
    setSavingPos(true);
    try {
      const updateData: any =
        repoMode === "banner"
          ? {
              banner_position_y: bannerPosY,
              banner_position_x: bannerPosX,
              banner_scale: bannerScale,
            }
          : {
              avatar_position_y: avatarPosY,
              avatar_position_x: avatarPosX,
              avatar_scale: avatarScale,
            };
      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Posición guardada" });
      setRepoMode(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingPos(false);
    }
  };

  const cancelPosition = () => {
    setBannerPosY(profile?.banner_position_y ?? 50);
    setBannerPosX(profile?.banner_position_x ?? 50);
    setAvatarPosY(profile?.avatar_position_y ?? 50);
    setAvatarPosX(profile?.avatar_position_x ?? 50);
    setBannerScale(profile?.banner_scale ?? 1);
    setAvatarScale(profile?.avatar_scale ?? 1);
    setRepoMode(null);
  };

  const hasBanner = !!profile?.banner_url;
  const hasAvatar = !!profile?.avatar_url;
  const isReposBanner = repoMode === "banner";
  const isReposAvatar = repoMode === "avatar";

  return (
    <div className="relative">
      {/* Banner */}
      <div
        ref={bannerContainerRef}
        className={`h-36 sm:h-44 w-full bg-gradient-to-r from-[hsl(var(--navy))] to-[hsl(var(--neon-purple)/0.6)] relative overflow-hidden select-none touch-none ${
          isReposBanner ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        onPointerDown={isReposBanner ? handlePointerDown : undefined}
        onPointerMove={isReposBanner ? handlePointerMove : undefined}
        onPointerUp={isReposBanner ? handlePointerUp : undefined}
        onPointerCancel={isReposBanner ? handlePointerUp : undefined}
      >
        {hasBanner && (
          <img
            src={profile.banner_url}
            alt="banner"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform"
            style={{
              objectPosition: `${bannerPosX}% ${bannerPosY}%`,
              transform: `scale(${bannerScale})`,
              transformOrigin: `${bannerPosX}% ${bannerPosY}%`,
            }}
          />
        )}

        {/* Settings gear (top-right) */}
        {!repoMode && (
          <div className="absolute top-2 right-2 z-10">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-sm"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] p-0 border-0 bg-[hsl(var(--neon-purple))] text-white"
              >
                <SheetHeader className="p-4 pb-2">
                  <SheetTitle className="text-white">Mi cuenta</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col items-center px-4 pb-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/30 bg-white/10">
                    {hasAvatar ? (
                      <img
                        src={profile?.avatar_url}
                        alt="avatar"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${avatarPosX}% ${avatarPosY}%` }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
                        {displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 font-bold text-base">{displayName}</p>
                  {role && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 mt-1">
                      {roleLabels[role] || role}
                    </span>
                  )}
                </div>

                <nav className="flex flex-col gap-1 px-3 pb-4">
                  <SidebarItem
                    icon={<UserIcon className="w-5 h-5" />}
                    label="Cambiar foto de perfil"
                    onClick={() => {
                      setSidebarOpen(false);
                      avatarRef.current?.click();
                    }}
                  />
                  {hasAvatar && (
                    <SidebarItem
                      icon={<Move className="w-5 h-5" />}
                      label="Reposicionar perfil"
                      onClick={() => {
                        setSidebarOpen(false);
                        setRepoMode("avatar");
                      }}
                    />
                  )}
                  <SidebarItem
                    icon={<ImageIcon className="w-5 h-5" />}
                    label="Cambiar portada"
                    onClick={() => {
                      setSidebarOpen(false);
                      bannerRef.current?.click();
                    }}
                  />
                  {hasBanner && (
                    <SidebarItem
                      icon={<Move className="w-5 h-5" />}
                      label="Reposicionar portada"
                      onClick={() => {
                        setSidebarOpen(false);
                        setRepoMode("banner");
                      }}
                    />
                  )}
                  <SidebarItem
                    icon={<IdCard className="w-5 h-5" />}
                    label="Información de la cuenta"
                    onClick={() => {
                      setSidebarOpen(false);
                      setAccountInfoOpen(true);
                    }}
                  />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {isReposBanner && (
          <>
            <div className="absolute inset-x-0 top-2 flex justify-center pointer-events-none z-10">
              <span className="text-xs text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                Arrastra en cualquier dirección y ajusta el zoom
              </span>
            </div>
            <div className="absolute top-2 right-2 flex gap-2 z-10">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 px-2 bg-black/60 hover:bg-black/80 text-white border-0"
                onClick={cancelPosition}
                disabled={savingPos}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Cancelar</span>
              </Button>
              <Button size="sm" className="h-8 px-2" onClick={savePosition} disabled={savingPos}>
                <Check className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Guardar</span>
              </Button>
            </div>
            {/* Zoom slider */}
            <div className="absolute inset-x-0 bottom-2 z-10 px-4 flex justify-center">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 w-full max-w-xs">
                <ZoomIn className="w-3.5 h-3.5 text-white shrink-0" />
                <Slider
                  min={1}
                  max={3}
                  step={0.05}
                  value={[bannerScale]}
                  onValueChange={(v) => setBannerScale(v[0])}
                  className="flex-1"
                />
                <span className="text-[10px] text-white w-8 text-right tabular-nums">
                  {bannerScale.toFixed(2)}x
                </span>
              </div>
            </div>
          </>
        )}

        <input
          ref={bannerRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f, "banners", "banner_url");
            e.target.value = "";
          }}
        />
      </div>

      {/* Avatar + Info */}
      <div className="container relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 pb-4">
        <div className="relative shrink-0">
          <div
            ref={avatarContainerRef}
            className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-background bg-muted overflow-hidden relative shadow-lg select-none touch-none ${
              isReposAvatar ? "cursor-grab active:cursor-grabbing ring-4 ring-primary/60" : ""
            }`}
            onPointerDown={isReposAvatar ? handlePointerDown : undefined}
            onPointerMove={isReposAvatar ? handlePointerMove : undefined}
            onPointerUp={isReposAvatar ? handlePointerUp : undefined}
            onPointerCancel={isReposAvatar ? handlePointerUp : undefined}
          >
            {hasAvatar ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                draggable={false}
                className="w-full h-full object-cover pointer-events-none transition-transform"
                style={{
                  objectPosition: `${avatarPosX}% ${avatarPosY}%`,
                  transform: `scale(${avatarScale})`,
                  transformOrigin: `${avatarPosX}% ${avatarPosY}%`,
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-2xl font-bold text-muted-foreground">
                  {displayName.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Avatar reposition controls */}
          {isReposAvatar && (
            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20 w-56">
              <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 w-full">
                <ZoomIn className="w-3.5 h-3.5 text-white shrink-0" />
                <Slider
                  min={1}
                  max={3}
                  step={0.05}
                  value={[avatarScale]}
                  onValueChange={(v) => setAvatarScale(v[0])}
                  className="flex-1"
                />
                <span className="text-[10px] text-white w-8 text-right tabular-nums">
                  {avatarScale.toFixed(2)}x
                </span>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2 bg-black/70 hover:bg-black/90 text-white border-0"
                  onClick={cancelPosition}
                  disabled={savingPos}
                >
                  <X className="w-3 h-3 mr-1" />
                  <span className="text-xs">Cancelar</span>
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2"
                  onClick={savePosition}
                  disabled={savingPos}
                >
                  <Check className="w-3 h-3 mr-1" />
                  <span className="text-xs">Guardar</span>
                </Button>
              </div>
            </div>
          )}

          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f, "avatars", "avatar_url");
              e.target.value = "";
            }}
          />
        </div>
        <div className={`sm:pb-1 flex-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 ${isReposAvatar ? "mt-16 sm:mt-0" : ""}`}>
          <div>
            <h2 className="text-lg font-bold text-foreground leading-tight">{displayName}</h2>
            {role && (
              <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary/20 text-secondary">
                {roleLabels[role] || role}
              </span>
            )}
            {bannerStats && (
              <div className="mt-3 sm:hidden">{bannerStats}</div>
            )}
          </div>
          <div className="flex items-end gap-3">
            {bannerStats && (
              <div className="hidden sm:block">{bannerStats}</div>
            )}
            {headerActions && (
              <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
            )}
          </div>
        </div>
      </div>

      {uploading && (
        <div className="absolute top-2 left-2 z-30 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Subiendo imagen…
        </div>
      )}

      <Dialog open={accountInfoOpen} onOpenChange={setAccountInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Información de la cuenta</DialogTitle>
            <DialogDescription>
              Completa o actualiza los datos de tu perfil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Primer nombre *</Label>
                <Input value={accountForm.first_name} onChange={(e) => setAccountForm((f) => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Segundo nombre</Label>
                <Input value={accountForm.second_name} onChange={(e) => setAccountForm((f) => ({ ...f, second_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Primer apellido *</Label>
                <Input value={accountForm.first_last_name} onChange={(e) => setAccountForm((f) => ({ ...f, first_last_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Segundo apellido</Label>
                <Input value={accountForm.second_last_name} onChange={(e) => setAccountForm((f) => ({ ...f, second_last_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono</Label>
                <Input value={accountForm.phone} onChange={(e) => setAccountForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de nacimiento</Label>
                <Input type="date" value={accountForm.birthday} onChange={(e) => setAccountForm((f) => ({ ...f, birthday: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Rol: <span className="font-medium text-foreground">{role ? (roleLabels[role] || role) : "—"}</span></span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAccountInfoOpen(false)} disabled={savingAccount}>Cancelar</Button>
              <Button size="sm" onClick={saveAccountInfo} disabled={savingAccount}>
                {savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileHeader;
