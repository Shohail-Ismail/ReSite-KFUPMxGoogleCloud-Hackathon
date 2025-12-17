import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, User, Shield, CheckCircle2, Clock } from 'lucide-react';

export default function Profile() {
  const { userData, organisation } = useAuth();

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="text-muted-foreground">View and manage your account information</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Information Card */}
        <Card className="card-interactive">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">User Information</CardTitle>
                <CardDescription>Your personal details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Display Name</p>
                <p className="font-medium text-foreground">{userData?.displayName || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                <p className="font-medium text-foreground">{userData?.email || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</p>
                <Badge variant="outline" className="capitalize">{userData?.role || 'standard'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organisation Information Card */}
        <Card className="card-interactive">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Organisation</CardTitle>
                <CardDescription>Your organisation details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</p>
                <p className="font-medium text-foreground">{organisation?.name || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</p>
                <p className="font-medium text-foreground">{organisation?.address || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
              {organisation?.verified ? (
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              ) : (
                <Clock className="h-5 w-5 text-warning mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verification</p>
                <Badge variant={organisation?.verified ? 'success' : 'warning'}>
                  {organisation?.verified ? 'Verified' : 'Pending'}
                </Badge>
              </div>
            </div>
            {organisation?.registrationNumber && (
              <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Registration Number</p>
                  <p className="font-medium text-foreground font-mono">{organisation.registrationNumber}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
