import React from 'react';
import { Layout } from '@/components/Layout';
import { SmartSearchBar } from '@/components/SmartSearchBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search as SearchIcon, Filter, MapPin, Calendar, DollarSign } from 'lucide-react';

export default function Search() {
  console.log('Search component mounting');
  
  React.useEffect(() => {
    console.log('Search component mounted at /search');
  }, []);
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Find Your Activity / Camp</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get ready for signup
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto">
          <SmartSearchBar className="w-full" />
        </div>
      </div>
    </Layout>
  );
}