import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { 
  Upload, FileText, AlertCircle, CheckCircle, X, 
  ArrowLeft, ArrowRight, Download, RefreshCw
} from 'lucide-react';

export default function PropertyImportWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedState, setSelectedState] = useState('');
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [inputMode, setInputMode] = useState('file'); // 'file' or 'paste'
  const [pastedData, setPastedData] = useState('');

  const states = ['NC', 'TN', 'SC', 'VA', 'GA', 'FL', 'AL', 'MS', 'LA', 'TX'];

  // Step 1: File Upload
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop().toLowerCase();
    if (!['json', 'csv'].includes(extension)) {
      alert('Please select a JSON or CSV file');
      return;
    }

    setFile(selectedFile);
    setFileType(extension);
  };

  /**
   * Parse a single CSV line, respecting quoted fields.
   * Handles commas inside double-quoted values (e.g., Cloudinary URLs).
   */
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error('CSV file must have headers and at least one data row');
    }

    const headers = parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      if (values.length >= headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }

    return data;
  };

  const handlePastedData = async () => {
    if (!pastedData || !selectedState) {
      alert('Please select a state and paste data');
      return;
    }

    try {
      let data;
      const trimmedData = pastedData.trim();
      
      // Try to parse as JSON first
      if (trimmedData.startsWith('[') || trimmedData.startsWith('{')) {
        try {
          data = JSON.parse(trimmedData);
          if (!Array.isArray(data)) {
            throw new Error('JSON must be an array of property objects');
          }
        } catch (jsonError) {
          throw new Error(`Invalid JSON format: ${jsonError.message}`);
        }
      } else {
        // Parse as CSV
        try {
          data = parseCSV(trimmedData);
        } catch (csvError) {
          throw new Error(`Invalid CSV format: ${csvError.message}`);
        }
      }

      // Validate data
      const errors = validateData(data);
      setValidationErrors(errors);

      if (errors.length === 0) {
        setParsedData(data);
        setStep(2);
      }
    } catch (error) {
      alert(`Error parsing pasted data: ${error.message}`);
    }
  };

  const handleFileUpload = async () => {
    if (!file || !selectedState) {
      alert('Please select a state and file');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let data;
          if (fileType === 'json') {
            data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) {
              throw new Error('JSON must be an array of property objects');
            }
          } else {
            data = parseCSV(e.target.result);
          }

          // Validate data
          const errors = validateData(data);
          setValidationErrors(errors);

          if (errors.length === 0) {
            setParsedData(data);
            setStep(2);
          }
        } catch (error) {
          alert(`Error parsing file: ${error.message}`);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      alert(`Error reading file: ${error.message}`);
    }
  };

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

  /**
   * Normalize status value to uppercase DB format.
   */
  const normalizeStatus = (val) => {
    if (!val) return 'AVAILABLE';
    const lower = val.toLowerCase().trim();
    if (lower === 'available' || lower === 'new listing' || lower === 'price reduced') {
      return 'AVAILABLE';
    } else if (lower === 'pending' || lower === 'under contract') {
      return 'PENDING';
    } else if (lower === 'sold') {
      return 'SOLD';
    }
    return val.toUpperCase();
  };

  const validateData = (data) => {
    const errors = [];
    const requiredFields = ['case_number', 'address', 'city', 'state'];

    data.forEach((row, index) => {
      // Check required fields
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`Row ${index + 1}: Missing required field "${field}"`);
        }
      });

      // Validate state matches selected state
      if (row.state && row.state !== selectedState) {
        errors.push(`Row ${index + 1}: State "${row.state}" does not match selected state "${selectedState}"`);
      }

      // Validate data types — accept both scraper and DB field names
      const priceVal = row.list_price || row.price;
      if (priceVal && isNaN(Number(String(priceVal).replace(/[$,]/g, '')))) {
        errors.push(`Row ${index + 1}: price/list_price must be a number`);
      }
      const bedsVal = row.bedrooms || row.beds;
      if (bedsVal && isNaN(Number(bedsVal))) {
        errors.push(`Row ${index + 1}: bedrooms/beds must be a number`);
      }
      const bathsVal = row.bathrooms || row.baths;
      if (bathsVal && isNaN(Number(bathsVal))) {
        errors.push(`Row ${index + 1}: bathrooms/baths must be a number`);
      }
    });

    return errors;
  };

  /**
   * Build a database-ready record from a parsed row.
   * Accepts both scraper field names (list_price, bedrooms, bathrooms)
   * and legacy DB field names (price, beds, baths).
   */
  /**
   * Supabase storage bucket base URL for property images.
   * Images are stored as {case_number_with_underscores}.jpg
   */
  const BUCKET_BASE = 'https://lpqjndfjbenolhneqzec.supabase.co/storage/v1/object/public/USAHUDhomes';

  /**
   * Auto-generate the main_image URL from the case number.
   * Converts hyphens to underscores and appends .jpg
   */
  const buildImageUrl = (caseNumber) => {
    if (!caseNumber) return null;
    const filename = caseNumber.replace(/-/g, '_') + '.jpg';
    return `${BUCKET_BASE}/${filename}`;
  };

  const buildRecord = (p) => {
    const priceRaw = p.list_price || p.price;
    const bedsRaw = p.bedrooms || p.beds;
    const bathsRaw = p.bathrooms || p.baths;

    return {
      case_number: p.case_number,
      address: p.address,
      city: p.city,
      state: selectedState,
      zip_code: p.zip_code || null,
      price: priceRaw ? parseFloat(String(priceRaw).replace(/[$,]/g, '')) : 0,
      beds: bedsRaw ? parseInt(bedsRaw, 10) : null,
      baths: interpretBaths(bathsRaw),
      status: normalizeStatus(p.status),
      county: p.county || null,
      main_image: buildImageUrl(p.case_number),
      bids_open: p.bids_open || null,
      listing_period: p.listing_period || null,
      property_type: p.property_type || 'Single Family',
      sq_ft: p.square_feet ? parseInt(p.square_feet, 10) : (p.sq_ft ? parseInt(p.sq_ft, 10) : null),
      lot_size: p.lot_size || null,
      year_built: p.year_built ? parseInt(p.year_built, 10) : null,
      description: p.description || null
    };
  };

  // Step 2: Preview and Analyze
  const analyzeImport = async () => {
    try {
      // Get existing properties for the selected state
      const { data: existingProperties, error } = await supabase
        .from('properties')
        .select('case_number, address, city, state, status')
        .eq('state', selectedState);

      if (error) throw error;

      const existingCaseNumbers = new Set(existingProperties.map(p => p.case_number));
      const importCaseNumbers = new Set(parsedData.map(p => p.case_number));

      // Categorize properties
      const newProperties = parsedData.filter(p => !existingCaseNumbers.has(p.case_number));
      const updatedProperties = parsedData.filter(p => existingCaseNumbers.has(p.case_number));
      const pendingProperties = existingProperties.filter(p => 
        !importCaseNumbers.has(p.case_number) && p.status !== 'SOLD'
      );

      setImportPreview({
        new: newProperties,
        updated: updatedProperties,
        pending: pendingProperties,
        total: parsedData.length
      });

      setStep(3);
    } catch (error) {
      alert(`Error analyzing import: ${error.message}`);
    }
  };

  // Step 3: Confirm and Import
  const executeImport = async () => {
    setImporting(true);
    const results = {
      newCount: 0,
      updatedCount: 0,
      pendingCount: 0,
      errors: []
    };

    try {
      // 1. Insert new properties
      if (importPreview.new.length > 0) {
        const newRecords = importPreview.new.map(p => buildRecord(p));

        const { error: insertError } = await supabase
          .from('properties')
          .insert(newRecords);

        if (insertError) {
          results.errors.push(`Error inserting new properties: ${insertError.message}`);
        } else {
          results.newCount = newRecords.length;
        }
      }

      // 2. Update existing properties
      if (importPreview.updated.length > 0) {
        for (const property of importPreview.updated) {
          const updateData = buildRecord(property);
          // Remove case_number from update payload (it's the match key)
          delete updateData.case_number;

          const { error: updateError } = await supabase
            .from('properties')
            .update(updateData)
            .eq('case_number', property.case_number);

          if (updateError) {
            results.errors.push(`Error updating ${property.case_number}: ${updateError.message}`);
          } else {
            results.updatedCount++;
          }
        }
      }

      // 3. Mark properties not in import as Pending
      if (importPreview.pending.length > 0) {
        const pendingCaseNumbers = importPreview.pending.map(p => p.case_number);
        
        const { error: pendingError } = await supabase
          .from('properties')
          .update({ status: 'PENDING' })
          .in('case_number', pendingCaseNumbers)
          .eq('state', selectedState);

        if (pendingError) {
          results.errors.push(`Error marking properties as pending: ${pendingError.message}`);
        } else {
          results.pendingCount = pendingCaseNumbers.length;
        }
      }

      setImportResults(results);
      setStep(4);
    } catch (error) {
      alert(`Error executing import: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedState('');
    setFile(null);
    setFileType('');
    setParsedData([]);
    setValidationErrors([]);
    setImportPreview(null);
    setImportResults(null);
    setInputMode('file');
    setPastedData('');
  };

  /**
   * Helper to display price from either field name.
   */
  const displayPrice = (p) => {
    const raw = p.list_price || p.price;
    if (!raw) return '-';
    const num = parseFloat(String(raw).replace(/[$,]/g, ''));
    return isNaN(num) ? raw : `$${num.toLocaleString()}`;
  };

  const displayBeds = (p) => p.bedrooms || p.beds || '-';
  const displayBaths = (p) => p.bathrooms || p.baths || '-';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/properties')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Properties
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Property Import Wizard</h1>
        <p className="text-gray-600 mt-2">Import HUD home data from JSON or CSV files</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {s}
              </div>
              {s < 4 && (
                <div className={`flex-1 h-1 mx-2 ${
                  step > s ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-sm text-gray-600">Upload</span>
          <span className="text-sm text-gray-600">Preview</span>
          <span className="text-sm text-gray-600">Confirm</span>
          <span className="text-sm text-gray-600">Results</span>
        </div>
      </div>

      {/* Step 1: Upload File or Paste Data */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Step 1: Upload or Paste Data</h2>
          
          {/* State Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select State *
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a state...</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-2">
              Only properties in this state will be affected by the import
            </p>
          </div>

          {/* Input Mode Tabs */}
          <div className="mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setInputMode('file')}
                className={`px-6 py-3 font-medium transition-colors ${
                  inputMode === 'file'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Upload className="h-4 w-4 inline mr-2" />
                Upload File
              </button>
              <button
                onClick={() => setInputMode('paste')}
                className={`px-6 py-3 font-medium transition-colors ${
                  inputMode === 'paste'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Paste Data
              </button>
            </div>
          </div>

          {/* File Upload Mode */}
          {inputMode === 'file' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File (JSON or CSV) *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                >
                  Choose a file
                </label>
                <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
                <p className="text-xs text-gray-400 mt-2">JSON or CSV files only</p>
              </div>
              {file && (
                <div className="mt-4 flex items-center text-sm text-gray-600">
                  <FileText className="h-4 w-4 mr-2" />
                  {file.name} ({fileType.toUpperCase()})
                </div>
              )}
            </div>
          )}

          {/* Paste Data Mode */}
          {inputMode === 'paste' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste JSON or CSV Data *
              </label>
              <textarea
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                placeholder={`Paste your JSON array or CSV data here...

JSON example:
[{"case_number": "381-850249", "address": "123 Main St", ...}]

CSV example:
case_number,address,city,state,list_price,bedrooms,bathrooms,status,zip_code,county,bids_open,listing_period
381-850249,123 Main St,Raleigh,NC,125000,3,2,Available,27601,Wake County,02/27/2026,Extended
`}
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              {pastedData && (
                <div className="mt-2 text-sm text-gray-600">
                  {pastedData.length} characters pasted
                </div>
              )}
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Validation Errors</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.slice(0, 10).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {validationErrors.length > 10 && (
                      <li className="font-medium">... and {validationErrors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* File Format Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Required Fields</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>case_number</strong> - Unique HUD case number (required)</li>
              <li>• <strong>address</strong> - Property address (required)</li>
              <li>• <strong>city</strong> - City (required)</li>
              <li>• <strong>state</strong> - State code (required, must match selected state)</li>
            </ul>
            <h3 className="font-semibold text-blue-900 mt-4 mb-2">Scraper Fields (auto-mapped)</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• list_price, bedrooms, bathrooms, status, zip_code, county</li>
              <li>• bids_open, listing_period (main_image is auto-generated)</li>
            </ul>
            <h3 className="font-semibold text-blue-900 mt-4 mb-2">Other Optional Fields</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• property_type, square_feet, lot_size, year_built, description</li>
            </ul>
          </div>

          {/* Download Sample Files */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Sample Files</h3>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  const sample = [
                    { case_number: '387-123456', address: '123 Main St', city: 'Raleigh', state: 'NC', list_price: 125000, bedrooms: 3, bathrooms: 2, status: 'Available', zip_code: '27601', county: 'Wake County', bids_open: '02/27/2026', listing_period: 'Extended' }
                  ];
                  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'sample_properties.json';
                  a.click();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Download className="h-4 w-4" />
                Download JSON Sample
              </button>
              <button
                onClick={() => {
                  const csv = 'case_number,address,city,state,list_price,bedrooms,bathrooms,status,zip_code,county,bids_open,listing_period\n387-123456,123 Main St,Raleigh,NC,125000,3,2,Available,27601,Wake County,02/27/2026,Extended';
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'sample_properties.csv';
                  a.click();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Download className="h-4 w-4" />
                Download CSV Sample
              </button>
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-end">
            <button
              onClick={inputMode === 'file' ? handleFileUpload : handlePastedData}
              disabled={
                !selectedState || 
                (inputMode === 'file' && !file) || 
                (inputMode === 'paste' && !pastedData)
              }
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next: Preview Data
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview Data */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Step 2: Preview Data</h2>
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">State: <strong>{selectedState}</strong></p>
                <p className="text-sm text-gray-600">Total Records: <strong>{parsedData.length}</strong></p>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beds</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Baths</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">County</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bids Open</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedData.slice(0, 10).map((property, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">{property.case_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{property.address}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{property.city}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{displayPrice(property)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{displayBeds(property)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{displayBaths(property)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{property.status || 'Available'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{property.county || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{property.bids_open || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{property.listing_period || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 10 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Showing 10 of {parsedData.length} records
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={analyzeImport}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next: Analyze Changes
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm Import */}
      {step === 3 && importPreview && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Step 3: Confirm Import</h2>
          
          {/* Import Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">New Properties</p>
                  <p className="text-2xl font-bold text-green-900">{importPreview.new.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-green-700 mt-2">Will be added to database</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Updated Properties</p>
                  <p className="text-2xl font-bold text-blue-900">{importPreview.updated.length}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs text-blue-700 mt-2">Will be updated with new data</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending Properties</p>
                  <p className="text-2xl font-bold text-yellow-900">{importPreview.pending.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <p className="text-xs text-yellow-700 mt-2">Will be marked as "Pending"</p>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 mr-2" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-1">Important</h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• This import will only affect properties in <strong>{selectedState}</strong></li>
                  <li>• {importPreview.new.length} new properties will be added</li>
                  <li>• {importPreview.updated.length} existing properties will be updated</li>
                  <li>• {importPreview.pending.length} properties not in the import file will be marked as "Pending"</li>
                  <li>• Properties in other states will not be affected</li>
                  <li>• Properties already marked as "SOLD" will not be changed to "Pending"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Pending Properties List */}
          {importPreview.pending.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Properties to be marked as "Pending" ({importPreview.pending.length})
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <ul className="text-sm text-gray-700 space-y-1">
                  {importPreview.pending.slice(0, 20).map((property, index) => (
                    <li key={index}>
                      • {property.case_number} - {property.address}, {property.city}
                    </li>
                  ))}
                  {importPreview.pending.length > 20 && (
                    <li className="font-medium">... and {importPreview.pending.length - 20} more</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={executeImport}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Confirm and Import
                  <CheckCircle className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 4 && importResults && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Step 4: Import Complete</h2>
          
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">Import Successful!</h3>
                <p className="text-sm text-green-700 mt-1">
                  Properties for {selectedState} have been updated
                </p>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">New Properties Added</p>
              <p className="text-3xl font-bold text-green-600">{importResults.newCount}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Properties Updated</p>
              <p className="text-3xl font-bold text-blue-600">{importResults.updatedCount}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Marked as Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{importResults.pendingCount}</p>
            </div>
          </div>

          {/* Errors */}
          {importResults.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-900 mb-2">Errors Encountered</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {importResults.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={resetWizard}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <RefreshCw className="h-4 w-4" />
              Import Another File
            </button>
            <button
              onClick={() => navigate('/admin/properties')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View Properties
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
