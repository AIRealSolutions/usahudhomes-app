import React from 'react'
import { Link } from 'react-router-dom'
import { Search, CreditCard, Home, Gavel, ClipboardCheck, Home as HomeCheckIcon, ChevronRight, ArrowRight } from 'lucide-react'

export default function HowItWorksPreview() {
  const steps = [
    {
      num: 1,
      title: 'FIND',
      description: 'Search HUD homes in your area',
      icon: <Search className="h-8 w-8 text-blue-600" />
    },
    {
      num: 2,
      title: 'FINANCE',
      description: 'Get FHA financing pre-approved',
      icon: <CreditCard className="h-8 w-8 text-blue-600" />
    },
    {
      num: 3,
      title: 'TOUR',
      description: 'Schedule property viewings',
      icon: <Home className="h-8 w-8 text-blue-600" />
    },
    {
      num: 4,
      title: 'BID',
      description: 'Submit your highest bid',
      icon: <Gavel className="h-8 w-8 text-blue-600" />
    },
    {
      num: 5,
      title: 'INSPECT',
      description: 'Complete inspection & repairs',
      icon: <ClipboardCheck className="h-8 w-8 text-blue-600" />
    },
    {
      num: 6,
      title: 'CLOSE',
      description: 'Get keys to your new home',
      icon: <HomeCheckIcon className="h-8 w-8 text-blue-600" />
    }
  ]

  return (
    <div className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Buying a HUD Home Doesn't Have to Be Hard
          </h2>
          <p className="text-lg text-gray-600">
            Our straightforward 6-step process makes HUD home buying simple and transparent
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {steps.map((step) => (
            <div key={step.num} className="relative">
              {/* Step Card */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-center hover:shadow-md transition-shadow h-full">
                <div className="flex justify-center mb-4">
                  <div className="bg-white rounded-full p-3 shadow-md">
                    {step.icon}
                  </div>
                </div>

                <div className="text-sm font-bold text-blue-600 mb-2">
                  STEP {step.num}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {step.title}
                </h3>

                <p className="text-gray-600 text-sm">
                  {step.description}
                </p>
              </div>

              {/* Arrow between steps (except after last one) */}
              {step.num < 6 && (
                <div className="hidden lg:flex absolute -right-8 top-1/2 transform -translate-y-1/2">
                  <ArrowRight className="h-6 w-6 text-blue-300" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Process Flow for Mobile */}
        <div className="lg:hidden mb-12 space-y-2">
          {steps.map((step, index) => (
            <div key={step.num} className="flex items-center">
              <span className="font-bold text-blue-600 text-sm">{step.num}</span>
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 h-px bg-blue-300"></div>
              )}
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-8 md:p-12 text-white text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
            Our complete step-by-step guide walks you through the entire HUD home buying process with tips and resources at each stage.
          </p>

          <Link
            to="/how-it-works"
            className="inline-flex items-center bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors group"
          >
            Read the Complete Guide
            <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">25+</div>
            <p className="text-gray-600">Years Experience</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">1000s</div>
            <p className="text-gray-600">Successful Closings</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">50+</div>
            <p className="text-gray-600">States Served</p>
          </div>
        </div>
      </div>
    </div>
  )
}
