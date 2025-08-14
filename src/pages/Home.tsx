import React, { useState, useEffect } from 'react'
import { Search, Globe, Lock, DollarSign } from "lucide-react"
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
        className="hero-section relative px-4 py-12 md:py-24 pb-20 md:pb-20 text-center overflow-hidden min-h-[520px] md:min-h-[70vh] flex items-center justify-center"
      >
        {/* Hero content with dark overlay */}
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="inline-block p-4 md:p-4 rounded-xl" style={{ backgroundColor: 'rgba(17,24,39,0.6)' }}>
            <h1 className="text-white mb-3 font-black tracking-[-0.02em] leading-[1.1]" style={{ fontSize: 'clamp(32px, 8vw, 56px)' }}>
              Beat the registration rush
            </h1>
            
            <div className="w-16 h-1 bg-primary mx-auto mb-3 rounded"></div>
            
            <p className="text-[#E5E7EB] font-normal max-w-[600px] mx-auto leading-[1.6] mb-6" style={{ fontSize: 'clamp(16px, 4vw, 20px)' }}>
              We submit the millisecond it opens, you complete the human steps.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 md:gap-4 justify-center items-center">
              <button className="bg-primary hover:bg-[#1D4ED8] text-white font-semibold px-8 py-[14px] rounded-lg transition-all duration-200 ease-out min-h-[44px] w-full md:w-auto md:max-w-xs">
                Get My Speed Advantage
              </button>
              
              {/* Tagline under primary CTA */}
              <p className="text-[#E5E7EB] text-sm md:text-base font-normal text-center mt-2">
                Technology for speed, humans for verification.
              </p>
              
              <button className="bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold px-8 py-[14px] rounded-lg transition-all duration-200 ease-out min-h-[44px] w-full md:w-auto md:max-w-xs">
                Learn How It Works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Stepper Rail Section */}
      <section className="px-4 pt-16 md:pt-16 pb-16 md:pb-16 bg-white" style={{ marginTop: '64px' }}>
        <div className="mx-auto max-w-6xl">
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
                     title: "Step 1 — Tell Us What You Want",
                     description: "Event name, location, dates, and your info.",
                   },
                   {
                     iconUrl: "/lovable-uploads/508fe445-4ff2-49e3-b456-b7b0be67c788.png",
                     title: "Step 2 — We Monitor & Submit Instantly",
                     description: "We watch for registration to open and submit the millisecond it's available.",
                   },
                   {
                     iconUrl: "/lovable-uploads/0b78337f-9565-4df0-91be-a194a4dcb675.png",
                     title: "Step 3 — You Complete the Human Steps",
                     description: "Handle captchas, account verification, and any final details we can't automate.",
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
                   title: "Step 1 — Tell Us What You Want",
                   description: "Event name, location, dates, and your info.",
                 },
                 {
                   title: "Step 2 — We Monitor & Submit Instantly",
                   description: "We watch for registration to open and submit the millisecond it's available.",
                 },
                 {
                   title: "Step 3 — You Complete the Human Steps",
                   description: "Handle captchas, account verification, and any final details we can't automate.",
                 }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <h3 className="text-[20px] font-semibold mb-[6px] text-[#111827]">
                    {item.title}
                  </h3>
                  <p className="text-[16px] leading-[1.4] text-[#4B5563]">
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
                     title: "Step 1 — Tell Us What You Want",
                     description: "Event name, location, dates, and your info.",
                   },
                   {
                     iconUrl: "/lovable-uploads/508fe445-4ff2-49e3-b456-b7b0be67c788.png",
                     title: "Step 2 — We Monitor & Submit Instantly",
                     description: "We watch for registration to open and submit the millisecond it's available.",
                   },
                   {
                     iconUrl: "/lovable-uploads/0b78337f-9565-4df0-91be-a194a4dcb675.png",
                     title: "Step 3 — You Complete the Human Steps",
                     description: "Handle captchas, account verification, and any final details we can't automate.",
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
                      <h3 className="text-[20px] font-semibold mb-[6px] text-[#111827]">
                        {item.title}
                      </h3>
                      <p className="text-[16px] leading-[1.4] text-[#4B5563]">
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

      <section className="px-4 py-10 md:py-20" style={{ backgroundColor: '#F9FAFB', marginTop: '64px' }}>
        <div className="mx-auto max-w-2xl">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full md:max-w-2xl" style={{ boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}>
            {/* Mobile: Stack vertically */}
            <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-3">
              <div className="flex items-center space-x-3 flex-1">
                <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <input 
                  type="text"
                  placeholder={isMobile ? "Event name, location…" : "Event name, city/state, session dates…"}
                  className="flex-1 border-0 outline-none text-gray-900 placeholder-gray-400 text-[16px] h-[56px] px-4 py-[14px]"
                />
              </div>
              <button className="bg-primary hover:bg-[#1D4ED8] text-white font-semibold text-[16px] px-6 py-[14px] rounded-lg transition-all duration-200 ease-out h-[56px] w-full md:w-auto">
                Secure My Spot
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust/Security Section */}
      <section className="px-4 py-16 md:py-16" style={{ backgroundColor: '#F3F4F6', marginTop: '80px' }}>
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col md:grid md:grid-cols-3 gap-5 md:gap-8">
            {[
               {
                 icon: Globe,
                 title: "Lightning-fast submission",
                 description: "We submit within milliseconds of registration opening."
               },
               {
                 icon: Lock,
                 title: "Human oversight when needed",
                 description: "You handle captchas and verification steps we can't automate."
               },
               {
                 icon: DollarSign,
                 title: "Success-based pricing",
                 description: "Only pay if we successfully get you through the initial submission."
               }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="text-center w-full">
                  <div className="inline-flex h-[56px] w-[56px] items-center justify-center rounded-full bg-primary mb-4">
                    <Icon className="h-[28px] w-[28px] text-white" />
                  </div>
                  
                  <h3 className="text-[18px] font-semibold mb-2 text-[#111827]">
                    {item.title}
                  </h3>
                  <p className="text-[16px] leading-[1.4] text-[#4B5563] max-w-xs mx-auto">
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