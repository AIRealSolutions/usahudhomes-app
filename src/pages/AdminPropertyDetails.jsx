import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { 
  ArrowLeft, Edit2, Save, X, Share2, Copy, Check,
  Facebook, Twitter, Linkedin, Instagram, ExternalLink, Upload, Trash2
} from 'lucide-react';

export default function AdminPropertyDetails() {
  const { caseNumber } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState(null);
  const [editedProperty, setEditedProperty] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchProperty();
  }, [caseNumber]);

  const fetchProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('case_number', caseNumber)
        .single();

      if (error) throw error;
      setProperty(data);
      setEditedProperty(data);
    } catch (error) {
      console.error('Error fetching property:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      console.log('Saving property data:', editedProperty);
      
      const { data, error } = await supabase
        .from('properties')
        .update(editedProperty)
        .eq('id', property.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Save successful:', data);
      // Refresh property from database to ensure we have latest data
      if (data && data[0]) {
        setProperty(data[0]);
      } else {
        setProperty(editedProperty);
      }
      setEditMode(false);
      alert('Property updated successfully!');
    } catch (error) {
      console.error('Error updating property:', error);
      alert(`Failed to update property: ${error.message || error}`);
    }
  };

  const handleCancel = () => {
    setEditedProperty(property);
    setEditMode(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this property at ${property.address}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', property.id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      alert('Property deleted successfully!');
      navigate('/admin/properties');
    } catch (error) {
      console.error('Error deleting property:', error);
      alert(`Failed to delete property: ${error.message || error}`);
    }
  };

  const handleChange = (field, value) => {
    // Handle numeric fields properly - convert NaN to null
    let processedValue = value;
    if (typeof value === 'number' && isNaN(value)) {
      processedValue = null;
    }
    setEditedProperty({ ...editedProperty, [field]: processedValue });
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      // Generate filename: case_number with underscores + .jpg
      const fileName = `${property.case_number.replace(/-/g, '_')}.jpg`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('USAHUDhomes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Overwrite if exists
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('USAHUDhomes')
        .getPublicUrl(filePath);
      
      const publicUrl = data.publicUrl;

      // Update the main_image field
      handleChange('main_image', publicUrl);
      setImagePreview(URL.createObjectURL(file));

      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const publicUrl = `https://usahudhomes.com/property/${caseNumber}`;

  // Generate platform-specific content
  const generateSocialContent = (platform) => {
    console.log('Generating social content with property:', property);
    console.log('Beds:', property.beds, 'Baths:', property.baths, 'Price:', property.price);
    
    const price = property.price?.toLocaleString() || 'Price Available';
    const city = property.city || '';
    const state = property.state || '';
    // Use the actual values, or 'TBD' if missing - don't default to 0
    const beds = property.beds != null && property.beds !== 0 ? property.beds : 'TBD';
    const baths = property.baths != null && property.baths !== 0 ? property.baths : 'TBD';
    const contact = '910.363.6147';
    const website = 'USAHUDhomes.com';

    const ownerOccupantIncentives = [
      '$100 down FHA Loans',
      '3% Closing Cost Paid',
      'Repair Escrows up to $35,000 with 203k Loan'
    ];

    switch (platform) {
      case 'facebook':
        return {
          title: `HUD Home in ${city}, ${state}!`,
          text: `🏡 HUD Home Available in ${city}, ${state}!

💰 Price: $${price}
🛏️ ${beds} Bedrooms | 🛁 ${baths} Bathrooms

✨ Owner-Occupant Incentives:
• ${ownerOccupantIncentives[0]}
• ${ownerOccupantIncentives[1]}
• ${ownerOccupantIncentives[2]}

📞 Contact Marc Spencer at ${contact}
🌐 Visit ${website}

Lightkeeper Realty - Registered HUD Buyer's Agency helping people bid on HUD homes for 25 years!

${publicUrl}`,
          url: publicUrl
        };

      case 'instagram':
        return {
          title: `HUD Home in ${city}`,
          text: `🏡 HUD Home in ${city}, ${state}!

💰 $${price} | 🛏️ ${beds} beds | 🛁 ${baths} baths

✨ Owner-Occupant Incentives:
• ${ownerOccupantIncentives[0]}
• ${ownerOccupantIncentives[1]}
• ${ownerOccupantIncentives[2]}

📞 ${contact}
🌐 ${website}

#HUDHomes #RealEstate #HomeOwnership #FirstTimeHomeBuyer #${state}RealEstate #${city}Homes #FHALoans #AffordableHousing #DreamHome #HouseHunting

Link in bio or visit ${website}`,
          url: publicUrl
        };

      case 'twitter':
        return {
          title: `HUD Home ${city}, ${state}`,
          text: `🏡 HUD Home in ${city}, ${state}

$${price} | ${beds}bd ${baths}ba

✨ $100 down FHA
✨ 3% closing cost paid
✨ Up to $35k repair escrow

📞 ${contact}
🌐 ${website}

${publicUrl}`,
          url: publicUrl
        };

      case 'linkedin':
        return {
          title: `Investment Opportunity: HUD Home in ${city}, ${state}`,
          text: `Investment Opportunity: HUD Home in ${city}, ${state}

Property Details:
• Price: $${price}
• Bedrooms: ${beds}
• Bathrooms: ${baths}
• Location: ${city}, ${state}

Owner-Occupant Incentives Available:
• $100 down FHA Loans
• 3% Closing Cost Allowance
• Repair Escrows up to $35,000 with 203k Loan
• Owner-Occupant Bidding Priority

As a Registered HUD Buyer's Agency with 25 years of experience, Lightkeeper Realty specializes in helping clients successfully bid on HUD homes.

Contact Marc Spencer: ${contact}
Learn more: ${website}

${publicUrl}`,
          url: publicUrl
        };

      default:
        return { title: '', text: '', url: publicUrl };
    }
  };

  const copyToClipboard = async (platform) => {
    const content = generateSocialContent(platform);
    const textToCopy = `${content.title}\n\n${content.text}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(publicUrl);
    // window.open triggers app on mobile if Facebook app is installed
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const shareToTwitter = () => {
    const content = generateSocialContent('twitter');
    const text = encodeURIComponent(content.text);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const shareToLinkedIn = () => {
    const url = encodeURIComponent(publicUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading property...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Property not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/properties')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Properties
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {editMode ? (
                <input
                  type="text"
                  value={editedProperty.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              ) : (
                property.address
              )}
            </h1>
            <p className="text-gray-600 mt-1">Case #{property.case_number}</p>
          </div>
          <div className="flex gap-3">
            {editMode ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>

              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Image */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Property Image</h2>
            {property.main_image ? (
              <img
                src={property.main_image}
                alt={property.address}
                className="w-full h-96 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">No image available</p>
              </div>
            )}
            {editMode && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Upload Property Image
                </label>
                
                {/* Image Preview */}
                {(imagePreview || editedProperty.main_image) && (
                  <div className="mb-4">
                    <img 
                      src={imagePreview || editedProperty.main_image} 
                      alt="Property preview"
                      className="w-full h-64 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Upload Button - Primary Action */}
                <div className="mb-4">
                  <label className="block w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    <div className={`cursor-pointer flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-semibold text-lg transition-colors ${
                      uploadingImage 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                    }`}>
                      <Upload className="h-6 w-6" />
                      {uploadingImage ? 'Uploading Image...' : 'Choose Image File to Upload'}
                    </div>
                  </label>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    📁 Supported formats: JPG, PNG, WebP • Max size: 5MB
                  </p>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Image will be saved as: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{property?.case_number?.replace(/-/g, '_')}.jpg</span>
                  </p>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>

                {/* Manual URL Input - Secondary Option */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Enter image URL manually (advanced):
                  </label>
                  <input
                    type="text"
                    value={editedProperty.main_image || ''}
                    onChange={(e) => handleChange('main_image', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Property Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price
                </label>
                {editMode ? (
                  <input
                    type="number"
                    value={editedProperty.price || ''}
                    onChange={(e) => handleChange('price', e.target.value === '' ? null : parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <p className="text-gray-900">${property.price?.toLocaleString()}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                {editMode ? (
                  <select
                    value={editedProperty.status || ''}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="Available">Available</option>
                    <option value="Under Contract">Under Contract</option>
                    <option value="Sold">Sold</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{property.status}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bedrooms
                </label>
                {editMode ? (
                  <input
                    type="number"
                    value={editedProperty.beds || ''}
                    onChange={(e) => handleChange('beds', e.target.value === '' ? null : parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <p className="text-gray-900">{property.beds}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bathrooms
                </label>
                {editMode ? (
                  <input
                    type="number"
                    step="0.5"
                    value={editedProperty.baths || ''}
                    onChange={(e) => handleChange('baths', e.target.value === '' ? null : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <p className="text-gray-900">{property.baths}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedProperty.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <p className="text-gray-900">{property.city}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedProperty.state || ''}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <p className="text-gray-900">{property.state}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Info</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Case Number</span>
                <p className="text-gray-900 font-medium">{property.case_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status</span>
                <div className="mt-1">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    property.status === 'Available' ? 'bg-green-100 text-green-800' :
                    property.status === 'Under Contract' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {property.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Listed Date</span>
                <p className="text-gray-900">
                  {property.created_at ? new Date(property.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Public URL */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Public URL</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={publicUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  alert('URL copied!');
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Social Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Share Property</h2>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Facebook */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Facebook className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-lg">Facebook</h3>
                    </div>
                    <button
                      onClick={shareToFacebook}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                      <Facebook className="h-5 w-5" />
                      Share on Facebook
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                      {generateSocialContent('facebook').text}
                    </pre>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>💡 How to share:</strong> Click the button above to open Facebook app. In the app, tap the dropdown at the top to choose where to post (Your Timeline, a Page you manage, or a Group), then click Post. The property details will show automatically!
                    </p>
                  </div>
                </div>

                {/* Instagram */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink-100 rounded-lg">
                        <Instagram className="h-6 w-6 text-pink-600" />
                      </div>
                      <h3 className="font-semibold text-lg">Instagram</h3>
                    </div>
                    <button
                      onClick={() => copyToClipboard('instagram')}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      {copiedPlatform === 'instagram' ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                      {generateSocialContent('instagram').text}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Copy the text and paste it when creating your Instagram post
                  </p>
                </div>

                {/* Twitter/X */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-900 rounded-lg">
                        <Twitter className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">Twitter / X</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard('twitter')}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        {copiedPlatform === 'twitter' ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </button>
                      <button
                        onClick={shareToTwitter}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                      >
                        Tweet
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                      {generateSocialContent('twitter').text}
                    </pre>
                  </div>
                </div>

                {/* LinkedIn */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Linkedin className="h-6 w-6 text-blue-700" />
                      </div>
                      <h3 className="font-semibold text-lg">LinkedIn</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard('linkedin')}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        {copiedPlatform === 'linkedin' ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </button>
                      <button
                        onClick={shareToLinkedIn}
                        className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800"
                      >
                        Share
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                      {generateSocialContent('linkedin').text}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
