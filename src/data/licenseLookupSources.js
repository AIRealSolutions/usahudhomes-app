/**
 * Where to look up a real estate license in each state (50 states, DC, PR).
 *
 * method:
 *   'auto'   — the state publishes its licensees as open data; the server searches it
 *              (NY data.ny.gov yg7h-zjbf, TX data.texas.gov s7ft-44qi, IL data.illinois.gov pzzh-kp68)
 *   'arello' — the state sends its licensees to ARELLO's national verification database
 *              (arello.com; manual search with a CAPTCHA, so it opens for you to search)
 *   'board'  — search on the state board's own lookup page
 *
 * verified: the lookup URL answered when checked (Nov 2026). false = could not be reached
 * from the build environment; the link may need updating.
 *
 * ARELLO also sells a Licensee Verification Web Service (API) covering ~43 jurisdictions,
 * which would allow automatic checks for the 'arello' states.
 */

export const ARELLO_URL = 'https://www.arello.com/'

const A = (board) => ({ method: 'arello', board, url: ARELLO_URL, verified: true })

export const LICENSE_SOURCES = {
  AL: A('Alabama Real Estate Commission'),
  AK: A('Alaska Real Estate Commission'),
  AZ: A('Arizona Department of Real Estate'),
  AR: A('Arkansas Real Estate Commission'),
  CA: A('California Department of Real Estate'),
  CO: A('Colorado Division of Real Estate'),
  CT: A('Connecticut Department of Consumer Protection — Real Estate'),
  DE: A('Delaware Real Estate Commission'),
  DC: A('DC Real Estate Commission'),
  FL: A('Florida Real Estate Commission (DBPR)'),
  GA: A('Georgia Real Estate Commission'),
  HI: A('Hawaii Real Estate Commission'),
  ID: A('Idaho Real Estate Commission'),
  IL: { method: 'auto', board: 'Illinois Department of Financial and Professional Regulation', url: 'https://online-dfpr.micropact.com/lookup/licenselookup.aspx', verified: true, dataset: 'IL open data (data.illinois.gov)' },
  IN: A('Indiana Real Estate Commission'),
  IA: A('Iowa Real Estate Commission'),
  KS: A('Kansas Real Estate Commission'),
  KY: A('Kentucky Real Estate Commission'),
  LA: A('Louisiana Real Estate Commission'),
  ME: A('Maine Real Estate Commission'),
  MD: A('Maryland Real Estate Commission'),
  MA: A('Massachusetts Board of Registration of Real Estate Brokers and Salespersons'),
  MI: { method: 'board', board: 'Michigan Department of Licensing and Regulatory Affairs (LARA)', url: 'https://aca-prod.accela.com/MILARA/GeneralProperty/PropertyLookUp.aspx?isLicensee=Y', verified: true },
  MN: { method: 'board', board: 'Minnesota Department of Commerce', url: 'https://mn.gov/commerce/licensing/license-lookup/', verified: false },
  MS: A('Mississippi Real Estate Commission'),
  MO: A('Missouri Real Estate Commission'),
  MT: A('Montana Board of Realty Regulation'),
  NE: A('Nebraska Real Estate Commission'),
  NV: A('Nevada Real Estate Division'),
  NH: A('New Hampshire Real Estate Commission'),
  NJ: A('New Jersey Real Estate Commission'),
  NM: { method: 'board', board: 'New Mexico Real Estate Commission (RLD)', url: 'https://verification.rld.state.nm.us/', verified: false },
  NY: { method: 'auto', board: 'New York Department of State', url: 'https://appext20.dos.ny.gov/nydos/selSearchType.do', verified: true, dataset: 'NY open data (data.ny.gov)' },
  NC: A('North Carolina Real Estate Commission'),
  ND: { method: 'board', board: 'North Dakota Real Estate Commission', url: 'https://services.realestatend.org/directory/', verified: true },
  OH: { method: 'board', board: 'Ohio Division of Real Estate and Professional Licensing', url: 'https://elicense.ohio.gov/oh_verifylicense', verified: true },
  OK: A('Oklahoma Real Estate Commission'),
  OR: A('Oregon Real Estate Agency'),
  PA: { method: 'board', board: 'Pennsylvania State Real Estate Commission (PALS)', url: 'https://www.pals.pa.gov/#/page/search', verified: true },
  RI: { method: 'board', board: 'Rhode Island Department of Business Regulation', url: 'https://elicensing.ri.gov/', verified: true },
  SC: A('South Carolina Real Estate Commission'),
  SD: A('South Dakota Real Estate Commission'),
  TN: A('Tennessee Real Estate Commission'),
  TX: { method: 'auto', board: 'Texas Real Estate Commission', url: 'https://www.trec.texas.gov/apps/license-holder-search/', verified: false, dataset: 'TX open data (data.texas.gov)' },
  UT: A('Utah Division of Real Estate'),
  VT: A('Vermont Real Estate Commission'),
  VA: { method: 'board', board: 'Virginia Department of Professional and Occupational Regulation', url: 'https://dporweb.dpor.virginia.gov/LicenseLookup/Search', verified: true },
  WA: { method: 'board', board: 'Washington Department of Licensing', url: 'https://professions.dol.wa.gov/s/license-lookup', verified: false },
  WV: A('West Virginia Real Estate Commission'),
  WI: { method: 'board', board: 'Wisconsin Department of Safety and Professional Services', url: 'https://licensesearch.wi.gov/', verified: false },
  WY: A('Wyoming Real Estate Commission'),
  PR: { method: 'board', board: 'Puerto Rico Board of Real Estate Brokers, Salespersons and Companies (DACO)', url: 'https://www.daco.pr.gov/', verified: false },
}

export const AUTO_STATES = Object.entries(LICENSE_SOURCES).filter(([, v]) => v.method === 'auto').map(([k]) => k)

export const licenseSource = state => LICENSE_SOURCES[String(state || '').toUpperCase()] || null
