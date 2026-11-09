import React, { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { MapPin, Star, AlertCircle } from 'lucide-react'
import { US_STATES, AGENT_SPECIALTIES } from '../../../data/referralAgreementTemplate'
import { getEconomicRegions } from '../../../services/brokerFinder'

const StatesAndSpecialtiesStep = ({ formData, updateFormData, errors }) => {
  const [regions, setRegions] = useState([])
  useEffect(() => { getEconomicRegions().then(setRegions).catch(() => setRegions([])) }, [])
  const chosenRegions = formData.economicRegions || []

  const toggleState = (stateCode) => {
    const currentStates = formData.statesCovered || []
    const removing = currentStates.includes(stateCode)
    const newStates = removing
      ? currentStates.filter(s => s !== stateCode)
      : [...currentStates, stateCode]
    updateFormData('statesCovered', newStates)
    if (removing) updateFormData('economicRegions', chosenRegions.filter(k => !k.startsWith(`${stateCode}:`)))
  }

  const toggleRegion = (key) => {
    updateFormData('economicRegions', chosenRegions.includes(key) ? chosenRegions.filter(k => k !== key) : [...chosenRegions, key])
  }
  const statesWithRegions = (formData.statesCovered || []).filter(code => regions.some(r => r.state === code))

  const toggleSpecialty = (specialty) => {
    const currentSpecialties = formData.specialties || []
    const newSpecialties = currentSpecialties.includes(specialty)
      ? currentSpecialties.filter(s => s !== specialty)
      : [...currentSpecialties, specialty]
    updateFormData('specialties', newSpecialties)
  }

  const selectAllStates = () => {
    updateFormData('statesCovered', US_STATES.map(s => s.code))
  }

  const clearAllStates = () => {
    updateFormData('statesCovered', [])
  }

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Define Your Territory:</strong> Select the states where you hold active 
          real estate licenses and want to receive HUD home leads. You can only receive 
          leads in states where you're licensed.
        </p>
      </div>

      {/* States Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-lg font-semibold">
            <MapPin className="w-5 h-5" />
            States Where You Operate *
          </Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllStates}
              className="text-sm text-blue-600 hover:underline"
            >
              Select All
            </button>
            <span className="text-gray-400">|</span>
            <button
              type="button"
              onClick={clearAllStates}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear All
            </button>
          </div>
        </div>

        {errors.statesCovered && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{errors.statesCovered}</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-4 border rounded-lg bg-gray-50">
          {US_STATES.map((state) => {
            const isSelected = formData.statesCovered.includes(state.code)
            return (
              <div
                key={state.code}
                onClick={() => toggleState(state.code)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleState(state.code)}
                  className="pointer-events-none"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{state.code}</div>
                  <div className="text-xs text-gray-600">{state.name}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Badge variant="secondary" className="text-base px-3 py-1">
            {formData.statesCovered.length}
          </Badge>
          <span>state{formData.statesCovered.length !== 1 ? 's' : ''} selected</span>
        </div>
      </div>

      {/* Economic regions within the chosen states */}
      {statesWithRegions.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-lg font-semibold">
            <MapPin className="w-5 h-5" />
            Regions You Cover
          </Label>
          <p className="text-sm text-gray-600">
            Pick the economic regions where you want leads. Leave a state's regions unchecked to receive leads statewide.
          </p>
          {statesWithRegions.map(code => (
            <div key={code} className="border rounded-lg p-3">
              <div className="font-medium text-sm mb-2">
                {US_STATES.find(s => s.code === code)?.name || code}
                <span className="text-gray-500 font-normal"> — {chosenRegions.some(k => k.startsWith(`${code}:`)) ? `${chosenRegions.filter(k => k.startsWith(`${code}:`)).length} selected` : 'whole state'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {regions.filter(r => r.state === code).map(r => {
                  const key = `${code}:${r.slug}`
                  return (
                    <label key={key} className="flex items-start gap-2 text-sm cursor-pointer" title={r.counties.join(', ')}>
                      <input type="checkbox" className="mt-0.5" checked={chosenRegions.includes(key)} onChange={() => toggleRegion(key)} />
                      <span>{r.name}<span className="block text-xs text-gray-500">{r.counties.slice(0, 4).join(', ')}{r.counties.length > 4 ? ` +${r.counties.length - 4} more` : ''}</span></span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Specialties Selection */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2 text-lg font-semibold">
          <Star className="w-5 h-5" />
          Your Specialties *
        </Label>

        <p className="text-sm text-gray-600">
          Select the types of clients and properties you specialize in. This helps us match 
          you with the right leads.
        </p>

        {errors.specialties && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{errors.specialties}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AGENT_SPECIALTIES.map((specialty) => {
            const isSelected = formData.specialties.includes(specialty)
            return (
              <div
                key={specialty}
                onClick={() => toggleSpecialty(specialty)}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-green-50 border-green-500 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSpecialty(specialty)}
                  className="pointer-events-none"
                />
                <span className="font-medium text-sm">{specialty}</span>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Badge variant="secondary" className="text-base px-3 py-1">
            {formData.specialties.length}
          </Badge>
          <span>specialt{formData.specialties.length !== 1 ? 'ies' : 'y'} selected</span>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <strong>Lead Matching:</strong> We'll prioritize sending you leads that match your 
          selected states and specialties. You can update these preferences anytime from your 
          broker dashboard.
        </p>
      </div>
    </div>
  )
}

export default StatesAndSpecialtiesStep
