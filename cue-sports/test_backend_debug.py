#!/usr/bin/env python3
"""
Debug script to test the backend algorithm endpoint directly
"""
import requests
import json

def test_algorithm_endpoint():
    """Test the algorithm endpoint with the failing tournament"""
    
    # The tournament ID from the logs
    tournament_id = "NJ9XxufWp2n4Pgh5dYUz"
    
    # Test data based on the frontend logs
    test_data = {
        "tournamentId": tournament_id,
        "special": True,
        "schedulingPreference": "weekend"
    }
    
    print("🧪 Testing Algorithm Endpoint")
    print(f"📝 Request data: {json.dumps(test_data, indent=2)}")
    
    try:
        # Make the API call to the actual backend
        response = requests.post(
            "https://thomasngomono.pythonanywhere.com/api/algorithm/initialize-tournament",
            json=test_data,
            timeout=30
        )
        
        print(f"📥 Response Status: {response.status_code}")
        print(f"📥 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            response_data = response.json()
            print(f"📥 Response Data: {json.dumps(response_data, indent=2)}")
        else:
            print(f"❌ Error Response: {response.text}")
            
    except requests.ConnectionError:
        print("❌ CONNECTION ERROR: Could not connect to Flask app")
        print("💡 Make sure the Flask app is running on localhost:5000")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_algorithm_endpoint()