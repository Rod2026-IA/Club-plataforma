import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Image as ImageIcon, Save, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const Configuracion = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, loading } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [firstLastName, setFirstLastName] = useState("");
  const [secondLastName, setSecondLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name || "");
    setSecondName(profile.second_name || "");
    setFirstLastName(profile.first_last_name || "");
    setSecondLastName(profile.second_last_name || "");
    setPhone(profile.phone || "");
    setBirthday(profile.birthday || "");
    setAvatarUrl(profile.avatar_url || "");
    setBannerUrl(profile.banner_url || "");
  }, [profile]);

  const uploadFile = async (bucket: "avatars" | "banners", file: File) => {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast({ title: "Error al subir", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const url = await uploadFile("avatars", file);
    if (url) {
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
      if (!error) {
        setAvatarUrl(url);
        await refreshProfile();
        toast({ title: "Foto de perfil actualizada" });
      }
    }
    setUploadingAvatar(false);
    e.target.value = "";
  };

  const onPickBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingBanner(true);
    const url = await uploadFile("banners", file);
    if (url) {
      const { error } = await supabase.from("profiles").update({ banner_url: url }).eq("user_id", user.id);
      if (!error) {
        setBannerUrl(url);
        await refreshProfile();
        toast({ title: "Foto de portada actualizada" });
      }
    }
    setUploadingBanner(false);
    e.target.value = "";
  };

  const saveInfo = async () => {
    if (!user) return;
    if (!firstName.trim() || !firstLastName.trim() || !phone.trim()) {
      toast({ title: "Faltan datos", description: "Nombre, apellido y teléfono son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        second_name: secondName.trim(),
        first_last_name: firstLastName.trim(),
        second_last_name: secondLastName.trim(),
        phone: phone.trim(),
        birthday: birthday || null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Información actualizada" });
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Contraseña muy corta", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "No coinciden", description: "Las contraseñas no coinciden.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Contraseña actualizada" });
    }
  };

  const initials = ((firstName?.[0] || "") + (firstLastName?.[0] || "")).toUpperCase() || "U";

  return (
    <div
      className="aurora-screen-enter min-h-screen"
      style={{ background: "var(--aurora-bg)", paddingBottom: 120, color: "var(--aurora-text)" }}
    >
      <div style={{ padding: "18px 18px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => navigate("/dashboard")}
          className="aurora-tap"
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: "var(--aurora-surface)", border: "1px solid var(--aurora-line)",
            color: "var(--aurora-text)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-grotesk" style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            Configuración
          </h1>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--aurora-text-mute)" }}>
            Edita tu perfil, fotos y contraseña
          </p>
        </div>
      </div>

      {/* Banner + Avatar */}
      <div style={{ padding: "20px 18px 0" }}>
        <div
          style={{
            position: "relative",
            height: 140,
            borderRadius: 18,
            overflow: "hidden",
            background: bannerUrl
              ? `url(${bannerUrl}) center/cover no-repeat`
              : "linear-gradient(135deg, var(--aurora-violet), var(--aurora-lavender))",
            border: "1px solid var(--aurora-line)",
          }}
        >
          <label
            className="aurora-tap"
            style={{
              position: "absolute", right: 10, top: 10,
              padding: "6px 10px", borderRadius: 10,
              background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 12, fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
            }}
          >
            <ImageIcon size={14} />
            {uploadingBanner ? "Subiendo..." : "Cambiar portada"}
            <input type="file" accept="image/*" hidden onChange={onPickBanner} disabled={uploadingBanner} />
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: -38, paddingLeft: 14 }}>
          <div style={{ position: "relative" }}>
            <Avatar style={{ width: 88, height: 88, border: "3px solid var(--aurora-bg)" }}>
              <AvatarImage src={avatarUrl} style={{ objectFit: "cover", objectPosition: "center 15%" }} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <label
              className="aurora-tap"
              style={{
                position: "absolute", right: -4, bottom: -4,
                width: 30, height: 30, borderRadius: 999,
                background: "var(--aurora-violet)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid var(--aurora-bg)", cursor: "pointer",
              }}
              title="Cambiar foto"
            >
              <Camera size={14} />
              <input type="file" accept="image/*" hidden onChange={onPickAvatar} disabled={uploadingAvatar} />
            </label>
          </div>
          <div style={{ paddingBottom: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {firstName} {firstLastName}
            </div>
            <div style={{ fontSize: 12, color: "var(--aurora-text-mute)" }}>
              {uploadingAvatar ? "Subiendo foto..." : "Toca el ícono para cambiar tu foto"}
            </div>
          </div>
        </div>
      </div>

      {/* Información personal */}
      <div style={{ padding: "24px 18px 0" }}>
        <div
          style={{
            background: "var(--aurora-surface)", border: "1px solid var(--aurora-line)",
            borderRadius: 16, padding: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <UserIcon size={16} style={{ color: "var(--aurora-lavender)" }} />
            <h3 className="font-grotesk" style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Información personal</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fn">Primer nombre</Label>
              <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sn">Segundo nombre</Label>
              <Input id="sn" value={secondName} onChange={(e) => setSecondName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fln">Primer apellido</Label>
              <Input id="fln" value={firstLastName} onChange={(e) => setFirstLastName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sln">Segundo apellido</Label>
              <Input id="sln" value={secondLastName} onChange={(e) => setSecondLastName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="bd">Cumpleaños</Label>
              <Input id="bd" type="date" value={birthday || ""} onChange={(e) => setBirthday(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ph">Teléfono</Label>
              <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <Button onClick={saveInfo} disabled={saving} className="mt-4 w-full">
            <Save size={16} className="mr-2" />
            {saving ? "Guardando..." : "Guardar información"}
          </Button>
        </div>
      </div>

      {/* Contraseña */}
      <div style={{ padding: "16px 18px 0" }}>
        <div
          style={{
            background: "var(--aurora-surface)", border: "1px solid var(--aurora-line)",
            borderRadius: 16, padding: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Lock size={16} style={{ color: "var(--aurora-lavender)" }} />
            <h3 className="font-grotesk" style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Cambiar contraseña</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="np">Nueva contraseña</Label>
              <Input id="np" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cp">Confirmar</Label>
              <Input id="cp" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <Button onClick={changePassword} disabled={changingPassword} variant="secondary" className="mt-4 w-full">
            {changingPassword ? "Actualizando..." : "Actualizar contraseña"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;