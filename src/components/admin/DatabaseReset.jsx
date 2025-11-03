import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Database } from 'lucide-react';

const DatabaseReset = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState(null);

  const handleReset = async () => {
    setResetting(true);
    setResult(null);

    try {
      // Clear all localStorage
      const keysToRemove = [
        'usahud_properties',
        'usahud_customers',
        'usahud_leads',
        'usahud_consultations',
        'usahud_agents'
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Force reload the page to reinitialize with default 25 properties
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      setResult({
        success: true,
        message: 'Database reset successful! Reloading with 25 NC HUD properties...'
      });

    } catch (error) {
      setResult({
        success: false,
        message: `Reset failed: ${error.message}`
      });
      setResetting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <Database className="h-6 w-6 text-red-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-900">Database Reset Utility</h2>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Warning: This action will reset all data</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>This will:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Clear all cached property data</li>
                <li>Clear all customer records</li>
                <li>Clear all leads and consultations</li>
                <li>Load fresh 25 NC HUD properties from default dataset</li>
                <li>Reload the page automatically</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className={`mb-6 p-4 rounded-lg ${
          result.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            )}
            <p className={result.success ? 'text-green-800' : 'text-red-800'}>
              {result.message}
            </p>
          </div>
        </div>
      )}

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          Reset Database to Default Properties
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-gray-700 font-medium">
            Are you sure you want to reset the database?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={resetting}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {resetting ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Yes, Reset Now
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">What happens after reset?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• The page will automatically reload</li>
          <li>• You'll see 25 NC HUD properties in the system</li>
          <li>• All properties will have real images and data</li>
          <li>• You can then add more properties using the "Add Property" button</li>
          <li>• Customer data will be cleared (export first if needed)</li>
        </ul>
      </div>
    </div>
  );
};

export default DatabaseReset;
