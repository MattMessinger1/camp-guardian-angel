import React from 'react';
import { X } from 'lucide-react';

type FacetChip = {
  label: string;
  value: string | number;
  onRemove: () => void;
};

type Props = {
  chips: FacetChip[];
  onClearAll: () => void;
};

export default function FacetChips({ chips, onClearAll }: Props) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border">
      <span className="text-sm text-muted-foreground">Active filters:</span>
      
      {chips.map((chip, index) => (
        <button
          key={index}
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
          aria-label={`Remove ${chip.label} filter`}
        >
          <span>{chip.label}</span>
          <X className="w-3 h-3" />
        </button>
      ))}

      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}