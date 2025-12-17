import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, FileText, Settings } from 'lucide-react';

export default function AdminSettings() {
  const { userRole } = useAuth();

  // Redirect non-admins - role is now fetched from protected user_roles collection
  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground">
          Manage system settings and user permissions
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>Manage user accounts and roles</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Coming Soon</Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              View and manage all registered users, approve onboarding requests, and assign roles.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Moderation
            </CardTitle>
            <CardDescription>Review flagged listings and requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Coming Soon</Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              Review and moderate user-generated content, handle reports and violations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              KYC Verification
            </CardTitle>
            <CardDescription>Review identity documents</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Coming Soon</Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              Review and approve uploaded identity documents for user verification.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>Configure platform settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Coming Soon</Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure material types, regions, and other platform-wide settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
