import React from 'react'
import { TrustStrip } from "@/components/ui/trust-strip"
import { SmartSearchBar } from "@/components/SmartSearchBar"
import { Search, Rocket, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const HomePage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">
            Get the spot you want, without the stress.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            Tell us your event, we'll be ready to sign you up the moment registration opens. 
            You handle any final steps.
          </p>
        </div>
      </section>

      {/* 1-2-3 Flow Section */}
      <section className="px-4 pb-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: Search,
                title: "Tell Us What You Want",
                description: "Event name, location, and session/dates.",
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
                  {/* Step Number */}
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold mb-4">
                    {item.step}
                  </div>
                  
                  {/* Icon */}
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <Icon className="h-8 w-8 text-primary" />
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
      </section>

      {/* Smart Search Section */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-4xl">
          <SmartSearchBar />
        </div>
      </section>

      {/* Trust Strip */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <TrustStrip />
        </div>
      </section>
    </div>
  )
}

export default HomePage