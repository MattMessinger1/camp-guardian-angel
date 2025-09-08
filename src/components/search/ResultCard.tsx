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
  
  const handleSelectSession = () => {
    console.log('🔗 ResultCard click:', { title, url, city, state });
    
    if (!url || url === 'null') {
      console.warn('⚠️ No URL available for result:', title);
      alert(`Sorry, no direct booking URL available for ${title}. Please search for them online.`);
      return;
    }
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
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
          className="w-full"
          variant="default"
          onClick={handleSelectSession}
        >
          <span className="inline-flex items-center gap-2">
            Select Your Session
            <ExternalLink className="h-4 w-4" />
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}