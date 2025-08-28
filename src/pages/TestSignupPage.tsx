import SimpleSignupTest from "@/components/SimpleSignupTest";

export default function TestSignupPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Signup Functionality Test</h1>
          <p className="text-muted-foreground mb-8">
            Test the complete camp signup automation system step by step.
          </p>
          
          <SimpleSignupTest />
        </div>
      </div>
    </div>
  );
}