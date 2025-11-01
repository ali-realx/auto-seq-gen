import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsSuperAdmin(false);
      return;
    }
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "superadmin")
          .single();

        if (mounted) setIsSuperAdmin(Boolean(data));
      } catch {
        if (mounted) setIsSuperAdmin(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1
              className="text-2xl font-bold text-primary cursor-pointer"
              onClick={() => navigate("/dashboard")}
            >
              E-Numbering
            </h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              Sistem pengelolaan nomor dokumen
            </p>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/superadmin")}
                  >
                    Super Admin
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/profile")}
                >
                  Profile
                </Button>

                <Button variant="outline" size="sm" onClick={signOut}>
                  Logout
                </Button>
              </>
            ) : (
              <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {children}
      </main>
    </div>
  );
}
