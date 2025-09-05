# Community Admin Dashboard Implementation Prompt

## 🎯 Overview
You are tasked with creating a comprehensive **Community Admin Dashboard** for managing community-level tournaments within a hierarchical tournament management system. This dashboard will be used by Community Leaders to manage their local tournaments from initialization through completion and qualification for county-level competition.

## 🏗️ System Context

### Tournament Algorithm Architecture
- **Backend API**: `https://thomasngomono.pythonanywhere.com/api/algorithm`
- **Tournament Hierarchy**: Community → County → Regional → National
- **Algorithm Service**: Already implemented in `@/services/algorithmService.ts`
- **Database**: Firebase Firestore with real-time updates

### Key API Endpoints for Community Level
```javascript
// Generate next community round
POST /api/algorithm/community/next-round
{
  "tournamentId": "tournament_id",
  "communityId": "COMM_KISUMU_CENTRAL_001" // Auto-detected by algorithm
}

// Finalize community winners
POST /api/algorithm/community/finalize-winners
{
  "tournamentId": "tournament_id",
  "communityId": "community_id"
}

// Test API connection
GET /api/algorithm/test-connection
```

## 📋 Required Dashboard Features

### 1. **Tournament Status Overview Section**
Create a comprehensive status display showing:

**Current Round Information:**
- Display current round (R1, R2, R3, SF, F, Community_Final)
- Round progress indicator (e.g., "Round 2 of 5")
- Expected completion timeline

**Match Completion Status:**
- Total matches in current round
- Completed matches count
- Pending matches with visual indicators:
  - 🔴 Red: Missing winnerId, loserId, or points
  - 🟡 Yellow: Completed but pending verification
  - 🟢 Green: Fully completed and verified

**Player Progression Tracking:**
- Active players remaining in tournament
- Eliminated players count
- Players advancing to next round

### 2. **Round Management Interface**

**Auto-Detection Logic:**
```javascript
// The algorithm automatically detects current round - no manual input needed
const generateNextRound = async () => {
  const response = await algorithmService.generateCommunityRound({
    tournamentId: selectedTournament.id,
    level: 'community'
  })
  
  if (response.success) {
    // Handle successful round generation
    // Update UI with new matches
    // Show round information
  }
}
```

**Round Validation Requirements:**
- All matches in current round must be completed
- Each match must have: winnerId, loserId, player1Points, player2Points
- Result approval status must be 'approved'
- No matches can be in 'pending' or 'disputed' status

**Next Round Generation:**
- Button enabled only when all current matches are complete
- Show confirmation dialog before generating
- Display generated matches immediately
- Update bracket visualization

### 3. **Match Management Grid**

**Match Display Format:**
```javascript
// Match data structure to display
{
  id: "match_id",
  matchNumber: 1,
  roundNumber: "R1", // or R2, SF, F, Community_Final
  player1: {
    id: "player_id",
    name: "Player Name",
    communityId: "COMM_KISUMU_CENTRAL_001"
  },
  player2: {
    id: "player_id", 
    name: "Player Name",
    communityId: "COMM_KISUMU_CENTRAL_001"
  },
  status: "pending", // pending, completed, verified
  winnerId: null, // Set when match completed
  loserId: null,
  player1Points: null, // Algorithm expects 3 for winner, 0 for loser
  player2Points: null,
  player1Score: null, // Actual game score (e.g., 21-15)
  player2Score: null,
  scheduledDateTime: null,
  completedAt: null
}
```

**Match Completion Interface:**
- Click on match to open completion form
- Select winner from dropdown
- Points automatically set (winner: 3, loser: 0)
- Optional: Enter actual game scores
- Mark result as approved
- Save and update match status

### 4. **Community Tournament Finalization**

**Finalization Trigger Conditions:**
- Community_Final round is completed
- All final matches have defined winners and losers
- Position determination is ready (Top 3 players identified)

**Finalization Process:**
```javascript
const finalizeCommunity = async () => {
  try {
    const response = await algorithmService.finalizeCommunityWinners(tournamentId)
    
    if (response.success) {
      // Display final positions
      // Show county qualification status
      // Enable export functionality
    }
  } catch (error) {
    // Handle finalization errors
  }
}
```

**Final Results Display:**
- Position 1: Winner (Qualifies for County)
- Position 2: Runner-up
- Position 3: Third place
- Player details, statistics, and qualification status

### 5. **Real-time Updates & Monitoring**

**Firebase Listeners:**
```javascript
// Listen for match updates
const subscribeToMatches = () => {
  return db.collection('tournaments')
    .doc(tournamentId)
    .collection('matches')
    .where('communityId', '==', currentCommunityId)
    .onSnapshot(snapshot => {
      // Update matches in real-time
      updateMatchesDisplay(snapshot.docs)
    })
}

// Listen for tournament bracket updates
const subscribeToBracket = () => {
  return db.collection('tournament_brackets')
    .doc(tournamentId)
    .onSnapshot(doc => {
      // Update bracket visualization
      updateBracketDisplay(doc.data())
    })
}
```

