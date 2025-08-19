import React from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoadingState } from '@/components/ui/loading-state';
import { Grid, Container, Flex, Stack, Section } from '@/components/ui/layout';
import { UIAuditToggle } from '@/components/ui/ui-audit-integration';
import { SkeletonCard, SkeletonList, SkeletonSearch } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function UIShowcase() {
  const [loading, setLoading] = React.useState(false);
  const [showError, setShowError] = React.useState(false);

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  const ErrorComponent = () => {
    if (showError) {
      throw new Error('This is a demonstration error for testing the Error Boundary');
    }
    return null;
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <Container size="xl" padding="lg">
          <Section padding="lg">
            <Stack space="xl">
              {/* Hero Section */}
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4 animate-fade-in">UI System Showcase</h1>
                <p className="text-lg text-muted-foreground mb-8 animate-fade-in">
                  Demonstrating all the Quick Win improvements: Loading States, Error Boundaries, 
                  Responsive Grid, Animation System, and UI Audit Integration
                </p>
              </div>

              {/* Control Panel */}
              <Card className="animate-scale-in">
                <CardHeader>
                  <CardTitle>Interactive Demo Controls</CardTitle>
                </CardHeader>
                <CardContent>
                  <Flex gap="md" wrap={true}>
                    <Button onClick={simulateLoading} disabled={loading}>
                      {loading ? 'Loading...' : 'Test Loading States'}
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowError(!showError)}
                    >
                      {showError ? 'Hide Error' : 'Test Error Boundary'}
                    </Button>
                    <Badge variant="outline" className="animate-bounce-gentle">
                      All systems operational
                    </Badge>
                  </Flex>
                </CardContent>
              </Card>

              {/* Error Component (will trigger error boundary if showError is true) */}
              <ErrorComponent />

              {/* Loading States Demo */}
              {loading ? (
                <Stack space="lg">
                  <h2 className="text-2xl font-semibold">Loading States Demo</h2>
                  <LoadingState type="search" items={3} title="Loading camps..." />
                </Stack>
              ) : (
                <Stack space="lg">
                  <h2 className="text-2xl font-semibold animate-fade-in">Responsive Grid System</h2>
                  
                  {/* Mobile-first responsive grid */}
                  <Grid 
                    cols={1} 
                    responsive={{ sm: 2, md: 3, lg: 4 }} 
                    gap="lg"
                    className="animate-fade-in"
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Card key={i} className="hover:shadow-lg transition-shadow animate-scale-in">
                        <CardContent className="p-6">
                          <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg mb-4"></div>
                          <h3 className="font-semibold mb-2">Grid Item {i + 1}</h3>
                          <p className="text-sm text-muted-foreground">
                            This demonstrates the responsive grid system with mobile-first design
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </Grid>
                </Stack>
              )}

              {/* Skeleton Patterns */}
              <Stack space="lg">
                <h2 className="text-2xl font-semibold">Skeleton Loading Patterns</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div>
                    <h3 className="font-medium mb-4">Card Skeleton</h3>
                    <SkeletonCard />
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-4">List Skeleton</h3>
                    <SkeletonList items={3} />
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-4">Search Skeleton</h3>
                    <div className="scale-75 origin-top">
                      <SkeletonSearch />
                    </div>
                  </div>
                </div>
              </Stack>

              {/* Animation System Demo */}
              <Stack space="lg">
                <h2 className="text-2xl font-semibold">Animation System</h2>
                
                <Grid cols={2} responsive={{ md: 4 }} gap="md">
                  <div className="p-6 border rounded-lg animate-fade-in">
                    <div className="w-12 h-12 bg-primary rounded-full mb-3"></div>
                    <p className="text-sm">Fade In</p>
                  </div>
                  
                  <div className="p-6 border rounded-lg animate-scale-in">
                    <div className="w-12 h-12 bg-secondary rounded-full mb-3"></div>
                    <p className="text-sm">Scale In</p>
                  </div>
                  
                  <div className="p-6 border rounded-lg animate-bounce-gentle">
                    <div className="w-12 h-12 bg-accent rounded-full mb-3"></div>
                    <p className="text-sm">Gentle Bounce</p>
                  </div>
                  
                  <div className="p-6 border rounded-lg hover:animate-slide-in-right">
                    <div className="w-12 h-12 bg-destructive rounded-full mb-3"></div>
                    <p className="text-sm">Slide (Hover)</p>
                  </div>
                </Grid>
              </Stack>

              {/* Layout Components Demo */}
              <Stack space="lg">
                <h2 className="text-2xl font-semibold">Layout Components</h2>
                
                <Section background="muted" padding="md">
                  <Flex justify="between" align="center" wrap={true}>
                    <div>
                      <h3 className="font-semibold">Flex Layout</h3>
                      <p className="text-sm text-muted-foreground">Responsive flexbox utilities</p>
                    </div>
                    <Button variant="outline">Action</Button>
                  </Flex>
                </Section>
              </Stack>

              {/* Success Message */}
              <Card className="border-green-200 bg-green-50 animate-fade-in">
                <CardContent className="p-6">
                  <Flex align="center" gap="md">
                    <div className="text-2xl">🎉</div>
                    <div>
                      <h3 className="font-semibold text-green-800">Quick Wins Implemented!</h3>
                      <p className="text-sm text-green-700">
                        All UI improvements are now available throughout your app. 
                        Click the 🎨 button to audit this page!
                      </p>
                    </div>
                  </Flex>
                </CardContent>
              </Card>
            </Stack>
          </Section>
        </Container>

        {/* UI Audit Integration */}
        <UIAuditToggle 
          pageName="UI Showcase" 
          currentRoute="/ui-showcase" 
        />
      </div>
    </ErrorBoundary>
  );
}