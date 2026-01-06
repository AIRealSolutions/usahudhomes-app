// Referral Agreement Template for HUD Home Leads
// Version 1.0 - January 2026

export const REFERRAL_AGREEMENT_VERSION = 'v1.0'

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
]

export const AGENT_SPECIALTIES = [
  'First Time Home Buyers',
  'Investment Properties',
  'HUD Foreclosures',
  'Distressed Properties',
  'Residential Sales',
  'Commercial Properties',
  'Multi-Family Properties',
  'Luxury Homes',
  'Relocation Services',
  'Military/VA Buyers',
  'Senior Housing',
  'New Construction'
]

export const DEFAULT_REFERRAL_FEE = 25.00 // 25%

export const getReferralAgreementText = (agentData) => {
  const { firstName, lastName, company, licenseNumber, licenseState, statesCovered, referralFeePercentage } = agentData
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const statesList = statesCovered.map(code => {
    const state = US_STATES.find(s => s.code === code)
    return state ? state.name : code
  }).join(', ')

  return `
HUD HOME LEAD REFERRAL AGREEMENT

This Referral Agreement ("Agreement") is entered into as of ${today} ("Effective Date") by and between:

**REFERRING PARTY:**
USA HUD Homes
A lead generation and referral service for HUD-owned properties
("Referrer")

**RECEIVING PARTY:**
${firstName} ${lastName}
${company ? `${company}\n` : ''}License Number: ${licenseNumber}
License State: ${licenseState}
("Agent" or "Broker")

WHEREAS, Referrer operates a platform that generates leads for HUD-owned properties and connects prospective buyers with licensed real estate agents; and

WHEREAS, Agent is a duly licensed real estate professional authorized to represent buyers in real estate transactions in the following states: ${statesList};

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, the parties agree as follows:

**1. SCOPE OF SERVICES**

1.1 Referrer agrees to refer qualified leads for HUD-owned properties to Agent in the states where Agent is licensed and has indicated availability.

1.2 Agent agrees to promptly respond to all referred leads within 2 hours during business hours (9 AM - 6 PM local time, Monday-Friday) and within 4 hours on weekends.

1.3 Agent agrees to provide professional representation to referred clients in accordance with all applicable real estate laws, regulations, and ethical standards.

**2. TERRITORY**

2.1 This Agreement applies to the following states where Agent is licensed and authorized to receive referrals: ${statesList}.

2.2 Agent may update their covered states by providing written notice to Referrer, subject to verification of valid licensure.

**3. REFERRAL FEE**

3.1 Agent agrees to pay Referrer a referral fee of ${referralFeePercentage}% of the gross commission earned by Agent upon successful closing of any transaction resulting from a lead referred by Referrer.

3.2 The referral fee is calculated on the total commission received by Agent before any splits with their brokerage or other parties.

3.3 Payment of the referral fee shall be made within 5 business days of Agent receiving their commission from the closing.

3.4 Agent shall provide Referrer with a copy of the settlement statement (HUD-1 or Closing Disclosure) for verification purposes.

**4. LEAD ACCEPTANCE AND REJECTION**

4.1 Agent has the right to accept or decline any referred lead within 24 hours of receiving the referral.

4.2 If Agent declines a lead or fails to respond within 24 hours, Referrer may reassign the lead to another agent without penalty.

4.3 Once Agent accepts a lead, Agent commits to diligently pursuing the opportunity and maintaining regular communication with the prospective client.

**5. CLIENT RELATIONSHIP**

5.1 Upon acceptance of a referral, Agent becomes the primary point of contact for the referred client.

5.2 Agent shall enter into appropriate buyer representation agreements with referred clients in accordance with state law and brokerage requirements.

5.3 Agent shall maintain confidentiality of all client information and comply with all privacy laws and regulations.

**6. REPORTING AND COMMUNICATION**

6.1 Agent agrees to provide status updates on referred leads through the Referrer's broker dashboard system.

6.2 Agent shall notify Referrer immediately upon:
    a) Execution of a buyer representation agreement
    b) Submission of an offer on any property
    c) Acceptance of an offer and contract execution
    d) Scheduled closing date
    e) Successful closing
    f) Termination of the client relationship for any reason

**7. TERM AND TERMINATION**

7.1 This Agreement shall commence on the Effective Date and continue for a period of one (1) year, automatically renewing for successive one-year terms unless either party provides written notice of non-renewal at least 30 days prior to the end of the current term.

7.2 Either party may terminate this Agreement with 30 days written notice.

7.3 Referral fee obligations for leads referred prior to termination shall survive termination of this Agreement.

7.4 Upon termination, Agent shall continue to service any active clients referred by Referrer and pay applicable referral fees upon closing.

**8. INDEPENDENT CONTRACTOR STATUS**

8.1 Agent is an independent contractor and not an employee, partner, or joint venturer of Referrer.

8.2 Agent is responsible for all taxes, insurance, licenses, and other obligations associated with their real estate business.

8.3 Agent maintains their own errors and omissions insurance coverage.

**9. COMPLIANCE WITH LAWS**

9.1 Agent represents and warrants that they hold all necessary licenses and are in good standing with all applicable real estate regulatory authorities.

9.2 Agent agrees to comply with all federal, state, and local laws governing real estate transactions, including but not limited to:
    - Real Estate Settlement Procedures Act (RESPA)
    - Fair Housing Act
    - Truth in Lending Act
    - State real estate licensing laws
    - HUD regulations for HUD-owned property sales

9.3 Agent agrees that all referral fee arrangements comply with RESPA Section 8 and applicable state referral fee regulations.

**10. CONFIDENTIALITY**

10.1 Both parties agree to maintain the confidentiality of proprietary business information, client data, and the terms of this Agreement.

10.2 Agent shall not solicit leads or clients through Referrer's platform for direct business that circumvents the referral fee arrangement.

**11. INDEMNIFICATION**

11.1 Agent agrees to indemnify and hold harmless Referrer from any claims, damages, or liabilities arising from Agent's representation of referred clients or Agent's breach of this Agreement.

11.2 Referrer agrees to indemnify and hold harmless Agent from any claims arising from Referrer's lead generation activities or misrepresentation of services.

**12. DISPUTE RESOLUTION**

12.1 Any disputes arising under this Agreement shall first be subject to good faith negotiation between the parties.

12.2 If negotiation fails, disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.

**13. GENERAL PROVISIONS**

13.1 This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements or understandings.

13.2 This Agreement may not be modified except in writing signed by both parties.

13.3 If any provision of this Agreement is found to be unenforceable, the remaining provisions shall remain in full force and effect.

13.4 This Agreement shall be governed by the laws of the State of North Carolina.

13.5 Notices under this Agreement shall be sent to the email addresses on file with Referrer's system.

**14. ELECTRONIC SIGNATURE**

14.1 The parties agree that electronic signatures shall have the same legal effect as original signatures.

14.2 By typing your name below, you acknowledge that you have read, understood, and agree to be bound by all terms and conditions of this Agreement.

**AGENT ACKNOWLEDGMENT**

By signing below, I acknowledge that:
- I have read and understand this entire Agreement
- I agree to all terms and conditions stated herein
- I am authorized to enter into this Agreement
- I hold a valid real estate license in the states indicated
- I will comply with all applicable laws and regulations
- I understand the referral fee structure and payment obligations

---

This is a legally binding agreement. Please read carefully before signing.
`
}

export const getAgreementSummary = (referralFeePercentage = DEFAULT_REFERRAL_FEE) => {
  return {
    title: 'HUD Home Lead Referral Agreement - Key Terms',
    points: [
      {
        title: 'Referral Fee',
        description: `${referralFeePercentage}% of your gross commission on successful closings from our referred leads`
      },
      {
        title: 'Response Time',
        description: 'Respond to leads within 2 hours (business hours) or 4 hours (weekends)'
      },
      {
        title: 'Lead Acceptance',
        description: 'Accept or decline leads within 24 hours of receiving referral'
      },
      {
        title: 'Payment Terms',
        description: 'Referral fee due within 5 business days after receiving your commission'
      },
      {
        title: 'Territory',
        description: 'Receive leads only in states where you hold active real estate licenses'
      },
      {
        title: 'Term',
        description: '1-year agreement with automatic renewal, 30-day cancellation notice'
      },
      {
        title: 'Compliance',
        description: 'All referral fees comply with RESPA and state regulations'
      },
      {
        title: 'Independent Contractor',
        description: 'You maintain your own business, licenses, and insurance'
      }
    ]
  }
}
