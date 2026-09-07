import React, { useState } from 'react'
import { DollarSign, ChevronDown, ChevronUp, AlertCircle, TrendingUp } from 'lucide-react'
import financialCalculatorService from '../services/financialCalculatorService'

export default function FinancialCalculator() {
  const [buyerType, setBuyerType] = useState('owner_occupant')
  const [purchasePrice, setPurchasePrice] = useState(250000)
  const [downPaymentPercent, setDownPaymentPercent] = useState(3.5)
  const [mortgageRate, setMortgageRate] = useState(7.0)
  const [loanTerm, setLoanTerm] = useState(30)
  const [afterRepairValue, setAfterRepairValue] = useState(300000)
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    monthly: true,
    upfront: false,
    details: false,
  })

  const calculations =
    buyerType === 'owner_occupant'
      ? financialCalculatorService.calculateOwnerOccupant(
          purchasePrice,
          downPaymentPercent,
          mortgageRate,
          loanTerm
        )
      : financialCalculatorService.calculateInvestor(
          purchasePrice,
          downPaymentPercent,
          mortgageRate,
          loanTerm,
          afterRepairValue
        )

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-6">
        <div className="flex items-center mb-2">
          <DollarSign className="h-8 w-8 mr-3" />
          <h2 className="text-3xl font-bold">Financial Calculator</h2>
        </div>
        <p className="text-blue-100 mt-2">
          Understand your true cost of ownership with detailed HUD-1 style breakdown
        </p>
      </div>

      <div className="p-8">
        {/* Buyer Type Selection */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Buyer Type</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setBuyerType('owner_occupant')}
              className={`p-4 rounded-lg border-2 transition-all ${
                buyerType === 'owner_occupant'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900">👨‍👩‍👧‍👦 Owner-Occupant</div>
              <div className="text-xs text-gray-600 mt-1">Living in your HUD home</div>
            </button>
            <button
              onClick={() => setBuyerType('investor')}
              className={`p-4 rounded-lg border-2 transition-all ${
                buyerType === 'investor'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900">📊 Investor</div>
              <div className="text-xs text-gray-600 mt-1">Investment/Rental property</div>
            </button>
          </div>
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
          {/* Purchase Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Price</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Down Payment % */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Down Payment %</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={downPaymentPercent}
                onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
              <span className="absolute right-3 top-2 text-gray-500">%</span>
            </div>
          </div>

          {/* Mortgage Rate */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Interest Rate</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={mortgageRate}
                onChange={(e) => setMortgageRate(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
              <span className="absolute right-3 top-2 text-gray-500">%</span>
            </div>
          </div>

          {/* Loan Term */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Loan Term</label>
            <select
              value={loanTerm}
              onChange={(e) => setLoanTerm(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value={15}>15 Years</option>
              <option value={20}>20 Years</option>
              <option value={30}>30 Years</option>
            </select>
          </div>

          {/* After Repair Value (Investor Only) */}
          {buyerType === 'investor' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                After Repair Value (ARV)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">$</span>
                <input
                  type="number"
                  value={afterRepairValue}
                  onChange={(e) => setAfterRepairValue(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">Expected value after repairs</p>
            </div>
          )}
        </div>

        {/* Summary Card */}
        <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Loan Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(calculations.loanSummary.totalLoanAmount)}
              </p>
              <p className="text-xs text-gray-600 mt-2">LTV: {calculations.loanSummary.loanToValue}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Monthly Payment (Est.)</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(calculations.monthlyPayment.total)}
              </p>
              <p className="text-xs text-gray-600 mt-2">Includes taxes & insurance</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Upfront Cash Needed</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(calculations.upfrontCash.total)}
              </p>
              <p className="text-xs text-gray-600 mt-2">Down payment + closing costs</p>
            </div>
          </div>
        </div>

        {/* Collapsible Sections */}
        {/* Loan Breakdown */}
        <CalculatorSection
          title="Loan Breakdown"
          icon={DollarSign}
          isOpen={expandedSections.summary}
          onToggle={() => toggleSection('summary')}
        >
          <div className="space-y-3">
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-700">Purchase Price</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(calculations.purchasePrice)}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-700">Down Payment</span>
              <span className="font-semibold text-blue-600">
                -{formatCurrency(calculations.downPayment.amount)}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-700">Base Loan Amount</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(calculations.loanAmount)}
              </span>
            </div>
            {calculations.upfrontMIP && (
              <div className="flex justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-700">Upfront Mortgage Insurance (1.75%)</span>
                <span className="font-semibold text-gray-900">
                  +{formatCurrency(calculations.upfrontMIP.amount)}
                </span>
              </div>
            )}
            {calculations.mortgageInsurance && calculations.mortgageInsurance.amount > 0 && (
              <div className="flex justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-700">Mortgage Insurance</span>
                <span className="font-semibold text-gray-900">
                  +{formatCurrency(calculations.mortgageInsurance.amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 bg-blue-50 px-3 py-2 rounded">
              <span className="font-semibold text-gray-900">Total Amount Financed</span>
              <span className="font-bold text-blue-600">
                {formatCurrency(calculations.totalFinanced)}
              </span>
            </div>
          </div>
        </CalculatorSection>

        {/* Monthly Payment Breakdown */}
        <CalculatorSection
          title="Monthly Payment Breakdown"
          icon={TrendingUp}
          isOpen={expandedSections.monthly}
          onToggle={() => toggleSection('monthly')}
        >
          <div className="space-y-3">
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-700">Principal & Interest</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(calculations.monthlyPayment.principalAndInterest)}
              </span>
            </div>
            {calculations.monthlyPayment.monthlyMIP && (
              <div className="flex justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-700">Mortgage Insurance (Annual {calculations.monthlyPayment.annualMIP ? ((calculations.monthlyPayment.annualMIP / calculations.totalFinanced) * 100).toFixed(2) : 0}%)</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(calculations.monthlyPayment.monthlyMIP)}
                </span>
              </div>
            )}
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-700">Property Tax</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(calculations.monthlyPayment.propertyTax || calculations.monthlyPayment.propertyTax)}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-700">Home Insurance</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(
                  calculations.monthlyPayment.homeInsurance || calculations.monthlyPayment.insurance
                )}
              </span>
            </div>
            {buyerType === 'investor' && calculations.investmentMetrics && (
              <div className="flex justify-between pb-2 border-b border-gray-200 text-green-600">
                <span className="text-gray-700">Est. Monthly Rental Income</span>
                <span className="font-semibold">
                  +{formatCurrency(calculations.investmentMetrics.estimatedMonthlyRent)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 bg-blue-50 px-3 py-2 rounded">
              <span className="font-semibold text-gray-900">
                Total Monthly Payment
                {buyerType === 'investor' && calculations.investmentMetrics && (
                  <span className="text-xs text-gray-600 block">
                    (Without rental income)
                  </span>
                )}
              </span>
              <span className="font-bold text-blue-600">
                {formatCurrency(calculations.monthlyPayment.total)}
              </span>
            </div>
            {buyerType === 'investor' && calculations.investmentMetrics && (
              <div className="flex justify-between pt-2 bg-green-50 px-3 py-2 rounded">
                <span className="font-semibold text-gray-900">Net Monthly Income (if renting)</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(calculations.investmentMetrics.monthlyNetIncome)}
                </span>
              </div>
            )}
          </div>
        </CalculatorSection>

        {/* Upfront Cash Needed */}
        <CalculatorSection
          title="Upfront Cash Needed"
          icon={AlertCircle}
          isOpen={expandedSections.upfront}
          onToggle={() => toggleSection('upfront')}
        >
          <div className="space-y-3">
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-700">Down Payment</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(calculations.upfrontCash.downPayment)}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-700">Closing Costs</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(calculations.upfrontCash.closingCosts)}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-700">Inspection</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(calculations.upfrontCash.inspection)}
              </span>
            </div>
            {calculations.upfrontCash.earnestMoney && (
              <div className="flex justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-700">Earnest Money Deposit</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(calculations.upfrontCash.earnestMoney)}
                </span>
              </div>
            )}
            {calculations.upfrontCash.title && (
              <div className="flex justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-700">Title & Other</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(calculations.upfrontCash.title + (calculations.upfrontCash.appraisal || 0))}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 bg-orange-50 px-3 py-2 rounded">
              <span className="font-semibold text-gray-900">Total Cash Needed</span>
              <span className="font-bold text-orange-600">
                {formatCurrency(calculations.upfrontCash.total)}
              </span>
            </div>
          </div>
        </CalculatorSection>

        {/* Detailed Information */}
        <CalculatorSection
          title="Detailed Information"
          icon={AlertCircle}
          isOpen={expandedSections.details}
          onToggle={() => toggleSection('details')}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">About This Calculation</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                {buyerType === 'owner_occupant' ? (
                  <>
                    <li>Based on FHA 203(b) loan program</li>
                    <li>Upfront Mortgage Insurance Premium: 1.75% of base loan amount</li>
                    <li>Annual Mortgage Insurance: 0.55% of financed amount</li>
                    <li>Down payment can be as low as $100 for FHA loans</li>
                    <li>Seller may pay up to 3% of purchase price toward closing costs</li>
                    <li>Property taxes and insurance are estimates based on typical NC rates</li>
                  </>
                ) : (
                  <>
                    <li>Based on conventional investment property financing</li>
                    <li>Minimum 25% down payment required</li>
                    <li>Mortgage insurance applied if LTV exceeds 80%</li>
                    <li>Includes property taxes and landlord insurance estimates</li>
                    <li>Rental income estimated at 0.8% of purchase price per month</li>
                    <li>Cap Rate and Cash-on-Cash Return calculated for rental scenarios</li>
                  </>
                )}
              </ul>
            </div>

            {buyerType === 'investor' && calculations.investmentMetrics && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Investment Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-xs text-gray-600">Cap Rate</p>
                    <p className="text-lg font-bold text-blue-600">
                      {calculations.investmentMetrics.capRate}%
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-xs text-gray-600">Cash-on-Cash Return</p>
                    <p className="text-lg font-bold text-green-600">
                      {calculations.investmentMetrics.cashOnCashReturn}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {buyerType === 'investor' && calculations.repairEstimate && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Repair Estimate</h4>
                <div className="space-y-2">
                  <div className="flex justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-700">After Repair Value</span>
                    <span className="font-semibold">
                      {formatCurrency(calculations.repairEstimate.afterRepairValue)}
                    </span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-700">Purchase Price</span>
                    <span className="font-semibold">
                      {formatCurrency(calculations.repairEstimate.purchasePrice)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 bg-orange-50 px-3 py-2 rounded">
                    <span className="font-semibold text-gray-900">Est. Repair Costs</span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(calculations.repairEstimate.estimatedRepairs)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CalculatorSection>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <p className="text-sm text-gray-700">
            <strong>⚠️ Disclaimer:</strong> These calculations are estimates for educational purposes only.
            Actual costs will vary based on your specific situation, credit score, property location, and
            lender. Please consult with a loan officer for exact figures before making a purchase decision.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Reusable Collapsible Section Component
 */
function CalculatorSection({ title, icon: Icon, isOpen, onToggle, children }) {
  return (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center">
          <Icon className="h-5 w-5 text-blue-600 mr-3" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-600" />
        )}
      </button>
      {isOpen && <div className="px-6 py-4 bg-white">{children}</div>}
    </div>
  )
}
