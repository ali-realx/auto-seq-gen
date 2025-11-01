import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Download, Upload } from "lucide-react";

interface User {
  id: string;
  username: string;
  nama: string;
  uid: string;
  departemen: string;
  lokasi: string;
}

interface UserManagementProps {
  locations: Array<{ id: string; nama: string }>;
  departments: Array<{ id: string; nama: string }>;
}

export const UserManagement = ({ locations, departments }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  // ref for hidden file input
  let fileInputRef: HTMLInputElement | null = null;

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    nama: "",
    uid: "",
    departemen: "",
    lokasi: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("nama");
    if (data) {
      setUsers(data as User[]);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      // Update existing user
      const { error } = await supabase
        .from("profiles")
        .update({
          nama: formData.nama,
          uid: formData.uid,
          departemen: formData.departemen,
          lokasi: formData.lokasi,
          username: formData.username,
        })
        .eq("id", editingUser.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Gagal mengupdate user",
        });
        return;
      }

      toast({
        title: "Sukses",
        description: "User berhasil diupdate",
      });
    } else {
      // Create new user via edge function
      const { error } = await supabase.functions.invoke("create-user", {
        body: formData,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Gagal membuat user",
        });
        return;
      }

      toast({
        title: "Sukses",
        description: "User berhasil dibuat",
      });
    }

    setIsDialogOpen(false);
    resetForm();
    fetchUsers();
  };

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      nama: "",
      uid: "",
      departemen: "",
      lokasi: "",
    });
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username || "",
      password: "",
      nama: user.nama,
      uid: user.uid || "",
      departemen: user.departemen,
      lokasi: user.lokasi,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini?")) return;

    const { error } = await supabase.functions.invoke("delete-user", {
      body: { userId },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal menghapus user",
      });
      return;
    }

    toast({
      title: "Sukses",
      description: "User berhasil dihapus",
    });
    fetchUsers();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // dynamic import to avoid bundling if not installed
    const Papa = (await import("papaparse")).default;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        const rows = (results.data || []) as Array<Record<string, string>>;
        if (!rows.length) {
          toast({ variant: "destructive", title: "Error", description: "File kosong atau format salah" });
          return;
        }

        // basic header validation
        const required = ["username", "password", "nama", "uid", "departemen", "lokasi"];
        const headers = Object.keys(rows[0]);
        const missing = required.filter((h) => !headers.includes(h));
        if (missing.length) {
          toast({
            variant: "destructive",
            title: "Format CSV tidak sesuai",
            description: `Kolom hilang: ${missing.join(", ")}`,
          });
          return;
        }

        // map rows to expected payload
        const users = rows.map((r) => ({
          username: String(r.username || "").trim(),
          password: String(r.password || "").trim(),
          nama: String(r.nama || "").trim(),
          uid: String(r.uid || "").trim(),
          departemen: String(r.departemen || "").trim(),
          lokasi: String(r.lokasi || "").trim(),
        }));

        toast({ title: "Mengimpor...", description: `Memproses ${users.length} user` });

        try {
          // Prefer single batch edge function if tersedia
          const { error: batchError } = await supabase.functions.invoke("create-users-batch", {
            body: { users },
          } as any);

          if (batchError) {
            // fallback: invoke create-user per row
            const results = [];
            for (const u of users) {
              const { error } = await supabase.functions.invoke("create-user", { body: u } as any);
              results.push({ user: u.username, ok: !error, error: error?.message });
            }

            const failed = results.filter((r) => !r.ok);
            if (failed.length) {
              toast({
                variant: "destructive",
                title: "Sebagian gagal",
                description: `${failed.length} dari ${users.length} user gagal dibuat`,
              });
            } else {
              toast({ title: "Sukses", description: "Semua user berhasil dibuat" });
            }
          } else {
            toast({ title: "Sukses", description: "User berhasil diimpor (batch)" });
          }

          fetchUsers();
        } catch (err: any) {
          toast({ variant: "destructive", title: "Error", description: String(err.message || err) });
        } finally {
          // reset file input
          if (fileInputRef) fileInputRef.value = "";
        }
      },
      error: (err) => {
        toast({ variant: "destructive", title: "Parse Error", description: String(err) });
      },
    });
  };

  const downloadTemplate = () => {
    const headers = ["username", "password", "nama", "uid", "departemen", "lokasi"];
    const csvContent = headers.join(",") + "\n" + "user1,Pass123,Nama User,12345,Departemen,Lokasi";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_users.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Manajemen User</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          {/* hidden file input + button */}
          <input
            ref={(el) => (fileInputRef = el)}
            className="hidden"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef && fileInputRef.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Users
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Tambah User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingUser ? "Edit User" : "Tambah User Baru"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>
                {!editingUser && (
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="nama">Nama Lengkap</Label>
                  <Input
                    id="nama"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="uid">UID (NIK)</Label>
                  <Input
                    id="uid"
                    value={formData.uid}
                    onChange={(e) => setFormData({ ...formData, uid: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="departemen">Departemen</Label>
                  <Select value={formData.departemen} onValueChange={(value) => setFormData({ ...formData, departemen: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih departemen" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.nama}>
                          {dept.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="lokasi">Lokasi</Label>
                  <Select value={formData.lokasi} onValueChange={(value) => setFormData({ ...formData, lokasi: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih lokasi" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.nama}>
                          {loc.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">
                    {editingUser ? "Update" : "Tambah"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>UID (NIK)</TableHead>
              <TableHead>Departemen</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Belum ada user
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.nama}</TableCell>
                  <TableCell>{user.uid}</TableCell>
                  <TableCell>{user.departemen}</TableCell>
                  <TableCell>{user.lokasi}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
