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

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

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
            <p className="text-muted-foreground">Daftar nomor dokumen Anda</p>
          </div>
          <Button onClick={() => navigate("/create-number")} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Buat Nomor Baru
          </Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-table-header">
                  <TableHead className="font-semibold">Nama</TableHead>
                  <TableHead className="font-semibold">Nomor Surat</TableHead>
                  <TableHead className="font-semibold">Jenis Surat</TableHead>
                  <TableHead className="font-semibold">Deskripsi</TableHead>
                  <TableHead className="font-semibold">Lokasi</TableHead>
                  <TableHead className="font-semibold">Departemen</TableHead>
                  <TableHead className="font-semibold">Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingDocs ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                      <TableCell className="max-w-xs truncate">{doc.deskripsi}</TableCell>
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
