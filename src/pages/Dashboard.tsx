import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Document {
  id: string;
  nama: string;
  nomor_surat: string;
  jenis_surat: string;
  deskripsi: string;
  lokasi: string;
  departemen: string;
  created_at: string;
}

type ViewMode = "own" | "department" | "all";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("own");
  const [jenisFilter, setJenisFilter] = useState<string>("all");
  const [documentTypes, setDocumentTypes] = useState<Array<{ id: string; nama: string }>>([]);
  const [userProfile, setUserProfile] = useState<{ departemen: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchDocumentTypes();
    }
  }, [user]);

  useEffect(() => {
    if (user && userProfile) {
      fetchDocuments();
    }
  }, [user, userProfile, viewMode, jenisFilter]);

  const fetchUserProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("departemen")
      .eq("id", user?.id)
      .single();
    
    if (data) {
      setUserProfile(data);
    }
  };

  const fetchDocumentTypes = async () => {
    const { data } = await supabase
      .from("document_types")
      .select("id, nama")
      .order("nama");
    
    if (data) {
      setDocumentTypes(data);
    }
  };

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    
    let query = supabase.from("documents").select("*");

    // Apply view mode filter
    if (viewMode === "own") {
      query = query.eq("user_id", user?.id);
    } else if (viewMode === "department" && userProfile) {
      query = query.eq("departemen", userProfile.departemen);
    }
    // "all" mode doesn't add any filter, RLS handles it

    // Apply jenis filter
    if (jenisFilter !== "all") {
      query = query.eq("jenis_surat", jenisFilter);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (data && !error) {
      setDocuments(data);
    }
    setIsLoadingDocs(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground">Daftar nomor dokumen</p>
          </div>
          <Button onClick={() => navigate("/create-number")} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Buat Nomor Baru
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <Label className="text-sm font-semibold mb-3 block">Tampilkan</Label>
              <RadioGroup value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="own" id="own" />
                  <Label htmlFor="own" className="cursor-pointer">Nomor Saya Sendiri</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="department" id="department" />
                  <Label htmlFor="department" className="cursor-pointer">Nomor Se-Departemen</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="cursor-pointer">Semua Nomor</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex-1">
              <Label className="text-sm font-semibold mb-3 block">Filter Jenis Surat</Label>
              <Select value={jenisFilter} onValueChange={setJenisFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis surat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.nama}>
                      {type.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-table-header">
                  <TableHead className="font-semibold">Nama</TableHead>
                  <TableHead className="font-semibold">Nomor Surat</TableHead>
                  <TableHead className="font-semibold">Jenis Surat</TableHead>
                  {viewMode !== "all" && <TableHead className="font-semibold">Deskripsi</TableHead>}
                  <TableHead className="font-semibold">Lokasi</TableHead>
                  <TableHead className="font-semibold">Departemen</TableHead>
                  <TableHead className="font-semibold">Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingDocs ? (
                  <TableRow>
                    <TableCell colSpan={viewMode !== "all" ? 7 : 6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={viewMode !== "all" ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      Belum ada nomor dokumen. Klik "Buat Nomor Baru" untuk memulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id} className="h-12">
                      <TableCell>{doc.nama}</TableCell>
                      <TableCell className="font-mono font-semibold text-primary">
                        {doc.nomor_surat}
                      </TableCell>
                      <TableCell>{doc.jenis_surat}</TableCell>
                      {viewMode !== "all" && <TableCell className="max-w-xs truncate">{doc.deskripsi}</TableCell>}
                      <TableCell>{doc.lokasi}</TableCell>
                      <TableCell>{doc.departemen}</TableCell>
                      <TableCell>
                        {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
