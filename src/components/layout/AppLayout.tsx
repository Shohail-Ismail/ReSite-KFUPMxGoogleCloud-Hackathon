import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { Footer } from '@/components/Footer';

export function AppLayout() {
  const { currentUser, loading, isOnboarded } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect non-onboarded users to onboarding page
  // unless they're trying to access profile (to see their status)
  if (!isOnboarded && location.pathname !== '/dashboard/profile') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
