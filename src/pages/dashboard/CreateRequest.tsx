import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createRequest } from '@/services/firestoreService';
import type { RequestFormData, MaterialType, QuantityUnit, UrgencyLevel } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { LocationPicker } from '@/components/LocationPicker';
import { OnboardingGate } from '@/components/OnboardingGate';

const MATERIALS: { value: MaterialType; label: string }[] = [
  { value: 'steel_beam', label: 'Steel Beam' },
  { value: 'rebar', label: 'Rebar' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'aggregates', label: 'Aggregates' },
  { value: 'timber', label: 'Timber' },
];

const URGENCY_LEVELS: { value: UrgencyLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const UNITS: { value: QuantityUnit; label: string }[] = [
  { value: 'tonnes', label: 'Tonnes' },
  { value: 'm3', label: 'Cubic Meters (m³)' },
  { value: 'linear_m', label: 'Linear Meters (m)' },
  { value: 'bags', label: 'Bags' },
];

export default function CreateRequest() {
  const navigate = useNavigate();
  const { currentUser, organisation } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [formData, setFormData] = useState<RequestFormData>({
    materialType: 'steel_beam',
    title: '',
    description: '',
    quantityValue: 0,
    quantityUnit: 'tonnes',
    urgency: 'medium',
    location: {
      latitude: 24.7136,
      longitude: 46.6753,
      address: '',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !organisation) {
      toast.error('You must be logged in');
      return;
    }

    if (!formData.location.address) {
      toast.error('Please set a location for the request');
      return;
    }

    setLoading(true);

    try {
      await createRequest(formData, organisation.id, currentUser.uid);
      toast.success('Request created successfully!');
      navigate('/dashboard/requests');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create request');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingGate action="create requests">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create Request</h1>
            <p className="text-muted-foreground mt-1">Request materials you need for your project</p>
          </div>
        </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>Describe what material you're looking for</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material">Material Type *</Label>
                <Select
                  value={formData.materialType}
                  onValueChange={(value: MaterialType) =>
                    setFormData({ ...formData, materialType: value })
                  }
                >
                  <SelectTrigger id="material" className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {MATERIALS.map((mat) => (
                      <SelectItem key={mat.value} value={mat.value}>
                        {mat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency *</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value: UrgencyLevel) =>
                    setFormData({ ...formData, urgency: value })
                  }
                >
                  <SelectTrigger id="urgency" className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {URGENCY_LEVELS.map((urg) => (
                      <SelectItem key={urg.value} value={urg.value}>
                        {urg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Need structural steel for warehouse expansion"
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your requirements, timeline, and any specific criteria..."
                required
                rows={4}
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quantityValue || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, quantityValue: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Select
                  value={formData.quantityUnit}
                  onValueChange={(value: QuantityUnit) =>
                    setFormData({ ...formData, quantityUnit: value })
                  }
                >
                  <SelectTrigger id="unit" className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Delivery Location *</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.location.address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: { ...formData.location, address: e.target.value },
                    })
                  }
                  placeholder="Enter address or select on map"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLocationPicker(true)}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Map
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Request'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {showLocationPicker && (
        <LocationPicker
          onSelect={(location) => {
            setFormData({ ...formData, location });
            setShowLocationPicker(false);
          }}
          onClose={() => setShowLocationPicker(false)}
          initialLocation={formData.location}
        />
      )}
      </div>
    </OnboardingGate>
  );
}
