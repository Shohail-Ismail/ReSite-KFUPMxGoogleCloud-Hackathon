import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createListing, getListing, updateListingAIFields } from '@/services/firestoreService';
import { uploadListingImage } from '@/services/storageService';
import { classifyWithAI, getAIQuotaInfo, type QuotaInfo } from '@/services/aiClassifierService';
import type { ListingFormData, MaterialType, ConditionType, QuantityUnit } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MapPin, Sparkles } from 'lucide-react';
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

const CONDITIONS: { value: ConditionType; label: string }[] = [
  { value: 'unused', label: 'Unused' },
  { value: 'slightly_used', label: 'Slightly Used' },
  { value: 'used', label: 'Used' },
];

const UNITS: { value: QuantityUnit; label: string }[] = [
  { value: 'tonnes', label: 'Tonnes' },
  { value: 'm3', label: 'Cubic Meters (m³)' },
  { value: 'linear_m', label: 'Linear Meters (m)' },
  { value: 'bags', label: 'Bags' },
];

export default function CreateListing() {
  const navigate = useNavigate();
  const { currentUser, organisation } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [aiQuota, setAiQuota] = useState<QuotaInfo | null>(null);

  const [formData, setFormData] = useState<ListingFormData>({
    materialType: 'steel_beam',
    title: '',
    description: '',
    quantityValue: 0,
    quantityUnit: 'tonnes',
    condition: 'unused',
    location: {
      latitude: 24.7136,
      longitude: 46.6753,
      address: '',
    },
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Fetch AI quota on mount
  useEffect(() => {
    getAIQuotaInfo().then(setAiQuota);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !organisation) {
      toast.error('You must be logged in');
      return;
    }

    if (!formData.location.address) {
      toast.error('Please set a location for the listing');
      return;
    }

    setLoading(true);

    try {
      // Upload image first if provided
      let imageUrl: string | undefined;
      if (imageFile) {
        const tempId = `temp_${Date.now()}`;
        imageUrl = await uploadListingImage(imageFile, tempId);
      }

      // Create listing with image URL
      const listingId = await createListing(
        formData,
        organisation.id,
        currentUser.uid,
        imageUrl
      );

      // Run AI classification after listing is created (if quota available)
      if (aiQuota && !aiQuota.exhausted) {
        try {
          // Fetch the created listing to get full data
          const createdListing = await getListing(listingId);
          if (createdListing) {
            toast.loading('Running AI classification...', { id: 'ai-classify' });
            
            const classificationResult = await classifyWithAI(createdListing);
            
            if (classificationResult) {
              // Update listing with AI classification fields
              await updateListingAIFields(listingId, {
                aiMaterialType: classificationResult.aiMaterialType,
                aiConfidence: classificationResult.aiConfidence,
                aiDescription: classificationResult.aiDescription,
                aiVersion: classificationResult.aiVersion,
              });
              
              toast.dismiss('ai-classify');
              
              // Notify user about AI classification
              if (classificationResult.aiMaterialType !== formData.materialType) {
                toast.info(
                  `AI classified as: ${classificationResult.aiMaterialType.replace('_', ' ')} (${Math.round(classificationResult.aiConfidence * 100)}% confidence)`,
                  { duration: 5000 }
                );
              } else {
                toast.success(
                  `AI confirmed: ${classificationResult.aiMaterialType.replace('_', ' ')} (${Math.round(classificationResult.aiConfidence * 100)}% confidence)`,
                  { duration: 3000 }
                );
              }
              
              // Update quota display
              if (classificationResult.remaining !== undefined) {
                setAiQuota({
                  remaining: classificationResult.remaining,
                  max: classificationResult.max || 25,
                  exhausted: classificationResult.remaining <= 0,
                });
              }
            } else {
              toast.dismiss('ai-classify');
            }
          }
        } catch (classifyError) {
          toast.dismiss('ai-classify');
          console.error('[CreateListing] Classification failed:', classifyError);
        }
      }

      toast.success('Listing created successfully!');
      navigate('/dashboard/listings');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create listing');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingGate action="create listings">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Create Listing</h1>
            <p className="text-muted-foreground mt-1">List surplus materials for reuse</p>
          </div>
          {aiQuota && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI: {aiQuota.remaining}/{aiQuota.max}</span>
            </div>
          )}
        </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Listing Details</CardTitle>
            <CardDescription>
              Provide information about the material. AI will automatically classify it.
            </CardDescription>
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
                <Label htmlFor="condition">Condition *</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value: ConditionType) =>
                    setFormData({ ...formData, condition: value })
                  }
                >
                  <SelectTrigger id="condition" className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {CONDITIONS.map((cond) => (
                      <SelectItem key={cond.value} value={cond.value}>
                        {cond.label}
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
                placeholder="e.g., High-grade structural steel beams"
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
                placeholder="Describe the material, its current condition, and any relevant details..."
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
              <Label>Location *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="image">Image (Optional, improves AI classification)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 w-20 object-cover rounded-md"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Listing'}
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