import { ActiveNetworkTester } from '../components/ActiveNetworkTester';

export default function ActiveNetworkTest() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">ActiveNetwork Testing</h1>
          <p className="text-muted-foreground">
            Test the camp registration automation system with ActiveNetwork providers
          </p>
        </div>
        <ActiveNetworkTester />
      </div>
    </div>
  );
}