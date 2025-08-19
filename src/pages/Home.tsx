import React, { useState, useEffect } from 'react'
import { Search, Globe, Lock, DollarSign, Clock, User, HelpCircle, Handshake } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver"
import SearchBar from '@/components/search/SearchBar'
import Results from '@/components/search/Results'
import { useSearch } from '@/components/search/useSearch'
import { EmbeddingsBackfill } from '@/components/EmbeddingsBackfill'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { PaymentMethodBanner } from '@/components/PaymentMethodBanner'

const HomePage = () => {
  const { user, loading } = useAuth()
  const { elementRef: heroRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.3,
    freezeOnceVisible: true
  })

  const [isMobile, setIsMobile] = useState(false)
  const search = useSearch()

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

  // Debug log to verify component rendering
  console.log('HomePage component rendering:', { user: !!user, loading })

  return (
    <div className="min-h-screen">
      {/* Auth banner */}
      {!user && (
        <div className="bg-primary text-primary-foreground px-4 py-3 text-center">
          <span className="text-sm">
            You'll need to sign in to search and reserve spots. {' '}
            <Link to="/login" className="underline font-medium">
              Sign in here
            </Link>
          </span>
        </div>
      )}
      
      {/* User menu for authenticated users */}
      {user && (
        <div className="bg-muted px-4 py-2 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Welcome, {user.email}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      )}
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
            <h1 className="hero-title">Get the spot<br />Without refreshing at midnight</h1>
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
                title: "2. We submit instantly<br/><span style='font-weight: 400;'>text you if action&nbsp;needed</span>", 
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
                          step.stepNum === 2 ? (isMobile ? '/step2_stopwatch_thick_48.png' : '/step2_stopwatch_thick_96.png') :
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
          
          <SearchBar
            q={search.q} setQ={search.setQ}
            city={search.city} setCity={search.setCity}
            state={search.state} setState={search.setState}
            ageMin={search.ageMin} setAgeMin={search.setAgeMin}
            ageMax={search.ageMax} setAgeMax={search.setAgeMax}
            dateFrom={search.dateFrom} setDateFrom={search.setDateFrom}
            dateTo={search.dateTo} setDateTo={search.setDateTo}
            priceMax={search.priceMax} setPriceMax={search.setPriceMax}
            availability={search.availability} setAvailability={search.setAvailability}
            onSearch={search.run}
          />
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
        
        <Results items={search.items} loading={search.loading} error={search.error} />
        
        {/* Search performance indicator */}
        {search.meta.elapsed && (
          <div className="text-xs text-muted-foreground text-center mt-6 p-2 bg-muted/30 rounded">
            Search completed in {search.meta.elapsed}ms
            {search.meta.cached && ' (cached)'}
          </div>
        )}

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

        {/* Demo & Test Section */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">Demo & Testing</h2>
            <p className="text-muted-foreground">
              Explore our testing tools and UI improvements
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage