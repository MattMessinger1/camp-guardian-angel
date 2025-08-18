import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Search Results</h1>
          <p className="text-muted-foreground">Results for: "{query}"</p>
          <div className="mt-8 p-8 border rounded-lg">
            <p className="text-muted-foreground">Search functionality coming soon...</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}