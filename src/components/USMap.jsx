import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { MapPin, Home, DollarSign } from 'lucide-react'

function USMap({ onStateSelect, stateStats = {} }) {
  const [hoveredState, setHoveredState] = useState(null)
  const [selectedState, setSelectedState] = useState(null)

  // US States with their abbreviations and approximate SVG coordinates
  const states = [
    { code: 'AL', name: 'Alabama', x: 580, y: 420 },
    { code: 'AK', name: 'Alaska', x: 120, y: 520 },
    { code: 'AZ', name: 'Arizona', x: 280, y: 380 },
    { code: 'AR', name: 'Arkansas', x: 480, y: 380 },
    { code: 'CA', name: 'California', x: 120, y: 320 },
    { code: 'CO', name: 'Colorado', x: 380, y: 320 },
    { code: 'CT', name: 'Connecticut', x: 720, y: 260 },
    { code: 'DE', name: 'Delaware', x: 700, y: 300 },
    { code: 'DC', name: 'District of Columbia', x: 680, y: 310 },
    { code: 'FL', name: 'Florida', x: 640, y: 480 },
    { code: 'GA', name: 'Georgia', x: 600, y: 420 },
    { code: 'HI', name: 'Hawaii', x: 200, y: 480 },
    { code: 'ID', name: 'Idaho', x: 280, y: 220 },
    { code: 'IL', name: 'Illinois', x: 520, y: 300 },
    { code: 'IN', name: 'Indiana', x: 560, y: 300 },
    { code: 'IA', name: 'Iowa', x: 480, y: 280 },
    { code: 'KS', name: 'Kansas', x: 420, y: 340 },
    { code: 'KY', name: 'Kentucky', x: 580, y: 340 },
    { code: 'LA', name: 'Louisiana', x: 480, y: 440 },
    { code: 'ME', name: 'Maine', x: 740, y: 200 },
    { code: 'MD', name: 'Maryland', x: 680, y: 310 },
    { code: 'MA', name: 'Massachusetts', x: 720, y: 240 },
    { code: 'MI', name: 'Michigan', x: 560, y: 240 },
    { code: 'MN', name: 'Minnesota', x: 460, y: 220 },
    { code: 'MS', name: 'Mississippi', x: 520, y: 420 },
    { code: 'MO', name: 'Missouri', x: 460, y: 340 },
    { code: 'MT', name: 'Montana', x: 340, y: 200 },
    { code: 'NE', name: 'Nebraska', x: 420, y: 300 },
    { code: 'NV', name: 'Nevada', x: 220, y: 300 },
    { code: 'NH', name: 'New Hampshire', x: 720, y: 220 },
    { code: 'NJ', name: 'New Jersey', x: 700, y: 280 },
    { code: 'NM', name: 'New Mexico', x: 340, y: 380 },
    { code: 'NY', name: 'New York', x: 680, y: 240 },
    { code: 'NC', name: 'North Carolina', x: 640, y: 360 },
    { code: 'ND', name: 'North Dakota', x: 420, y: 200 },
    { code: 'OH', name: 'Ohio', x: 600, y: 300 },
    { code: 'OK', name: 'Oklahoma', x: 420, y: 380 },
    { code: 'OR', name: 'Oregon', x: 160, y: 220 },
    { code: 'PA', name: 'Pennsylvania', x: 660, y: 280 },
    { code: 'PR', name: 'Puerto Rico', x: 720, y: 480 },
    { code: 'RI', name: 'Rhode Island', x: 730, y: 250 },
    { code: 'SC', name: 'South Carolina', x: 620, y: 380 },
    { code: 'SD', name: 'South Dakota', x: 420, y: 260 },
    { code: 'TN', name: 'Tennessee', x: 560, y: 360 },
    { code: 'TX', name: 'Texas', x: 380, y: 440 },
    { code: 'UT', name: 'Utah', x: 300, y: 320 },
    { code: 'VT', name: 'Vermont', x: 710, y: 220 },
    { code: 'VA', name: 'Virginia', x: 640, y: 330 },
    { code: 'WA', name: 'Washington', x: 200, y: 160 },
    { code: 'WV', name: 'West Virginia', x: 620, y: 320 },
    { code: 'WI', name: 'Wisconsin', x: 500, y: 240 },
    { code: 'WY', name: 'Wyoming', x: 340, y: 260 }
  ]

  const handleStateClick = (state) => {
    setSelectedState(state)
    if (onStateSelect) {
      onStateSelect(state)
    }
  }

  const getStateColor = (stateCode) => {
    const stats = stateStats[stateCode]
    if (!stats) return '#e5e7eb' // gray-200
    
    const count = stats.total_properties
    if (count >= 6) return '#1d4ed8' // blue-700
    if (count >= 4) return '#3b82f6' // blue-500
    if (count >= 2) return '#60a5fa' // blue-400
    return '#93c5fd' // blue-300
  }

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            HUD Properties Nationwide
          </CardTitle>
          <CardDescription>
            Click on any state to view available HUD properties. Darker blue indicates more properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* SVG Map */}
            <svg
              viewBox="0 0 800 600"
              className="w-full h-auto border border-gray-200 rounded-lg bg-gray-50"
            >
              {/* State circles */}
              {states.map((state) => {
                const stats = stateStats[state.code]
                const isHovered = hoveredState === state.code
                const isSelected = selectedState === state.code
                
                return (
                  <g key={state.code}>
                    {/* State circle */}
                    <circle
                      cx={state.x}
                      cy={state.y}
                      r={isHovered || isSelected ? 18 : 15}
                      fill={getStateColor(state.code)}
                      stroke={isSelected ? '#f59e0b' : isHovered ? '#374151' : '#ffffff'}
                      strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                      className="cursor-pointer transition-all duration-200 hover:drop-shadow-lg"
                      onMouseEnter={() => setHoveredState(state.code)}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateClick(state)}
                    />
                    
                    {/* State code label */}
                    <text
                      x={state.x}
                      y={state.y + 4}
                      textAnchor="middle"
                      className="text-xs font-semibold fill-white pointer-events-none"
                      style={{ fontSize: '10px' }}
                    >
                      {state.code}
                    </text>
                    
                    {/* Property count badge */}
                    {stats && stats.total_properties > 0 && (
                      <circle
                        cx={state.x + 12}
                        cy={state.y - 12}
                        r="8"
                        fill="#dc2626"
                        className="pointer-events-none"
                      />
                    )}
                    {stats && stats.total_properties > 0 && (
                      <text
                        x={state.x + 12}
                        y={state.y - 8}
                        textAnchor="middle"
                        className="text-xs font-bold fill-white pointer-events-none"
                        style={{ fontSize: '8px' }}
                      >
                        {stats.total_properties}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Hover tooltip */}
            {hoveredState && (
              <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg border z-10">
                <div className="font-semibold text-gray-900">
                  {states.find(s => s.code === hoveredState)?.name}
                </div>
                {stateStats[hoveredState] && (
                  <div className="text-sm text-gray-600 mt-1">
                    <div className="flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      {stateStats[hoveredState].total_properties} properties
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Avg: ${stateStats[hoveredState].avg_price?.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-gray-700">Property Count:</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-300"></div>
                  <span className="text-xs text-gray-600">1-2</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                  <span className="text-xs text-gray-600">3-4</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-600">5-6</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-700"></div>
                  <span className="text-xs text-gray-600">7+</span>
                </div>
              </div>
            </div>
            
            {selectedState && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedState(null)}
              >
                Clear Selection
              </Button>
            )}
          </div>

          {/* Selected state info */}
          {selectedState && stateStats[selectedState] && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-blue-900">
                  {states.find(s => s.code === selectedState)?.name}
                </h3>
                <Badge variant="secondary">
                  {stateStats[selectedState].total_properties} properties
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Average Price:</span>
                  <div className="font-semibold text-green-600">
                    ${stateStats[selectedState].avg_price?.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Price Range:</span>
                  <div className="font-semibold">
                    ${stateStats[selectedState].min_price?.toLocaleString()} - 
                    ${stateStats[selectedState].max_price?.toLocaleString()}
                  </div>
                </div>
              </div>
              {stateStats[selectedState].cities && (
                <div className="mt-2">
                  <span className="text-gray-600 text-sm">Cities:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {stateStats[selectedState].cities.slice(0, 5).map((city, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {city}
                      </Badge>
                    ))}
                    {stateStats[selectedState].cities.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{stateStats[selectedState].cities.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default USMap
