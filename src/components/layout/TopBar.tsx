import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Building, ChevronDown } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useNavigate } from 'react-router-dom';
import { GlobalSearch } from '@/components/GlobalSearch';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function TopBar() {
  const { userData, organisation, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const initials = userData?.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <SidebarTrigger className="hover:bg-muted transition-colors rounded-lg" />
      
      {/* Global Search */}
      <div className="flex-1 max-w-md">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-3">
        {/* Organisation indicator */}
        {organisation && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <Building className="h-4 w-4" />
            <span className="font-medium">{organisation.name}</span>
          </div>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 px-2 hover:bg-muted transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
                {userData?.displayName}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userData?.displayName}</p>
                <p className="text-xs text-muted-foreground">{userData?.email}</p>
                {userData?.role === 'admin' && (
                  <span className="text-xs font-medium text-primary">Admin</span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => navigate('/dashboard/profile')}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            {userData?.role === 'admin' && (
              <DropdownMenuItem 
                onClick={() => navigate('/dashboard/organisation')}
                className="cursor-pointer"
              >
                <Building className="mr-2 h-4 w-4" />
                Organisation
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
