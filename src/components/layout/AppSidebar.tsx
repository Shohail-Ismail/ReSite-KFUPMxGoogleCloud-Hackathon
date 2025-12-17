import { useLocation } from 'react-router-dom';
import { Package, FileText, Map, User, Recycle, LayoutDashboard, Building, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'My Listings', url: '/dashboard/listings', icon: Package },
  { title: 'My Requests', url: '/dashboard/requests', icon: FileText },
  { title: 'Map View', url: '/dashboard/map', icon: Map },
  { title: 'Profile', url: '/dashboard/profile', icon: User },
];

const adminNavItems = [
  { title: 'Organisation', url: '/dashboard/organisation', icon: Building },
  { title: 'Admin Settings', url: '/dashboard/admin', icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { userData, isOnboarded } = useAuth();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  const isAdmin = userData?.role === 'admin';

  // Filter nav items based on onboarding status
  const visibleNavItems = isOnboarded 
    ? navItems 
    : navItems.filter(item => item.url === '/dashboard' || item.url === '/dashboard/profile');

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-64'} collapsible="icon">
      <SidebarContent className="py-4">
        {/* Logo */}
        <div className="px-4 pb-4 mb-2 flex items-center gap-3 border-b border-sidebar-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary/20">
            <Recycle className="h-5 w-5 text-sidebar-primary" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-lg text-sidebar-foreground tracking-tight">ReSite</h1>
              <p className="text-xs text-sidebar-foreground/60">Circular Construction</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-4 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                        }`}
                      >
                        <item.icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                        {!collapsed && (
                          <span className="font-medium">{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - Only visible to admins */}
        {isAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-4 mb-2">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {adminNavItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                          }`}
                        >
                          <item.icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                          {!collapsed && (
                            <span className="font-medium">{item.title}</span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
