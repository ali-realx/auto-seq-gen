import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (username: string, password: string, nama: string, lokasi: string, departemen: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for cached session
    const cachedSession = localStorage.getItem("sb-session");
    if (cachedSession) {
      const parsedSession = JSON.parse(cachedSession);
      setSession(parsedSession);
      setUser(parsedSession.user);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Cache session
        if (session) {
          localStorage.setItem("sb-session", JSON.stringify(session));
        } else {
          localStorage.removeItem("sb-session");
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, password: string) => {
    // Convert username to email format for Supabase
    const email = `${username}@enumbering.local`;
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      navigate("/dashboard");
    }
    
    return { error };
  };

  const signUp = async (username: string, password: string, nama: string, lokasi: string, departemen: string) => {
    // Convert username to email format for Supabase
    const email = `${username}@enumbering.local`;
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
          nama,
          lokasi,
          departemen,
        },
      },
    });
    
    if (!error) {
      navigate("/dashboard");
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("sb-session");
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
