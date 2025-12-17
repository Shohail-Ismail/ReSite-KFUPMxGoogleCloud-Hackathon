import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/hooks/use-theme";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/dashboard/Dashboard";
import Listings from "./pages/dashboard/Listings";
import CreateListing from "./pages/dashboard/CreateListing";
import Requests from "./pages/dashboard/Requests";
import CreateRequest from "./pages/dashboard/CreateRequest";
import MapView from "./pages/dashboard/MapView";
import Profile from "./pages/dashboard/Profile";
import Organisation from "./pages/dashboard/Organisation";
import AdminSettings from "./pages/dashboard/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="listings" element={<Listings />} />
                <Route path="create-listing" element={<CreateListing />} />
                <Route path="requests" element={<Requests />} />
                <Route path="create-request" element={<CreateRequest />} />
                <Route path="map" element={<MapView />} />
                <Route path="profile" element={<Profile />} />
                <Route path="organisation" element={<Organisation />} />
                <Route path="admin" element={<AdminSettings />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
