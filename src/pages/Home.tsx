import React, { useState, useEffect } from 'react'
import { Search, Globe, Lock, DollarSign, Clock, User, HelpCircle, Handshake, Clipboard, Zap, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver"

const HomePage = () => {
  const { elementRef: heroRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.3,
    freezeOnceVisible: true
  })

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="hero-section relative px-4 overflow-hidden min-h-[70vh] flex items-center justify-center"
        style={{ paddingTop: '64px', paddingBottom: '64px' }}
      >
        {/* Hero content with solid dark card */}
        <div className="relative z-10 mx-auto max-w-4xl">
          {/* HERO TEXT BLOCK */}
          <div className="hero-card">
            <h1 className="hero-title">Beat the registration&nbsp;rush</h1>
            <div className="hero-accent" aria-hidden="true"></div>
            <p className="hero-sub">
              You pre-load your info, we submit the millisecond registration opens, we help you complete any human steps (e.g. Captcha) via text
            </p>
            <button className="btn-primary">Get My Speed Advantage</button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 bg-white" style={{ paddingTop: '64px', paddingBottom: '32px' }}>
        <div className="mx-auto max-w-5xl" style={{ maxWidth: '1200px' }}>
          
          {/* Three Steps Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Clipboard,
                title: "Step 1 — Find your chosen Activity or Camp",
                description: "Choose the specific session(s) you'd like",
              },
              {
                icon: Zap,
                title: "Step 2 — Enter your info ahead of time",
                description: "It's all encrypted and we'll use it for future registrations too",
              },
              {
                icon: Trophy,
                title: "Step 3 — We sign you up the millisecond registration opens",
                description: "You pay us only if you get the session you chose",
              }
            ].map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="flex flex-col items-center text-center">
                  {/* Icon Circle */}
                  <div 
                    className="rounded-full flex items-center justify-center"
                    style={{ 
                      width: '80px', 
                      height: '80px', 
                      backgroundColor: '#2563EB',
                      marginBottom: '20px'
                    }}
                  >
                    <IconComponent size={40} color="white" strokeWidth={2} />
                  </div>
                  
                  {/* Title */}
                  <h3 
                    className="mb-3"
                    style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#111827',
                      textAlign: 'center',
                      maxWidth: '28ch',
                      lineHeight: '1.3'
                    }}
                  >
                    {step.title}
                  </h3>
                  
                  {/* Description */}
                  <p 
                    style={{ 
                      fontSize: '16px', 
                      color: '#4B5563',
                      textAlign: 'center',
                      maxWidth: '32ch',
                      lineHeight: '1.5'
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* STICKY SEARCH CARD */}
      <div 
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200/50"
        style={{ paddingTop: '8px', paddingBottom: '8px' }}
      >
        <div className="search-wrap" style={{ marginTop: '0', paddingBottom: '0' }}>
          <div className="search-card" style={{ margin: '0 auto' }}>
            <div className="search-input">
              <span className="search-icon" aria-hidden="true">🔎</span>
              <input
                type="text"
                placeholder={isMobile ? "Activity name, location…" : "Activity name, city/state, session dates…"}
                aria-label="Search activities by name, location, and dates"
              />
            </div>
            <button className="btn-primary btn-search">Secure My Spot</button>
          </div>
        </div>
      </div>



      {/* Key Information Section */}
      <section className="px-4 bg-white" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
        <div className="mx-auto" style={{ maxWidth: '1200px' }}>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center max-w-[28ch] mx-auto" style={{ fontWeight: '700', textWrap: 'balance' }}>
            How It Works
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {[
                "We monitor registration openings and submit your application instantly when spots become available.",
                "You handle human verification steps like captchas and account confirmations that require manual completion.",
                "All your registration information is encrypted and securely stored for use in current and future sign-ups.",
                "We send immediate text notifications with step-by-step guidance when your action is needed.",
                "You only pay our service fee if you successfully secure the session you chose.",
                "We prepare everything in advance so you're ready when verification steps appear."
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