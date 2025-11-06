import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Download, Upload, Search, Edit, FileSpreadsheet, Key } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface User {
  id: string;
  username: string;
  nama: string;
  uid: string;
  departemen: string;
  lokasi: string;
  role?: string;
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

  // New state for filters and batch operations
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLokasi, setFilterLokasi] = useState<string>("all");
  const [filterDepartemen, setFilterDepartemen] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [batchFormData, setBatchFormData] = useState({
    lokasi: "",
    departemen: "",
  });

  // Password reset state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ref for hidden file input
  let fileInputRef: HTMLInputElement | null = null;

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    nama: "",
    uid: "",
    departemen: "",
    lokasi: "",
    role: "user",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch profiles first
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, nama, uid, departemen, lokasi")
        .order("nama");

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Gagal mengambil data user: " + profilesError.message,
        });
        setIsLoading(false);
        return;
      }

      if (!profilesData || profilesData.length === 0) {
        setUsers([]);
        setIsLoading(false);
        return;
      }

      // Fetch user roles separately
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      }

      // Combine profiles with their roles
      const usersWithRoles = profilesData.map((profile: any) => {
        const userRole = rolesData?.find((r: any) => r.user_id === profile.id);
        return {
          id: profile.id,
          username: profile.username || "",
          nama: profile.nama || "",
          uid: profile.uid || "",
          departemen: profile.departemen || "",
          lokasi: profile.lokasi || "",
          role: userRole?.role || "user"
        };
      });

      setUsers(usersWithRoles as User[]);
    } catch (error: any) {
      console.error("Unexpected error in fetchUsers:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Terjadi kesalahan: " + error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      // Update existing user
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          nama: formData.nama,
          uid: formData.uid,
          departemen: formData.departemen,
          lokasi: formData.lokasi,
          username: formData.username,
        })
        .eq("id", editingUser.id);

      if (profileError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Gagal mengupdate user",
        });
        return;
      }

      // Update role if changed
      if (formData.role !== editingUser.role) {
        await supabase.from("user_roles").delete().eq("user_id", editingUser.id);
        
        const validRole = formData.role === "admin" ? "user" : formData.role;
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: editingUser.id, role: validRole as "user" | "superadmin" });

        if (roleError) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Gagal mengupdate role",
          });
          return;
        }
      }

      toast({
        title: "Sukses",
        description: "User berhasil diupdate",
      });
    } else {
      // Create new user - sign up via auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${formData.username}@placeholder.local`,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            nama: formData.nama,
            lokasi: formData.lokasi,
            departemen: formData.departemen,
          }
        }
      });

      if (authError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: authError.message || "Gagal membuat user",
        });
        return;
      }

      if (!authData.user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Gagal membuat user",
        });
        return;
      }

      // Update profile with UID
      await supabase
        .from("profiles")
        .update({ uid: formData.uid })
        .eq("id", authData.user.id);

      // Add role
      const validRole = formData.role === "admin" ? "user" : formData.role;
      await supabase
        .from("user_roles")
        .insert({ user_id: authData.user.id, role: validRole as "user" | "superadmin" });

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
      role: "user",
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
      role: user.role || "user",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini?")) return;

    try {
      // Delete user roles first
      await supabase.from("user_roles").delete().eq("user_id", userId);
      
      // Delete profile
      const { error } = await supabase.from("profiles").delete().eq("id", userId);

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
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handlePasswordReset = (user: User) => {
    setPasswordResetUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setIsPasswordDialogOpen(true);
  };

  const handlePasswordResetSubmit = async () => {
    if (!passwordResetUser) return;

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password minimal 6 karakter",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password dan konfirmasi password tidak cocok",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("update-user-password", {
        body: {
          user_id: passwordResetUser.id,
          new_password: newPassword,
        },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Gagal mereset password",
        });
        return;
      }

      toast({
        title: "Sukses",
        description: `Password untuk ${passwordResetUser.nama} berhasil direset`,
      });

      setIsPasswordDialogOpen(false);
      setPasswordResetUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
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
        const required = ["username", "password", "nama", "uid", "departemen", "lokasi", "role"];
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
          role: String(r.role || "user").trim(),
        }));

        toast({ title: "Mengimpor...", description: `Memproses ${users.length} user` });

        try {
          let successCount = 0;
          let failCount = 0;

          for (const u of users) {
            try {
              // Create auth user
              const { data: authData, error: authError } = await supabase.auth.signUp({
                email: `${u.username}@placeholder.local`,
                password: u.password,
                options: {
                  data: {
                    username: u.username,
                    nama: u.nama,
                    lokasi: u.lokasi,
                    departemen: u.departemen,
                  }
                }
              });

              if (authError) throw authError;
              if (!authData.user) throw new Error("Failed to create user");

              // Update profile with UID
              await supabase
                .from("profiles")
                .update({ uid: u.uid })
                .eq("id", authData.user.id);

              // Add role
              const validRole = u.role === "admin" ? "user" : u.role;
              await supabase
                .from("user_roles")
                .insert({ user_id: authData.user.id, role: validRole as "user" | "superadmin" });

              successCount++;
            } catch (error: any) {
              console.error(`Failed to create user ${u.username}:`, error);
              failCount++;
            }
          }

          if (failCount > 0) {
            toast({
              variant: "destructive",
              title: "Sebagian gagal",
              description: `${failCount} dari ${users.length} user gagal dibuat`,
            });
          } else {
            toast({ title: "Sukses", description: `${successCount} user berhasil dibuat` });
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
    const headers = ["username", "password", "nama", "uid", "departemen", "lokasi", "role"];
    const csvContent = headers.join(",") + "\n" + "user1,Pass123,Nama User,12345,Departemen,Lokasi,user";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_users.csv";
    a.click();
  };

  const exportUsersToCSV = () => {
    const headers = ["username", "nama", "uid", "departemen", "lokasi", "role"];
    const rows = filteredUsers.map(u => [u.username, u.nama, u.uid, u.departemen, u.lokasi, u.role || "user"]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast({ title: "Sukses", description: "Data user berhasil diexport ke CSV" });
  };

  const exportUsersToExcel = () => {
    const excelData = filteredUsers.map(u => ({
      Username: u.username,
      "Nama Lengkap": u.nama,
      "UID (NIK)": u.uid,
      Departemen: u.departemen,
      Lokasi: u.lokasi,
      Role: u.role || "user"
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [
      { wch: 20 },  // Username
      { wch: 30 },  // Nama
      { wch: 15 },  // UID
      { wch: 20 },  // Departemen
      { wch: 20 },  // Lokasi
      { wch: 12 }   // Role
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, `users-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Sukses", description: "Data user berhasil diexport ke Excel" });
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.uid?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLokasi = filterLokasi === "all" || user.lokasi === filterLokasi;
    const matchesDepartemen = filterDepartemen === "all" || user.departemen === filterDepartemen;
    return matchesSearch && matchesLokasi && matchesDepartemen;
  });

  // Toggle individual user selection
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  // Toggle all users selection
  const toggleAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  // Handle batch update
  const handleBatchUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedUsers.size === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Pilih user terlebih dahulu",
      });
      return;
    }

    const updates: any = {};
    if (batchFormData.lokasi) updates.lokasi = batchFormData.lokasi;
    if (batchFormData.departemen) updates.departemen = batchFormData.departemen;

    if (Object.keys(updates).length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Pilih minimal satu field untuk diupdate",
      });
      return;
    }

    try {
      const promises = Array.from(selectedUsers).map(userId =>
        supabase.from("profiles").update(updates).eq("id", userId)
      );

      await Promise.all(promises);

      toast({
        title: "Sukses",
        description: `${selectedUsers.size} user berhasil diupdate`,
      });

      setIsBatchDialogOpen(false);
      setBatchFormData({ lokasi: "", departemen: "" });
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal mengupdate users",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h3 className="text-lg font-semibold">Manajemen User</h3>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportUsersToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportUsersToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
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
          {selectedUsers.size > 0 && (
            <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit {selectedUsers.size} User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Batch Edit {selectedUsers.size} User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBatchUpdate} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Pilih field yang ingin diubah untuk {selectedUsers.size} user yang dipilih
                  </p>
                  <div>
                    <Label htmlFor="batch-lokasi">Lokasi (opsional)</Label>
                    <Select value={batchFormData.lokasi} onValueChange={(value) => setBatchFormData({ ...batchFormData, lokasi: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih lokasi baru" />
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
                  <div>
                    <Label htmlFor="batch-departemen">Departemen (opsional)</Label>
                    <Select value={batchFormData.departemen} onValueChange={(value) => setBatchFormData({ ...batchFormData, departemen: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih departemen baru" />
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
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsBatchDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit">
                      Update
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
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
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Superadmin</SelectItem>
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

      {/* Search and Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, username, atau UID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterLokasi} onValueChange={setFilterLokasi}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter Lokasi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Lokasi</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.nama}>
                {loc.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDepartemen} onValueChange={setFilterDepartemen}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter Departemen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Departemen</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.nama}>
                {dept.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                  onCheckedChange={toggleAllUsers}
                />
              </TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>UID (NIK)</TableHead>
              <TableHead>Departemen</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {users.length === 0 ? "Belum ada user" : "Tidak ada user yang sesuai filter"}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.nama}</TableCell>
                  <TableCell>{user.uid}</TableCell>
                  <TableCell>{user.departemen}</TableCell>
                  <TableCell>{user.lokasi}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'superadmin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                      user.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                    }`}>
                      {user.role || 'user'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handlePasswordReset(user)}
                      title="Reset Password"
                    >
                      <Key className="h-4 w-4" />
                    </Button>
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

      {/* Password Reset Dialog */}
      <AlertDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password User</AlertDialogTitle>
            <AlertDialogDescription>
              Reset password untuk: <strong>{passwordResetUser?.nama}</strong> ({passwordResetUser?.username})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-password">Password Baru</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Konfirmasi Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Ketik ulang password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsPasswordDialogOpen(false);
              setPasswordResetUser(null);
              setNewPassword("");
              setConfirmPassword("");
            }}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handlePasswordResetSubmit}>
              Reset Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
