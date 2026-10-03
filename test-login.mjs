import { chromium } from 'playwright'

async function testLogin() {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium'
  })
  
  const page = await browser.newPage()
  
  try {
    console.log('Navigating to login page...')
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
    
    // Check if login page is displayed
    const title = await page.locator('h2').first()
    const titleText = await title.textContent()
    console.log('Page title:', titleText)
    
    // Check if email input exists
    const emailInput = await page.locator('input[name="email"]')
    const emailExists = await emailInput.isVisible()
    console.log('Email input exists:', emailExists)
    
    // Check if sign-in button exists
    const signInButton = await page.locator('button[type="submit"]')
    const signInButtonExists = await signInButton.isVisible()
    const signInButtonText = await signInButton.textContent()
    console.log('Sign-in button exists:', signInButtonExists)
    console.log('Sign-in button text:', signInButtonText)
    
    console.log('\n✓ Login page loaded successfully')
  } catch (error) {
    console.error('Error during test:', error)
  } finally {
    await browser.close()
  }
}

testLogin()
