/**
 * Financial Calculator Service
 * Provides calculations for HUD home financing with different logic for owner-occupants vs investors
 */

class FinancialCalculatorService {
  /**
   * Calculate HUD-1 style financing statement for owner-occupants
   * Includes FHA loan with $100 down payment and 3% closing cost assistance
   */
  calculateOwnerOccupant(purchasePrice, downPaymentPercent, mortgageRate, loanTerm) {
    const calculations = {
      buyerType: 'owner_occupant',
      purchasePrice: purchasePrice,
      downPaymentPercent: downPaymentPercent,
      mortgageRate: mortgageRate,
      loanTerm: loanTerm,
    }

    // Down payment calculation
    // FHA allows as low as 3.5%, but user specified $100 minimum
    const downPaymentAmount = Math.max(100, (purchasePrice * downPaymentPercent) / 100)
    calculations.downPayment = {
      amount: downPaymentAmount,
      note: downPaymentAmount === 100 ? 'Minimum $100 FHA down payment' : `${downPaymentPercent}% down payment`,
    }

    // Loan amount
    const loanAmount = purchasePrice - downPaymentAmount
    calculations.loanAmount = loanAmount

    // FHA Mortgage Insurance Premium (MIP)
    // Upfront MIP: 1.75% of loan amount
    const upfrontMIP = loanAmount * 0.0175
    calculations.upfrontMIP = {
      rate: 1.75,
      amount: upfrontMIP,
    }

    // Total amount financed (includes upfront MIP)
    const totalFinanced = loanAmount + upfrontMIP
    calculations.totalFinanced = totalFinanced

    // Closing costs (estimated at 2-5% of purchase price)
    const closingCostsEstimate = purchasePrice * 0.035 // 3.5% estimate
    // FHA allows up to 3% of closing costs to be paid by seller
    const closingCostAssistance = purchasePrice * 0.03
    const buyerClosingCosts = Math.max(0, closingCostsEstimate - closingCostAssistance)
    calculations.closingCosts = {
      estimate: closingCostsEstimate,
      assistanceAvailable: closingCostAssistance,
      buyerResponsibility: buyerClosingCosts,
      note: 'Estimate; seller may pay up to 3% of purchase price',
    }

    // Monthly mortgage calculation (P&I only)
    const monthlyRate = mortgageRate / 100 / 12
    const numberOfPayments = loanTerm * 12
    const monthlyPI = this.calculateMonthlyPayment(totalFinanced, monthlyRate, numberOfPayments)
    calculations.monthlyPayment = {
      principalAndInterest: monthlyPI,
      mortgageRate: mortgageRate,
      loanTerm: loanTerm,
    }

    // Annual mortgage insurance premium (ANNUAL MIP)
    // 0.55% of loan amount for loans >= 95% LTV
    const loanToValue = (totalFinanced / purchasePrice) * 100
    const annualMIP = totalFinanced * 0.0055
    const monthlyMIP = annualMIP / 12
    calculations.monthlyPayment.annualMIP = annualMIP
    calculations.monthlyPayment.monthlyMIP = monthlyMIP

    // Taxes and insurance (estimated)
    const estimatedPropertyTax = (purchasePrice * 0.012) / 12 // 1.2% annual property tax
    const estimatedHomeInsurance = 1200 / 12 // $1,200/year estimate
    calculations.monthlyPayment.propertyTax = estimatedPropertyTax
    calculations.monthlyPayment.homeInsurance = estimatedHomeInsurance

    // Total monthly payment
    calculations.monthlyPayment.total =
      monthlyPI + monthlyMIP + estimatedPropertyTax + estimatedHomeInsurance
    calculations.monthlyPayment.breakdown = {
      principalAndInterest: monthlyPI,
      mortgageInsurance: monthlyMIP,
      propertyTax: estimatedPropertyTax,
      homeInsurance: estimatedHomeInsurance,
    }

    // Upfront cash needed
    calculations.upfrontCash = {
      downPayment: downPaymentAmount,
      closingCosts: buyerClosingCosts,
      inspection: 500, // estimated
      earnestMoney: purchasePrice * 0.01, // 1% estimate
      total: downPaymentAmount + buyerClosingCosts + 500 + purchasePrice * 0.01,
    }

    // Loan summary
    calculations.loanSummary = {
      purchasePrice: purchasePrice,
      downPayment: downPaymentAmount,
      baseAmount: loanAmount,
      upfrontMIP: upfrontMIP,
      totalLoanAmount: totalFinanced,
      loanToValue: loanToValue.toFixed(2),
    }

    return calculations
  }

