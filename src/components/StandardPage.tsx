import React from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Container, Section } from '@/components/ui/layout';
import { UIAuditToggle } from '@/components/ui/ui-audit-integration';
import { Layout } from '@/components/Layout';

interface StandardPageProps {
  children: React.ReactNode;
  pageName: string;
  currentRoute: string;
  title?: string;
  description?: string;
  useLayout?: boolean;
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  sectionPadding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * StandardPage - Template that includes ALL Quick Win features automatically:
 * ✅ Error Boundary wrapper
 * ✅ Responsive layout system
 * ✅ Animation classes ready
 * ✅ UI Audit integration
 * ✅ Semantic HTML structure
 * ✅ Consistent spacing
 */
export function StandardPage({
  children,
  pageName,
  currentRoute,
  title,
  description,
  useLayout = true,
  containerSize = 'xl',
  sectionPadding = 'lg'
}: StandardPageProps) {
  const content = (
    <ErrorBoundary>
      <div className="min-h-screen bg-background animate-fade-in">
        <Container size={containerSize}>
          <Section padding={sectionPadding}>
            <main role="main">
              {(title || description) && (
                <header className="mb-8 text-center animate-scale-in">
                  {title && (
                    <h1 className="text-3xl font-bold mb-4">{title}</h1>
                  )}
                  {description && (
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                      {description}
                    </p>
                  )}
                </header>
              )}
              
              <div className="animate-fade-in">
                {children}
              </div>
            </main>
          </Section>
        </Container>

        {/* Automatic UI Audit integration */}
        <UIAuditToggle pageName={pageName} currentRoute={currentRoute} />
      </div>
    </ErrorBoundary>
  );

  // Optionally wrap with app Layout (for nav/header/footer)
  if (useLayout) {
    return <Layout>{content}</Layout>;
  }

  return content;
}

/**
 * HOC that wraps any component with StandardPage features
 */
export function withStandardPage<P extends object>(
  Component: React.ComponentType<P>,
  pageName: string,
  currentRoute: string,
  options: {
    title?: string;
    description?: string;
    useLayout?: boolean;
    containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  } = {}
) {
  const WrappedComponent = (props: P) => (
    <StandardPage
      pageName={pageName}
      currentRoute={currentRoute}
      title={options.title}
      description={options.description}
      useLayout={options.useLayout}
      containerSize={options.containerSize}
    >
      <Component {...props} />
    </StandardPage>
  );
  
  WrappedComponent.displayName = `withStandardPage(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Hook for pages that need the Standard Page features programmatically
 */
export function useStandardPage(pageName: string, currentRoute: string) {
  return {
    pageClasses: "min-h-screen bg-background animate-fade-in",
    contentClasses: "animate-fade-in", 
    headerClasses: "mb-8 text-center animate-scale-in",
    auditToggle: <UIAuditToggle pageName={pageName} currentRoute={currentRoute} />
  };
}