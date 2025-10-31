import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<{ nama?: string; departemen?: string; lokasi?: string } | null>(null);
  const [form, setForm] = useState({ nama: "", departemen: "", lokasi: "" });

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Profil Saya</h2>
            <p className="text-sm text-muted-foreground">Kelola data profil Anda</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing((s) => !s)}>
              {editing ? "Batal" : "Edit"}
            </Button>
            {editing && (
              <Button size="sm" onClick={handleSave} disabled={loading}>
                Simpan
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
      </div>
    </Layout>
  );
}