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
            <h1 className="hero-title">Manage the signup&nbsp;stress</h1>
            <div className="hero-accent" aria-hidden="true"></div>
            <p className="hero-sub">
              You pre-load your info, we submit the millisecond registration opens, then we help you complete any human steps (captcha) via text message
            </p>
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
                title: "#1 — Find your activity or&nbsp;camp",
                description: "Choose the specific session(s) you'd like",
              },
              {
                stepNum: 2,
                title: "#2 — Load your signup info ahead of&nbsp;time",
                description: "We encrypt it and we'll use it for future registrations too",
              },
              {
                stepNum: 3,
                title: "#3 — Give yourself the best chance to get your&nbsp;spot",
                description: "We'll text you if we need your help with\u00A0captcha",
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
                          step.stepNum === 1 ? (isMobile ? '/lovable-uploads/1e4c3eef-7722-4b2b-ba6a-a0bed50edb82.png' : '/lovable-uploads/b6798b9a-8c60-43d8-a73f-263b2a614dd3.png') :
                          step.stepNum === 2 ? (isMobile ? '/lovable-uploads/2c6de7f6-c6a9-4ab0-8b66-d6d777cfd0a0.png' : '/lovable-uploads/103d7239-d5ea-415a-ab4e-afcbe109e547.png') :
                          (isMobile ? '/lovable-uploads/6210bebc-9c12-4bd9-8f2d-349330268e8b.png' : '/lovable-uploads/103b80e6-36a5-4ad7-8445-cb90b43f2645.png')
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

      {/* Search Components - Only show if authenticated */}
      {user ? (
        <>
          <SearchBar
            q={search.q} setQ={search.setQ}
            city={search.city} setCity={search.setCity}
            start={search.start} setStart={search.setStart}
            end={search.end} setEnd={search.setEnd}
            platform={search.platform} setPlatform={search.setPlatform}
            onSearch={search.run}
          />

          <main className="max-w-5xl mx-auto px-4 py-6">
            {/* Dev Tools Section */}
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-yellow-800">🛠️ Development Tools</h3>
              <div className="flex gap-4">
                <EmbeddingsBackfill />
              </div>
            </div>
            
            <Results items={search.items} loading={search.loading} error={search.error} />
          </main>
        </>
      ) : (
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



      {/* Key Information Section */}
      <section className="px-4 bg-white" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
        <div className="mx-auto" style={{ maxWidth: '1200px' }}>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center max-w-[28ch] mx-auto" style={{ fontWeight: '700', textWrap: 'balance' }}>
            Reduce your sign-up stress
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {[
                "You pay our Spot Registration Fee ($20 flat fee per spot reserved) only if you successfully reserve a spot.",
                "We monitor registration openings and submit your application the instant spots become available.",
                "You handle captchas and account verification when needed - we prepare everything in advance and send instant text alerts.",
                "All your registration information is encrypted and securely stored for current and future use.",
                "We help you reserve your spot before there are none left. You finish the rest of the camp registration (e.g. uploading health forms) on the provider's site. Once your spot is reserved you'll receive an email with next steps.",
                "The other fee we charge, in addition to the Spot Registration Fee, is a small Annual Registration Fee of $12. This Registration Fee is small because we want to align our incentives with yours. You get the spot you wanted, then we get paid."
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