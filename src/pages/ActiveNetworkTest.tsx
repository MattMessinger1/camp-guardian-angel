import { ActiveNetworkTester } from '@/components/ActiveNetworkTester';

export default function ActiveNetworkTest() {
  console.log('🔥 ActiveNetworkTest component is rendering!');
  console.log('🔥 Current URL:', window.location.href);
  console.log('🔥 Current pathname:', window.location.pathname);
  
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">🚀 ActiveNetwork Testing</h1>
          <p className="text-muted-foreground">
            Test the camp registration automation system with ActiveNetwork providers
          </p>
          <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded">
            ✅ Page is rendering! Current URL: {window.location.pathname}
          </div>
        </div>
        <ActiveNetworkTester />
      </div>
    </div>
  );
}