import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe, Database } from "lucide-react";

interface InternetSearchToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function InternetSearchToggle({ enabled, onToggle }: InternetSearchToggleProps) {
  return (
    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border">
      <div className="flex items-center space-x-2">
        {enabled ? (
          <Globe className="h-5 w-5 text-blue-600" />
        ) : (
          <Database className="h-5 w-5 text-gray-600" />
        )}
        <Label htmlFor="internet-search" className="flex flex-col space-y-1">
          <span className="font-medium">
            {enabled ? "Search Entire Internet" : "Search Our Database"}
          </span>
          <span className="text-sm text-muted-foreground">
            {enabled 
              ? "Find ANY camp or activity worldwide - we'll help you register!"
              : "Search our curated database of partner camps"
            }
          </span>
        </Label>
      </div>
      <Switch
        id="internet-search"
        checked={enabled}
        onCheckedChange={onToggle}
      />
    </div>
  );
}