import React from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, Wrench, TrendingUp, ChevronRight } from 'lucide-react'

export default function BuyerProgramsSection() {
  const programs = [
    {
      id: 1,
      title: '$100 Down Opportunities',
      description: 'Eligible owner-occupants can purchase HUD homes with as little as $100 down using FHA financing',
      icon: <DollarSign className="h-12 w-12 text-blue-600" />,
      link: '/programs/100-dollar-down',
      color: 'from-blue-50 to-blue-100'
    },
    {
      id: 2,
      title: 'Repair Escrow Properties',
      description: 'HUD homes needing repair work with FHA financing and escrow options up to $35,000',
      icon: <Wrench className="h-12 w-12 text-orange-600" />,
      link: '/programs/repair-escrow',
      color: 'from-orange-50 to-orange-100'
    },
    {
      id: 3,
      title: 'Investor Opportunities',
      description: 'Investment properties perfect for building your real estate portfolio with strong cash flow potential',
      icon: <TrendingUp className="h-12 w-12 text-green-600" />,
      link: '/programs/investor-opportunities',
      color: 'from-green-50 to-green-100'
    }
  ]

  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Explore Buyer Programs
          </h2>
          <p className="text-lg text-gray-600">
            Find the perfect HUD home program for your situation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {programs.map(program => (
            <Link
              key={program.id}
              to={program.link}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden"
            >
              <div className={`bg-gradient-to-br ${program.color} h-24 flex items-center justify-center`}>
                {program.icon}
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {program.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {program.description}
                </p>

                <div className="flex items-center text-blue-600 font-semibold group">
                  Learn More
                  <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Not sure which program is right for you?
          </p>
          <a
            href="tel:9103636147"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Call Our Experts: 910-363-6147
          </a>
        </div>
      </div>
    </div>
  )
}
