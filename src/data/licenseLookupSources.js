/**
 * Where to look up real estate licenses in each state (50 states, DC, PR), as checked
 * in Nov 2026.
 *
 * method (how License Check verifies a person):
 *   'auto'   — the state publishes licensees as open data / downloads; searched by the server
 *              NY data.ny.gov · TX data.texas.gov · IL data.illinois.gov · FL DBPR weekly county files
 *   'board'  — the state board's own lookup (better than ARELLO here, or the state isn't in ARELLO)
 *   'arello' — ARELLO's national license verification database (manual search; CAPTCHA)
 *
 * board:   the state's own lookup, when we have one
 *   url, searchBy: which fields it searches ('name','license','city','county','zip','firm'),
 *   captcha: true if it has a CAPTCHA (can only be searched by hand),
 *   firmUrl: a separate firm/company search, verified: the page answered when checked
 * arello:  true if the state is in ARELLO's search (39 + DC)
 *
 * Boards that search by city/county/ZIP are how to find every licensed agent in a town.
 * ARELLO also sells an API (~43 jurisdictions) that would make the 'arello' states automatic.
 */

export const ARELLO_URL = 'https://www.arello.com/'

const B = (url, searchBy, extra = {}) => ({ url, searchBy, captcha: false, verified: true, ...extra })

