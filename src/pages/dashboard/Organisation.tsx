import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building, CheckCircle, XCircle, Save } from 'lucide-react';
import { getOrganisation, updateOrganisation } from '@/services/firestoreService';
import { useToast } from '@/hooks/use-toast';
import type { Organisation } from '@/types';

export default function OrganisationPage() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    address: '',
  });

  useEffect(() => {
    if (!userData?.organisationId) return;

    const loadOrganisation = async () => {
      try {
        const org = await getOrganisation(userData.organisationId);
        if (org) {
          setOrganisation(org);
          setFormData({
            name: org.name,
            registrationNumber: org.registrationNumber || '',
            address: org.address,
          });
        }
      } catch (error) {
        console.error('Error loading organisation:', error);
        toast({
          title: 'Error',
          description: 'Failed to load organisation details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadOrganisation();
  }, [userData?.organisationId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.organisationId || !organisation) return;

    setSaving(true);
    try {
      await updateOrganisation(userData.organisationId, formData);
      
      setOrganisation({
        ...organisation,
        ...formData,
      });

      toast({
        title: 'Success',
        description: 'Organisation details updated successfully',
      });
    } catch (error) {
      console.error('Error updating organisation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update organisation details',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading organisation details...</div>
        </div>
      </div>
    );
  }

  if (!organisation) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Organisation not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Building className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Organisation</h1>
          <p className="text-muted-foreground">Manage your organisation profile</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organisation Details</CardTitle>
            <CardDescription>Update your organisation information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organisation Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input
                  id="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Status Card */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verification Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {organisation.verified ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <Badge variant="default" className="bg-green-500">Verified</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-yellow-500" />
                    <Badge variant="secondary">Pending Verification</Badge>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {organisation.verified
                  ? 'Your organisation has been verified by our team.'
                  : 'Verification is pending. This will be enabled in future updates.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organisation ID</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs bg-muted p-2 rounded block break-all">
                {organisation.id}
              </code>
            </CardContent>
          </Card>

          {userData?.role === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Admin Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  You have administrator privileges for this organisation.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
