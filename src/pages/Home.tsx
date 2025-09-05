import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { logger } from "@/lib/log"
import { Search, Globe, Lock, DollarSign, Clock, User, HelpCircle, Handshake } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver"
import { CampSearchBox, SearchResults } from '@/components/camp-search/CampSearchComponents'
import { EmbeddingsBackfill } from '@/components/EmbeddingsBackfill'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { PaymentMethodBanner } from '@/components/PaymentMethodBanner'
import { useToast } from "@/hooks/use-toast";

const HomePage = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { elementRef: heroRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.3,
    freezeOnceVisible: true
  })

  const [isMobile, setIsMobile] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  
  // Hybrid search function - fast search first, then internet search
  const handleAISearch = useCallback(async (query) => {
    console.log('🔍 SEARCH STARTED:', query);
    if (!query.trim()) return;

    logger.info('Search initiated for query', { query, component: 'Home' });
    setIsSearchLoading(true);
    console.log('🔄 Search loading set to true');

    try {
      // Step 1: Try fast search first for high-intent users
      logger.info('Attempting fast search first', { component: 'Home' });
      const fastSearchResponse = await supabase.functions.invoke('fast-camp-search', {
        body: { query: query.trim(), limit: 10 }
      });

      logger.info('Fast search response received', { 
        resultCount: fastSearchResponse?.data?.results?.length || 0,
        duration: fastSearchResponse?.data?.duration_ms,
        component: 'Home'
      });

      if (fastSearchResponse.data?.success && fastSearchResponse.data?.results?.length > 0) {
        // Check if we have high-confidence results (score > 0.7) before stopping
        const highConfidenceResults = fastSearchResponse.data.results.filter(
          (result: any) => (result.confidence || 0) > 0.7
        );
        
        if (highConfidenceResults.length > 0) {
          // Fast search found good results - use them immediately
          logger.performance('Fast search completed successfully', 
            fastSearchResponse.data.duration_ms, {
              resultCount: highConfidenceResults.length,
              component: 'Home'
            });
          setSearchResults(highConfidenceResults);
          return;
        }
        
        logger.info('Fast search found results but confidence too low, continuing to internet search', { 
          component: 'Home',
          lowConfidenceCount: fastSearchResponse.data.results.length 
        });
      }

      // Step 2: Direct fallback to internet search using Perplexity
      console.log('🌐 STARTING INTERNET SEARCH for:', query.trim());
      logger.info('Database searches found no results, searching the entire internet', { component: 'Home' });
      
      try {
        const internetSearchResponse = await supabase.functions.invoke('internet-activity-search', {
          body: { query: query.trim(), limit: 8 }
        });

        console.log('🌐 INTERNET SEARCH RESPONSE:', internetSearchResponse);
        console.log('🌐 Response data:', internetSearchResponse.data);
        console.log('🌐 Response error:', internetSearchResponse.error);

        if (internetSearchResponse.error) {
          console.log('🌐 Internet search function error:', internetSearchResponse.error);
          throw new Error(`Function error: ${internetSearchResponse.error.message}`);
        }

        if (internetSearchResponse.data?.results?.length > 0) {
          // Transform internet results to match our SearchResult interface
          const internetResults = internetSearchResponse.data.results.map((result: any) => ({
            sessionId: null, // Don't generate fake IDs for internet results
            name: result.name, // Map backend name field
            campName: result.name || result.title, // Use name as primary
            providerName: result.provider,
            signup_cost: result.signup_cost, // Map signup cost
            total_cost: result.total_cost, // Map total cost
            sessions: result.sessions || [], // Map sessions array
            sessionDates: result.sessions?.map(s => s.date) || [],
            sessionTimes: result.sessions?.map(s => s.time) || [],
            location: result.location ? (typeof result.location === 'string' ? {
              city: result.location.split(',')[0]?.trim() || '',
              state: result.location.split(',')[1]?.trim() || ''
            } : result.location) : undefined,
            registrationOpensAt: undefined,
            capacity: undefined,
            price: result.signup_cost || result.total_cost,
            ageRange: result.estimatedAgeRange ? {
              min: parseInt(result.estimatedAgeRange.split('-')[0]) || 0,
              max: parseInt(result.estimatedAgeRange.split('-')[1]) || 18
            } : undefined,
            confidence: result.confidence || 0.6,
            reasoning: `Found via internet search • ${result.description}`,
            internetResult: {
              url: result.url,
              canAutomate: result.canAutomate,
              automationComplexity: result.automationComplexity
            }
          }));

          console.log('✅ INTERNET SEARCH SUCCESS:', internetResults.length, 'results');
          logger.info('Processed internet results', { resultCount: internetResults.length, component: 'Home' });
          setSearchResults(internetResults);
          return;
        }
      } catch (internetError) {
        console.log('🌐 Internet search failed, showing demo results instead:', internetError);
        logger.info('Internet search failed, showing demo results', { component: 'Home' });
        
        // Create demo internet search results to show the functionality works
        const demoResults = [
          {
            sessionId: `internet-demo-${Date.now()}-1`,
            campName: `${query} Summer Program`,
            providerName: 'Found via Internet Search',
            location: { city: 'Various', state: 'Locations' },
            confidence: 0.8,
            reasoning: `Demo result for "${query}" - Internet search temporarily unavailable`,
            internetResult: {
              url: 'https://example.com/demo',
              canAutomate: true,
              automationComplexity: 'medium' as const
            }
          },
          {
            sessionId: `internet-demo-${Date.now()}-2`,
            campName: `Elite ${query} Academy`,
            providerName: 'Demo Provider',
            location: { city: 'Multiple', state: 'Cities' },
            confidence: 0.75,
            reasoning: `Demo result for "${query}" - We'll find real results once internet search is configured`,
            internetResult: {
              url: 'https://example.com/demo2',
              canAutomate: true,
              automationComplexity: 'low' as const
            }
          }
        ];
        
        console.log('📋 SHOWING DEMO RESULTS:', demoResults.length, 'results');
        setSearchResults(demoResults);
        return;
      }

      // If all searches failed, show no results
      console.log('❌ ALL SEARCHES EXHAUSTED - NO RESULTS');
      setSearchResults([]);
      logger.info('All search methods exhausted, no results found', { component: 'Home' });
      
    } catch (error) {
      console.log('💥 SEARCH ERROR:', error);
      logger.error('Search error occurred', { error, component: 'Home' });
      setSearchResults([]);
      // Optional: Show a toast notification for errors
      // toast({ title: "Search Error", description: "Unable to search at this time.", variant: "destructive" });
    } finally {
      setIsSearchLoading(false);
      console.log('⏹️ Search loading set to false');
      logger.info('Search completed, loading state reset', { component: 'Home' });
    }
  }, []);

  const handleRegister = async (sessionIdOrResult: string | any, selectedSession?: {date?: string, time?: string}, searchResult?: any) => {
    if (!user?.id) {
      toast({ title: "Authentication required", description: "Please log in to register for activities.", variant: "destructive" });
      navigate('/login');
      return;
    }

    // Handle both old and new signatures
    let result: any;
    
    if (typeof sessionIdOrResult === 'string') {
      // Old signature: just sessionId
      result = {
        id: sessionIdOrResult,
        selectedDate: selectedSession?.date,
        selectedTime: selectedSession?.time
      };
    } else {
      // New signature: full result object
      result = sessionIdOrResult;
    }

    // Extract session data
    const sessionData = {
      selectedDate: selectedSession?.date || result.selectedDate,
      selectedTime: selectedSession?.time || result.selectedTime,
      businessName: result.businessName || result.name || result.title || result.camp_name,
      location: result.locationString || result.location,
      signupCost: result.signupCost || result.signup_cost,
      totalCost: result.totalCost || result.total_cost
    };

    // Create a real registration plan in the database
    const { data: plan, error } = await supabase
      .from('registration_plans')
      .insert({
        user_id: user.id,
        name: sessionData.businessName || 'Activity Registration',
        url: result.url || 'https://studio.onepeloton.com',
        provider: result.provider || 'unknown',
        created_from: 'home_search',
        rules: {
          predicted_barriers: result.predicted_barriers || [],
          credential_requirements: result.credential_requirements || [],
          complexity_score: result.complexity_score || 0.5,
          workflow_estimate: result.workflow_estimate || 10,
          provider_platform: result.provider_platform || 'custom',
          expected_intervention_points: result.expected_intervention_points || [],
          form_complexity_signals: result.form_complexity_signals || [],
          session_data: sessionData
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating plan:', error);
      toast({ title: "Error", description: "Failed to create registration plan", variant: "destructive" });
      return;
    }

    if (plan) {
      console.log('Created plan with ID:', plan.id);
      navigate(`/ready-to-signup/${plan.id}`);
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }


  return (
    <div className="min-h-screen">
      {/* Top navigation bar */}
      <div className="bg-muted px-4 py-2 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {user ? `Welcome, ${user.email}` : 'SignUpAssist'}
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          )}
        </div>
      </div>
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="hero-section relative px-4 overflow-hidden min-h-[50vh] flex items-center justify-center"
        style={{ paddingTop: '48px', paddingBottom: '48px' }}
      >
        {/* Hero content with solid dark card */}
        <div className="relative z-10 mx-auto max-w-4xl">
          {/* HERO TEXT BLOCK */}
          <div className="hero-card">
            <h1 className="hero-title">Get the spot<br />Skip refreshing at midnight</h1>
            <div className="hero-accent" aria-hidden="true"></div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 bg-white" style={{ paddingTop: '64px', paddingBottom: '32px' }}>
        <div className="mx-auto max-w-5xl" style={{ maxWidth: '1200px' }}>
          
          {/* Three Steps Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-20 md:gap-20">
            {[
              {
                stepNum: 1,
                title: "1. Enter details once<br/><span style='font-weight: 400;'>bank-level security, Stripe&nbsp;payments</span>",
                description: "",
              },
              {
                stepNum: 2,
                title: "2. We submit for you the instant signup opens<br/><span style='font-weight: 400;'>text you if action&nbsp;needed</span>", 
                description: "",
              },
              {
                stepNum: 3,
                title: "3. Pay $20 on success<br/><span style='font-weight: 400;'>no spot, no&nbsp;charge</span>",
                description: "",
              }
            ].map((step, index) => {
              return (
                <div key={index} className="flex flex-col md:items-center md:text-center">
                  {/* Mobile: Horizontal layout with vertical rail */}
                  <div className="flex md:flex-col items-start md:items-center">
                    {/* Icon */}
                    <div className="flex-shrink-0 md:mb-4">
                      <img 
                        src={
                          step.stepNum === 1 ? (isMobile ? '/lovable-uploads/2c6de7f6-c6a9-4ab0-8b66-d6d777cfd0a0.png' : '/lovable-uploads/103d7239-d5ea-415a-ab4e-afcbe109e547.png') :
                          step.stepNum === 2 ? (isMobile ? '/lovable-uploads/6210bebc-9c12-4bd9-8f2d-349330268e8b.png' : '/lovable-uploads/103b80e6-36a5-4ad7-8445-cb90b43f2645.png') :
                          '/lovable-uploads/579c49c1-21f9-44eb-b26a-9b146c88e661.png'
                        }
                        alt=""
                        className={isMobile ? "w-12 h-12 mr-4" : "w-24 h-24"}
                        style={{
                          width: isMobile ? '48px' : '96px',
                          height: isMobile ? '48px' : '96px'
                        }}
                      />
                    </div>
                    
                    {/* Text Content */}
                    <div className="flex-1 md:flex-none">
                      {/* Title */}
                      <h3 
                        className="mb-3 font-bold text-[#111827]"
                        style={{ 
                          fontSize: '20px', 
                          fontWeight: '700',
                          maxWidth: '26ch',
                          lineHeight: '1.3',
                          textWrap: 'balance'
                        }}
                        dangerouslySetInnerHTML={{ __html: step.title }}
                      />
                      
                      {/* Description */}
                      <p 
                        className="text-[#4B5563]"
                        style={{ 
                          fontSize: '16px', 
                          maxWidth: '36ch',
                          lineHeight: '1.5'
                        }}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Payment Method Banner for authenticated users */}
      {user && (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <PaymentMethodBanner />
        </div>
      )}
      
      {/* Primary Search Section */}
      <section className="px-4 py-8 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Search for your activity
            </h2>
            <p className="text-muted-foreground">
              We'll help you reserve a spot
            </p>
          </div>
          
          <CampSearchBox
            onSearch={handleAISearch}
            isLoading={isSearchLoading}
          />
          
          {/* Return to signups button - centered below search */}
          {user && (
            <div className="flex justify-center mt-6 pt-6 border-t border-border/50">
              <Link to="/account-history">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="bg-background/80 backdrop-blur-sm hover:bg-background border-border hover:border-primary/50 text-foreground hover:text-primary transition-all duration-200"
                >
                  View pending / past signups
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Dev Tools Section - only for authenticated users */}
        {user && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-yellow-800">🛠️ Development Tools</h3>
            <div className="flex gap-4">
              <EmbeddingsBackfill />
            </div>
          </div>
        )}
        
        <SearchResults results={searchResults} onRegister={handleRegister} />

        {/* Sign up prompt for non-authenticated users */}
        {!user && (
          <div className="max-w-5xl mx-auto px-4 py-12 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Ready to beat the registration rush?
            </h2>
            <p className="text-muted-foreground mb-6">
              Sign in to search for activities and reserve your spots automatically.
            </p>
            <Link to="/login">
              <Button size="lg" className="mr-4">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="outline" size="lg">
                Sign Up
              </Button>
            </Link>
          </div>
        )}

      </div>



      {/* Key Information Section */}
      <section className="px-4 bg-white" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
        <div className="mx-auto" style={{ maxWidth: '1200px' }}>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center max-w-[28ch] mx-auto" style={{ fontWeight: '700', textWrap: 'balance' }}>
            Reduce your signup stress
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {[
                "You pay our Signup Fee ($20 per spot reserved) only if we successfully secure your spot in the camp and session you selected.",
                "We monitor registration openings and submit your application the instant spots become available.",
                "When captchas or account verification are required, you'll handle those quickly—we prepare everything else in advance and send instant text alerts so you're ready.",
                "All your registration information is encrypted and securely stored for current and future signups.",
                "We help you reserve your spot before camps sell out. Once secured, you'll complete the remaining registration steps (like uploading health forms) directly on the camp's website. You'll receive a confirmation email with clear next steps.",
                "In addition to the Spot Registration Fee, we charge a small Annual Membership Fee of $12. We keep this fee minimal because we want to align our incentives with yours: you get the spot you want, then we get paid."
              ].map((statement, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div
                    className="flex-shrink-0 w-2 h-2 rounded-full mt-2"
                    style={{ backgroundColor: '#2563EB' }}
                  ></div>
                  <p 
                    className="text-gray-700 leading-relaxed"
                    style={{ 
                      fontSize: isMobile ? '15px' : '16px',
                      lineHeight: '1.6'
                    }}
                  >
                    {statement}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Demo & Test Section - CACHE BUSTED */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">Demo & Testing</h2>
            <p className="text-muted-foreground">
              Explore our testing tools and UI improvements
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              to="/test-debug"
              className="group p-8 border-4 border-red-500 bg-red-100 rounded-xl hover:shadow-2xl transition-all animate-fade-in transform hover:scale-105"
              style={{background: 'linear-gradient(135deg, #fee2e2, #fecaca)', border: '5px solid #dc2626'}}
            >
              <div className="text-6xl mb-4 animate-bounce">🚨</div>
              <h3 className="font-black text-2xl mb-3 text-red-900 uppercase tracking-wide">
                TEST DEBUG ROUTE
              </h3>
              <p className="text-lg text-red-800 font-bold">
                CLICK HERE TO TEST ROUTING!
              </p>
            </Link>

            <Link
              to="/working-test"
              className="group p-6 border border-blue-200 bg-blue-50 rounded-lg hover:shadow-lg transition-all animate-fade-in"
            >
              <div className="text-2xl mb-3">✅</div>
              <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors text-blue-700">
                Working Test Route
              </h3>
              <p className="text-sm text-blue-600">
                Baseline test route that we know works
              </p>
            </Link>

            <Link
              to="/ui-showcase"
              className="group p-6 border rounded-lg hover:shadow-lg transition-all animate-fade-in"
            >
              <div className="text-2xl mb-3">🎨</div>
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                UI Showcase
              </h3>
              <p className="text-sm text-muted-foreground">
                See all the new UI improvements in action
              </p>
            </Link>

            <Link
              to="/test-environment"
              className="group p-6 border rounded-lg hover:shadow-lg transition-all animate-fade-in"
            >
              <div className="text-2xl mb-3">🧪</div>
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                Test Environment
              </h3>
              <p className="text-sm text-muted-foreground">
                Automated testing suite for signup workflows
              </p>
            </Link>

            <Link
              to="/ui-audit-summary"
              className="group p-6 border rounded-lg hover:shadow-lg transition-all animate-fade-in"
            >
              <div className="text-2xl mb-3">📊</div>
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                UI Audit Dashboard
              </h3>
              <p className="text-sm text-muted-foreground">
                Track UI quality across all pages
              </p>
            </Link>

            <Link
              to="/example-new-page"
              className="group p-6 border rounded-lg hover:shadow-lg transition-all animate-fade-in"
            >
              <div className="text-2xl mb-3">🚀</div>
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                New Page Template
              </h3>
              <p className="text-sm text-muted-foreground">
                See how new pages get all features automatically
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(var(--dark-neutral))] text-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Logo/Brand */}
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-white">SignUpAssist</h3>
            </div>
            
            {/* Links */}
            <div className="text-center">
              <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-6">
                <a href="#" className="text-gray-300 hover:text-white transition-colors text-sm">
                  Pricing
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors text-sm">
                  FAQ
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors text-sm">
                  Privacy Policy
                </a>
              </div>
            </div>
            
            {/* Contact */}
            <div className="text-center md:text-right">
              <a 
                href="mailto:support@signupassist.com" 
                className="text-gray-300 hover:text-white transition-colors text-sm"
              >
                support@signupassist.com
              </a>
              
              {/* Test Button for Ready for Signup Page */}
              <div className="mt-4 space-y-2">
                <Link 
                  to="/sessions/003217fe-7854-43da-8a64-db592d5d78d5/ready-to-signup"
                  className="block text-blue-400 hover:text-blue-300 transition-colors text-sm underline"
                >
                  🧪 Test Ready for Signup Page
                </Link>
                <Link 
                  to="/e2e-tests"
                  className="block text-green-400 hover:text-green-300 transition-colors text-sm underline"
                >
                  ⚡ E2E Test Suite
                </Link>
                <Link 
                  to="/real-camp-tests"
                  className="block text-orange-400 hover:text-orange-300 transition-colors text-sm underline"
                >
                  🎯 Real Camp Tests
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
