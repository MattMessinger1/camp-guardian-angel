import React from 'react'
import { SmartSearchBar } from "@/components/SmartSearchBar"
import { Search, Rocket, CheckCircle, Globe, Lock, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import heroImage from "@/assets/hero-camp.jpg"

const HomePage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="relative px-4 py-24 md:py-32 text-center overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(31, 41, 55, 0.8), rgba(31, 41, 55, 0.6)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-10 mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-2 text-white">
            Get the spot you want, without the stress.
          </h1>
          
          {/* Accent Bar */}
          <div className="w-24 h-1 bg-primary mx-auto mb-8"></div>
          
          <p className="text-lg md:text-xl text-gray-200 mb-16 max-w-3xl mx-auto leading-relaxed">
            Tell us your event, we'll be ready to sign you up the moment registration opens. 
            You handle any final steps.
          </p>
        </div>
      </section>

      {/* 1-2-3 Process Section */}
      <section className="px-4 py-16 bg-background">
        <div className="mx-auto max-w-6xl">
          <div className="relative">
            {/* Connector Lines - Desktop Only */}
            <div className="hidden md:block absolute top-8 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
              <div className="flex justify-between items-center h-16">
                <div className="w-1/3"></div>
                <div className="w-1/3 border-t-2 border-gray-200"></div>
                <div className="w-1/3"></div>
                <div className="w-1/3 border-t-2 border-gray-200"></div>
                <div className="w-1/3"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
              {[
                {
                  icon: Search,
                  title: "Tell Us What You Want",
                  description: "Enter the event name, location, and session/dates.",
                  step: "1"
                },
                {
                  icon: Rocket,
                  title: "We're On It",
                  description: "We prepare and monitor for opening day.",
                  step: "2"
                },
                {
                  icon: CheckCircle,
                  title: "Get Your Spot",
                  description: "We sign you up instantly when it opens — only pay if you get in.",
                  step: "3"
                }
              ].map((item, index) => {
                const Icon = item.icon
                return (
                  <div key={index} className="text-center">
                    {/* Icon Circle */}
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary mb-6">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-semibold mb-3 text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
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
      <section className="px-4 py-8 bg-background">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg border border-border/20 p-6">
            <SmartSearchBar />
          </div>
        </div>
      </section>

      {/* Why It Works Section */}
      <section className="px-4 py-16 bg-gray-50">
        <div className="mx-auto max-w-6xl">
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
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            {/* Logo/Brand */}
            <div className="md:text-left">
              <h3 className="text-xl font-bold text-white">SignUpAssist</h3>
            </div>
            
            {/* Links */}
            <div className="md:text-center">
              <div className="flex flex-col md:flex-row justify-center space-y-2 md:space-y-0 md:space-x-6">
                <a href="#" className="text-gray-300 hover:text-white hover:underline transition-colors">
                  Pricing
                </a>
                <a href="#" className="text-gray-300 hover:text-white hover:underline transition-colors">
                  FAQ
                </a>
                <a href="#" className="text-gray-300 hover:text-white hover:underline transition-colors">
                  Privacy Policy
                </a>
              </div>
            </div>
            
            {/* Contact */}
            <div className="md:text-right">
              <a 
                href="mailto:support@signupassist.com" 
                className="text-gray-300 hover:text-white hover:underline transition-colors"
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