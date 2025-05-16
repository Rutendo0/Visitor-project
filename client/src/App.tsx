import { Route, Switch } from "wouter";
import { ThemeProvider } from "@/components/ui/theme-provider";
import Layout from "@/components/Layout";
import Reception from "@/pages/reception";
import Library from "@/pages/library";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="naz-theme">
      <Layout>
        <Switch>
          <Route path="/" component={Reception} />
          <Route path="/reception" component={Reception} />
          <Route path="/library" component={Library} />
          <Route path="/reports" component={Reports} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </ThemeProvider>
  );
}

export default App;
