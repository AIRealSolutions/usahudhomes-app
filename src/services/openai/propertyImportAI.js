import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Property Import AI Service
 * Enhances property data, validates fields, and assists with property imports
 */
class PropertyImportAI {
  /**
   * Enhance property data with AI
   * Fills in missing fields, standardizes format, validates data
   */
  async enhancePropertyData(rawPropertyData) {
    try {
      const prompt = `You are a property data specialist. Analyze this property information and enhance it.

Property Data:
${JSON.stringify(rawPropertyData, null, 2)}

Tasks:
1. Standardize the address format
2. Validate and format the price (remove $ and commas, return as number)
3. Ensure bedrooms, bathrooms, square_feet are numbers
4. Standardize the state name (full name, not abbreviation)
5. Generate a professional property description if missing
6. Suggest appropriate property_type if not provided (Single Family, Condo, Townhouse, Multi-Family)
7. Validate the case_number format
8. Set appropriate status (Available, Pending, Sold)
9. Determine if FHA insurable based on property condition

Return ONLY a JSON object with enhanced property data in this exact format:
{
  "case_number": "string",
  "address": "string",
  "city": "string",
  "state": "string (full name)",
  "zip_code": "string",
  "price": number,
  "bedrooms": number,
  "bathrooms": number,
  "square_feet": number,
  "year_built": number or null,
  "property_type": "string",
  "status": "string",
  "description": "string (professional description)",
  "fha_insurable": boolean,
  "bid_open_date": "YYYY-MM-DD or null",
  "bid_close_date": "YYYY-MM-DD or null",
  "validation_notes": "string (any issues or suggestions)"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a property data specialist. Return only valid JSON, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content.trim();
      
      // Remove markdown code blocks if present
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('Error enhancing property data:', error);
      throw new Error('Failed to enhance property data: ' + error.message);
    }
  }

  /**
   * Extract property data from free-form text
   * Useful for pasting property listings from HUDHomeStore or other sources
   */
  async extractPropertyFromText(text) {
    try {
      const prompt = `Extract property information from this text and return structured data.

Text:
${text}

Extract all available information and return ONLY a JSON object in this format:
{
  "case_number": "string or null",
  "address": "string",
  "city": "string",
  "state": "string",
  "zip_code": "string or null",
  "price": number or null,
  "bedrooms": number or null,
  "bathrooms": number or null,
  "square_feet": number or null,
  "year_built": number or null,
  "property_type": "string or null",
  "status": "string or null",
  "description": "string or null",
  "image_urls": ["array of image URLs if found"],
  "notes": "string (any additional information found)"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a property data extraction specialist. Return only valid JSON, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 800
      });

      const content = response.choices[0].message.content.trim();
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('Error extracting property data:', error);
      throw new Error('Failed to extract property data: ' + error.message);
    }
  }

  /**
   * Generate property description
   */
  async generateDescription(propertyData) {
    try {
      const prompt = `Write a professional, engaging property description for this HUD home.

Property Details:
- Address: ${propertyData.address}, ${propertyData.city}, ${propertyData.state}
- Price: $${propertyData.price?.toLocaleString()}
- Bedrooms: ${propertyData.bedrooms || 'N/A'}
- Bathrooms: ${propertyData.bathrooms || 'N/A'}
- Square Feet: ${propertyData.square_feet?.toLocaleString() || 'N/A'}
- Year Built: ${propertyData.year_built || 'N/A'}
- Property Type: ${propertyData.property_type || 'N/A'}
- FHA Insurable: ${propertyData.fha_insurable ? 'Yes' : 'No'}

Write a compelling 150-200 word description that:
1. Highlights key features
2. Mentions FHA financing availability
3. Emphasizes value and opportunity
4. Uses professional real estate language
5. Includes a call-to-action

Return only the description text, no additional formatting.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional real estate copywriter specializing in HUD homes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating description:', error);
      throw new Error('Failed to generate description: ' + error.message);
    }
  }

  /**
   * Validate property data before import
   */
  async validatePropertyData(propertyData) {
    const issues = [];
    const warnings = [];

    // Required fields
    if (!propertyData.case_number) issues.push('Case number is required');
    if (!propertyData.address) issues.push('Address is required');
    if (!propertyData.city) issues.push('City is required');
    if (!propertyData.state) issues.push('State is required');
    if (!propertyData.price || propertyData.price <= 0) issues.push('Valid price is required');

    // Warnings for missing optional fields
    if (!propertyData.bedrooms) warnings.push('Bedrooms not specified');
    if (!propertyData.bathrooms) warnings.push('Bathrooms not specified');
    if (!propertyData.square_feet) warnings.push('Square feet not specified');
    if (!propertyData.description) warnings.push('Description is missing');
    if (!propertyData.property_type) warnings.push('Property type not specified');

    // Data validation
    if (propertyData.bedrooms && (propertyData.bedrooms < 0 || propertyData.bedrooms > 20)) {
      issues.push('Bedrooms value seems invalid');
    }
    if (propertyData.bathrooms && (propertyData.bathrooms < 0 || propertyData.bathrooms > 20)) {
      issues.push('Bathrooms value seems invalid');
    }
    if (propertyData.square_feet && (propertyData.square_feet < 100 || propertyData.square_feet > 50000)) {
      warnings.push('Square feet value seems unusual');
    }
    if (propertyData.year_built && (propertyData.year_built < 1800 || propertyData.year_built > new Date().getFullYear())) {
      warnings.push('Year built seems invalid');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Chat with Property Import Agent
   */
  async chat(message, context = {}) {
    try {
      const systemPrompt = `You are a Property Import Assistant for a HUD homes real estate platform.

Your role:
- Help users import property data from various sources
- Validate and enhance property information
- Suggest missing data based on context
- Provide guidance on property data standards
- Help troubleshoot import issues

Context:
${context.currentProperty ? `Current Property: ${JSON.stringify(context.currentProperty, null, 2)}` : 'No property currently being imported'}

Be helpful, concise, and professional.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error in chat:', error);
      throw new Error('Failed to process chat message: ' + error.message);
    }
  }
}

export const propertyImportAI = new PropertyImportAI();
export default propertyImportAI;
