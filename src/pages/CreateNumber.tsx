import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import NumberModal from "@/components/NumberModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  nama: string;
  lokasi: string;
  departemen: string;
}

const CreateNumber = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);

  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("");
  const [description, setDescription] = useState("");
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedNumber, setGeneratedNumber] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchMasterData();
    if (user) {
      fetchCurrentUserProfile();
    }
  }, [user]);

  const fetchCurrentUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) {
      setCurrentUserProfile(data);
      setSelectedLocation(data.lokasi);
      setSelectedName(data.nama);
      setSelectedDepartment(data.departemen);
    }
  };

  useEffect(() => {
    if (selectedLocation) {
      const filtered = profiles.filter((p) => p.lokasi === selectedLocation);
      setFilteredProfiles(filtered);
      setSelectedName("");
      setSelectedDepartment("");
    }
  }, [selectedLocation, profiles]);

  useEffect(() => {
    if (selectedName) {
      const profile = profiles.find((p) => p.nama === selectedName);
      if (profile) {
        setSelectedDepartment(profile.departemen);
      }
    }
  }, [selectedName, profiles]);

  const fetchMasterData = async () => {
    const [locsResult, deptsResult, docTypesResult, profilesResult] = await Promise.all([
      supabase.from("locations").select("*").order("nama"),
      supabase.from("departments").select("*").order("nama"),
      supabase.from("document_types").select("*").order("nama"),
      supabase.from("profiles").select("*"),
    ]);

    if (locsResult.data) setLocations(locsResult.data);
    if (deptsResult.data) setDepartments(deptsResult.data);
    if (docTypesResult.data) setDocumentTypes(docTypesResult.data);
    if (profilesResult.data) setProfiles(profilesResult.data);
  };

  const handleGetNumber = async () => {
    if (!selectedLocation || !selectedName || !selectedDocType || !description) {
      toast({
        variant: "destructive",
        title: "Data tidak lengkap",
        description: "Mohon lengkapi semua data",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-number", {
        body: {
          user_id: user?.id,
          nama: selectedName,
          lokasi: selectedLocation,
          departemen: selectedDepartment,
          jenis_surat: selectedDocType,
          deskripsi: description,
        },
      });

      if (error) throw error;

      if (data.number) {
        setGeneratedNumber(data.number);
        setIsModalOpen(true);
        
        // Reset form fields except location and name
        setSelectedDocType("");
        setDescription("");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal generate nomor",
        description: error.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading || isGenerating) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">{isGenerating ? "Generating number..." : "Loading..."}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Buat Nomor Baru</h2>
            <p className="text-muted-foreground">Isi formulir untuk generate nomor dokumen</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Formulir Penomoran</CardTitle>
            <CardDescription>Lengkapi data berikut untuk mendapatkan nomor dokumen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Lokasi</Label>
              <Select 
                value={selectedLocation} 
                onValueChange={setSelectedLocation}
                disabled={user && currentUserProfile !== null}
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder={user ? "Auto-selected" : "Pilih lokasi"} />
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

            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Select 
                value={selectedName} 
                onValueChange={setSelectedName}
                disabled={!selectedLocation || (user && currentUserProfile !== null)}
              >
                <SelectTrigger id="name">
                  <SelectValue placeholder={user ? "Auto-selected" : "Pilih nama"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.nama}>
                      {profile.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departemen</Label>
              <Select value={selectedDepartment} disabled>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Otomatis terisi" />
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

            <div className="space-y-2">
              <Label htmlFor="doctype">Jenis Dokumen</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger id="doctype">
                  <SelectValue placeholder="Pilih jenis dokumen" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((doc) => (
                    <SelectItem key={doc.id} value={doc.nama}>
                      {doc.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Masukkan deskripsi dokumen"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <Button 
              onClick={handleGetNumber} 
              className="w-full" 
              size="lg"
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Get Number"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <NumberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        number={generatedNumber}
      />
    </Layout>
  );
};

export default CreateNumber;
