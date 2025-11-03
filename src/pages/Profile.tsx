import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<{ nama?: string; departemen?: string; lokasi?: string } | null>(null);
  const [form, setForm] = useState({ nama: "", departemen: "", lokasi: "" });
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("profiles").select("nama, departemen, lokasi").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setForm({ nama: data.nama ?? "", departemen: data.departemen ?? "", lokasi: data.lokasi ?? "" });
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form }).select();
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Simpan gagal", description: error.message });
    } else {
      toast({ title: "Profil disimpan" });
      setProfile(form);
      setEditing(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ variant: "destructive", title: "Password tidak cocok", description: "Password baru dan konfirmasi tidak sama" });
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast({ variant: "destructive", title: "Password terlalu pendek", description: "Password minimal 6 karakter" });
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
    setLoading(false);
    
    if (error) {
      toast({ variant: "destructive", title: "Ubah password gagal", description: error.message });
    } else {
      toast({ title: "Password berhasil diubah" });
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Profil Saya</h2>
            <p className="text-sm text-muted-foreground">Kelola data profil Anda</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => {
              setEditing(false);
              setChangingPassword((s) => !s);
            }}>
              {changingPassword ? "Batal" : "Ubah Password"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              setChangingPassword(false);
              setEditing((s) => !s);
            }}>
              {editing ? "Batal" : "Edit Profil"}
            </Button>
            {editing && (
              <Button size="sm" onClick={handleSave} disabled={loading}>
                Simpan
              </Button>
            )}
            {changingPassword && (
              <Button size="sm" onClick={handleChangePassword} disabled={loading}>
                Simpan Password
              </Button>
            )}
          </div>
        </div>

        <div className="bg-white border rounded p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
            <div className="text-foreground">{user?.email ?? "-"}</div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-muted-foreground mb-1">Nama</label>
            {editing ? (
              <input
                className="w-full border rounded px-3 py-2"
                value={form.nama}
                onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
              />
            ) : (
              <div>{profile?.nama ?? "-"}</div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-muted-foreground mb-1">Departemen</label>
            {editing ? (
              <input
                className="w-full border rounded px-3 py-2"
                value={form.departemen}
                onChange={(e) => setForm((f) => ({ ...f, departemen: e.target.value }))}
              />
            ) : (
              <div>{profile?.departemen ?? "-"}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Lokasi</label>
            {editing ? (
              <input
                className="w-full border rounded px-3 py-2"
                value={form.lokasi}
                onChange={(e) => setForm((f) => ({ ...f, lokasi: e.target.value }))}
              />
            ) : (
              <div>{profile?.lokasi ?? "-"}</div>
            )}
          </div>
        </div>

        {changingPassword && (
          <div className="bg-white border rounded p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Ubah Password</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Password Baru</label>
              <input
                type="password"
                className="w-full border rounded px-3 py-2"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Konfirmasi Password Baru</label>
              <input
                type="password"
                className="w-full border rounded px-3 py-2"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}