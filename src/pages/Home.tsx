import React from 'react'
import { SmartSearchBar } from "@/components/SmartSearchBar"
import { Search, Rocket, CheckCircle, Globe, Lock, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver"

const HomePage = () => {
  const { elementRef: heroRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.3,
    freezeOnceVisible: true
  })

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className={cn(
          "relative px-4 py-12 md:py-24 text-center overflow-hidden min-h-[520px] md:min-h-[70vh] flex items-center justify-center hero-bg"
        )}
      >
        {/* Dot pattern overlay in top-right */}
        <div className="absolute top-0 right-0 w-64 h-64 hero-dot-pattern opacity-100"></div>
        
        {/* Hero content with dark overlay */}
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="text-overlay-dark inline-block">
            <h1 className="text-white mb-3">
              Get the spot you want, without the stress.
            </h1>
            
            <div className="accent-bar mx-auto mb-4"></div>
            
            <p className="subheadline text-white max-w-2xl mx-auto">
              Tell us your event, we'll be ready to sign you up the moment registration opens. 
              You handle any final steps.
            </p>
          </div>
        </div>
      </section>

      {/* 1-2-3 Process Section */}
      <section className="px-4 py-12 md:py-24 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 relative">
            {[
              {
                icon: Search,
                title: "Tell Us What You Want",
                description: "Name, location, and dates.",
              },
              {
                icon: Rocket,
                title: "We're On It",
                description: "We prep and monitor for opening.",
              },
              {
                icon: CheckCircle,
                title: "Get Your Spot",
                description: "Instant sign-up when it opens.",
              }
            ].map((item, index) => {
              const Icon = item.icon
              const isLast = index === 2
              
              return (
                <div key={index} className="relative text-center">
                  {/* Connector Line - Only show between steps on desktop */}
                  {!isLast && (
                    <div className="hidden md:block absolute top-8 left-full w-16 h-px bg-border z-10" style={{ transform: 'translateX(-50%)' }}>
                    </div>
                  )}
                  
                  {/* Icon Circle */}
                  <div className="inline-flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-primary mb-6">
                    <Icon className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-lg md:text-xl font-semibold mb-3 text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Search Bar Section */}
      <section className="px-4 py-8 bg-background">
        <div className="mx-auto max-w-2xl">
          <div className="surface-card p-6">
            <SmartSearchBar />
          </div>
        </div>
      </section>

      {/* Trust/Security Section */}
      <section className="px-4 py-12 md:py-24 bg-muted">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                title: "Works broadly",
                description: "Compatible with most registration sites."
              },
              {
                icon: Lock,
                title: "Data protected",
                description: "Encrypted in transit and at rest."
              },
              {
                icon: DollarSign,
                title: "Only pay if you get in",
                description: "No success, no fee."
              }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
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