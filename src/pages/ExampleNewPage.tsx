import React from 'react';
import { StandardPage } from '@/components/StandardPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Grid, Flex, Stack } from '@/components/ui/layout';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';

// Example of a new page using the StandardPage template
export default function ExampleNewPage() {
  const [loading, setLoading] = React.useState(false);

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <StandardPage 
      pageName="Example New Page"
      currentRoute="/example-new-page"
      title="Welcome to Your New Page"
      description="This page was created with all Quick Win features automatically included"
    >
      <Stack space="xl">
        {/* Automatic features included */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              ✅ Automatic Features Included
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Grid cols={1} responsive={{ md: 2 }} gap="md">
              <div>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>• Error Boundary wrapper</li>
                  <li>• Responsive layout system</li>
                  <li>• Smooth animations (fade-in, scale-in)</li>
                  <li>• UI Audit integration (🎨 button)</li>
                </ul>
              </div>
              <div>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>• Semantic HTML structure</li>
                  <li>• Consistent spacing & typography</li>
                  <li>• Mobile-first responsive design</li>
                  <li>• Design system colors & components</li>
                </ul>
              </div>
            </Grid>
          </CardContent>
        </Card>

        {/* Demo content */}
        <Grid cols={1} responsive={{ md: 2, lg: 3 }} gap="lg">
          <Card>
            <CardHeader>
              <CardTitle>Loading States</CardTitle>
            </CardHeader>
            <CardContent>
              <Flex direction="col" gap="md">
                <Button onClick={simulateLoading} disabled={loading}>
                  Test Loading
                </Button>
                {loading && <LoadingState type="card" items={1} />}
              </Flex>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responsive Grid</CardTitle>
            </CardHeader>
            <CardContent>
              <Grid cols={2} gap="sm">
                <div className="h-16 bg-primary/20 rounded animate-scale-in"></div>
                <div className="h-16 bg-secondary/20 rounded animate-scale-in"></div>
                <div className="h-16 bg-accent/20 rounded animate-scale-in"></div>
                <div className="h-16 bg-muted rounded animate-scale-in"></div>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>UI Components</CardTitle>
            </CardHeader>
            <CardContent>
              <Stack space="sm">
                <Badge variant="default">Primary Badge</Badge>
                <Badge variant="secondary">Secondary Badge</Badge>
                <Badge variant="outline">Outline Badge</Badge>
                <Button size="sm" className="animate-bounce-gentle">
                  Animated Button
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Usage instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Create Pages Like This</CardTitle>
          </CardHeader>
          <CardContent>
            <Stack space="md">
              <div>
                <h4 className="font-semibold mb-2">Option 1: StandardPage Component</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`<StandardPage 
  pageName="Your Page Name"
  currentRoute="/your-route"
  title="Page Title"
  description="Page description"
>
  {/* Your content here */}
</StandardPage>`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Option 2: HOC Wrapper</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`export default withStandardPage(
  YourComponent, 
  "Page Name", 
  "/route",
  { title: "Title", description: "Description" }
);`}
                </pre>
              </div>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </StandardPage>
  );
}