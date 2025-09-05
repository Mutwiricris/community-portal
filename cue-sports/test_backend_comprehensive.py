#!/usr/bin/env python3
"""
Comprehensive test to diagnose the backend algorithm issue
"""
import requests
import json
from datetime import datetime

def test_algorithm_comprehensive():
    """Run comprehensive tests on the algorithm endpoint"""
    
    base_url = "https://thomasngomono.pythonanywhere.com/api/algorithm"
    tournament_id = "NJ9XxufWp2n4Pgh5dYUz"
    
    print("🧪 COMPREHENSIVE ALGORITHM TESTING")
    print("=" * 80)
    
    # Test 1: Health check
    print("\n1️⃣ Testing Algorithm Health Check")
    try:
        response = requests.get(f"{base_url}/test-connection", timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   ❌ Health check failed: {e}")
    
    # Test 2: Tournament initialization with special=true
    print("\n2️⃣ Testing Special Tournament Initialization")
    test_data = {
        "tournamentId": tournament_id,
        "special": True,
        "schedulingPreference": "weekend"
    }
    
    try:
        response = requests.post(
            f"{base_url}/initialize-tournament",
            json=test_data,
            timeout=30
        )
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            
            # Analyze the response
            print("\n   📊 Response Analysis:")
            print(f"      Success: {data.get('success')}")
            print(f"      Has matches array: {'matches' in data}")
            print(f"      Matches count: {len(data.get('matches', []))}")
            print(f"      Total matches field: {data.get('totalMatches')}")
            print(f"      Initial matches field: {data.get('initialMatches')}")
            print(f"      Error: {data.get('error', 'None')}")
            
            if not data.get('success') and data.get('totalMatches', 0) > 0:
                print("\n   ⚠️ ISSUE DETECTED:")
                print("      Backend generated matches but success=false")
                print("      This indicates a Firebase write issue")
        else:
            print(f"   ❌ Error: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
    
    # Test 3: Try different tournament ID
    print("\n3️⃣ Testing with New Tournament ID")
    new_tournament_id = f"test_special_{int(datetime.now().timestamp())}"
    test_data_new = {
        "tournamentId": new_tournament_id,
        "special": True,
        "schedulingPreference": "weekend"
    }
    
    try:
        response = requests.post(
            f"{base_url}/initialize-tournament",
            json=test_data_new,
            timeout=30
        )
        
        print(f"   Tournament ID: {new_tournament_id}")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: {data.get('success')}")
            print(f"   Error: {data.get('error', 'None')}")
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
    
    print("\n" + "=" * 80)
    print("🏁 TESTING COMPLETE")
    print("\nDIAGNOSIS:")
    print("- If health check passes but initialization fails, it's likely a Firebase issue")
    print("- If totalMatches > 0 but success=false, matches were generated but not saved")
    print("- The backend needs to be updated to return the matches array")

if __name__ == "__main__":
    test_algorithm_comprehensive()