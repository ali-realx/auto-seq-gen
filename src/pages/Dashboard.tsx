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
import { Input } from "@/components/ui/input";
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
  const [viewMode, setViewMode] = useState<"own" | "department" | "all">("all");
  const [jenisFilter, setJenisFilter] = useState<string>("all");
  const [departemenFilter, setDepartemenFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Allow public access to dashboard; no redirect

  useEffect(() => {
    // Load filters for everyone
    fetchDocumentTypes();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [user, userProfile, viewMode, jenisFilter, departemenFilter]);

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

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from("departments")
      .select("id, nama")
      .order("nama");
    
    if (data) {
      setDepartments(data);
    }
  };

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    
    let query = supabase.from("documents").select("*");

    // Apply view mode filter
    if (viewMode === "own") {
      if (user?.id) {
        query = query.eq("user_id", user.id);
      }
    } else if (viewMode === "department") {
      if (userProfile?.departemen) {
        query = query.eq("departemen", userProfile.departemen);
      }
    }
    // "all" mode doesn't add any filter; backend policies handle access

    // Apply jenis filter
    if (jenisFilter !== "all") {
      query = query.eq("jenis_surat", jenisFilter);
    }

    if (departemenFilter !== "all") {
      query = query.eq("departemen", departemenFilter);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (data && !error) {
      setDocuments(data);
    }
    setIsLoadingDocs(false);
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      doc.nama.toLowerCase().includes(query) ||
      doc.jenis_surat.toLowerCase().includes(query) ||
      doc.departemen.toLowerCase().includes(query) ||
      (doc.deskripsi && doc.deskripsi.toLowerCase().includes(query))
    );
  });

  if (loading || isLoadingDocs) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
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
          <div className="space-y-4">
            {user && (
              <div>
                <Label className="text-sm font-semibold mb-3 block">Tampilkan</Label>
                <RadioGroup value={viewMode} onValueChange={(value) => setViewMode(value as "own" | "department" | "all")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="own" id="own" />
                    <Label htmlFor="own" className="cursor-pointer">Nomor Saya</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="department" id="department" />
                    <Label htmlFor="department" className="cursor-pointer">Nomor Departemen</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="cursor-pointer">Semua Nomor</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold mb-3 block">Filter Jenis Dokumen</Label>
                <Select value={jenisFilter} onValueChange={setJenisFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis dokumen" />
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

              <div>
                <Label className="text-sm font-semibold mb-3 block">Filter Departemen</Label>
                <Select value={departemenFilter} onValueChange={setDepartemenFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih departemen" />
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
            </div>

            {(viewMode === "own" || viewMode === "department") && (
              <div>
                <Label className="text-sm font-semibold mb-3 block">Cari</Label>
                <Input
                  placeholder="Cari berdasarkan nama, jenis, departemen, atau deskripsi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
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
                ) : filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={viewMode !== "all" ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      Belum ada nomor dokumen. Klik "Buat Nomor Baru" untuk memulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => (
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
