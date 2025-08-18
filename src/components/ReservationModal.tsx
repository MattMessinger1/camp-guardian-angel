import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, AlertTriangle } from "lucide-react";

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sessionTitle?: string;
  isLoading?: boolean;
}

export function ReservationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  sessionTitle = "Session",
  isLoading = false 
}: ReservationModalProps) {
  const [hasAcceptedFee, setHasAcceptedFee] = useState(false);

  const handleConfirm = () => {
    if (hasAcceptedFee) {
      onConfirm();
    }
  };

  const handleClose = () => {
    setHasAcceptedFee(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Confirm Reservation
          </DialogTitle>
          <DialogDescription>
            You're about to reserve: <strong>{sessionTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Success Fee Policy:</strong>
              <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                <li>$20 charge applies <strong>only if</strong> your registration succeeds</li>
                <li>No charge for failed attempts or if registration doesn't open</li>
                <li>Automatic refund if provider cancels the session</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="accept-fee"
              checked={hasAcceptedFee}
              onCheckedChange={(checked) => setHasAcceptedFee(checked === true)}
            />
            <label 
              htmlFor="accept-fee"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I authorize a $20 success fee only if my signup is successful
            </label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!hasAcceptedFee || isLoading}
            >
              {isLoading ? "Creating Reservation..." : "Confirm Reservation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}