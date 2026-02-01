import React, { useState } from 'react';
import { Upload, FileText, Image, CheckCircle, AlertCircle, Sparkles, Download, Plus } from 'lucide-react';
import { propertyImportAI } from '../../services/openai/propertyImportAI';
import { processPropertyImages, handleMultipleFileUploads } from '../../services/imageService';
import { propertyService } from '../../services/database';

/**
 * Property Import Agent Component
 * AI-enhanced property import with smart forms and validation
 */
export default function PropertyImportAgent({ onPropertyAdded }) {
  const [mode, setMode] = useState('paste'); // 'paste', 'form', 'review'
  const [pastedText, setPastedText] = useState('');
  const [propertyData, setPropertyData] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validation, setValidation] = useState(null);
  const [success, setSuccess] = useState(false);

  /**
   * Extract property data from pasted text using AI
   */
  const handleExtractFromText = async () => {
    if (!pastedText.trim()) {
      setError('Please paste property information');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Extract data using AI
      const extracted = await propertyImportAI.extractPropertyFromText(pastedText);
      
      // Enhance the extracted data
      const enhanced = await propertyImportAI.enhancePropertyData(extracted);
      
      // Validate
      const validationResult = await propertyImportAI.validatePropertyData(enhanced);
      
      setPropertyData(enhanced);
      setValidation(validationResult);
      setMode('review');

      // If image URLs were found, process them
      if (extracted.image_urls && extracted.image_urls.length > 0) {
        const processedImages = await processPropertyImages(extracted.image_urls);
        setImages(processedImages);
      }
    } catch (err) {
      setError('Failed to extract property data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate description using AI
   */
  const handleGenerateDescription = async () => {
    if (!propertyData) return;

    setLoading(true);
    try {
      const description = await propertyImportAI.generateDescription(propertyData);
      setPropertyData({ ...propertyData, description });
    } catch (err) {
      setError('Failed to generate description: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle image file uploads
   */
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setLoading(true);
    try {
      const uploadedImages = await handleMultipleFileUploads(files);
      const successfulImages = uploadedImages
        .filter(img => img.success)
        .map((img, index) => ({
          url: img.name,
          data: img.data,
          is_primary: images.length === 0 && index === 0,
          display_order: images.length + index
        }));

      setImages([...images, ...successfulImages]);
    } catch (err) {
      setError('Failed to upload images: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add property to database
   */
  const interpretBaths = (val) => {
    if (val === null || val === undefined || val === '') return null;
    let num = parseFloat(val);
    if (isNaN(num)) return null;
    
    // Rule: .1 represents a half bath (e.g., 1.1 -> 1.5)
    const integerPart = Math.floor(num);
    const fractionalPart = Math.round((num - integerPart) * 10) / 10;
    
    if (fractionalPart === 0.1) {
      return integerPart + 0.5;
    }
    return num;
  };

  const handleAddProperty = async () => {
    if (!propertyData) return;

    setLoading(true);
    setError(null);

    try {
      // Check for duplicates by case number
      const existing = await propertyService.getPropertyByCaseNumber(propertyData.case_number);
      if (existing) {
        setError(`Property with case number ${propertyData.case_number} already exists`);
        setLoading(false);
        return;
      }

      // Add property to database
      const newProperty = await propertyService.addProperty({
        ...propertyData,
        beds: propertyData.bedrooms,
        baths: interpretBaths(propertyData.bathrooms),
        sq_ft: propertyData.square_feet,
        images: images.length > 0 ? JSON.stringify(images) : null
      });

      setSuccess(true);
      setTimeout(() => {
        if (onPropertyAdded) onPropertyAdded(newProperty);
        handleReset();
      }, 2000);
    } catch (err) {
      setError('Failed to add property: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset form
   */
  const handleReset = () => {
    setMode('paste');
    setPastedText('');
    setPropertyData(null);
    setImages([]);
    setError(null);
    setValidation(null);
    setSuccess(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Property Import Agent</h2>
            <p className="text-sm text-gray-600">AI-powered property import and enhancement</p>
          </div>
        </div>
        {mode === 'review' && (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Start Over
          </button>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-900">Property added successfully!</p>
            <p className="text-sm text-green-700">Redirecting...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Mode: Paste Text */}
      {mode === 'paste' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste Property Information
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste property listing from HUDHomeStore.gov or any source...

Example:
Case #: 387-124193
447 Cascade Ave, Eden, NC 27288
$170,000
3 bed, 2 bath, 1,500 sqft
Built 2005
Single Family Home
FHA Insurable"
              className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm"
            />
            <p className="mt-2 text-sm text-gray-500">
              💡 Tip: Copy property details from HUDHomeStore.gov and paste here. AI will extract and enhance the data automatically.
            </p>
          </div>

          <button
            onClick={handleExtractFromText}
            disabled={loading || !pastedText.trim()}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Extracting with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Extract & Enhance with AI
              </>
            )}
          </button>
        </div>
      )}

      {/* Mode: Review & Edit */}
      {mode === 'review' && propertyData && (
        <div className="space-y-6">
          {/* Validation Status */}
          {validation && (
            <div className={`p-4 rounded-lg border ${
              validation.isValid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                {validation.isValid ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {validation.isValid ? 'Data looks good!' : 'Please review the following:'}
                  </p>
                  {validation.issues.length > 0 && (
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                      {validation.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  )}
                  {validation.warnings.length > 0 && (
                    <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                      {validation.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Property Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Case Number *</label>
              <input
                type="text"
                value={propertyData.case_number || ''}
                onChange={(e) => setPropertyData({ ...propertyData, case_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input
                type="number"
                value={propertyData.price || ''}
                onChange={(e) => setPropertyData({ ...propertyData, price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <input
                type="text"
                value={propertyData.address || ''}
                onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                type="text"
                value={propertyData.city || ''}
                onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <input
                type="text"
                value={propertyData.state || ''}
                onChange={(e) => setPropertyData({ ...propertyData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input
                type="text"
                value={propertyData.zip_code || ''}
                onChange={(e) => setPropertyData({ ...propertyData, zip_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
              <input
                type="number"
                value={propertyData.bedrooms || ''}
                onChange={(e) => setPropertyData({ ...propertyData, bedrooms: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
              <input
                type="number"
                step="0.5"
                value={propertyData.bathrooms || ''}
                onChange={(e) => setPropertyData({ ...propertyData, bathrooms: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
              <input
                type="number"
                value={propertyData.square_feet || ''}
                onChange={(e) => setPropertyData({ ...propertyData, square_feet: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
              <input
                type="number"
                value={propertyData.year_built || ''}
                onChange={(e) => setPropertyData({ ...propertyData, year_built: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
              <select
                value={propertyData.property_type || ''}
                onChange={(e) => setPropertyData({ ...propertyData, property_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select type</option>
                <option value="Single Family">Single Family</option>
                <option value="Condo">Condo</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Multi-Family">Multi-Family</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={propertyData.status || 'Available'}
                onChange={(e) => setPropertyData({ ...propertyData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="Available">Available</option>
                <option value="Pending">Pending</option>
                <option value="Sold">Sold</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <button
                  onClick={handleGenerateDescription}
                  disabled={loading}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate with AI
                </button>
              </div>
              <textarea
                value={propertyData.description || ''}
                onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
          </div>

          {/* Images Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Property Images</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Image className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Click to upload images</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
              </label>
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img src={img.data} alt={`Property ${i + 1}`} className="w-full h-full object-cover" />
                      {img.is_primary && (
                        <div className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                          Primary
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAddProperty}
              disabled={loading || !validation?.isValid}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding Property...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Add Property to Database
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
