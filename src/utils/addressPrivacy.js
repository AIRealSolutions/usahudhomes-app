/**
 * Street addresses are shown only to signed-in visitors. Everyone else sees
 * the city and state, plus a link to sign in.
 */

export const maskedAddress = (p) => `HUD Home in ${[p?.city, p?.state].filter(Boolean).join(', ')}`

export const displayAddress = (p, signedIn) => (signedIn ? p?.address : maskedAddress(p))

/** Login link that returns the visitor to the given page afterwards. */
export const signInToSeeAddressUrl = (path) => `/login?next=${encodeURIComponent(path)}`