  /**
   * Calculate HUD-1 style financing statement for investors
   * Uses conventional loan with 25% down payment and investment property rates
   */
  calculateInvestor(purchasePrice, downPaymentPercent, mortgageRate, loanTerm, afterRepairValue) {
    const calculations = {
      buyerType: 'investor',
      purchasePrice: purchasePrice,
      afterRepairValue: afterRepairValue,
      downPaymentPercent: downPaymentPercent,
      mortgageRate: mortgageRate,
      loanTerm: loanTerm,
    }

    // Down payment calculation (typically 25% minimum for investment property)
    const minDownPayment = purchasePrice * 0.25
    const requestedDownPayment = (purchasePrice * downPaymentPercent) / 100
    const downPaymentAmount = Math.max(minDownPayment, requestedDownPayment)
    calculations.downPayment = {
      amount: downPaymentAmount,
      percentage: (downPaymentAmount / purchasePrice) * 100,
      note: downPaymentAmount === minDownPayment ? 'Investment property minimum 25%' : `${downPaymentPercent}% down payment`,
    }

    // Loan amount
    const loanAmount = purchasePrice - downPaymentAmount
    calculations.loanAmount = loanAmount

    // Investment property mortgage insurance (if applicable)
    const loanToValue = (loanAmount / purchasePrice) * 100
    let mortgageInsurancePercent = 0
    if (loanToValue > 80) {
      mortgageInsurancePercent = 1.0 // 1% for LTV > 80%
    }

    const mortgageInsuranceAmount = loanAmount * mortgageInsurancePercent
    calculations.mortgageInsurance = {
      rate: mortgageInsurancePercent,
      amount: mortgageInsuranceAmount,
    }

    // Total amount financed
    const totalFinanced = loanAmount + mortgageInsuranceAmount
    calculations.totalFinanced = totalFinanced

    // Closing costs (higher for investment properties, 2-3%)
    const closingCostsEstimate = purchasePrice * 0.025 // 2.5% estimate
    calculations.closingCosts = {
      estimate: closingCostsEstimate,
      buyerResponsibility: closingCostsEstimate,
      note: 'Investor typically bears all closing costs',
    }

    // Repair/rehab estimate (optional but crucial for investors)
    const estimatedRepairs = Math.max(0, afterRepairValue - purchasePrice)
    calculations.repairEstimate = {
      afterRepairValue: afterRepairValue,
      purchasePrice: purchasePrice,
      estimatedRepairs: estimatedRepairs,
      note: 'Estimated cost to bring property to after-repair value',
    }

    // Monthly mortgage calculation (P&I only)
    const monthlyRate = mortgageRate / 100 / 12
    const numberOfPayments = loanTerm * 12
    const monthlyPI = this.calculateMonthlyPayment(totalFinanced, monthlyRate, numberOfPayments)
    calculations.monthlyPayment = {
      principalAndInterest: monthlyPI,
      mortgageRate: mortgageRate,
      loanTerm: loanTerm,
    }

    // Property taxes (typically 1.2-1.5% annual)
    const estimatedPropertyTax = (purchasePrice * 0.0135) / 12
    // Investment property insurance (typically $1500-2000/year)
    const estimatedPropertyInsurance = 1800 / 12
    // Landlord insurance
    const estimatedInsurance = estimatedPropertyInsurance

    calculations.monthlyPayment.propertyTax = estimatedPropertyTax
    calculations.monthlyPayment.insurance = estimatedInsurance

    // Rental income estimate (optional)
    const estimatedMonthlyRent = purchasePrice * 0.008 // 0.8% monthly rent rule
    calculations.monthlyPayment.estimatedRentalIncome = estimatedMonthlyRent

    // Total monthly payment (without rental income)
    calculations.monthlyPayment.total = monthlyPI + estimatedPropertyTax + estimatedInsurance

    // Cash-on-cash return (if renting)
    const yearlyNetIncome = (estimatedMonthlyRent - calculations.monthlyPayment.total) * 12
    const cashOnCashReturn = (yearlyNetIncome / (downPaymentAmount + closingCostsEstimate)) * 100
    calculations.investmentMetrics = {
      estimatedMonthlyRent: estimatedMonthlyRent,
      monthlyExpenses: calculations.monthlyPayment.total,
      monthlyNetIncome: estimatedMonthlyRent - calculations.monthlyPayment.total,
      yearlyNetIncome: yearlyNetIncome,
      cashOnCashReturn: cashOnCashReturn.toFixed(2),
      capRate: ((yearlyNetIncome / purchasePrice) * 100).toFixed(2),
    }

    // Upfront cash needed
    calculations.upfrontCash = {
      downPayment: downPaymentAmount,
      closingCosts: closingCostsEstimate,
      inspection: 750, // Investor grade inspection
      title: 500,
      appraisal: 600,
      total: downPaymentAmount + closingCostsEstimate + 750 + 500 + 600,
    }

    // Loan summary
    calculations.loanSummary = {
      purchasePrice: purchasePrice,
      downPayment: downPaymentAmount,
      baseAmount: loanAmount,
      mortgageInsurance: mortgageInsuranceAmount,
      totalLoanAmount: totalFinanced,
      loanToValue: loanToValue.toFixed(2),
    }

    return calculations
  }

  /**
   * Calculate monthly payment using standard amortization formula
   */
  calculateMonthlyPayment(principal, monthlyRate, numberOfPayments) {
    if (monthlyRate === 0) {
      return principal / numberOfPayments
    }
    return (principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  /**
   * Format percentage for display
   */
  formatPercent(percent) {
    return `${percent.toFixed(2)}%`
  }
}

export const financialCalculatorService = new FinancialCalculatorService()
export default financialCalculatorService