export const LICENSE_SOURCES = {
  AL: { name: 'Alabama Real Estate Commission', method: 'arello', arello: true, board: B('https://arec.alabama.gov/pages/professionals/licensing/license_search.aspx', ['name', 'license']) },
  AK: { name: 'Alaska Real Estate Commission', method: 'arello', arello: true },
  AZ: { name: 'Arizona Department of Real Estate', method: 'arello', arello: true, board: B('https://services.azre.gov/PdbWeb/IndividualLicense/SearchIndividualLicenses', ['name', 'license'], { firmUrl: 'https://services.azre.gov/PdbWeb/EntityLicense/SearchEntityLicenses' }) },
  AR: { name: 'Arkansas Real Estate Commission', method: 'arello', arello: true, board: B('https://labor.arkansas.gov/licensing/real-estate-commission/arec-roster/agent-search/', ['name'], { verified: false }) },
  CA: { name: 'California Department of Real Estate', method: 'board', arello: true, board: B('https://www2.dre.ca.gov/publicasp/pplinfo.asp', ['name', 'license', 'city']) },
  CO: { name: 'Colorado Division of Real Estate', method: 'arello', arello: true, board: B('https://apps2.colorado.gov/dre/licensing/lookup/licenselookup.aspx', ['name', 'license', 'zip', 'firm'], { captcha: true }) },
  CT: { name: 'Connecticut Department of Consumer Protection', method: 'arello', arello: true, board: B('https://www.elicense.ct.gov/Lookup/LicenseLookup.aspx', ['name', 'license', 'city', 'zip', 'firm'], { captcha: true }) },
  DE: { name: 'Delaware Real Estate Commission', method: 'board', arello: true, board: B('https://delpros.delaware.gov/OH_VerifyLicense', ['name', 'license', 'city', 'firm']) },
  DC: { name: 'DC Real Estate Commission', method: 'arello', arello: true },
  FL: { name: 'Florida Real Estate Commission (DBPR)', method: 'auto', arello: true, dataset: 'FL DBPR weekly licensee files', board: B('https://www.myfloridalicense.com/wl11.asp', ['name', 'license']) },
  GA: { name: 'Georgia Real Estate Commission', method: 'board', arello: true, board: B('https://ata.grec.state.ga.us/Account/Search', ['name', 'license', 'city', 'firm']) },
  HI: { name: 'Hawaii Real Estate Commission', method: 'arello', arello: true, board: B('https://pvl.ehawaii.gov/pvlsearch/', ['name', 'license'], { verified: false }) },
  ID: { name: 'Idaho Real Estate Commission', method: 'arello', arello: true, board: B('https://edopl.idaho.gov/OnlineServices/?link=PubSearch', ['name', 'license'], { verified: false }) },
  IL: { name: 'Illinois Department of Financial and Professional Regulation', method: 'auto', arello: false, dataset: 'IL open data (data.illinois.gov)', board: B('https://online-dfpr.micropact.com/lookup/licenselookup.aspx', ['name', 'license', 'city']) },
  IN: { name: 'Indiana Real Estate Commission', method: 'board', arello: true, board: B('https://mylicense.in.gov/EVerification/Search.aspx', ['name', 'license', 'city', 'county', 'zip', 'firm'], { captcha: true }) },
  IA: { name: 'Iowa Real Estate Commission', method: 'arello', arello: true },
  KS: { name: 'Kansas Real Estate Commission', method: 'arello', arello: true },
  KY: { name: 'Kentucky Real Estate Commission', method: 'arello', arello: true },
  LA: { name: 'Louisiana Real Estate Commission', method: 'arello', arello: true },
  ME: { name: 'Maine Real Estate Commission', method: 'board', arello: true, board: B('https://www.pfr.maine.gov/ALMSOnline/ALMSQuery/SearchIndividual.aspx', ['name', 'license', 'city', 'county', 'zip']) },
  MD: { name: 'Maryland Real Estate Commission', method: 'arello', arello: true },
  MA: { name: 'Massachusetts Board of Registration of Real Estate Brokers and Salespersons', method: 'board', arello: true, board: B('https://elicensing21.mass.gov/CitizenAccess/GeneralProperty/PropertyLookUp.aspx?isLicensee=Y', ['name', 'license', 'city', 'zip', 'firm']) },
  MI: { name: 'Michigan Department of Licensing and Regulatory Affairs', method: 'board', arello: false, board: B('https://aca-prod.accela.com/MILARA/GeneralProperty/PropertyLookUp.aspx?isLicensee=Y', ['name', 'license', 'city', 'zip', 'firm']) },
  MN: { name: 'Minnesota Department of Commerce', method: 'board', arello: false, board: B('https://mn.gov/commerce/licensing/license-lookup/', ['name', 'license'], { verified: false }) },
  MS: { name: 'Mississippi Real Estate Commission', method: 'arello', arello: true },
  MO: { name: 'Missouri Real Estate Commission', method: 'arello', arello: true, board: B('https://pr.mo.gov/licensee-search.asp', ['name', 'license'], { verified: false }) },
  MT: { name: 'Montana Board of Realty Regulation', method: 'arello', arello: true, board: B('https://ebizws.mt.gov/PUBLICPORTAL/searchform?mylist=licenses', ['name', 'license'], { verified: false }) },
  NE: { name: 'Nebraska Real Estate Commission', method: 'board', arello: true, board: B('https://nrec.igovsolution.net/online/Verification/Individual', ['name', 'city', 'county', 'zip'], { captcha: true }) },
  NV: { name: 'Nevada Real Estate Division', method: 'arello', arello: true, board: B('https://red.prod.secure.nv.gov/Lookup/LicenseLookup.aspx', ['name', 'license'], { verified: false }) },
  NH: { name: 'New Hampshire Real Estate Commission', method: 'arello', arello: true },
  NJ: { name: 'New Jersey Real Estate Commission', method: 'arello', arello: true },
  NM: { name: 'New Mexico Real Estate Commission', method: 'board', arello: false, board: B('https://verification.rld.state.nm.us/', ['name', 'license'], { verified: false }) },
  NY: { name: 'New York Department of State', method: 'auto', arello: false, dataset: 'NY open data (data.ny.gov)', board: B('https://appext20.dos.ny.gov/nydos/selSearchType.do', ['name', 'license', 'firm']) },
  NC: { name: 'North Carolina Real Estate Commission', method: 'board', arello: true, board: B('https://license.ncrec.gov/ncrec/oecgi3.exe/O4W_LIC_SEARCH_NEW', ['name', 'license', 'city', 'county'], { firmUrl: 'https://license.ncrec.gov/ncrec/oecgi3.exe/O4W_FIRM_SEARCH_NEW' }) },
  ND: { name: 'North Dakota Real Estate Commission', method: 'board', arello: false, board: B('https://services.realestatend.org/directory/', ['name']) },
  OH: { name: 'Ohio Division of Real Estate and Professional Licensing', method: 'board', arello: false, board: B('https://elicense.ohio.gov/oh_verifylicense', ['name', 'license', 'city', 'firm']) },
  OK: { name: 'Oklahoma Real Estate Commission', method: 'arello', arello: true, board: B('https://oklahoma.gov/orec/quick-links/search-for-a-licensee.html', ['name', 'license'], { verified: false }) },
  OR: { name: 'Oregon Real Estate Agency', method: 'board', arello: true, board: B('https://orea.elicense.micropact.com/Lookup/LicenseLookup.aspx', ['name', 'license', 'city', 'county', 'zip', 'firm']) },
  PA: { name: 'Pennsylvania State Real Estate Commission', method: 'board', arello: false, board: B('https://www.pals.pa.gov/#/page/search', ['name', 'license', 'city']) },
  RI: { name: 'Rhode Island Department of Business Regulation', method: 'board', arello: false, board: B('https://elicensing.ri.gov/', ['name', 'license']) },
  SC: { name: 'South Carolina Real Estate Commission', method: 'arello', arello: true },
  SD: { name: 'South Dakota Real Estate Commission', method: 'arello', arello: true },
  TN: { name: 'Tennessee Real Estate Commission', method: 'arello', arello: true, board: B('https://verify.tn.gov/', ['name', 'license'], { verified: false }) },
  TX: { name: 'Texas Real Estate Commission', method: 'auto', arello: true, dataset: 'TX open data (data.texas.gov)', board: B('https://www.trec.texas.gov/apps/license-holder-search/', ['name', 'license'], { verified: false }) },
  UT: { name: 'Utah Division of Real Estate', method: 'arello', arello: true, board: B('https://secure.utah.gov/llv/search/index.html', ['name', 'license', 'firm'], { captcha: true }) },
  VT: { name: 'Vermont Real Estate Commission', method: 'arello', arello: true, board: B('https://secure.professionals.vermont.gov/prweb/PRServletCustom/V9csDxL3sXkkjMC_FR2HrA%5B%5B*/!STANDARD?UserIdentifier=LicenseLookupGuestUser', ['name', 'license', 'firm']) },
  VA: { name: 'Virginia Department of Professional and Occupational Regulation', method: 'board', arello: false, board: B('https://dporweb.dpor.virginia.gov/LicenseLookup/Search', ['name', 'license', 'city', 'zip', 'firm'], { captcha: true }) },
  WA: { name: 'Washington Department of Licensing', method: 'board', arello: false, board: B('https://professions.dol.wa.gov/s/license-lookup', ['name', 'license', 'city'], { verified: false }) },
  WV: { name: 'West Virginia Real Estate Commission', method: 'arello', arello: true },
  WI: { name: 'Wisconsin Department of Safety and Professional Services', method: 'board', arello: false, board: B('https://licensesearch.wi.gov/', ['name', 'license', 'city'], { verified: false }) },
  WY: { name: 'Wyoming Real Estate Commission', method: 'arello', arello: true, board: B('https://online.wyrec.org/#/verifylicense', ['name', 'license'], { verified: false }) },
  PR: { name: 'Puerto Rico Board of Real Estate Brokers, Salespersons and Companies (DACO)', method: 'board', arello: false, board: B('https://www.daco.pr.gov/', ['name'], { verified: false }) },
}

export const AUTO_STATES = Object.entries(LICENSE_SOURCES).filter(([, v]) => v.method === 'auto').map(([k]) => k)

export const licenseSource = state => LICENSE_SOURCES[String(state || '').toUpperCase()] || null

/** The state board can search by location (city/county/ZIP): the way to find every agent in a town */
export const searchesByArea = src => !!src?.board && src.board.searchBy.some(f => ['city', 'county', 'zip'].includes(f))

export const SEARCH_LABELS = { name: 'name', license: 'license #', city: 'city', county: 'county', zip: 'ZIP', firm: 'firm' }
