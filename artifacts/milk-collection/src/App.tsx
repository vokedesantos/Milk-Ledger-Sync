import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

import Login from "@/pages/auth/login";
import Dashboard from "@/pages/dashboard";
import FarmerCollection from "@/pages/farmer";
import CustomerSale from "@/pages/customer";
import Records from "@/pages/records";
import Contacts from "@/pages/contacts";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/auth/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/farmer" component={FarmerCollection} />
      <Route path="/customer" component={CustomerSale} />
      <Route path="/records" component={Records} />
      <Route path="/contacts" component={Contacts} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
