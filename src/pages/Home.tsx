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
        className="hero-section relative px-4 py-12 md:py-24 text-center overflow-hidden min-h-[520px] md:min-h-[70vh] flex items-center justify-center"
      >
        {/* Hero content with dark overlay */}
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="inline-block p-4 rounded-xl" style={{ backgroundColor: 'rgba(17,24,39,0.6)' }}>
            <h1 className="text-white mb-3 text-[32px] md:text-[48px] font-extrabold tracking-tight leading-tight">
              Get the spot you want, without the stress.
            </h1>
            
            <div className="w-16 h-1 bg-primary mx-auto mb-3 rounded"></div>
            
            <p className="text-white text-base md:text-[20px] font-normal max-w-2xl mx-auto leading-relaxed">
              Tell us your event, we'll be ready to sign you up the moment registration opens. 
              You handle any final steps.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works - Stepper Rail Section */}
      <section className="px-4 py-12 lg:py-12 bg-white">
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
                    description: "Name, location, and dates.",
                  },
                  {
                    iconUrl: "/lovable-uploads/508fe445-4ff2-49e3-b456-b7b0be67c788.png",
                    title: "Step 2 — We're On It",
                    description: "We prep your signup and watch for opening.",
                  },
                  {
                    iconUrl: "/lovable-uploads/0b78337f-9565-4df0-91be-a194a4dcb675.png",
                    title: "Step 3 — Get Your Spot",
                    description: "Instant sign-up when it opens. You only pay if you get in.",
                  }
                ].map((item, index) => (
                  <div key={index} className="flex flex-col items-center" style={{ width: 'calc(100% / 3)' }}>
                    <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4">
                      <img 
                        src={item.iconUrl} 
                        alt={item.title}
                        className="h-6 w-6 filter brightness-0 invert"
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
                  description: "Name, location, and dates.",
                },
                {
                  title: "Step 2 — We're On It",
                  description: "We prep your signup and watch for opening.",
                },
                {
                  title: "Step 3 — Get Your Spot",
                  description: "Instant sign-up when it opens. You only pay if you get in.",
                }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-base text-gray-600">
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
              <div className="space-y-4">
                {[
                  {
                    iconUrl: "/lovable-uploads/10cb3bee-0365-4578-97fb-fba558a34666.png",
                    title: "Step 1 — Tell Us What You Want",
                    description: "Name, location, and dates.",
                  },
                  {
                    iconUrl: "/lovable-uploads/508fe445-4ff2-49e3-b456-b7b0be67c788.png",
                    title: "Step 2 — We're On It",
                    description: "We prep your signup and watch for opening.",
                  },
                  {
                    iconUrl: "/lovable-uploads/0b78337f-9565-4df0-91be-a194a4dcb675.png",
                    title: "Step 3 — Get Your Spot",
                    description: "Instant sign-up when it opens. You only pay if you get in.",
                  }
                ].map((item, index) => (
                  <div key={index} className="flex items-start">
                    {/* Icon Circle */}
                    <div className="relative z-10 h-12 w-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <img 
                        src={item.iconUrl} 
                        alt={item.title}
                        className="h-5 w-5 filter brightness-0 invert"
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="ml-6 flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-gray-900">
                        {item.title}
                      </h3>
                      <p className="text-base text-gray-600">
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

      {/* Search Bar Section */}
      <section className="px-4 py-12 md:py-24" style={{ backgroundColor: '#F9FAFB' }}>
        <div className="mx-auto max-w-2xl">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-3">
              <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <input 
                type="text"
                placeholder={isMobile ? "Event name, location…" : "Event name, city/state, session dates…"}
                className="flex-1 border-0 outline-none text-gray-900 placeholder-gray-400 text-base"
              />
              <button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-lg transition-colors">
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust/Security Section */}
      <section className="px-4 py-12 md:py-24" style={{ backgroundColor: '#F3F4F6' }}>
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                title: "Works Broadly",
                description: "Compatible with most registration sites."
              },
              {
                icon: Lock,
                title: "Data Protected",
                description: "Encrypted in transit and at rest."
              },
              {
                icon: DollarSign,
                title: "Only Pay If You Get In",
                description: "No success, no fee."
              }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary mb-4">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                    {item.description}
                  </p>
                </div>
              )
            })}
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