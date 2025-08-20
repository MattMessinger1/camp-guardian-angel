import React from 'react';

export default function SimpleTest() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold">Simple Test Page Works!</h1>
      <p>If you can see this, routing is working correctly.</p>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Next Steps:</h2>
        <ul className="space-y-2">
          <li>✅ Basic routing works</li>
          <li>📱 Test existing readiness pages:</li>
          <li className="ml-4">
            <a href="/readiness" className="text-blue-600 hover:underline">
              /readiness - Configuration page
            </a>
          </li>
          <li className="ml-4">
            <a href="/sessions" className="text-blue-600 hover:underline">
              /sessions - Sessions list
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}