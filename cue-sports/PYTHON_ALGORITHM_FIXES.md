# Python Algorithm Backend Fixes

## 🔍 Issues Identified

1. **Field Name Mismatch**: Algorithm looks for `registeredPlayersIds` but frontend uses `registeredPlayerIds`
2. **Missing Player Data**: Algorithm doesn't handle player data sent from frontend
3. **Placeholder Names**: Algorithm generates "Player 1", "Player 2" when no real players found
4. **Missing Round Management**: Should auto-detect rounds without manual input

## 🛠️ Required Python Algorithm Fixes

### Fix 1: Update Field Name in `code/routes.py`

**Location:** Line ~1160 in `detect_participant_scope()` function

**Current Code:**
```python
registered_players_ids = (tournament_data.get('registeredPlayersIds') or 
                         tournament_data.get('registeredPlayerIds') or [])
```

**Fixed Code:**
```python
# Fix: Frontend uses 'registeredPlayerIds' (without 's')
registered_players_ids = (tournament_data.get('registeredPlayerIds') or 
                         tournament_data.get('registeredPlayersIds') or [])
```

### Fix 2: Handle Player Data from Frontend

**Location:** Line ~1040 in `initialize_tournament()` function

**Add after line ~1043:**
```python
@app.route('/api/algorithm/initialize-tournament', methods=['POST'])
def initialize_tournament():
    try:
        data = request.get_json()
        tournament_id = data.get('tournamentId')
        special = data.get('special', False)
        level = data.get('level', 'community')
        scheduling_preference = data.get('schedulingPreference', 'weekend')
        
        # NEW: Handle players data from frontend
        frontend_players = data.get('players', [])
        
        if frontend_players:
            print(f"🎯 Received {len(frontend_players)} players from frontend")
            for player in frontend_players:
                print(f"   - {player.get('name')} ({player.get('id')})")
        
        # Pass players to algorithm
        algorithm = TournamentProgressionAlgorithm()
        result = algorithm.initialize_tournament_with_players(
            tournament_id, 
            special, 
            level, 
            scheduling_preference,
            frontend_players  # Pass frontend players
        )
        
        return jsonify(result)
    except Exception as e:
        # error handling...
```

### Fix 3: Create New Method to Handle Frontend Players

**Location:** Add to `TournamentProgressionAlgorithm` class

```python
def initialize_tournament_with_players(self, tournament_id: str, special: bool = False, 
                                     level: str = 'community', scheduling_preference: str = 'weekend',
                                     frontend_players: List[Dict] = None) -> Dict:
    """Initialize tournament with players from frontend"""
    try:
        print(f"🎯 Algorithm initialization: {tournament_id}")
        print(f"   Level: {level}")
        print(f"   Players from frontend: {len(frontend_players) if frontend_players else 0}")
        
        # Use frontend players if provided, otherwise fall back to database lookup
        if frontend_players and len(frontend_players) > 0:
            registered_players = self.process_frontend_players(frontend_players, tournament_id)
        else:
            # Fallback to database lookup
            registered_players = self.get_tournament_players_from_db(tournament_id)
        
        if not registered_players:
            return {
                'success': False,
                'error': 'No players found for tournament'
            }
        
        print(f"✅ Using {len(registered_players)} players for match generation")
        
        # Generate initial matches
        matches = self.generate_initial_matches(registered_players, level, scheduling_preference)
        
        return {
            'success': True,
            'tournamentId': tournament_id,
            'matches': matches,
            'playerCount': len(registered_players),
            'roundInfo': {
                'currentRound': 'R1',
                'totalMatches': len(matches),
                'estimatedDuration': self.estimate_duration(len(matches))
            }
        }
        
    except Exception as e:
        print(f"❌ Error in tournament initialization: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def process_frontend_players(self, frontend_players: List[Dict], tournament_id: str) -> List[Dict]:
    """Process player data received from frontend"""
    processed_players = []
    
    for player_data in frontend_players:
        player = {
            'id': player_data.get('id'),
            'name': player_data.get('name'),
            'communityId': player_data.get('communityId'),
            'countyId': player_data.get('countyId'),
            'regionId': player_data.get('regionId'),
            'points': player_data.get('points', 0),
            'currentRanking': player_data.get('currentRanking'),
            'tournamentId': tournament_id
        }
        
        # Validate required fields
        if player['id'] and player['name']:
            processed_players.append(player)
            print(f"   ✅ Processed player: {player['name']} ({player['id']})")
        else:
            print(f"   ⚠️ Skipped invalid player data: {player_data}")
    
    return processed_players
```

### Fix 4: Fix Missing User Document Handling

**Location:** Line ~1180 in `detect_participant_scope()` function

**Current Code:**
```python
if user_doc.exists:
    user_data = user_doc.to_dict()
    # ... process player
# MISSING: else clause for when user doesn't exist
```

**Fixed Code:**
```python
if user_doc.exists:
    user_data = user_doc.to_dict()
    # ... existing code
else:
    print(f"   ⚠️ User document not found for player ID: {player_id}")
    # Skip this player or handle gracefully
    continue
```

### Fix 5: Auto-Round Detection (Remove Manual Round Input)

**Location:** Various endpoints that require round input

**Current Issue:** Endpoints like `/community/next-round` expect round number input

**Fix:** Algorithm should auto-detect current round by analyzing existing matches

```python
def detect_current_round(self, tournament_id: str, level: str = 'community') -> str:
    """Auto-detect current tournament round"""
    try:
        # Query existing matches for this tournament
        matches_ref = self.db.collection('matches')
        query = matches_ref.where('tournamentId', '==', tournament_id)
        
        if level != 'special':
            query = query.where('tournamentLevel', '==', level)
        
        matches = query.get()
        
        if not matches:
            return 'R1'  # First round
        
        # Find the highest round number
        rounds = set()
        for match in matches:
            match_data = match.to_dict()
            round_num = match_data.get('roundNumber', 'R1')
            rounds.add(round_num)
        
        # Determine next round based on completion
        # Logic to determine if current round is complete and what's next
        return self.calculate_next_round(rounds, level)
        
    except Exception as e:
        print(f"Error detecting current round: {e}")
        return 'R1'  # Default to first round
```

## 🧪 Testing the Fixes

After implementing these fixes:

1. **Check Console Logs**: Look for "🎯 Received X players from frontend"
2. **Verify Player Names**: Should show real player names instead of "Player 1", "Player 2"
3. **Check Match Generation**: Should create matches with actual registered players
4. **Test Round Auto-Detection**: Rounds should advance without manual input

## 🚀 Expected Result

After these fixes:
- ✅ Algorithm receives real player data from frontend
- ✅ Matches generated with actual player names
- ✅ No more placeholder "Player 1", "Player 2" names
- ✅ Auto-round detection without manual input
- ✅ Proper field name matching (`registeredPlayerIds`)

## 📁 Files to Update

1. `/home/ascend/cue-sports/code/routes.py` - Main algorithm file
2. Update `initialize_tournament()` endpoint
3. Update `detect_participant_scope()` function
4. Add `initialize_tournament_with_players()` method
5. Add `process_frontend_players()` method
6. Add `detect_current_round()` method
7. Fix missing user document handling

These changes will ensure the algorithm uses real tournament registrations instead of generating placeholder players.