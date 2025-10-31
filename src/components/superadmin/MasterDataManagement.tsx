import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";

interface MasterData {
  id: string;
  nama: string;
  singkatan: string;
}

interface MasterDataManagementProps {
  title: string;
  tableName: "locations" | "departments" | "document_types";
  onDataChange?: () => void;
}

export const MasterDataManagement = ({ title, tableName, onDataChange }: MasterDataManagementProps) => {
  const [data, setData] = useState<MasterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterData | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nama: "",
    singkatan: "",
  });

  useEffect(() => {
    fetchData();
  }, [tableName]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: result } = await supabase
      .from(tableName)
      .select("*")
      .order("nama");
    
    if (result) {
      setData(result);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingItem) {
      const { error } = await supabase
        .from(tableName)
        .update(formData)
        .eq("id", editingItem.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Gagal mengupdate ${title}`,
        });
        return;
      }

      toast({
        title: "Sukses",
        description: `${title} berhasil diupdate`,
      });
    } else {
      const { error } = await supabase
        .from(tableName)
        .insert([formData]);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Gagal menambah ${title}`,
        });
        return;
      }

      toast({
        title: "Sukses",
        description: `${title} berhasil ditambahkan`,
      });
    }

    setIsDialogOpen(false);
    resetForm();
    fetchData();
    onDataChange?.();
  };

  const handleEdit = (item: MasterData) => {
    setEditingItem(item);
    setFormData({
      nama: item.nama,
      singkatan: item.singkatan,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${title} ini?`)) return;

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Gagal menghapus ${title}`,
      });
      return;
    }

    toast({
      title: "Sukses",
      description: `${title} berhasil dihapus`,
    });
    fetchData();
    onDataChange?.();
  };

  const resetForm = () => {
    setFormData({
      nama: "",
      singkatan: "",
    });
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Manajemen {title}</h3>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Tambah {title}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? `Edit ${title}` : `Tambah ${title} Baru`}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nama">Nama {title}</Label>
                <Input
                  id="nama"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="singkatan">Singkatan</Label>
                <Input
                  id="singkatan"
                  value={formData.singkatan}
                  onChange={(e) => setFormData({ ...formData, singkatan: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  {editingItem ? "Update" : "Tambah"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Singkatan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Belum ada data
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.nama}</TableCell>
                  <TableCell>{item.singkatan}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
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
