import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface Child {
  id: string;
  name: string;
  dob: string;
}

interface FuzzyDuplicateWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onCancel: () => void;
  childName: string;
  childDob: string;
  similarChild: Child;
  similarity: number;
}

/**
 * Calculate string similarity using Jaro-Winkler algorithm
 * Returns a value between 0 and 1, where 1 is identical
 */
function calculateJaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  if (matchWindow < 0) return 0;

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

  // Jaro-Winkler improvement
  const prefix = Math.min(4, Math.max(s1.length, s2.length));
  let commonPrefix = 0;
  for (let i = 0; i < prefix; i++) {
    if (s1[i] === s2[i]) commonPrefix++;
    else break;
  }

  return jaro + 0.1 * commonPrefix * (1 - jaro);
}

/**
 * Normalize name for comparison by removing diacritics, converting to lowercase,
 * and removing non-alphanumeric characters
 */
function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars but keep spaces
    .trim();
}

/**
 * Check if a child is a potential duplicate based on DOB match and name similarity
 * @param newChild - The child being added
 * @param existingChildren - List of existing children for the user
 * @param threshold - Similarity threshold (default 0.88)
 * @returns Similar child if found, null otherwise
 */
export function findSimilarChild(
  newChild: { name: string; dob: string },
  existingChildren: Child[],
  threshold: number = 0.88
): { child: Child; similarity: number } | null {
  for (const existing of existingChildren) {
    // Must have exact DOB match
    if (existing.dob !== newChild.dob) continue;

    // Calculate name similarity
    const normalizedNew = normalizeName(newChild.name);
    const normalizedExisting = normalizeName(existing.name);
    const similarity = calculateJaroWinkler(normalizedNew, normalizedExisting);

    if (similarity >= threshold) {
      return { child: existing, similarity };
    }
  }

  return null;
}

export function FuzzyDuplicateWarning({
  isOpen,
  onClose,
  onProceed,
  onCancel,
  childName,
  childDob,
  similarChild,
  similarity
}: FuzzyDuplicateWarningProps) {
  const [isProceeding, setIsProceeding] = useState(false);

  const handleProceed = () => {
    setIsProceeding(true);
    onProceed();
  };

  const handleCancel = () => {
    setIsProceeding(false);
    onCancel();
  };

  const handleClose = () => {
    setIsProceeding(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Possible Duplicate Child
          </DialogTitle>
          <DialogDescription>
            We found a similar child already in your account.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>
                <strong>New child:</strong> {childName} ({childDob})
              </p>
              <p>
                <strong>Existing child:</strong> {similarChild.name} ({similarChild.dob})
              </p>
              <p className="text-sm text-muted-foreground">
                Names are {Math.round(similarity * 100)}% similar with matching birth dates.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="text-sm text-muted-foreground">
          If this is the same child, you may want to cancel and use the existing record instead. 
          If these are different children (like twins), you can continue.
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isProceeding}
          >
            Cancel & Review
          </Button>
          <Button 
            onClick={handleProceed}
            disabled={isProceeding}
          >
            {isProceeding ? "Proceeding..." : "Continue Anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}