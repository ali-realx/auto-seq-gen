import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SuperAdmin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    
    // Check if user is superadmin
    if (user && user.email !== "superadmin@enumber.app") {
      toast({
        variant: "destructive",
        title: "Akses ditolak",
        description: "Anda tidak memiliki akses ke halaman ini",
      });
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

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
                <div className="text-center py-12 text-muted-foreground">
                  <p>Fitur manajemen users akan segera tersedia</p>
                  <p className="text-sm mt-2">Untuk saat ini, user dapat mendaftar sendiri melalui halaman register</p>
                </div>
              </TabsContent>
              
              <TabsContent value="doctypes" className="space-y-4">
                <div className="text-center py-12 text-muted-foreground">
                  <p>Fitur manajemen jenis dokumen akan segera tersedia</p>
                </div>
              </TabsContent>
              
              <TabsContent value="locations" className="space-y-4">
                <div className="text-center py-12 text-muted-foreground">
                  <p>Fitur manajemen lokasi akan segera tersedia</p>
                </div>
              </TabsContent>
              
              <TabsContent value="departments" className="space-y-4">
                <div className="text-center py-12 text-muted-foreground">
                  <p>Fitur manajemen departemen akan segera tersedia</p>
                </div>
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
