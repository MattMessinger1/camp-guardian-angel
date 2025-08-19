import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star, Plus, Trash2, ExternalLink, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RequirementResearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionTitle: string;
  currentRequirements?: any;
  daysUntilSignup?: number;
}

export function RequirementResearchModal({
  open,
  onOpenChange,
  sessionId,
  sessionTitle,
  currentRequirements,
  daysUntilSignup
}: RequirementResearchModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confidenceRating, setConfidenceRating] = useState(4);
  
  // Research findings state
  const [depositAmount, setDepositAmount] = useState("");
  const [parentFields, setParentFields] = useState<string[]>(["email", "phone"]);
  const [childFields, setChildFields] = useState<string[]>(["name", "dob"]);
  const [documents, setDocuments] = useState<string[]>(["waiver"]);
  const [sourceUrls, setSourceUrls] = useState<string[]>([""]);
  const [researchNotes, setResearchNotes] = useState("");

  const addField = (fields: string[], setFields: (fields: string[]) => void) => {
    setFields([...fields, ""]);
  };

  const updateField = (index: number, value: string, fields: string[], setFields: (fields: string[]) => void) => {
    const updated = [...fields];
    updated[index] = value;
    setFields(updated);
  };

  const removeField = (index: number, fields: string[], setFields: (fields: string[]) => void) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const addSourceUrl = () => {
    setSourceUrls([...sourceUrls, ""]);
  };

  const updateSourceUrl = (index: number, value: string) => {
    const updated = [...sourceUrls];
    updated[index] = value;
    setSourceUrls(updated);
  };

  const removeSourceUrl = (index: number) => {
    setSourceUrls(sourceUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Validate inputs
      const validSourceUrls = sourceUrls.filter(url => url.trim().length > 0);
      if (validSourceUrls.length === 0) {
        throw new Error("Please provide at least one source URL");
      }

      const validParentFields = parentFields.filter(field => field.trim().length > 0);
      const validChildFields = childFields.filter(field => field.trim().length > 0);
      const validDocuments = documents.filter(doc => doc.trim().length > 0);

      if (validParentFields.length === 0 && validChildFields.length === 0 && validDocuments.length === 0) {
        throw new Error("Please specify at least some requirements");
      }

      const research = {
        session_id: sessionId,
        found_requirements: {
          required_parent_fields: validParentFields,
          required_child_fields: validChildFields,
          required_documents: validDocuments,
          custom_requirements: {}
        },
        deposit_amount_cents: depositAmount ? parseInt(depositAmount) * 100 : undefined,
        source_urls: validSourceUrls,
        research_notes: researchNotes.trim(),
        confidence_rating: confidenceRating
      };

      const { data, error } = await supabase.functions.invoke('submit-requirement-research', {
        body: research
      });

      if (error) throw error;

      toast({
        title: data.auto_accepted ? "Research Accepted!" : "Research Submitted!",
        description: data.message,
        duration: 5000,
      });

      onOpenChange(false);
      
      // Reset form
      setDepositAmount("");
      setParentFields(["email", "phone"]);
      setChildFields(["name", "dob"]);
      setDocuments(["waiver"]);
      setSourceUrls([""]);
      setResearchNotes("");
      setConfidenceRating(4);

    } catch (error: any) {
      console.error("Research submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit research",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const urgencyLevel = daysUntilSignup !== undefined ? (
    daysUntilSignup <= 3 ? "urgent" :
    daysUntilSignup <= 7 ? "high" :
    daysUntilSignup <= 14 ? "medium" : "low"
  ) : "low";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Research Camp Requirements
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Urgency indicator */}
          {daysUntilSignup !== undefined && daysUntilSignup <= 14 && (
            <Card className={`border-l-4 ${
              urgencyLevel === 'urgent' ? 'border-red-500 bg-red-50' :
              urgencyLevel === 'high' ? 'border-orange-500 bg-orange-50' :
              'border-yellow-500 bg-yellow-50'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className={`h-4 w-4 ${
                    urgencyLevel === 'urgent' ? 'text-red-500' :
                    urgencyLevel === 'high' ? 'text-orange-500' :
                    'text-yellow-500'
                  }`} />
                  <span className="font-medium">
                    Registration opens in {daysUntilSignup} days
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Help yourself and other parents by researching the exact signup requirements!
                </p>
              </CardContent>
            </Card>
          )}

          {/* Session info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{sessionTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Research the official camp website or call them directly to find out exactly what information and documents they require for registration.
              </p>
            </CardContent>
          </Card>

          {/* Current estimated requirements */}
          {currentRequirements && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Current Estimated Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {currentRequirements.deposit_amount_cents && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Deposit</Badge>
                    <span className="text-sm">${(currentRequirements.deposit_amount_cents / 100).toFixed(2)}</span>
                  </div>
                )}
                {currentRequirements.required_parent_fields?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Parent Info</Badge>
                    <span className="text-sm">{currentRequirements.required_parent_fields.join(", ")}</span>
                  </div>
                )}
                {currentRequirements.required_documents?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Documents</Badge>
                    <span className="text-sm">{currentRequirements.required_documents.join(", ")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Research form */}
          <div className="space-y-4">
            <h3 className="font-medium">Your Research Findings</h3>

            {/* Deposit amount */}
            <div className="space-y-2">
              <Label htmlFor="deposit">Deposit Amount (USD)</Label>
              <Input
                id="deposit"
                type="number"
                placeholder="50"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>

            {/* Parent fields */}
            <div className="space-y-2">
              <Label>Required Parent Information</Label>
              {parentFields.map((field, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="e.g., email, phone, emergency contact"
                    value={field}
                    onChange={(e) => updateField(index, e.target.value, parentFields, setParentFields)}
                  />
                  {parentFields.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeField(index, parentFields, setParentFields)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addField(parentFields, setParentFields)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Field
              </Button>
            </div>

            {/* Child fields */}
            <div className="space-y-2">
              <Label>Required Child Information</Label>
              {childFields.map((field, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="e.g., name, date of birth, medical info"
                    value={field}
                    onChange={(e) => updateField(index, e.target.value, childFields, setChildFields)}
                  />
                  {childFields.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeField(index, childFields, setChildFields)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addField(childFields, setChildFields)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Field
              </Button>
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <Label>Required Documents</Label>
              {documents.map((doc, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="e.g., waiver, medical form, photo release"
                    value={doc}
                    onChange={(e) => updateField(index, e.target.value, documents, setDocuments)}
                  />
                  {documents.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeField(index, documents, setDocuments)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addField(documents, setDocuments)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Document
              </Button>
            </div>

            {/* Source URLs */}
            <div className="space-y-2">
              <Label>Source URLs <span className="text-red-500">*</span></Label>
              {sourceUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="https://camp-website.com/registration"
                      value={url}
                      onChange={(e) => updateSourceUrl(index, e.target.value)}
                    />
                    {url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => window.open(url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {sourceUrls.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeSourceUrl(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addSourceUrl}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Source
              </Button>
            </div>

            {/* Research notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional details about the registration process, special requirements, or tips for other parents..."
                value={researchNotes}
                onChange={(e) => setResearchNotes(e.target.value)}
              />
            </div>

            {/* Confidence rating */}
            <div className="space-y-2">
              <Label>How confident are you in this information?</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={confidenceRating >= rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConfidenceRating(rating)}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {confidenceRating >= 5 ? "Very confident - verified directly with camp" :
                 confidenceRating >= 4 ? "Confident - found on official website" :
                 confidenceRating >= 3 ? "Somewhat confident - mixed sources" :
                 confidenceRating >= 2 ? "Low confidence - unofficial sources" :
                 "Guessing - minimal information"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit Research"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}