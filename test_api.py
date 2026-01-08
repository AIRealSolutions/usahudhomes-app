#!/usr/bin/env python3
"""
Simple test script for HUD Sync API
"""

import requests
import json

API_BASE = "http://localhost:5000"

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{API_BASE}/api/hud/health", timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_states():
    """Test states endpoint"""
    print("\nTesting states endpoint...")
    try:
        response = requests.get(f"{API_BASE}/api/hud/states", timeout=5)
        data = response.json()
        print(f"Status: {response.status_code}")
        print(f"States count: {len(data.get('states', []))}")
        print(f"First 3 states: {data['states'][:3]}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_scrape():
    """Test scrape endpoint"""
    print("\nTesting scrape endpoint (this will take ~20 seconds)...")
    try:
        response = requests.post(
            f"{API_BASE}/api/hud/scrape",
            json={"state": "NC"},
            timeout=60
        )
        data = response.json()
        print(f"Status: {response.status_code}")
        if data.get('success'):
            print(f"Job ID: {data['job_id']}")
            print(f"Properties found: {data['statistics']['total']}")
            print(f"New listings: {data['statistics']['new_listings']}")
            return data['job_id']
        else:
            print(f"Error: {data.get('error')}")
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    print("="*50)
    print("HUD Sync API Test")
    print("="*50)
    
    # Test health
    if not test_health():
        print("\n❌ API server not responding. Make sure it's running:")
        print("   python3 api/hud_sync_api.py")
        exit(1)
    
    # Test states
    test_states()
    
    # Test scrape (optional, commented out by default)
    # job_id = test_scrape()
    
    print("\n" + "="*50)
    print("✅ API tests completed")
    print("="*50)
