import { Route, Switch, useLocation } from "wouter";
import { ThemeProvider } from "@/components/ui/theme-provider";
import Layout from "@/components/Layout";
import Login from "@/pages/login";
import Reception from "@/pages/reception";
import Accounts from "@/pages/accounts";
import Library from "@/pages/library";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

// Protected route component
const ProtectedRoute = ({ component: Component, roles, ...rest }: any) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (!isLoading && isAuthenticated && roles && user) {
      if (!roles.includes(user.role)) {
        // Redirect to appropriate page based on role
        switch(user.role) {
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
  }, [isLoading, isAuthenticated, user, roles, setLocation]);

  if (isLoading) {
    // You could render a loading spinner here
    return <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  if (!isAuthenticated) {
    return null; // The redirect will happen in the useEffect
  }

  return <Component {...rest} />;
};

function App() {
  const [currentLocation] = useLocation();
  const [appReady, setAppReady] = useState(false);
  
  useEffect(() => {
    // Simple check to indicate app is ready to render
    setAppReady(true);
  }, []);
  
  if (!appReady) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }
  
  return (
    <ThemeProvider defaultTheme="light" storageKey="naz-theme">
      <AuthProvider>
        {currentLocation === "/login" ? (
          <Login />
        ) : (
          <Layout>
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/" component={() => <ProtectedRoute component={Reception} roles={["Admin", "Receptionist"]} />} />
              <Route path="/reception" component={() => <ProtectedRoute component={Reception} roles={["Admin", "Receptionist"]} />} />
              <Route path="/accounts" component={() => <ProtectedRoute component={Accounts} roles={["Admin", "Accountant"]} />} />
              <Route path="/library" component={() => <ProtectedRoute component={Library} roles={["Admin", "LibraryOfficer"]} />} />
              <Route path="/reports" component={() => <ProtectedRoute component={Reports} roles={["Admin"]} />} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
