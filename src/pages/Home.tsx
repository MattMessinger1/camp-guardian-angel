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
              We submit the millisecond it opens, and we prompt you to complete the human steps when needed.
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
                title: "Step 2 — Enter the info the Activity requires",
                description: "All info is encrypted and we re-use for future sign-ups.",
              },
              {
                icon: Trophy,
                title: "Step 3 — You complete verification",
                description: "Handle captchas, account setup, and final verification.",
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

      {/* SEARCH CARD */}
      <section className="search-wrap" style={{ paddingBottom: '64px' }}>
        <div className="search-card">
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
      </section>



      {/* FAQ Section */}
      <section className="px-4 bg-white" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
        <div className="mx-auto" style={{ maxWidth: '1200px' }}>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center max-w-[28ch] mx-auto" style={{ fontWeight: '700', textWrap: 'balance' }}>
            FAQs
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: '#E5E7EB', borderRadius: '14px' }}>
              <div className="flex items-start mb-3">
                <img 
                  src="/lovable-uploads/5fd2573c-5da6-4ede-bb5a-a5171c65594f.png" 
                  alt="Help icon"
                  className="h-8 w-8 mr-3 mt-0.5 flex-shrink-0"
                />
                <h3 className="text-[18px] font-bold text-gray-900 max-w-[28ch]" style={{ fontWeight: '700', textWrap: 'balance' }}>
                  Do you complete the entire registration for&nbsp;me?
                </h3>
              </div>
              <p className="text-[16px] text-[#4B5563] ml-11" style={{ lineHeight: '1.6' }}>
                We handle the speed-critical parts — monitoring when registration opens and submitting your application instantly. You handle the human verification steps like captchas and account confirmations that we can't automate.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: '#E5E7EB', borderRadius: '14px' }}>
              <div className="flex items-start mb-3">
                <img 
                  src="/lovable-uploads/5fd2573c-5da6-4ede-bb5a-a5171c65594f.png" 
                  alt="Help icon"
                  className="h-8 w-8 mr-3 mt-0.5 flex-shrink-0"
                />
                <h3 className="text-[18px] font-bold text-gray-900 max-w-[28ch]" style={{ fontWeight: '700', textWrap: 'balance' }}>
                  What if there are captchas or other verification&nbsp;steps?
                </h3>
              </div>
              <p className="text-[16px] text-[#4B5563] ml-11" style={{ lineHeight: '1.6' }}>
                We prepare everything in advance and send you immediate notifications with step-by-step guidance. You'll have all the prep work done and just need to complete the human verification steps.
              </p>
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