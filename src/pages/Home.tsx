import React, { useState, useEffect } from 'react'
import { Search, Clipboard, Zap, Trophy, Shield, Globe, Lock, DollarSign, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver"

const HomePage = () => {
  const { elementRef: heroRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.3,
    freezeOnceVisible: true
  })

  const [isMobile, setIsMobile] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSearch = () => {
    setIsSearching(true)
    // Simulate search
    setTimeout(() => setIsSearching(false), 2000)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="hero-section relative px-6 md:px-4 py-12 md:py-24 pb-20 md:pb-20 text-center overflow-hidden min-h-[520px] md:min-h-[70vh] flex items-center justify-center"
      >
        {/* Hero content with dark overlay */}
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="inline-block p-6 md:p-8 rounded-xl" style={{ backgroundColor: 'rgba(17,24,39,0.6)' }}>
            <h1 
              className="text-black mb-4 font-extrabold tracking-[-0.03em] leading-[1.1] text-balance" 
              style={{ fontSize: 'clamp(42px, 7vw, 64px)' }}
            >
              Beat the <span className="relative">registration<span className="absolute bottom-0 left-0 w-full h-1 bg-primary"></span></span> rush
            </h1>
            
            <div className="w-16 h-1 bg-primary mx-auto mb-4 rounded"></div>
            
            <p className="text-[#1F2937] font-normal max-w-[600px] mx-auto leading-[1.6] mb-8" style={{ fontSize: 'clamp(16px, 4vw, 20px)' }}>
              We submit the millisecond it opens, you complete the human steps.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 md:gap-6 justify-center items-center">
              <button className="bg-primary hover:bg-[#1D4ED8] hover:scale-105 text-white font-bold px-9 py-[18px] rounded-lg transition-all duration-200 ease-out min-h-[56px] w-full md:w-auto md:max-w-sm shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
                Start Monitoring
              </button>
              
              {/* Tagline under primary CTA */}
              <p className="text-[#374151] text-sm md:text-base font-normal text-center">
                Technology for speed, humans for verification.
              </p>
              
              <button className="bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold px-9 py-[18px] rounded-lg transition-all duration-200 ease-out min-h-[56px] w-full md:w-auto md:max-w-sm">
                Learn How It Works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Stepper Rail Section */}
      <section className="px-6 md:px-4 py-24 md:py-24 bg-white border-t border-b border-gray-100">
        <div className="mx-auto max-w-6xl">
          {/* Desktop Layout (≥1024px) */}
          <div className="hidden lg:block">
            {/* Horizontal Rail with connecting line */}
            <div className="relative mb-20">
              <div className="h-1 bg-gray-200 w-full"></div>
              <div className="absolute top-0 left-0 h-1 bg-primary w-full opacity-20"></div>
              
              {/* Icon Circles on Rail */}
              <div className="absolute top-0 w-full flex justify-between" style={{ transform: 'translateY(-50%)' }}>
                {[
                   {
                     icon: Clipboard,
                     number: "1",
                     title: "Tell Us What You Want",
                     description: "Event name, location, dates, and your info.",
                   },
                   {
                     icon: Zap,
                     number: "2", 
                     title: "We Monitor & Submit Instantly",
                     description: "We watch for registration to open and submit the millisecond it's available.",
                   },
                   {
                     icon: Trophy,
                     number: "3",
                     title: "You Complete the Human Steps",
                     description: "Handle captchas, account verification, and any final details we can't automate.",
                   }
                ].map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div key={index} className="flex flex-col items-center" style={{ width: 'calc(100% / 3)' }}>
                      <div className="h-[80px] w-[80px] bg-primary rounded-full flex items-center justify-center mb-6 shadow-lg">
                        <Icon className="h-10 w-10 text-white" />
                      </div>
                      <div className="text-4xl font-black text-primary mb-2">{item.number}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Content Below Rail */}
            <div className="grid grid-cols-3 gap-16">
              {[
                 {
                   title: "Tell Us What You Want",
                   description: "Event name, location, dates, and your info.",
                 },
                 {
                   title: "We Monitor & Submit Instantly", 
                   description: "We watch for registration to open and submit the millisecond it's available.",
                 },
                 {
                   title: "You Complete the Human Steps",
                   description: "Handle captchas, account verification, and any final details we can't automate.",
                 }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <h3 className="text-[22px] font-bold mb-2 text-[#111827]">
                    {item.title}
                  </h3>
                  <p className="text-[16px] leading-[1.4] text-[#374151]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Layout (<1024px) */}
          <div className="lg:hidden px-6">
            <div className="relative">
              {/* Vertical Rail */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {/* Steps */}
              <div className="space-y-8">
                {[
                   {
                     icon: Clipboard,
                     number: "1",
                     title: "Tell Us What You Want",
                     description: "Event name, location, dates, and your info.",
                   },
                   {
                     icon: Zap,
                     number: "2",
                     title: "We Monitor & Submit Instantly",
                     description: "We watch for registration to open and submit the millisecond it's available.",
                   },
                   {
                     icon: Trophy,
                     number: "3",
                     title: "You Complete the Human Steps",
                     description: "Handle captchas, account verification, and any final details we can't automate.",
                   }
                ].map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div key={index} className="flex items-start">
                      {/* Icon Circle */}
                      <div className="relative z-10 h-[64px] w-[64px] bg-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      
                      {/* Content */}
                      <div className="ml-6 flex-1">
                        <div className="text-2xl font-black text-primary mb-2">{item.number}</div>
                        <h3 className="text-[20px] font-bold mb-2 text-[#111827]">
                          {item.title}
                        </h3>
                        <p className="text-[16px] leading-[1.4] text-[#374151]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section - THE Primary Element */}
      <section className="px-6 md:px-4 py-20" style={{ backgroundColor: '#F1F5F9' }}>
        <div className="mx-auto max-w-4xl text-center">
          <div className="bg-white rounded-[20px] p-8 md:p-10 w-full shadow-[0_24px_48px_rgba(0,0,0,0.12)]">
            {/* Security Badge */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                <Shield className="h-4 w-4" />
                <span>Secure & Encrypted</span>
              </div>
            </div>
            
            {/* Search Form */}
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex items-center space-x-4 flex-1 bg-gray-50 rounded-xl px-6 py-4 h-[72px]">
                <Search className="h-6 w-6 text-gray-400 flex-shrink-0" />
                <input 
                  type="text"
                  placeholder={isMobile ? "Event name, location…" : "Event name, city/state, session dates…"}
                  className="flex-1 border-0 outline-none bg-transparent text-gray-900 placeholder-gray-400 text-[20px] font-medium"
                />
              </div>
              <button 
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-primary hover:bg-[#1D4ED8] text-white font-bold text-[18px] px-8 py-4 rounded-xl transition-all duration-200 ease-out h-[72px] w-full md:w-[140px] flex items-center justify-center"
              >
                {isSearching ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Start Now"
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust/Security Section */}
      <section className="px-6 md:px-4 py-24 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
               {
                 icon: DollarSign,
                 title: "Success-based pricing",
                 description: "Only pay if we successfully get you through the initial submission."
               },
               {
                 icon: Zap,
                 title: "Lightning-fast submission",
                 description: "We submit within milliseconds of registration opening."
               },
               {
                 icon: Lock,
                 title: "Human oversight when needed",
                 description: "You handle captchas and verification steps we can't automate."
               }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="bg-white rounded-xl p-8 shadow-lg border-l-4 border-primary hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center justify-center h-16 w-16 bg-primary rounded-full mb-6 mx-auto">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-[18px] font-semibold mb-3 text-[#111827] text-center">
                    {item.title}
                  </h3>
                  <p className="text-[16px] leading-[1.4] text-[#374151] text-center">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Partnership Messaging Strip */}
      <section className="px-4 py-12 md:py-16 bg-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            We give you the best chance at securing your spot
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">We handle</h3>
              <p className="text-gray-600">Monitoring, instant submission, speed advantage.</p>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">You handle</h3>
              <p className="text-gray-600">Captchas, account setup, final verification steps.</p>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Together</h3>
              <p className="text-gray-600">You get the best chance at securing spots.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 py-12 md:py-16 bg-alt-light">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Do you complete the entire registration for me?
              </h3>
              <p className="text-gray-600">
                We handle the speed-critical parts — monitoring when registration opens and submitting your application instantly. You handle the human verification steps like captchas and account confirmations that we can't automate.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                What if there are captchas or other verification steps?
              </h3>
              <p className="text-gray-600">
                We prepare everything in advance and send you immediate notifications with step-by-step guidance. You'll have all the prep work done and just need to complete the human verification steps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(var(--dark-neutral))] text-white py-12">
        <div className="mx-auto max-w-5xl px-4">
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