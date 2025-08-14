import React from 'react'
import { SmartSearchBar } from "@/components/SmartSearchBar"
import { Search, Rocket, CheckCircle, Globe, Lock, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import heroImage from "@/assets/hero-activities.jpg"

const HomePage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="relative px-4 py-12 md:py-24 text-center overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 40%, transparent 100%), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-10 mx-auto max-w-4xl">
          <h1 className="text-[1.75rem] md:text-[2.25rem] font-extrabold tracking-tight mb-2 text-white leading-tight">
            Get the spot you want, without the stress.
          </h1>
          
          <p className="text-lg md:text-xl text-gray-200 mt-2 max-w-2xl mx-auto leading-relaxed">
            Tell us your event, we'll be ready to sign you up the moment registration opens. 
            You handle any final steps.
          </p>
        </div>
      </section>

      {/* 1-2-3 Process Section */}
      <section className="px-4 py-16 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="relative flex items-center justify-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 relative z-10 w-full">
              {[
                {
                  icon: Search,
                  title: "Tell Us What You Want",
                  description: "Enter the event name, location, and session/dates.",
                },
                {
                  icon: Rocket,
                  title: "We're On It",
                  description: "We prepare and monitor for opening day.",
                },
                {
                  icon: CheckCircle,
                  title: "Get Your Spot",
                  description: "We sign you up instantly when it opens — only pay if you get in.",
                }
              ].map((item, index) => {
                const Icon = item.icon
                const isLast = index === 2
                
                return (
                  <div key={index} className="relative text-center">
                    {/* Connector Line - Only show between steps on desktop */}
                    {!isLast && (
                      <div className="hidden md:block absolute top-8 left-full w-16 h-px bg-gray-300 z-10" style={{ transform: 'translateX(-50%)' }}>
                      </div>
                    )}
                    
                    {/* Icon Circle */}
                    <div className="inline-flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-[#2563EB] mb-6">
                      <Icon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-lg md:text-xl font-semibold mb-3 text-gray-900">
                      {item.title}
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-xs mx-auto">
                      {item.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar Section */}
      <section className="px-4 py-8 bg-[#F9FAFB]">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SmartSearchBar />
          </div>
        </div>
      </section>

      {/* Why It Works Section */}
      <section className="px-4 py-16 bg-[#F3F4F6]">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                title: "Works with most registration sites",
                description: "Compatible with popular camp and activity platforms"
              },
              {
                icon: Lock,
                title: "Secure — your data is encrypted",
                description: "Bank-level security protects your information"
              },
              {
                icon: DollarSign,
                title: "You only pay if you get in",
                description: "Success-based pricing — no spot, no charge"
              }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#059669]/10 mb-4">
                    <Icon className="h-6 w-6 text-[#059669]" />
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
      <footer className="bg-[#1F2937] text-white py-12">
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