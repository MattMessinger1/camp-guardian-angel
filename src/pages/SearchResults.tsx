import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import SearchBar from '@/components/search/SearchBar';
import Results from '@/components/search/Results';
import { useSearch } from '@/components/search/useSearch';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const {
    q, setQ,
    city, setCity,
    state, setState,
    ageMin, setAgeMin,
    ageMax, setAgeMax,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    priceMax, setPriceMax,
    availability, setAvailability,
    loading,
    error,
    items,
    meta,
    run
  } = useSearch();

  // Set initial query from URL params
  useEffect(() => {
    if (query && query !== q) {
      setQ(query);
    }
  }, [query, q, setQ]);

  // Run search when query changes
  useEffect(() => {
    if (q) {
      run();
    }
  }, [q, run]);

  return (
    <Layout>
      <div className="min-h-screen">
        <SearchBar
          q={q}
          setQ={setQ}
          city={city}
          setCity={setCity}
          state={state}
          setState={setState}
          ageMin={ageMin}
          setAgeMin={setAgeMin}
          ageMax={ageMax}
          setAgeMax={setAgeMax}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          priceMax={priceMax}
          setPriceMax={setPriceMax}
          availability={availability}
          setAvailability={setAvailability}
          onSearch={run}
        />
        
        <div className="max-w-6xl mx-auto px-4 pb-8">
          <Results
            loading={loading}
            error={error}
            items={items}
          />
        </div>
      </div>
    </Layout>
  );
}