## 🎨 UI/UX Requirements

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│                    Tournament Header                        │
│           (Name, Status, Current Round, Progress)           │
├─────────────────────────────────────────────────────────────┤
│  Stats Cards Row                                           │
│  [Total Players] [Active Players] [Completed Matches]     │
│  [Pending Matches] [Current Round] [Next Round Ready]     │
├─────────────────────────────────────────────────────────────┤
│  Match Management Grid                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Round R1 Matches                                   │   │
│  │  [Match 1] [Match 2] [Match 3] [Match 4]           │   │
│  │                                                     │   │
│  │  Round R2 Matches                                   │   │
│  │  [Match 5] [Match 6]                               │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Action Controls                                           │
│  [Generate Next Round] [Finalize Tournament] [Export]     │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture
- **CommunityDashboard.vue**: Main dashboard container
- **TournamentStatusCard.vue**: Tournament overview
- **MatchManagementGrid.vue**: Match display and management
- **RoundProgressIndicator.vue**: Visual round progress
- **MatchCompletionModal.vue**: Match result entry form
- **TournamentFinalizationPanel.vue**: Final results and export

### Visual Design Requirements
- **Status Indicators**: Color-coded match status (red/yellow/green)
- **Progress Bars**: Round completion progress
- **Match Cards**: Clean, clickable match representations
- **Responsive Design**: Mobile-friendly layout
- **Real-time Updates**: Smooth animations for state changes

## 🔧 Technical Implementation Guidelines

### State Management
```javascript
// Use Pinia store for community dashboard state
const useCommunityDashboard = () => {
  const currentTournament = ref(null)
  const currentRound = ref('')
  const matches = ref([])
  const roundProgress = ref(0)
  const canAdvanceRound = ref(false)
  const canFinalizeTournament = ref(false)
  
  // Methods for managing community tournament
  const loadTournamentData = async (tournamentId) => { /* */ }
  const generateNextRound = async () => { /* */ }
  const completeMatch = async (matchId, winnerId, scores) => { /* */ }
  const finalizeTournament = async () => { /* */ }
  
  return {
    currentTournament,
    currentRound,
    matches,
    roundProgress,
    canAdvanceRound,
    canFinalizeTournament,
    loadTournamentData,
    generateNextRound,
    completeMatch,
    finalizeTournament
  }
}
```

### Error Handling
```javascript
// Handle common algorithm errors
const handleAlgorithmError = (error) => {
  if (error.includes('matches not completed')) {
    showError('Complete all matches before advancing to next round')
  } else if (error.includes('invalid tournament state')) {
    showError('Tournament is not in a valid state for this operation')
  } else {
    showError('Algorithm service error: ' + error)
  }
}
```

### Authentication & Authorization
```javascript
// Ensure community admin has access to their community only
const canAccessCommunity = (communityId) => {
  const user = useAuthStore().user
  return user.role === 'community_admin' && 
         user.communityId === communityId
}
```

## 🚀 Implementation Steps

### Phase 1: Core Dashboard (Priority: High)
1. Create main dashboard view with tournament selection
2. Implement match display grid with real-time updates
3. Add match completion functionality
4. Create round advancement controls

### Phase 2: Enhanced Features (Priority: Medium)
1. Add tournament finalization interface
2. Implement bracket visualization
3. Add export functionality for results
4. Create notification system for match updates

### Phase 3: Advanced Features (Priority: Low)
1. Add scheduling suggestions for matches
2. Implement match dispute resolution
3. Add comprehensive tournament analytics
4. Create automated reminders for pending matches

## 📊 Success Metrics

### Functional Requirements
- ✅ Community admins can view tournament status
- ✅ Matches can be completed and verified
- ✅ Rounds advance automatically when ready
- ✅ Tournament finalization works correctly
- ✅ Winners qualify for county level

### Technical Requirements
- ✅ Real-time updates work seamlessly
- ✅ Algorithm API integration is robust
- ✅ Error handling is comprehensive
- ✅ UI is responsive and intuitive

## 🔍 Testing Requirements

### Unit Tests
- Test match completion logic
- Test round advancement conditions
- Test finalization triggers
- Test error handling scenarios

### Integration Tests
- Test algorithm service integration
- Test Firebase real-time updates
- Test authentication and authorization
- Test cross-component communication

### User Acceptance Tests
- Community admin can complete full tournament
- All algorithm scenarios work correctly
- Position determination is accurate
- County qualification is properly handled

## 📱 Mobile Considerations

### Responsive Design
- Optimized for tablet and mobile use
- Touch-friendly match selection
- Simplified navigation for small screens
- Offline capability for match entry

### Performance
- Efficient real-time updates
- Minimal API calls
- Optimized for slow connections
- Progressive loading for large tournaments

## 🎯 Key Success Factors

1. **Algorithm Integration**: Seamless communication with Python backend
2. **Real-time Updates**: Instant reflection of match and tournament changes
3. **User Experience**: Intuitive interface for community administrators
4. **Error Handling**: Graceful handling of all edge cases
5. **Data Integrity**: Accurate tournament progression and results

This Community Admin Dashboard should provide community leaders with complete control over their local tournaments while maintaining integration with the broader hierarchical tournament system.