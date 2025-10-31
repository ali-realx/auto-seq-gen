import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserManagement } from "@/components/superadmin/UserManagement";
import { MasterDataManagement } from "@/components/superadmin/MasterDataManagement";

const SuperAdmin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; nama: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; nama: string }>>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkSuperAdminRole();
      fetchMasterData();
    }
  }, [user]);

  const checkSuperAdminRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id)
      .eq("role", "superadmin")
      .single();

    if (!data) {
      toast({
        variant: "destructive",
        title: "Akses ditolak",
        description: "Anda tidak memiliki akses ke halaman ini",
      });
      navigate("/dashboard");
    } else {
      setIsSuperAdmin(true);
    }
  };

  const fetchMasterData = async () => {
    const [locsResult, deptsResult] = await Promise.all([
      supabase.from("locations").select("id, nama").order("nama"),
      supabase.from("departments").select("id, nama").order("nama"),
    ]);

    if (locsResult.data) setLocations(locsResult.data);
    if (deptsResult.data) setDepartments(deptsResult.data);
  };

  if (loading || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Super Admin Panel</h2>
            <p className="text-muted-foreground">Kelola master data aplikasi</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Manajemen Data</CardTitle>
            <CardDescription>Kelola users, jenis dokumen, lokasi, dan departemen</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="doctypes">Jenis Dokumen</TabsTrigger>
                <TabsTrigger value="locations">Lokasi</TabsTrigger>
                <TabsTrigger value="departments">Departemen</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="users" className="space-y-4">
                <UserManagement locations={locations} departments={departments} />
              </TabsContent>
              
              <TabsContent value="doctypes" className="space-y-4">
                <MasterDataManagement 
                  title="Jenis Dokumen" 
                  tableName="document_types" 
                  onDataChange={fetchMasterData}
                />
              </TabsContent>
              
              <TabsContent value="locations" className="space-y-4">
                <MasterDataManagement 
                  title="Lokasi" 
                  tableName="locations" 
                  onDataChange={fetchMasterData}
                />
              </TabsContent>
              
              <TabsContent value="departments" className="space-y-4">
                <MasterDataManagement 
                  title="Departemen" 
                  tableName="departments" 
                  onDataChange={fetchMasterData}
                />
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4">
                <div className="text-center py-12 text-muted-foreground">
                  <p>Fitur pengaturan aplikasi akan segera tersedia</p>
                  <p className="text-sm mt-2">Logo dan nama aplikasi dapat diubah di sini</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SuperAdmin;
