import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export function ResultCard({ 
  title, 
  city, 
  state, 
  url 
}: { 
  title: string; 
  city?: string | null; 
  state?: string | null; 
  url: string; 
}) {
  const subtitle = city && state ? `${city}, ${state}` : "—";
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground">
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          asChild 
          className="w-full"
          variant="default"
        >
          <a 
            href={url} 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center gap-2"
          >
            Select Your Session
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}