import React from 'react';
import { Layout } from '@/components/Layout';
import { SmartSearchBar } from '@/components/SmartSearchBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search as SearchIcon, Filter, MapPin, Calendar, DollarSign } from 'lucide-react';

export default function Search() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Find Your Perfect Camp</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Search thousands of summer camps, activities, and programs. 
            Find the perfect fit for your child's interests and schedule.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-12">
          <SmartSearchBar className="w-full" />
        </div>

        {/* Search Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader className="text-center pb-4">
              <SearchIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">Smart Search</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Use natural language to find camps. Try "swimming camps near me" or "coding for teens"
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center pb-4">
              <Filter className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Filter by age, location, price, dates, and activity type to find exactly what you need
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center pb-4">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">Location Based</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Find camps near you or in specific cities and states across the country
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center pb-4">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">Ready to Signup</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Get prepared for camp registration with our guided signup assistance
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Popular Searches */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6 text-center">Popular Searches</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              'Swimming',
              'Arts & Crafts',
              'Sports',
              'STEM/Coding',
              'Dance',
              'Theater',
              'Outdoor Adventure',
              'Music',
              'Academic',
              'Day Camps',
              'Overnight Camps',
              'Teen Programs'
            ].map((category) => (
              <button
                key={category}
                className="p-3 text-left hover:bg-muted rounded-lg transition-colors border border-border"
                onClick={() => {
                  // This would trigger a search for this category
                  console.log(`Searching for: ${category}`);
                }}
              >
                <div className="font-medium">{category}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}