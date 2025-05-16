import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Fetch current user session
  const { data: currentUser, isLoading: fetchingUser } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          return data.user;
        }
        return null;
      } catch (error) {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false
  });
  
  useEffect(() => {
    setIsLoading(fetchingUser);
  }, [fetchingUser]);
  
  // Login function
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Login failed");
      }
      
      const data = await res.json();
      
      // Invalidate the current user query to refetch
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Redirect based on role
      redirectBasedOnRole(data.user.role);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.fullName}`,
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      await apiRequest("GET", "/api/auth/logout");
      
      // Clear any user data in the query cache
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.setQueryData(["/api/auth/me"], null);
      
      // Redirect to login
      setLocation("/login");
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error logging out",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to redirect based on role
  const redirectBasedOnRole = (role: string) => {
    switch (role) {
      case "Receptionist":
        setLocation("/reception");
        break;
      case "Accountant":
        setLocation("/accounts");
        break;
      case "LibraryOfficer":
        setLocation("/library");
        break;
      case "Admin":
        setLocation("/reports");
        break;
      default:
        setLocation("/");
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user: currentUser || null,
        isLoading,
        login,
        logout,
        isAuthenticated: !!currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Custom hook for protected routes
export function useRequireAuth(allowedRoles?: string[]) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Not logged in, redirect to login
      setLocation("/login");
    } else if (!isLoading && isAuthenticated && allowedRoles && user) {
      // Check if user has the required role
      if (!allowedRoles.includes(user.role)) {
        // If not, redirect to their default page based on role
        switch (user.role) {
          case "Receptionist":
            setLocation("/reception");
            break;
          case "Accountant":
            setLocation("/accounts");
            break;
          case "LibraryOfficer":
            setLocation("/library");
            break;
          case "Admin":
            setLocation("/reports");
            break;
          default:
            setLocation("/");
        }
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, setLocation]);
  
  return { user, isLoading, isAuthenticated };
}