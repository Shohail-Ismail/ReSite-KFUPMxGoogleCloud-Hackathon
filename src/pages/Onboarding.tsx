import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase";
import { uploadIdDocument, getIdDocumentCount } from "@/services/storageService";
import { updateOrganisation } from "@/services/firestoreService";
import { logOnboardingCompleted, logIdUploaded, logProfileUpdated } from "@/services/analyticsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Recycle, Upload, AlertCircle, CheckCircle, FileImage, Zap } from "lucide-react";
import { toast } from "sonner";

const DEMO_DATA = {
  displayName: "Moksh Atukuri",
  phone: "+966 512 345 678",
  country: "Saudi Arabia",
  organisationName: "Riyadh Construction Co.",
};

const COUNTRIES = [
  "Saudi Arabia",
  "United Arab Emirates",
  "Kuwait",
  "Bahrain",
  "Qatar",
  "Oman",
  "Egypt",
  "Jordan",
  "Other",
];

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png"];
const MAX_TOTAL_ID_UPLOADS = 10;

export default function Onboarding() {
  const navigate = useNavigate();
  const { currentUser, userData, refreshUserData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: userData?.displayName || "",
    phone: "",
    country: "",
    organisationName: "",
  });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fileError, setFileError] = useState<string>("");

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return "Only JPEG and PNG images are allowed";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size must be less than ${MAX_FILE_SIZE_MB}MB`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError("");

    if (file) {
      const error = validateFile(file);
      if (error) {
        setFileError(error);
        setIdFile(null);
        setIdPreview("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setIdFile(file);
      setIdPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast.error("You must be logged in");
      return;
    }

    if (!idFile) {
      toast.error("Please upload an identity document");
      return;
    }

    if (!termsAccepted) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    if (!formData.displayName || !formData.phone || !formData.country || !formData.organisationName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // Check global upload limit
      const currentCount = await getIdDocumentCount();
      if (currentCount >= MAX_TOTAL_ID_UPLOADS) {
        toast.error("Maximum ID document uploads reached for this MVP. Please contact support.");
        setLoading(false);
        return;
      }

      // Upload ID document
      const idDocumentUrl = await uploadIdDocument(idFile, currentUser.uid);
      
      // Log ID upload event for RL pipeline
      await logIdUploaded(currentUser.uid, idFile.type);

      // Update user document with onboarding data
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        phone: formData.phone,
        country: formData.country,
        onboardingStatus: "completed",
        idDocumentUrl,
        onboardingCompletedAt: serverTimestamp(),
      });

      // Update organisation name if provided
      if (userData?.organisationId) {
        await updateOrganisation(userData.organisationId, {
          name: formData.organisationName,
        });
      }

      // Log analytics events for RL pipeline
      await logProfileUpdated(currentUser.uid, { phone: formData.phone, country: formData.country });
      await logOnboardingCompleted(currentUser.uid);

      // Refresh user data in context
      await refreshUserData();

      toast.success("Onboarding completed successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  // If user has already completed onboarding, redirect
  if (userData?.onboardingStatus === "completed") {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Recycle className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>Before you can create listings or requests, please verify your identity</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Personal Information</h3>

              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Enter your full name"
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+966 5XX XXX XXXX"
                  required
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger id="country" className="bg-card">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Organisation Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Organisation Information</h3>

              <div className="space-y-2">
                <Label htmlFor="organisationName">Organisation Name *</Label>
                <Input
                  id="organisationName"
                  value={formData.organisationName}
                  onChange={(e) => setFormData({ ...formData, organisationName: e.target.value })}
                  placeholder="Enter your organisation name"
                  required
                  maxLength={200}
                />
              </div>
            </div>

            {/* Identity Document Upload */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Identity Verification</h3>

              <Alert className="bg-muted/50 border-primary/20">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  Please upload a clear photo of your passport or driving licence.
                  <br />
                  <span className="text-muted-foreground text-xs">
                    Accepted formats: JPEG, PNG | Max size: {MAX_FILE_SIZE_MB}MB
                  </span>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="idDocument">Identity Document *</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Input
                      ref={fileInputRef}
                      id="idDocument"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                  </div>

                  {fileError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {fileError}
                    </p>
                  )}

                  {idPreview && (
                    <div className="relative w-full max-w-xs">
                      <img src={idPreview} alt="ID Preview" className="w-full h-auto rounded-md border border-border" />
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                  )}

                  {!idPreview && (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                      <FileImage className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No document uploaded yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                I acknowledge that I have read and agree to the ReSite Terms of Service and Privacy Policy. I confirm
                that the information provided is accurate and the uploaded document is valid.
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !idFile || !termsAccepted}>
              {loading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Completing Onboarding...
                </>
              ) : (
                "Complete Onboarding"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setFormData(DEMO_DATA);
                setTermsAccepted(true);
                toast.info("Demo data filled! Please upload any valid ID image to continue.");
              }}
            >
              <Zap className="h-4 w-4 mr-2" />
              Fill Demo Data
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
