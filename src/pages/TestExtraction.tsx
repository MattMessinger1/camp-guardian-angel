import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const TestExtraction = () => {
  const [htmlContent, setHtmlContent] = useState(`<!DOCTYPE html>
<html>
<head><title>Summer Camp - YMCA</title></head>
<body>
  <h1>Summer Camp 2024</h1>
  <p>Ages 5-12</p>
  <p>Location: Madison, WI</p>
  <p>Price: $250 per week</p>
  <p>Registration opens June 1st</p>
</body>
</html>`);
  
  const [sourceUrl, setSourceUrl] = useState("https://ymcadane.org/programs");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('Calling extract-session function...');
      
      const { data, error } = await supabase.functions.invoke('extract-session', {
        body: {
          html_content: htmlContent,
          source_url: sourceUrl
        }
      });
      
      if (error) {
        console.error('Function error:', error);
        setResult({ error: error.message, details: error });
      } else {
        console.log('Success:', data);
        setResult(data);
      }
    } catch (err: any) {
      console.error('Caught error:', err);
      setResult({ error: err.message, caught: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔬 Session Extraction Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Source URL</label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/programs"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">HTML Content</label>
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="h-32 font-mono text-sm"
            />
          </div>

          <Button 
            onClick={handleTest}
            disabled={loading || !htmlContent.trim() || !sourceUrl.trim()}
            className="w-full"
          >
            {loading ? "Testing..." : "Test Extract Function"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestExtraction;