import React from 'react'
import { Button } from "@/components/ui/button"
import { TrustStrip } from "@/components/ui/trust-strip"
import { SmartSearchBar } from "@/components/SmartSearchBar"
import { ArrowRight, Search, FileCheck, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const HomePage = () => {
  const handleGetStarted = () => {
    // Scroll to search bar
    document.getElementById('smart-search')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-primary via-brand-600 to-brand-500 bg-clip-text text-transparent">
              Human-Driven, AI-Assisted
            </span>
            <br />
            Sign-Ups
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Your best chance at securing competitive camp spots. We combine smart technology 
            with real human expertise to get your child registered.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="min-w-[200px] hero-gradient text-white border-0 shadow-lg hover:shadow-xl transition-all"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="min-w-[200px]"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-16 bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to secure your child's camp registration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                icon: Search,
                title: "Find your camp",
                description: "Tell us which camp, location, and sessions you want. Our AI helps identify the perfect matches.",
                step: "01"
              },
              {
                icon: FileCheck,
                title: "Prep your sign-up",
                description: "We gather all required information and prepare everything needed for a successful registration.",
                step: "02"
              },
              {
                icon: CheckCircle,
                title: "Secure your spot",
                description: "Our experts handle the registration process with precision timing and human oversight.",
                step: "03"
              }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="relative">
                  <div className="surface-card p-8 text-center relative overflow-hidden">
                    {/* Step Number */}
                    <div className="absolute top-4 right-4 text-6xl font-bold text-primary/10">
                      {item.step}
                    </div>
                    
                    {/* Icon */}
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-semibold mb-4">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  
                  {/* Arrow connector (hidden on mobile) */}
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <ArrowRight className="h-6 w-6 text-primary/60" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <TrustStrip />
        </div>
      </section>

      {/* Smart Search Section */}
      <section id="smart-search" className="px-4 py-16 bg-gradient-to-b from-muted/30 to-background">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Start Your Search
            </h2>
            <p className="text-lg text-muted-foreground">
              Tell us about the camp you're looking for
            </p>
          </div>
          
          <SmartSearchBar />
        </div>
      </section>
    </div>
  )
}

export default HomePage