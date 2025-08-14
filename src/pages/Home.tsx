import React, { useState, useEffect } from 'react'
import { Search, Globe, Lock, DollarSign, Clock, User, HelpCircle, Handshake } from "lucide-react"
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
              We submit the millisecond it opens, you complete the human steps.
            </p>
            <button className="btn-primary">Get My Speed Advantage</button>
          </div>
        </div>
      </section>

      {/* SEARCH CARD (directly below hero, overlapping by -48px) */}
      <section className="search-wrap">
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

      {/* How It Works - Stepper Rail Section */}
      <section className="px-4 bg-white" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
        <div className="mx-auto max-w-5xl" style={{ maxWidth: '1200px' }}>
          {/* Desktop Layout (≥1024px) */}
          <div className="hidden lg:block">
            {/* Horizontal Rail */}
            <div className="relative mb-16">
              <div className="h-1 bg-gray-200 w-full"></div>
              
              {/* Icon Circles on Rail */}
              <div className="absolute top-0 w-full flex justify-between" style={{ transform: 'translateY(-50%)' }}>
                 {[
                   {
                     iconUrl: "/lovable-uploads/10cb3bee-0365-4578-97fb-fba558a34666.png",
                     title: "Step 1 — Tell us what you&nbsp;want",
                     description: "Event name, location, dates, and your info.",
                   },
                   {
                     iconUrl: "/lovable-uploads/508fe445-4ff2-49e3-b456-b7b0be67c788.png",
                     title: "Step 2 — We monitor & submit&nbsp;instantly",
                     description: "We watch for registration to open and submit the millisecond it's available.",
                   },
                   {
                     iconUrl: "/lovable-uploads/0b78337f-9565-4df0-91be-a194a4dcb675.png",
                     title: "Step 3 — You complete&nbsp;verification",
                     description: "Handle captchas, account setup, and final verification.",
                   }
                ].map((item, index) => (
                  <div key={index} className="flex flex-col items-center" style={{ width: 'calc(100% / 3)' }}>
                    <div className="h-[72px] w-[72px] bg-primary rounded-full flex items-center justify-center mb-5">
                      <img 
                        src={item.iconUrl} 
                        alt={item.title}
                        className="h-8 w-8 filter brightness-0 invert"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Content Below Rail */}
            <div className="grid grid-cols-3 gap-20">
              {[
                  {
                    title: "Step 1 — Tell us what you&nbsp;want",
                    description: "Event name, location, dates, and your info.",
                  },
                  {
                    title: "Step 2 — We monitor & submit&nbsp;instantly",
                    description: "We watch for registration to open and submit the millisecond it's available.",
                  },
                  {
                    title: "Step 3 — You complete&nbsp;verification",
                    description: "Handle captchas, account setup, and final verification.",
                  }
              ].map((item, index) => (
                <div key={index} className="text-center">
            <h3 className="text-[20px] font-bold mb-[6px] text-[#111827] max-w-[26ch] mx-auto" style={{ fontWeight: '700', textWrap: 'balance' }} dangerouslySetInnerHTML={{ __html: item.title }}>
            </h3>
                  <p className="text-[16px] leading-[1.4] text-[#4B5563] max-w-[36ch] mx-auto" style={{ textWrap: 'balance' }}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Layout (<1024px) */}
          <div className="lg:hidden">
            <div className="relative">
              {/* Vertical Rail */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {/* Steps */}
              <div className="space-y-5">
                {[
                   {
                      iconUrl: "/lovable-uploads/10cb3bee-0365-4578-97fb-fba558a34666.png",
                      title: "Step 1 — Tell us what you&nbsp;want",
                      description: "Event name, location, dates, and your info.",
                    },
                    {
                      iconUrl: "/lovable-uploads/508fe445-4ff2-49e3-b456-b7b0be67c788.png",
                      title: "Step 2 — We monitor & submit&nbsp;instantly",
                      description: "We watch for registration to open and submit the millisecond it's available.",
                    },
                    {
                      iconUrl: "/lovable-uploads/0b78337f-9565-4df0-91be-a194a4dcb675.png",
                      title: "Step 3 — You complete&nbsp;verification",
                      description: "Handle captchas, account setup, and final verification.",
                    }
                ].map((item, index) => (
                  <div key={index} className="flex items-start">
                    {/* Icon Circle */}
                    <div className="relative z-10 h-[56px] w-[56px] bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <img 
                        src={item.iconUrl} 
                        alt={item.title}
                        className="h-6 w-6 filter brightness-0 invert"
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="ml-6 flex-1">
                      <h3 className="text-[20px] font-bold mb-[6px] text-[#111827] max-w-[26ch]" style={{ fontWeight: '700', textWrap: 'balance' }} dangerouslySetInnerHTML={{ __html: item.title }}>
                      </h3>
                      <p className="text-[16px] leading-[1.4] text-[#4B5563] max-w-[36ch]" style={{ textWrap: 'balance' }}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* How We Work Section */}
      <section className="px-4" style={{ backgroundColor: '#EFF6FF', paddingTop: '64px', paddingBottom: '64px' }}>
        <div className="mx-auto" style={{ maxWidth: '1200px' }}>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center max-w-[28ch] mx-auto" style={{ fontWeight: '700', textWrap: 'balance' }}>
            How We&nbsp;Work
          </h2>
          
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-8">
            {/* We Handle Column */}
            <div className="bg-white rounded-xl p-8 shadow-sm border">
              <div className="flex items-center mb-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary mr-4">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-[20px] font-bold text-gray-900" style={{ fontWeight: '700' }}>We&nbsp;handle</h3>
              </div>
              <ul className="space-y-3 text-[16px] text-[#4B5563]">
                <li className="flex items-start">
                  <span className="text-primary mr-3 mt-1.5">•</span>
                  Monitoring registration opening times
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-3 mt-1.5">•</span>
                  Instant submission when registration opens
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-3 mt-1.5">•</span>
                  Speed advantage over manual registration
                </li>
              </ul>
            </div>

            {/* You Handle Column */}
            <div className="bg-white rounded-xl p-8 shadow-sm border">
              <div className="flex items-center mb-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary mr-4">
                  <User className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-[20px] font-bold text-gray-900" style={{ fontWeight: '700' }}>You&nbsp;handle</h3>
              </div>
              <ul className="space-y-3 text-[16px] text-[#4B5563]">
                <li className="flex items-start">
                  <span className="text-primary mr-3 mt-1.5">•</span>
                  Captchas and human verification
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-3 mt-1.5">•</span>
                  Account setup and login steps
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-3 mt-1.5">•</span>
                  Final verification and confirmation
                </li>
              </ul>
            </div>
          </div>

          {/* Together Strip */}
          <div className="bg-white rounded-xl p-6 shadow-sm border text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary mr-4">
                <Handshake className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-[20px] font-bold text-gray-900" style={{ fontWeight: '700' }}>Together</h3>
            </div>
            <p className="text-[16px] text-[#4B5563]">You get the best chance at securing spots</p>
          </div>
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