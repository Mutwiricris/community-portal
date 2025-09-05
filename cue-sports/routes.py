# routes.py
from flask import Blueprint, request, jsonify
from __init__ import get_firestore_client
import firebase_admin
from firebase_admin import firestore
import math
import random
import json
import os
import traceback
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import logging

# Create Blueprint
bp = Blueprint('algorithm', __name__, url_prefix='/api/algorithm')

class TournamentProgressionAlgorithm:
    def __init__(self):
        self.db = get_firestore_client()
        print("🎯 Enhanced Tournament Algorithm initialized!")
        print("🔥 Production mode: Writing directly to Firebase database")
    
    # =================== INITIALIZATION (Called Once) ===================
    
    def initialize_tournament(self, tournament_id: str, special: bool = False, 
                            level: str = 'community', scheduling_preference: str = 'weekend') -> Dict:
        """
        ENHANCED INITIALIZATION: Create complete tournament structure
        Called once when tournament is created
        
        Args:
            tournament_id: Tournament identifier
            special: If True, creates mixed-player tournament (no community grouping)
            level: Tournament level ('community', 'county', 'regional', 'national')
            scheduling_preference: 'weekend' (Fri-Sun) or 'full_week' (Mon-Sun)
        """
        print(f"🚀 Initializing {'SPECIAL' if special else f'LEVEL-{level.upper()}'} tournament: {tournament_id}")
        print(f"🏆 Tournament Level: {level}")
        print(f"🌟 Special Mode: {special}")
        print(f"📅 Scheduling preference: {scheduling_preference}")
        
        # Get tournament configuration
        config = self.get_tournament_configuration(tournament_id)
        if not config:
            return {'success': False, 'error': 'Tournament configuration not found'}
        
        # CRITICAL: Algorithm ONLY respects admin's explicit parameters
        # NO automatic special tournament detection based on player groupings
        # Tournament type is ENTIRELY determined by admin's choice:
        # - special=true → Special mixed tournament (regardless of player distribution)
        # - special=false + level → Level-based tournament (regardless of player origins)
        
        print(f"🔐 ADMIN CONTROL: Tournament type determined ONLY by admin parameters")
        print(f"   special={special}, level={level}")
        print(f"   Algorithm will NOT override these settings based on player groupings")
        
        if special:
            print(f"🌟 ADMIN CHOICE: Creating SPECIAL mixed tournament")
            return self.initialize_special_tournament(tournament_id, config, scheduling_preference)
        else:
            print(f"🏆 ADMIN CHOICE: Creating {level.upper()} level tournament")
            return self.initialize_level_based_tournament(tournament_id, config, level, scheduling_preference)
    
    def initialize_regular_tournament(self, tournament_id: str, config: Dict, 
                                    scheduling_preference: str) -> Dict:
        """Initialize regular community-based tournament - MATCHES FIRST, then BRACKET"""
        print(f"🏘️ Initializing REGULAR tournament with community grouping")
        print(f"📋 NEW FLOW: Creating matches first, then building bracket from matches")
        
        # STEP 1: Generate initial community matches for ALL communities FIRST
        print(f"🎯 STEP 1: Creating all initial matches...")
        initial_matches = self.generate_all_initial_community_matches(tournament_id, config)
        
        if not initial_matches:
            return {
                'success': False,
                'error': 'No initial matches could be created'
            }
        
        # STEP 2: Add scheduling suggestions to matches
        print(f"📅 STEP 2: Adding scheduling suggestions to {len(initial_matches)} matches...")
        matches_with_scheduling = self.add_scheduling_suggestions(
            initial_matches, 'community', scheduling_preference
        )
        
        # STEP 3: Create bracket structure AFTER matches exist
        print(f"🏗️ STEP 3: Building bracket structure from {len(matches_with_scheduling)} existing matches...")
        bracket = self.create_complete_bracket_structure_from_matches(
            tournament_id, config, matches_with_scheduling
        )
        
        # STEP 4: Write matches to matches collection and bracket to tournament_brackets
        print(f"💾 STEP 4: Writing tournament data to database...")
        write_success = self.write_tournament_initialization_data(
            tournament_id, bracket, matches_with_scheduling
        )
        
        return {
            'success': write_success,
            'tournamentId': tournament_id,
            'tournamentType': 'regular',
            'schedulingPreference': scheduling_preference,
            'initialCommunityMatches': len(initial_matches),
            'totalMatches': len(initial_matches),
            'bracketLevels': len(bracket.get('bracketLevels', {})),
            'communitiesInitialized': len(bracket.get('bracketLevels', {}).get('community', {}))
        }
    
    def initialize_special_tournament(self, tournament_id: str, config: Dict, 
                                    scheduling_preference: str) -> Dict:
        """Initialize special mixed-player tournament - MATCHES FIRST, then BRACKET"""
        print(f"🌟 Initializing SPECIAL tournament - mixed players from anywhere")
        print(f"📋 NEW FLOW: Creating matches first, then building bracket from matches")
        
        # Get ALL registered players regardless of community
        all_players = self.get_all_tournament_players(tournament_id)
        
        if len(all_players) < 2:
            return {
                'success': False, 
                'error': f'Insufficient players for special tournament: {len(all_players)} found'
            }
        
        print(f"   Found {len(all_players)} total players for special tournament")
        
        # Calculate rounds needed to get to top 3
        rounds_needed = self.calculate_rounds_for_top_3(len(all_players))
        
        # STEP 1: Generate R1 matches for special tournament FIRST
        print(f"🎯 STEP 1: Creating R1 matches for {len(all_players)} players...")
        initial_matches = self.generate_special_round_matches(
            tournament_id, "R1", all_players
        )
        
        if not initial_matches:
            return {
                'success': False,
                'error': 'No initial matches could be created for special tournament'
            }
        
        # STEP 2: Add scheduling suggestions
        print(f"📅 STEP 2: Adding scheduling suggestions to {len(initial_matches)} matches...")
        matches_with_scheduling = self.add_scheduling_suggestions(
            initial_matches, 'special', scheduling_preference
        )
        
        # STEP 3: Create special bracket structure AFTER matches exist
        print(f"🏗️ STEP 3: Building special bracket structure from {len(matches_with_scheduling)} existing matches...")
        special_bracket = self.create_special_bracket_structure_from_matches(
            tournament_id, config, all_players, rounds_needed, matches_with_scheduling
        )
        
        # STEP 4: Write data
        print(f"💾 STEP 4: Writing special tournament data to database...")
        write_success = self.write_tournament_initialization_data(
            tournament_id, special_bracket, matches_with_scheduling
        )
        
        return {
            'success': write_success,
            'tournamentId': tournament_id,
            'tournamentType': 'special',
            'schedulingPreference': scheduling_preference,
            'totalPlayers': len(all_players),
            'initialMatches': len(initial_matches),
            'totalMatches': len(initial_matches),
            'roundsToCompletion': rounds_needed,
            'matches': matches_with_scheduling  # Include the actual matches array for frontend
        }
    
    def initialize_level_based_tournament(self, tournament_id: str, config: Dict, 
                                        level: str, scheduling_preference: str) -> Dict:
        """Initialize tournament based on specified level - MATCHES FIRST, then BRACKET"""
        print(f"🏆 Initializing LEVEL-BASED tournament: {level.upper()}")
        print(f"📋 NEW FLOW: Creating matches first for {level} level, then building bracket from matches")
        print(f"🎯 IMPORTANT: Tournament level is {level} regardless of player geographical distribution")
        print(f"   - Algorithm focuses ONLY on registered players for THIS tournament")
        print(f"   - No automatic special tournament detection based on player origins")
        print(f"   - Winners determined at {level} level as specified by admin")
        
        # STEP 1: Generate matches based on tournament level
        print(f"🎯 STEP 1: Creating {level} level matches...")
        
        if level == 'community':
            # Community level: matches within each community
            initial_matches = self.generate_all_initial_community_matches(tournament_id, config)
        elif level == 'county':
            # County level: matches between community winners within counties
            initial_matches = self.generate_county_level_matches(tournament_id, config)
        elif level == 'regional':
            # Regional level: matches between county winners within regions  
            initial_matches = self.generate_regional_level_matches(tournament_id, config)
        elif level == 'national':
            # National level: matches between regional winners
            initial_matches = self.generate_national_level_matches(tournament_id, config)
        else:
            return {
                'success': False,
                'error': f'Unsupported tournament level: {level}'
            }
        
        if not initial_matches:
            return {
                'success': False,
                'error': f'No {level} level matches could be created'
            }
        
        # STEP 2: Add scheduling suggestions to matches
        print(f"📅 STEP 2: Adding scheduling suggestions to {len(initial_matches)} {level} matches...")
        matches_with_scheduling = self.add_scheduling_suggestions(
            initial_matches, level, scheduling_preference
        )
        
        # STEP 3: Create bracket structure AFTER matches exist
        print(f"🏗️ STEP 3: Building {level} bracket structure from {len(matches_with_scheduling)} existing matches...")
        bracket = self.create_level_based_bracket_structure(
            tournament_id, config, level, matches_with_scheduling
        )
        
        # STEP 4: Write matches to matches collection and bracket to tournament_brackets
        print(f"💾 STEP 4: Writing {level} tournament data to database...")
        write_success = self.write_tournament_initialization_data(
            tournament_id, bracket, matches_with_scheduling
        )
        
        return {
            'success': write_success,
            'tournamentId': tournament_id,
            'tournamentType': f'level_{level}',
            'tournamentLevel': level,
            'schedulingPreference': scheduling_preference,
            'initialMatches': len(initial_matches),
            'totalMatches': len(initial_matches),
            'bracketLevels': len(bracket.get('bracketLevels', {})),
            'matches': matches_with_scheduling  # Include the actual matches array for frontend
        }
    
    def generate_all_initial_community_matches(self, tournament_id: str, config: Dict) -> List[Dict]:
        """Generate R1 matches for ALL communities simultaneously using simplified approach"""
        print(f"🏘️ Generating initial community matches for all communities")
        all_matches = []
        
        # STEP 1: Get all registered players grouped by community
        print(f"🔍 STEP 1: Getting all registered players grouped by community...")
        players_by_community = self.get_all_registered_players_grouped_by_community(tournament_id)
        
        if not players_by_community:
            print(f"❌ No players found grouped by community")
            return []
        
        print(f"   Found players in {len(players_by_community)} communities")
        
        # STEP 2: Generate matches for each community group
        print(f"🎯 STEP 2: Generating matches for each community...")
        
        for community_id, community_players in players_by_community.items():
            print(f"\n   Processing community: {community_id}")
            player_count = len(community_players)
            print(f"   Players in {community_id}: {player_count} - {[p.get('name', 'Unknown') for p in community_players]}")
            
            if player_count == 1:
                # Single player gets automatic position 1
                single_player_result = self.handle_single_player_community(
                    tournament_id, community_id, community_players[0]
                )
                all_matches.extend(single_player_result)
                print(f"   Single player: {community_players[0]['name']} gets automatic position 1")
                
            elif player_count == 2:
                # Two players: direct final to determine positions 1 and 2
                two_player_matches = self.handle_two_player_community(
                    tournament_id, community_id, community_players
                )
                all_matches.extend(two_player_matches)
                print(f"   Two players: Direct final for positions 1 and 2")
                
            elif player_count == 3:
                # 3 players: Use 3-player positioning system
                three_player_matches = self.create_three_player_positioning_matches(
                    tournament_id, community_id, community_players
                )
                all_matches.extend(three_player_matches)
                print(f"   Generated {len(three_player_matches)} matches for 3-player system in {community_id}")
                
            elif player_count == 4:
                # 4 players: Create SF1, SF2 directly (skip R1)
                four_player_matches = self.create_four_player_positioning_matches(
                    tournament_id, community_id, community_players
                )
                all_matches.extend(four_player_matches)
                print(f"   Generated {len(four_player_matches)} SF matches for 4-player system in {community_id}")
                
            elif player_count >= 5:
                # 5+ players: Generate R1 matches (standard elimination until down to 4)
                community_r1_matches = self.generate_community_round_matches(
                    tournament_id, community_id, "R1", community_players
                )
                all_matches.extend(community_r1_matches)
                print(f"   Generated {len(community_r1_matches)} R1 matches for {community_id} (elimination to 4 players)")
            else:
                print(f"   ⚠️ No players in {community_id}")
        
        print(f"\n✅ Total matches generated across all communities: {len(all_matches)}")
        return all_matches
    
    def handle_single_player_community(self, tournament_id: str, community_id: str, 
                                     player: Dict) -> List[Dict]:
        """Handle community with single player - automatic position 1"""
        match_id = f"SINGLE_PLAYER_COMM_{community_id}_auto_1"
        
        # Create automatic advancement match
        auto_match = {
            # Core match identification
            'id': match_id,
            'tournamentId': tournament_id,
            'matchNumber': 1,
            'bracketPosition': 'AUTO_POS1',
            
            # Tournament structure
            'roundNumber': 'Community_Final',
            'tournamentLevel': 'community',
            'communityId': community_id,
            'countyId': None,
            'regionId': None,
            
            # Player details (player vs AUTO)
            'player1Id': player['id'],
            'player1Name': player['name'],
            'player1CommunityId': player.get('communityId', community_id),
            'player1Avatar': player.get('avatar', None),
            'player1Score': 0,
            'player1Points': 3,  # Automatic win points
            
            'player2Id': 'AUTO_POS1',
            'player2Name': 'AUTOMATIC POSITION 1',
            'player2CommunityId': community_id,
            'player2Avatar': None,
            'player2Score': 0,
            'player2Points': 0,
            
            # Match results - already completed
            'status': 'completed',
            'winnerId': player['id'],
            'loserId': 'AUTO_POS1',
            'resultSubmittedAt': datetime.now().isoformat(),
            'resultSubmittedBy': 'algorithm_system',
            'resultApprovalStatus': 'approved',
            'approvedAt': datetime.now().isoformat(),
            'approvedBy': 'algorithm_system',
            
            # Match configuration
            'gameType': '8ball',
            'matchFormat': 'automatic_advancement',
            'bestOf': 1,
            'pointsSystem': {'win': 3, 'loss': 0},
            
            # Special flags
            'isByeMatch': False,
            'isAutoAdvancement': True,
            'isLevelFinal': True,
            'determinesPositions': True,
            'finalPositions': {'position1': player['id'], 'position2': None, 'position3': None},
            
            # Admin fields
            'adminNotes': 'Single player community - automatic position 1',
            'searchableText': f"{player['name']} automatic position 1 {tournament_id}",
            
            # System fields
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
            'createdByCommunityAdminId': 'algorithm_system'
        }
        
        return [auto_match]
    
    def handle_two_player_community(self, tournament_id: str, community_id: str, 
                                  players: List[Dict]) -> List[Dict]:
        """Handle community with two players - direct final for positions 1 and 2"""
        match_id = f"TWO_PLAYER_FINAL_COMM_{community_id}_final_1"
        
        final_match = self.create_comprehensive_match(
            match_id, tournament_id, 'Community_Final', community_id, 1,
            players[0], players[1], 'community'
        )
        
        # Override specific fields for two-player final
        final_match.update({
            'matchType': 'two_player_final',
            'isLevelFinal': True,
            'determinesPositions': True,
            'availablePositions': [1, 2],
            'bracketPosition': 'TWO_PLAYER_FINAL',
            'adminNotes': 'Two-player community final - determines positions 1 and 2',
            'twoPlayerFinal': True
        })
        
        return [final_match]
    
    def generate_special_round_matches(self, tournament_id: str, round_number: str, 
                                     players: List[Dict]) -> List[Dict]:
        """Generate matches for special tournament (mixed communities)"""
        print(f"🌟 Generating {round_number} matches for SPECIAL tournament")
        print(f"   Players available: {len(players)} (mixed communities)")
        
        matches = []
        available_players = players.copy()
        random.shuffle(available_players)  # Random pairing across all communities
        
        match_number = 1
        while len(available_players) >= 2:
            player1 = available_players.pop(0)
            player2 = available_players.pop(0)
            
            # Create predictable match ID for special tournament
            match_id = f"{round_number}_SPECIAL_mixed_match_{match_number}"
            
            # Create comprehensive match with special tournament flag
            match = self.create_comprehensive_match(
                match_id, tournament_id, round_number, 'MIXED', match_number,
                player1, player2, 'special'
            )
            
            # Override community-specific fields for special tournament
            match.update({
                'communityId': None,  # No specific community
                'tournamentLevel': 'special',
                'geographicalSeparation': True,  # Players can be from different communities
                'specialTournament': True,
                'mixedCommunityMatch': True
            })
            
            matches.append(match)
            print(f"   Match {match_number}: {player1['name']} ({player1.get('communityId', 'N/A')}) vs {player2['name']} ({player2.get('communityId', 'N/A')})")
            match_number += 1
        
        # Handle odd player (bye to next round)
        if available_players:
            bye_player = available_players[0]
            bye_match = self.create_special_bye_match(tournament_id, round_number, bye_player, match_number)
            matches.append(bye_match)
            print(f"   Bye Match: {bye_player['name']} gets automatic advancement")
        
        print(f"   Total matches created: {len(matches)}")
        return matches
    
    def create_special_bye_match(self, tournament_id: str, round_number: str, 
                               bye_player: Dict, match_number: int) -> Dict:
        """Create bye match for special tournament"""
        match_id = f"{round_number}_SPECIAL_mixed_bye_{match_number}"
        
        bye_opponent = {
            'id': 'BYE',
            'name': 'BYE',
            'communityId': 'N/A',
            'avatar': None
        }
        
        bye_match = self.create_comprehensive_match(
            match_id, tournament_id, round_number, 'MIXED', match_number,
            bye_player, bye_opponent, 'special'
        )
        
        # Override for special bye match
        bye_match.update({
            'communityId': None,
            'tournamentLevel': 'special',
            'isByeMatch': True,
            'status': 'completed',
            'winnerId': bye_player['id'],
            'loserId': 'BYE',
            'player1Points': 3,
            'player2Points': 0,
            'resultApprovalStatus': 'approved',
            'approvedAt': datetime.now().isoformat(),
            'approvedBy': 'algorithm_system',
            'resultSubmittedAt': datetime.now().isoformat(),
            'resultSubmittedBy': 'algorithm_system',
            'adminNotes': 'Special tournament bye - automatic advancement',
            'specialTournament': True,
            'geographicalSeparation': True
        })
        
        return bye_match
    
    # =================== ENHANCED COMMUNITY FINAL LOGIC ===================
    
    def generate_community_final_matches(self, tournament_id: str, community_id: str,
                                       players: List[Dict]) -> List[Dict]:
        """
        PROGRESSIVE Community Final matches:
        - 3-player: Initial match → call next-round → final match → call finalize
        - 4-player: Semi-finals → call next-round → winners/losers → call next-round → final → call finalize
        """
        print(f"🏆 Generating PROGRESSIVE Community Final for {community_id} with {len(players)} players")
        
        # Add debugging to prevent infinite loops
        print(f"🔍 DEBUG: Starting generate_community_final_matches with {len(players)} players")
        
        # Check if we're continuing a progressive scenario
        existing_final_matches = self.get_round_matches(tournament_id, community_id, 'Community_Final')
        existing_f_matches = self.get_round_matches(tournament_id, community_id, 'Community_F')  # Check for Community_F matches too
        existing_sf_matches = self.get_round_matches(tournament_id, community_id, 'Community_SF')  
        existing_wf_matches = self.get_round_matches(tournament_id, community_id, 'Community_WF')
        existing_lf_matches = self.get_round_matches(tournament_id, community_id, 'Community_LF')
        
        # Combine all 4-player system matches
        all_existing_matches = existing_final_matches + existing_f_matches + existing_sf_matches + existing_wf_matches + existing_lf_matches
        
        print(f"🔍 DEBUG: Found existing matches:")
        print(f"   Community_Final: {len(existing_final_matches)}")
        print(f"   Community_F: {len(existing_f_matches)}")
        print(f"   Community_SF: {len(existing_sf_matches)}")
        print(f"   Community_WF: {len(existing_wf_matches)}")
        print(f"   Community_LF: {len(existing_lf_matches)}")
        print(f"   Total: {len(all_existing_matches)}")
        
        if all_existing_matches:
            print(f"🔍 DEBUG: Calling handle_progressive_final_scenario")
            return self.handle_progressive_final_scenario(tournament_id, community_id, all_existing_matches, players)
        
        # Initial Community_Final generation
        matches = []
        
        # Check if there were previous matches (R1, R2, etc.)
        previous_matches_exist = self.check_previous_matches_exist(tournament_id, community_id)
        
        if len(players) == 1:
            # Auto-advance the single player
            matches = self.handle_single_player_community(tournament_id, community_id, players[0])
        elif len(players) == 2:
            if previous_matches_exist:
                # 2 players after elimination rounds - THIS SHOULD NEVER HAPPEN
                # We should jump to 3-player or 4-player logic when appropriate
                print(f"   ERROR: 2 players after elimination should not reach here")
                print(f"   This indicates a counting error - check winner collection logic")
                return []
            else:
                # Initial 2 players - direct final for positions 1&2 (no position 3)
                print(f"   Initial 2 players - creating direct final")
                return self.handle_two_player_community(tournament_id, community_id, players)
        elif len(players) == 3:
            # 3-player progressive: only creates initial match
            return self.create_three_player_positioning_matches(tournament_id, community_id, players)
        elif len(players) == 4:
            # 4-player progressive: only creates semi-finals
            return self.create_four_player_positioning_matches(tournament_id, community_id, players)
        elif len(players) > 4:
            # More than 4: Continue elimination until 3 or fewer remain
            elimination_matches = self.generate_community_round_matches(
                tournament_id, community_id, "Community_Final", players
            )
            matches.extend(elimination_matches)
        
        return matches
    
    def check_previous_matches_exist(self, tournament_id: str, community_id: str) -> bool:
        """Check if there were previous rounds (R1, R2, etc.) for this community"""
        try:
            # Check for R1 matches
            r1_matches = self.get_round_matches(tournament_id, community_id, 'R1')
            if r1_matches:
                print(f"   Found {len(r1_matches)} R1 matches - previous rounds exist")
                return True
            
            # Check for R2 matches
            r2_matches = self.get_round_matches(tournament_id, community_id, 'R2')
            if r2_matches:
                print(f"   Found {len(r2_matches)} R2 matches - previous rounds exist")
                return True
            
            print(f"   No previous rounds found - this is initial tournament")
            return False
        except Exception as e:
            print(f"   Error checking previous matches: {e}")
            return False
    
    def handle_progressive_final_scenario(self, tournament_id: str, community_id: str, 
                                        existing_matches: List[Dict], players: List[Dict]) -> List[Dict]:
        """
        Handle progressive final scenarios for 3-player and 4-player systems
        """
        print(f"🔄 Handling progressive final scenario with {len(existing_matches)} existing matches")
        
        # Determine scenario type based on existing matches
        match_types = [m.get('matchType', '') for m in existing_matches]
        
        # 3-Player Progressive System
        if 'three_player_initial' in match_types:
            initial_match = next(m for m in existing_matches if m.get('matchType') == 'three_player_initial')
            
            if initial_match.get('status') == 'completed':
                print("   3-player initial match completed, creating final positioning match")
                return self.create_three_player_final_positioning_match(tournament_id, community_id, initial_match)
            else:
                print("   3-player initial match not yet completed")
                return []
        
        # 4-Player Progressive System
        elif 'semi_final' in match_types:
            semi_finals = [m for m in existing_matches if m.get('matchType') == 'semi_final']
            
            # Check if semi-finals are complete
            if all(sf.get('status') == 'completed' for sf in semi_finals):
                
                # Check if winners/losers finals exist
                winners_final = next((m for m in existing_matches if m.get('matchType') == 'winners_final'), None)
                losers_final = next((m for m in existing_matches if m.get('matchType') == 'losers_final'), None)
                
                if not winners_final or not losers_final:
                    print("   Semi-finals completed, creating Winners Final and Losers Final")
                    return self.create_four_player_winners_losers_matches(tournament_id, community_id, 
                                                                        semi_finals[0], semi_finals[1])
                
                # Check if winners/losers finals are complete  
                elif (winners_final.get('status') == 'completed' and 
                      losers_final.get('status') == 'completed'):
                    
                    # Check if position 2/3 final exists
                    final_match = next((m for m in existing_matches if m.get('matchType') == 'final'), None)
                    
                    if not final_match:
                        print("   Winners/Losers Finals completed, creating Position 2/3 Final")
                        return self.create_four_player_final_positioning_match(tournament_id, community_id,
                                                                             winners_final, losers_final)
                    else:
                        print("   All 4-player matches complete, tournament ready for finalization")
                        return []
                else:
                    print("   Winners/Losers Finals not yet completed")
                    return []
            else:
                print("   Semi-finals not yet completed")
                return []
        
        else:
            print("   No progressive scenario detected")
            return []
    
    def create_three_player_positioning_matches(self, tournament_id: str, community_id: str,
                                              players: List[Dict]) -> List[Dict]:
        """
        CORRECTED 3-player positioning logic:
        Match 1: Player A vs Player B → Winner = Position 1, Loser advances to Match 2
        (After Match 1 completes, call next-round to generate Match 2)
        Match 2: Loser of Match 1 vs Player C → Winner = Position 2, Loser = Position 3
        """
        print(f"🎯 Creating 3-player positioning match 1 for {community_id}")
        
        matches = []
        
        # Randomly assign players
        random.shuffle(players)
        player_a, player_b, player_c = players[0], players[1], players[2]
        
        # Match 1: A vs B (Winner gets Position 1, loser advances to match 2)
        match1_id = f"Community_Final_COMM_{community_id}_INITIAL"
        first_match = self.create_comprehensive_match(
            match1_id, tournament_id, 'Community_Final', community_id, 1,
            player_a, player_b, 'community'
        )
        first_match.update({
            'matchType': 'three_player_initial',
            'isLevelFinal': True,
            'adminNotes': f'3-Player Initial Match: {player_a["name"]} vs {player_b["name"]} (Winner = Position 1, Loser advances)',
            'positioningRound': 1,
            'positioningStage': 'initial',
            'player_c_id': player_c['id'],  # Store Player C for next match
            'player_c_name': player_c['name']
        })
        matches.append(first_match)
        
        print(f"   Created initial match: {player_a['name']} vs {player_b['name']}")
        print(f"   Winner gets Position 1, loser will play {player_c['name']} in final match")
        print(f"   After this completes, call next-round to generate final positioning match")
        
        return matches
    
    def create_three_player_final_positioning_match(self, tournament_id: str, community_id: str, 
                                                  initial_match: Dict) -> List[Dict]:
        """
        Create final positioning match for 3-player system:
        Match 2: Initial match loser vs Player C → Winner = Position 2, Loser = Position 3
        """
        print(f"🎯 Creating 3-player final positioning match for {community_id}")
        
        matches = []
        
        # Position 1 is already determined (winner of initial match)
        # Get winner and loser based on points
        position_1_winner = self.get_match_winner_data(initial_match)
        initial_match_loser = self.get_match_loser_data(initial_match)
        
        if not position_1_winner or not initial_match_loser:
            print(f"❌ Cannot determine winner/loser for initial match")
            return []
        player_c = {
            'id': initial_match.get('player_c_id'),
            'name': initial_match.get('player_c_name'),
            'communityId': initial_match.get('communityId')
        }
        
        # Match 2: Position 2/3 Final Match
        final_match_id = f"Community_Final_COMM_{community_id}_POS23_FINAL"
        final_match = self.create_comprehensive_match(
            final_match_id, tournament_id, 'Community_Final', community_id, 2,
            initial_match_loser, player_c, 'community'
        )
        final_match.update({
            'matchType': 'three_player_final',
            'isLevelFinal': True,
            'adminNotes': f'3-Player Final: {initial_match_loser["name"]} vs {player_c["name"]} (Winner = Position 2, Loser = Position 3)',
            'positioningRound': 2,
            'positioningStage': 'final_positioning',
            'determinesPositions': [2, 3]
        })
        matches.append(final_match)
        
        print(f"   Position 1: {position_1_winner['name']} (Initial match winner)")
        print(f"   Position 2/3 Match: {initial_match_loser['name']} vs {player_c['name']}")
        print(f"   After this completes, call finalize endpoint to determine final positions")
        
        return matches
    
    def create_four_player_positioning_matches(self, tournament_id: str, community_id: str,
                                             players: List[Dict]) -> List[Dict]:
        """
        Stage 1: Create Semi-Finals for 4-player system
        SF1: Player A vs Player B
        SF2: Player C vs Player D
        """
        print(f"🎯 Creating 4-player semi-finals for {community_id}")
        
        matches = []
        random.shuffle(players)
        
        # Match 1: Semi Final 1
        sf1_id = f"Community_SF_COMM_{community_id}_SF1"
        semifinal1 = self.create_comprehensive_match(
            sf1_id, tournament_id, 'Community_SF', community_id, 1,
            players[0], players[1], 'community'
        )
        semifinal1.update({
            'matchType': 'semi_final',
            'isLevelFinal': True,
            'adminNotes': f'Semi Final 1: {players[0]["name"]} vs {players[1]["name"]}',
            'positioningRound': 1,
            'positioningStage': 'semi_finals'
        })
        matches.append(semifinal1)
        
        # Match 2: Semi Final 2
        sf2_id = f"Community_SF_COMM_{community_id}_SF2"
        semifinal2 = self.create_comprehensive_match(
            sf2_id, tournament_id, 'Community_SF', community_id, 2,
            players[2], players[3], 'community'
        )
        semifinal2.update({
            'matchType': 'semi_final',
            'isLevelFinal': True,
            'adminNotes': f'Semi Final 2: {players[2]["name"]} vs {players[3]["name"]}',
            'positioningRound': 1,
            'positioningStage': 'semi_finals'
        })
        matches.append(semifinal2)
        
        print(f"   Created 2 semi-final matches:")
        print(f"   SF1: {players[0]['name']} vs {players[1]['name']}")
        print(f"   SF2: {players[2]['name']} vs {players[3]['name']}")
        print(f"   After completion, call next-round to generate Winners/Losers Finals")
        
        return matches
    
    def create_four_player_winners_losers_matches(self, tournament_id: str, community_id: str, 
                                                sf1_match: Dict, sf2_match: Dict) -> List[Dict]:
        """
        Stage 2: Create Winners Final and Losers Final
        Winners Final: SF1 winner vs SF2 winner (Winner = Position 1)
        Losers Final: SF1 loser vs SF2 loser (Loser = ELIMINATED)
        """
        print(f"🎯 Creating Winners Final and Losers Final for 4-player system")
        
        # Safety check: Ensure we have two distinct semi-final matches
        if sf1_match.get('id') == sf2_match.get('id'):
            print(f"❌ ERROR: Both semi-final matches have the same ID: {sf1_match.get('id')}")
            return []
        
        matches = []
        
        # Debug: Show full match data
        print(f"   🔍 SF1 Match Full Data:")
        print(f"      Player1: {sf1_match.get('player1Id')} - {sf1_match.get('player1Name')} ({sf1_match.get('player1Points', 0)} points)")
        print(f"      Player2: {sf1_match.get('player2Id')} - {sf1_match.get('player2Name')} ({sf1_match.get('player2Points', 0)} points)")
        print(f"      Status: {sf1_match.get('status')}")
        print(f"   🔍 SF2 Match Full Data:")
        print(f"      Player1: {sf2_match.get('player1Id')} - {sf2_match.get('player1Name')} ({sf2_match.get('player1Points', 0)} points)")
        print(f"      Player2: {sf2_match.get('player2Id')} - {sf2_match.get('player2Name')} ({sf2_match.get('player2Points', 0)} points)")
        print(f"      Status: {sf2_match.get('status')}")
        
        # Get winners and losers based purely on points
        print(f"   🎯 Determining SF1 winner/loser from points...")
        sf1_winner = self.get_match_winner_data(sf1_match)
        sf1_loser = self.get_match_loser_data(sf1_match)
        
        if not sf1_winner or not sf1_loser:
            print(f"❌ ERROR: Cannot determine SF1 winner/loser - points may be tied or missing")
            return []
        
        print(f"   🎯 Determining SF2 winner/loser from points...")
        sf2_winner = self.get_match_winner_data(sf2_match)
        sf2_loser = self.get_match_loser_data(sf2_match)
        
        if not sf2_winner or not sf2_loser:
            print(f"❌ ERROR: Cannot determine SF2 winner/loser - points may be tied or missing")
            return []
        
        print(f"   SF1 Winner: {sf1_winner.get('name')} ({sf1_winner.get('id')})")
        print(f"   SF1 Loser: {sf1_loser.get('name')} ({sf1_loser.get('id')})")
        print(f"   SF2 Winner: {sf2_winner.get('name')} ({sf2_winner.get('id')})")
        print(f"   SF2 Loser: {sf2_loser.get('name')} ({sf2_loser.get('id')})")
        
        # Validate that we have 4 distinct players
        all_player_ids = [sf1_winner.get('id'), sf1_loser.get('id'), sf2_winner.get('id'), sf2_loser.get('id')]
        unique_player_ids = set(all_player_ids)
        
        if len(unique_player_ids) != 4:
            print(f"❌ ERROR: Expected 4 distinct players, but got {len(unique_player_ids)}: {unique_player_ids}")
            print(f"   SF1: {sf1_winner.get('name')} vs {sf1_loser.get('name')}")
            print(f"   SF2: {sf2_winner.get('name')} vs {sf2_loser.get('name')}")
            return []
        
        # Match 3: Winners Final (Winner = Position 1)
        winners_final_id = f"Community_WF_COMM_{community_id}_WINNERS_FINAL"
        winners_final = self.create_comprehensive_match(
            winners_final_id, tournament_id, 'Community_WF', community_id, 3,
            sf1_winner, sf2_winner, 'community'
        )
        winners_final.update({
            'matchType': 'winners_final',
            'isLevelFinal': True,
            'adminNotes': f'Winners Final: {sf1_winner["name"]} vs {sf2_winner["name"]} (Winner = Position 1)',
            'positioningRound': 2,
            'positioningStage': 'finals',
            'determinesPosition': 1
        })
        matches.append(winners_final)
        
        # Match 4: Losers Final (Loser = ELIMINATED)
        losers_final_id = f"Community_LF_COMM_{community_id}_LOSERS_FINAL"  
        losers_final = self.create_comprehensive_match(
            losers_final_id, tournament_id, 'Community_LF', community_id, 4,
            sf1_loser, sf2_loser, 'community'
        )
        losers_final.update({
            'matchType': 'losers_final',
            'isLevelFinal': True,
            'adminNotes': f'Losers Final: {sf1_loser["name"]} vs {sf2_loser["name"]} (Loser = ELIMINATED)',
            'positioningRound': 2,
            'positioningStage': 'finals'
        })
        matches.append(losers_final)
        
        print(f"   Created Winners Final: {sf1_winner['name']} vs {sf2_winner['name']} (Winner = Position 1)")
        print(f"   Created Losers Final: {sf1_loser['name']} vs {sf2_loser['name']} (Loser = ELIMINATED)")
        print(f"   After completion, call next-round to generate Position 2/3 Final")
        
        return matches
    
    def create_four_player_final_positioning_match(self, tournament_id: str, community_id: str,
                                                 winners_final: Dict, losers_final: Dict) -> List[Dict]:
        """
        Stage 3: Create Position 2/3 Final
        Final: Winners Final loser vs Losers Final winner (Winner = Position 2, Loser = Position 3)
        Position 1 already determined (Winners Final winner)
        """
        print(f"🎯 Creating Position 2/3 Final for 4-player system")
        
        matches = []
        
        # Get players based purely on points
        position_1_winner = self.get_match_winner_data(winners_final)
        if not position_1_winner:
            print(f"❌ Cannot determine winner for Winners Final in final positioning")
            return []
        
        # Get players for Position 2/3 final: WF loser vs LF winner
        winners_final_loser = self.get_match_loser_data(winners_final)
        losers_final_winner = self.get_match_winner_data(losers_final)
        
        if not winners_final_loser or not losers_final_winner:
            print(f"❌ Cannot determine loser/winner for final positioning match")
            return []
        
        # Match 5: Position 2/3 Final (THE FINAL MATCH)
        final_match_id = f"Community_F_COMM_{community_id}_FINAL"
        final_match = self.create_comprehensive_match(
            final_match_id, tournament_id, 'Community_F', community_id, 5,
            winners_final_loser, losers_final_winner, 'community'
        )
        final_match.update({
            'matchType': 'final',
            'isLevelFinal': True,
            'adminNotes': f'FINAL: {winners_final_loser["name"]} vs {losers_final_winner["name"]} (Winner = Position 2, Loser = Position 3)',
            'positioningRound': 3,
            'positioningStage': 'final',
            'determinesPositions': [2, 3]
        })
        matches.append(final_match)
        
        print(f"   Position 1: {position_1_winner['name']} (Winners Final winner)")
        print(f"   FINAL: {winners_final_loser['name']} vs {losers_final_winner['name']}")
        print(f"   Winner = Position 2, Loser = Position 3")
        print(f"   After completion, call finalize endpoint to determine final positions")
        
        return matches
    
    # =================== SCHEDULING SUGGESTIONS ===================
    
    def add_scheduling_suggestions(self, matches: List[Dict], level: str, 
                                 preference: str = 'weekend') -> List[Dict]:
        """Add scheduling suggestions to matches - single day per round"""
        print(f"📅 Adding scheduling suggestions for {level} level (preference: {preference})")
        
        # Define available days
        weekend_days = ['Friday', 'Saturday', 'Sunday']
        full_week_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        available_days = weekend_days if preference == 'weekend' else full_week_days
        
        # Group matches by round
        rounds = {}
        for match in matches:
            round_number = match.get('roundNumber', 'Unknown')
            if round_number not in rounds:
                rounds[round_number] = []
            rounds[round_number].append(match)
        
        # Suggest one day per round based on match count
        for round_number, round_matches in rounds.items():
            # Calculate a reasonable day based on number of matches
            # Prefer weekends for larger rounds
            match_count = len(round_matches)
            
            if match_count <= 10:
                # Small round - can be any day
                suggested_day = random.choice(available_days)
            elif match_count <= 30:
                # Medium round - prefer weekend days
                if preference == 'weekend':
                    suggested_day = random.choice(['Saturday', 'Sunday'])
                else:
                    suggested_day = random.choice(['Friday', 'Saturday', 'Sunday'])
            else:
                # Large round - definitely weekend
                suggested_day = 'Saturday'
            
            # Calculate start date offset based on round
            if round_number == 'R1':
                days_offset = 7  # First round starts in 1 week
            elif round_number == 'R2':
                days_offset = 14  # Second round in 2 weeks
            elif 'Final' in round_number:
                days_offset = 21  # Finals in 3 weeks
            else:
                days_offset = 28  # Other rounds in 4 weeks
            
            # Apply the same suggested day to all matches in this round
            for match in round_matches:
                # Update the match with scheduling suggestion
                match['scheduledDate'] = suggested_day  # Single day suggestion
                
                # Add additional scheduling info if needed
                match.update({
                    'schedulingSuggestion': {
                        'suggestedDay': suggested_day,
                        'roundNumber': round_number,
                        'matchesInRound': match_count,
                        'daysFromNow': days_offset,
                        'schedulingPreference': preference,
                        'level': level
                    }
                })
        
        total_matches = len(matches)
        print(f"   ✅ Scheduling suggestions added to {total_matches} matches across {len(rounds)} rounds")
        for round_number, round_matches in rounds.items():
            suggested_day = round_matches[0].get('scheduledDate', 'Not set')
            print(f"      {round_number}: {len(round_matches)} matches on {suggested_day}")
        
        return matches
    
    # =================== SPECIAL TOURNAMENT UTILITIES ===================
    
    def get_all_tournament_players(self, tournament_id: str) -> List[Dict]:
        """Get ALL registered players regardless of community for special tournaments"""
        try:
            print(f"🌟 Getting ALL players for special tournament: {tournament_id}")
            
            # Get tournament document to access registeredPlayersIds
            tournament_ref = self.db.collection('tournaments').document(tournament_id)
            tournament_doc = tournament_ref.get()
            
            if not tournament_doc.exists:
                print(f"❌ Tournament {tournament_id} not found")
                return []
            
            tournament_data = tournament_doc.to_dict()
            print(f"🔍 DEBUG: Tournament document keys: {list(tournament_data.keys())}")
            print(f"🔍 DEBUG: Tournament document data: {tournament_data}")
            
            # First try the expected field name (with 's')
            registered_player_ids = tournament_data.get('registeredPlayersIds', [])
            print(f"🔍 DEBUG: Found {len(registered_player_ids)} player IDs in 'registeredPlayersIds': {registered_player_ids}")
            
            # Check for common alternative field name (without 's')
            if not registered_player_ids:
                registered_player_ids = tournament_data.get('registeredPlayerIds', [])
                if registered_player_ids:
                    print(f"🔧 FIELD NAME FIX: Using 'registeredPlayerIds' (without 's') - found {len(registered_player_ids)} players")
                    print(f"🔍 DEBUG: Player IDs from 'registeredPlayerIds': {registered_player_ids}")
            
            all_players = []
            
            for player_id in registered_player_ids:
                # Get user details
                user_ref = self.db.collection('users').document(player_id)
                user_doc = user_ref.get()
                
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    
                    player_name = (user_data.get('playerName') or 
                                 user_data.get('displayName') or 
                                 user_data.get('fullName') or 
                                 f"Player_{player_id[-6:]}")
                    
                    community_id = user_data.get('communityId', 'MIXED')
                    
                    player = {
                        'id': player_id,
                        'name': player_name,
                        'communityId': community_id,
                        'email': user_data.get('email', 'N/A'),
                        'skillRating': user_data.get('skillRating', 1000),
                        'registrationId': player_id,  # Use player_id as registration reference
                        'avatar': user_data.get('avatar', None),
                        'geographicalContext': self.get_geographical_context(community_id)
                    }
                    
                    all_players.append(player)
                    print(f"   Player: {player_name} from {community_id}")
            
            print(f"✅ Found {len(all_players)} total players for special tournament")
            return all_players
            
        except Exception as e:
            print(f"❌ Error getting all tournament players: {e}")
            return []
    
    def calculate_rounds_for_top_3(self, player_count: int) -> int:
        """Calculate rounds needed to eliminate down to top 3 players"""
        if player_count <= 3:
            return 1  # Already at final positioning stage
        
        # Calculate rounds to get from player_count to 3
        current_count = player_count
        rounds = 0
        
        while current_count > 3:
            current_count = math.ceil(current_count / 2)  # Each round roughly halves
            rounds += 1
        
        rounds += 1  # Add final positioning round
        return rounds
    
    def create_special_bracket_structure(self, tournament_id: str, config: Dict, 
                                       players: List[Dict], rounds_needed: int) -> Dict:
        """Create bracket structure for special tournament"""
        try:
            print(f"🌟 Creating special bracket structure")
            
            bracket = {
                'tournamentId': tournament_id,
                'hierarchicalLevel': 'special',
                'bracketType': 'special_elimination_to_top_3',
                'tournamentType': 'special',
                'mixedCommunityTournament': True,
                'participantScope': {
                    'scopeType': 'special_mixed',
                    'totalPlayers': len(players),
                    'communityMixingAllowed': True
                },
                'rounds': {},
                'roundStatus': {},
                'advancementRules': {
                    'type': 'elimination_to_top_3',
                    'winnersAdvance': True,
                    'losersEliminated': True,
                    'finalGoal': 'determine_top_3_positions'
                },
                'specialTournamentConfig': {
                    'playerCount': len(players),
                    'roundsNeeded': rounds_needed,
                    'eliminationTarget': 3,
                    'crossCommunityAllowed': True
                },
                'createdAt': datetime.now().isoformat(),
                'lastUpdated': datetime.now().isoformat()
            }
            
            # Create round structure
            round_names = []
            for i in range(rounds_needed - 1):
                round_names.append(f"R{i + 1}")
            round_names.append("Special_Final")
            
            # Initialize round status
            bracket['roundStatus'] = {round_names[0]: 'in_progress'}
            for round_name in round_names[1:]:
                bracket['roundStatus'][round_name] = 'pending'
            
            print(f"✅ Special bracket created: {rounds_needed} rounds, {len(players)} players")
            return bracket
            
        except Exception as e:
            print(f"❌ Error creating special bracket: {e}")
            return {}
    
    def create_complete_bracket_structure_from_matches(self, tournament_id: str, config: Dict, matches: List[Dict]) -> Dict:
        """Create complete bracket structure from existing matches - ENSURES ROUNDS MAP IS POPULATED"""
        try:
            print(f"🏗️ Creating bracket structure from {len(matches)} EXISTING matches for tournament: {tournament_id}")
            
            # Validate inputs
            if not tournament_id:
                print(f"❌ Error: tournament_id is required for bracket creation")
                return {}
            
            if not config:
                print(f"❌ Error: config is required for bracket creation")
                return {}
            
            if not matches:
                print(f"❌ Error: no matches provided for bracket creation")
                return {}
            
            # Validate match structure
            for i, match in enumerate(matches):
                if not match.get('id'):
                    print(f"❌ Error: match {i} missing required 'id' field")
                    return {}
                if not match.get('roundNumber'):
                    print(f"❌ Error: match {i} missing required 'roundNumber' field")
                    return {}
            
            print(f"✅ Input validation passed for bracket creation")
            
            # Start with base bracket structure with proper level hierarchy
            bracket = {
                'tournamentId': tournament_id,
                'hierarchicalLevel': config.get('hierarchicalLevel', 'community'),
                'bracketType': 'single_elimination',
                'participantScope': config.get('participantScope', {}),
                'rounds': {
                    'community': {},  # community_id -> round_names -> [match_ids]
                    'county': {},     # county_id -> round_names -> [match_ids]  
                    'regional': {},   # region_id -> round_names -> [match_ids]
                    'national': {}    # 'national' -> round_names -> [match_ids]
                },  # Will be populated from matches with proper level structure
                'roundStatus': {},
                'advancementRules': {
                    'type': 'single_elimination',
                    'winnersAdvance': True,
                    'losersEliminated': True,
                    'positioningRules': {
                        '3_players': 'quarter_final_semi_final',
                        '4_players': 'semi_final_system',
                        'final_positions': [1, 2, 3]
                    }
                },
                'bracketLevels': {
                    'community': {},  # Will be populated from matches
                    'county': {},
                    'regional': {},
                    'national': {}
                },
                'positions': {
                    'community': {},  # Will track positions for each community
                    'county': {},     # Will track positions for each county  
                    'regional': {},   # Will track positions for each region
                    'national': {}    # Will track final national positions
                },
                'createdAt': datetime.now().isoformat(),
                'lastUpdated': datetime.now().isoformat()
            }
            
            print(f"✅ Base bracket structure created with required fields")
            
            # CRITICAL: Populate rounds structure from existing matches
            print(f"🎯 Populating bracket structure from {len(matches)} matches...")
            self.organize_matches_in_bracket(bracket, matches)
            
            # Verify rounds were populated
            if not bracket.get('rounds'):
                print(f"❌ Error: bracket rounds structure is empty after organization")
                return {}
            
            rounds_count = sum(len(rounds) for rounds in bracket['rounds'].values())
            if rounds_count == 0:
                print(f"❌ Error: no rounds populated in bracket structure")
                return {}
            
            print(f"✅ Bracket rounds populated: {len(bracket['rounds'])} communities, {rounds_count} total rounds")
            
            # Populate bracketLevels from matches
            communities_found = set()
            for match in matches:
                community_id = match.get('communityId')
                if community_id:
                    communities_found.add(community_id)
                    if community_id not in bracket['bracketLevels']['community']:
                        bracket['bracketLevels']['community'][community_id] = {
                            'communityId': community_id,
                            'status': 'active',
                            'playersCount': 0,  # Will be updated by actual player counting
                            'currentRound': 'R1'
                        }
            
            # Set round status based on what rounds we found
            rounds_found = set()
            for community_rounds in bracket['rounds'].values():
                for round_number in community_rounds.keys():
                    rounds_found.add(round_number)
            
            # Set first round as in_progress, others as pending (including 4-player rounds)
            if rounds_found:
                first_round = min(rounds_found) if rounds_found else 'R1'
                bracket['roundStatus'] = {first_round: 'in_progress'}
                
                # Add all standard rounds including 4-player system
                standard_rounds = ['R1', 'R2', 'R3', 'R4', 'R5', 'Community_SF', 'Community_WF', 'Community_LF', 'Community_Final']
                for round_name in standard_rounds:
                    if round_name != first_round:
                        bracket['roundStatus'][round_name] = 'pending'
                
                # Add any additional rounds found in matches
                for round_name in rounds_found:
                    if round_name not in bracket['roundStatus']:
                        bracket['roundStatus'][round_name] = 'pending'
            
            print(f"✅ Bracket structure created from matches:")
            print(f"   Communities found: {len(communities_found)}")
            print(f"   Rounds found: {list(rounds_found)}")
            print(f"   Rounds map populated: {len(bracket['rounds'])} communities")
            
            return bracket
            
        except Exception as e:
            print(f"❌ Error creating bracket structure from matches: {e}")
            import traceback
            traceback.print_exc()
            return {}
    
    def create_special_bracket_structure_from_matches(self, tournament_id: str, config: Dict, 
                                                    players: List[Dict], rounds_needed: int, 
                                                    matches: List[Dict]) -> Dict:
        """Create special bracket structure from existing matches - ENSURES ROUNDS MAP IS POPULATED"""
        try:
            print(f"🌟 Creating special bracket structure from {len(matches)} EXISTING matches")
            
            # Start with base special bracket structure
            bracket = {
                'tournamentId': tournament_id,
                'hierarchicalLevel': 'special',
                'bracketType': 'special_mixed_elimination',
                'participantScope': {
                    'scope': 'mixed_cross_community',
                    'totalPlayers': len(players),
                    'communityMixingAllowed': True
                },
                'rounds': {},  # Will be populated from matches
                'roundStatus': {},
                'advancementRules': {
                    'type': 'elimination_to_top_3',
                    'winnersAdvance': True,
                    'losersEliminated': True,
                    'finalGoal': 'determine_top_3_positions'
                },
                'specialTournamentConfig': {
                    'playerCount': len(players),
                    'roundsNeeded': rounds_needed,
                    'eliminationTarget': 3,
                    'crossCommunityAllowed': True
                },
                'positions': {
                    'final': {}  # Will track final top 3 positions
                },
                'createdAt': datetime.now().isoformat(),
                'lastUpdated': datetime.now().isoformat()
            }
            
            # CRITICAL: Populate rounds structure from existing matches
            print(f"🎯 Populating special bracket structure from {len(matches)} matches...")
            self.organize_matches_in_bracket(bracket, matches)
            
            # Create round names and set status
            round_names = []
            for i in range(rounds_needed - 1):
                round_names.append(f"R{i + 1}")
            round_names.append("Special_Final")
            
            # Initialize round status - first round in progress, others pending
            bracket['roundStatus'] = {round_names[0]: 'in_progress'}
            for round_name in round_names[1:]:
                bracket['roundStatus'][round_name] = 'pending'
            
            print(f"✅ Special bracket structure created from matches:")
            print(f"   Rounds needed: {rounds_needed}")
            print(f"   Players: {len(players)}")
            print(f"   Rounds map populated: {len(bracket['rounds'])} communities")
            
            return bracket
            
        except Exception as e:
            print(f"❌ Error creating special bracket structure from matches: {e}")
            import traceback
            traceback.print_exc()
            return {}
    
    def create_level_based_bracket_structure(self, tournament_id: str, config: Dict, 
                                           level: str, matches: List[Dict]) -> Dict:
        """Create bracket structure based on tournament level from existing matches"""
        try:
            print(f"🏗️ Creating {level.upper()} bracket structure from {len(matches)} EXISTING matches")
            
            # Start with base bracket structure
            bracket = {
                'tournamentId': tournament_id,
                'hierarchicalLevel': level,
                'bracketType': f'{level}_elimination',
                'participantScope': config.get('participantScope', {}),
                'rounds': {},  # Will be populated from matches
                'roundStatus': {},
                'advancementRules': {
                    'type': 'single_elimination',
                    'winnersAdvance': True,
                    'losersEliminated': True,
                    'positioningRules': {
                        '3_players': 'quarter_final_semi_final',
                        '4_players': 'semi_final_system',
                        'final_positions': [1, 2, 3]
                    }
                },
                'bracketLevels': {
                    'community': {},
                    'county': {},
                    'regional': {},
                    'national': {}
                },
                'createdAt': datetime.now().isoformat(),
                'lastUpdated': datetime.now().isoformat()
            }
            
            # CRITICAL: Populate rounds structure from existing matches
            print(f"🎯 Populating {level} bracket structure from {len(matches)} matches...")
            self.organize_matches_in_bracket(bracket, matches)
            
            # Populate bracketLevels based on tournament level and matches
            if level == 'community':
                # For community level, populate community data
                communities_found = set()
                for match in matches:
                    community_id = match.get('communityId') or match.get('player1CommunityId')
                    if community_id and community_id != 'SPECIAL':
                        communities_found.add(community_id)
                        if community_id not in bracket['bracketLevels']['community']:
                            bracket['bracketLevels']['community'][community_id] = {
                                'communityId': community_id,
                                'status': 'active',
                                'playersCount': 0,  # Will be updated by actual player counting
                                'currentRound': 'R1'
                            }
            
            # Set round status based on what rounds we found
            rounds_found = set()
            for community_rounds in bracket['rounds'].values():
                for round_number in community_rounds.keys():
                    rounds_found.add(round_number)
            
            # Set first round as in_progress, others as pending (including 4-player rounds)  
            if rounds_found:
                first_round = min(rounds_found) if rounds_found else 'R1'
                bracket['roundStatus'] = {first_round: 'in_progress'}
                
                # Add all standard rounds including 4-player system
                standard_rounds = ['R1', 'R2', 'R3', 'R4', 'R5', 'Community_SF', 'Community_WF', 'Community_LF', 'Community_Final']
                for round_name in standard_rounds:
                    if round_name != first_round:
                        bracket['roundStatus'][round_name] = 'pending'
                
                # Add any additional rounds found in matches
                for round_name in rounds_found:
                    if round_name not in bracket['roundStatus']:
                        bracket['roundStatus'][round_name] = 'pending'
            
            print(f"✅ {level.upper()} bracket structure created from matches:")
            print(f"   Level: {level}")
            print(f"   Rounds found: {list(rounds_found)}")
            print(f"   Rounds map populated: {len(bracket['rounds'])} entities")
            
            return bracket
            
        except Exception as e:
            print(f"❌ Error creating {level} bracket structure from matches: {e}")
            import traceback
            traceback.print_exc()
            return {}
    
    # =================== COMMUNITY LEVEL PROGRESSION ===================
    
    def generate_community_next_round(self, tournament_id: str, community_id: str, 
                                    current_round: str) -> Dict:
        """
        COMMUNITY PROGRESSION: Generate next round for specific community
        Called by community admin with: tournamentId, communityId, level="community"
        """
        print(f"🏘️ Generating community next round for {community_id}, current round: {current_round}")
        
        # Auto-detect the actual current round state
        actual_current_round = self.detect_actual_current_round(tournament_id, community_id, current_round)
        print(f"   Current round provided: {current_round}")
        print(f"   Actual current round detected: {actual_current_round}")
        
        # Extract base round from bracket suffixes (R2_WB -> R2)
        base_round = self.extract_base_round(actual_current_round)
        print(f"   Base round extracted: {base_round} from actual_current_round: {actual_current_round}")
        
        # Check if this is a bracket scenario that needs completion
        bracket_status = self.check_bracket_scenario_completion(tournament_id, community_id, base_round)
        
        if bracket_status['action'] == 'create_final':
            # Create final positioning match for bracket scenario
            print(f"🏁 Creating final positioning match for {bracket_status['scenario']} scenario")
            final_matches = self.create_final_positioning_match_from_brackets(
                tournament_id, community_id, base_round, bracket_status['scenario']
            )
            
            if final_matches:
                # Write final match and update bracket
                write_success = self.write_community_round_data(
                    tournament_id, community_id, final_matches[0]['roundNumber'], final_matches
                )
                
                return {
                    'success': write_success,
                    'tournamentId': tournament_id,
                    'communityId': community_id,
                    'roundGenerated': final_matches[0]['roundNumber'],
                    'matchesGenerated': len(final_matches),
                    'action': 'final_positioning_match_created',
                    'scenario': bracket_status['scenario'],
                    'message': 'Final positioning match created. Complete this match to determine positions 2 and 3.'
                }
            else:
                return {'success': False, 'error': 'Failed to create final positioning match'}
        
        elif bracket_status['action'] == 'tournament_complete':
            # Tournament is already complete - return positions
            positions = self.get_tournament_positions(tournament_id, community_id, 'community')
            return {
                'success': True,
                'tournamentId': tournament_id,
                'communityId': community_id,
                'action': 'tournament_complete',
                'message': 'Community tournament is complete. All positions determined.',
                'positions': positions
            }
        
        # Standard round validation and progression
        validation_result = self.validate_round_completion(tournament_id, community_id, base_round, 'community')
        if not validation_result['success']:
            return validation_result
        
        # Get winners from current round for this specific community FIRST
        # Handle bracket scenarios specially for winner collection
        if bracket_status.get('scenario') in ['2match', '3match']:
            # For bracket scenarios, we need to collect winners differently
            current_round_winners = self.get_bracket_scenario_winners(
                tournament_id, community_id, base_round, bracket_status['scenario']
            )
        else:
            # Standard winner collection
            current_round_winners = self.get_community_round_winners(
                tournament_id, community_id, base_round
            )
        
        if len(current_round_winners) < 1:
            return {'error': 'No winners found from current round', 'success': False}
        
        # Determine next round based on number of winners
        next_round = self.get_next_community_round_smart(base_round, len(current_round_winners))
        
        if not next_round:
            return {'error': 'Community tournament completed', 'success': False}
        
        # Generate matches for next round using new 3-player and 4-player logic
        level = 'community'  # This will be generalized when this method is expanded for other levels
        
        if next_round.endswith("_SF"):
            # Starting SF round - determine if 3-player or 4-player scenario
            if len(current_round_winners) == 3:
                print(f"   🎯 Generating 3-player {next_round} (1 match)")
                next_round_matches = self.generate_3_player_sf_matches(
                    tournament_id, community_id, current_round_winners, level
                )
            elif len(current_round_winners) == 4:
                print(f"   🎯 Generating 4-player {next_round} (2 matches)")
                next_round_matches = self.generate_4_player_sf_matches(
                    tournament_id, community_id, current_round_winners, level
                )
            else:
                print(f"   ⚠️ Unexpected player count {len(current_round_winners)} for {next_round}")
                next_round_matches = []
                
        elif next_round.endswith("_WF"):
            # 4-player WF round (2 matches: winners match + losers match)
            print(f"   🎯 Generating 4-player {next_round} (2 matches)")
            next_round_matches = self.generate_4_player_wf_matches(
                tournament_id, community_id, base_round, level
            )
            
        elif next_round.endswith("_Final"):
            # Final round - different logic based on previous round
            if base_round.endswith("_SF"):
                # 3-player scenario: SF winner vs remaining player
                print(f"   🎯 Generating 3-player {next_round} (1 match)")
                next_round_matches = self.generate_3_player_final_matches(
                    tournament_id, community_id, base_round, level
                )
            elif base_round.endswith("_WF"):
                # 4-player scenario: WF loser vs WF losers winner
                print(f"   🎯 Generating 4-player {next_round} (1 match)")
                next_round_matches = self.generate_4_player_final_matches(
                    tournament_id, community_id, base_round, level
                )
            else:
                # Direct final for 2 or fewer players (community level only)
                if level == 'community':
                    print(f"   🎯 Generating direct {next_round} for {len(current_round_winners)} players")
                    next_round_matches = self.generate_direct_final_matches(
                        tournament_id, community_id, current_round_winners, level
                    )
                else:
                    print(f"   ❌ Direct finals not supported for {level} level")
                    next_round_matches = []
        else:
            # Standard round progression
            next_round_matches = self.generate_community_round_matches(
                tournament_id, community_id, next_round, current_round_winners
            )
        
        # Write new matches and update bracket
        # Use the actual round name from the generated matches instead of the generic next_round
        if next_round_matches:
            actual_round_name = next_round_matches[0].get('roundNumber', next_round)
            write_success = self.write_community_round_data(tournament_id, community_id, actual_round_name, next_round_matches)
        else:
            write_success = self.write_community_round_data(tournament_id, community_id, next_round, next_round_matches)
        
        # Check if this is Community_Final and if it's complete (only 3 positioning matches)
        is_final_complete = False
        if next_round == "Community_Final" and len(current_round_winners) <= 4:
            # For 3 or 4 players, we generate positioning matches that determine final positions
            is_final_complete = True
            print(f"   🏁 Community {community_id} tournament structure complete - positioning matches created")
        
        # Use the actual round name for response
        response_round_name = actual_round_name if next_round_matches else next_round
        
        return {
            'success': write_success,
            'tournamentId': tournament_id,
            'communityId': community_id,
            'roundGenerated': response_round_name,
            'matchesGenerated': len(next_round_matches),
            'playersAdvancing': len(current_round_winners),
            'isCommunityFinal': next_round == "Community_Final",
            'communityComplete': is_final_complete
        }
    
    def generate_community_round_matches(self, tournament_id: str, community_id: str,
                                       round_number: str, players: List[Dict]) -> List[Dict]:
        """Generate matches for community round ensuring no cross-community pairs"""
        print(f"      🎯 Generating {round_number} matches for community {community_id}")
        print(f"         Players available: {len(players)}")
        
        matches = []
        available_players = players.copy()
        random.shuffle(available_players)  # Random pairing within community
        
        match_number = 1
        while len(available_players) >= 2:
            player1 = available_players.pop(0)
            player2 = available_players.pop(0)
            
            # Create predictable match ID: {round}_{level}_{community}_{match_number}
            match_id = f"{round_number}_COMM_{community_id}_match_{match_number}"
            
            # Create comprehensive match structure
            match = self.create_comprehensive_match(
                match_id, tournament_id, round_number, community_id, match_number,
                player1, player2, 'community'
            )
            
            matches.append(match)
            print(f"         Match {match_number}: {player1['name']} vs {player2['name']} (ID: {match_id})")
            match_number += 1
        
        # Handle odd player - different logic for R1 vs subsequent rounds
        if available_players:
            odd_player = available_players[0]
            
            if round_number == "R1" and len(players) > 3:
                # For first round with more than 3 players: random player plays twice
                print(f"         ⚠️ Odd number in R1: {odd_player['name']} needs pairing")
                
                # Select a random player from the already paired players to play again
                paired_players = [p for p in players if p['id'] != odd_player['id']]
                if paired_players:
                    double_duty_player = random.choice(paired_players)
                    
                    # Create additional match
                    match_id = f"{round_number}_COMM_{community_id}_match_{match_number}"
                    extra_match = self.create_comprehensive_match(
                        match_id, tournament_id, round_number, community_id, match_number,
                        odd_player, double_duty_player, 'community'
                    )
                    
                    # Mark that one player is playing twice
                    extra_match['notes'] = f"{double_duty_player['name']} playing twice to handle odd number"
                    extra_match['specialMatch'] = True
                    
                    matches.append(extra_match)
                    print(f"         Extra Match {match_number}: {odd_player['name']} vs {double_duty_player['name']} (playing twice)")
            else:
                # For subsequent rounds or small groups: give bye
                bye_match = self.create_bye_match(tournament_id, community_id, round_number, odd_player, match_number)
                matches.append(bye_match)
                print(f"         Bye Match: {odd_player['name']} gets automatic advancement (ID: {bye_match['id']})")
        
        print(f"         Total matches created: {len(matches)}")
        return matches
    
    def create_comprehensive_match(self, match_id: str, tournament_id: str, round_number: str, 
                                 community_id: str, match_number: int, player1: Dict, player2: Dict, 
                                 level: str) -> Dict:
        """Create match structure with required fields"""
        
        # Create searchable text for easy searching
        searchable_text = f"{player1['name']} {player2['name']} {tournament_id} {community_id} {level}"
        
        return {
            # Core match identification
            'id': match_id,
            'tournamentId': tournament_id,
            'matchNumber': match_number,
            
            # Tournament structure
            'roundNumber': round_number,
            'tournamentLevel': level,
            'communityId': community_id if level == 'community' else None,
            'countyId': None,  # Will be set for county level
            'regionId': None,  # Will be set for regional level
            
            # Player 1 details
            'player1Id': player1['id'],
            'player1Name': player1['name'],
            'player1CommunityId': player1.get('communityId', community_id),
            'player1Points': 0,  # Key field for determining winners
            
            # Player 2 details
            'player2Id': player2['id'],
            'player2Name': player2['name'],
            'player2CommunityId': player2.get('communityId', community_id),
            'player2Points': 0,  # Key field for determining winners
            
            # Match results - to be filled by admin
            'status': 'scheduled',  # scheduled, live, completed, cancelled, disputed
            'winnerId': None,
            'winnerName': None,
            'loserId': None,
            'loserName': None,
            'resultSubmittedAt': None,
            'resultSubmittedBy': None,
            
            # Timing
            'scheduledDate': None,  # Single day suggestion (to be set by scheduling algorithm)
            'scheduledDateTime': None,  # To be set by admin
            'actualStartTime': None,
            'actualEndTime': None,
            'timeZone': 'Africa/Nairobi',
            
            # Venue and logistics
            'venueId': None,
            'venueName': None,
            'venueAddress': None,
            'tableNumber': None,
            
            # Officials and breaks
            'maximumBreaks': None,  # To be set by admin
            'adminNotes': None,
            
            # Searchable text
            'searchableText': searchable_text,
            
            # Special flags
            'isByeMatch': False,
            'disputeReason': None,
            
            # Algorithm metadata (for tournament progression)
            'isLevelFinal': round_number.endswith("_Final"),
            'geographicalSeparation': False if level == 'community' else True,
            'positionBasedMatching': False if level == 'community' else True,
            'determinesTop3': round_number.endswith("_Final"),
            
            # System fields
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
            'createdBy': 'algorithm_system'
        }
    
    def create_bye_match(self, tournament_id: str, community_id: str, 
                        round_number: str, bye_player: Dict, match_number: int) -> Dict:
        """Create comprehensive bye match for odd player"""
        match_id = f"{round_number}_COMM_{community_id}_bye_{match_number}"
        
        # Create a bye "opponent"
        bye_opponent = {
            'id': 'BYE',
            'name': 'BYE',
            'communityId': community_id,
            'avatar': None
        }
        
        # Create comprehensive bye match using the same structure
        bye_match = self.create_comprehensive_match(
            match_id, tournament_id, round_number, community_id, match_number,
            bye_player, bye_opponent, 'community'
        )
        
        # Override specific fields for bye match
        bye_match.update({
            'isByeMatch': True,
            'status': 'completed',
            'winnerId': bye_player['id'],
            'winnerName': bye_player['name'],
            'loserId': 'BYE',
            'loserName': 'BYE',
            'player1Points': 3,  # Automatic win points
            'player2Points': 0,
            'resultSubmittedAt': datetime.now().isoformat(),
            'resultSubmittedBy': 'algorithm_system',
            'actualStartTime': datetime.now().isoformat(),
            'actualEndTime': datetime.now().isoformat(),
            'adminNotes': 'Automatic advancement due to odd number of players',
            'searchableText': f"{bye_player['name']} BYE advancement {tournament_id}"
        })
        
        return bye_match
    
    # =================== NEW 3-PLAYER AND 4-PLAYER MATCH GENERATION ===================
    
    def get_level_prefix(self, level: str) -> str:
        """Get prefix for match IDs based on tournament level"""
        level_prefixes = {
            'community': 'COMM',
            'county': 'CNTY', 
            'regional': 'REGL',
            'national': 'NATL',
            'special': 'SPCL'
        }
        return level_prefixes.get(level, 'COMM')
    
    def generate_3_player_sf_matches(self, tournament_id: str, entity_id: str, players: List[Dict], level: str = 'community') -> List[Dict]:
        """Generate 3-player scenario Semi-Final (1 match: A vs B, C waits) for any level"""
        print(f"      🎯 Generating 3-player {level.capitalize()}_SF: 1 match, 1 player waits")
        
        if len(players) != 3:
            print(f"      ❌ Expected 3 players, got {len(players)}")
            return []
        
        # Randomly select 2 players for the match, 1 waits
        import random
        shuffled_players = players.copy()
        random.shuffle(shuffled_players)
        
        player1 = shuffled_players[0]
        player2 = shuffled_players[1]
        waiting_player = shuffled_players[2]
        
        print(f"      📋 Match: {player1['name']} vs {player2['name']}")
        print(f"      ⏳ Waiting for final: {waiting_player['name']}")
        
        # Create level-specific round name and match ID
        round_name = f"{level.capitalize()}_SF"
        level_prefix = self.get_level_prefix(level)
        match_id = f"{round_name}_{level_prefix}_{entity_id}_match_1"
        
        sf_match = self.create_comprehensive_match(
            match_id, tournament_id, round_name, entity_id, 1,
            player1, player2, level
        )
        
        # Add special notes for 3-player scenario
        sf_match.update({
            'matchType': '3player_sf',
            'waitingPlayerId': waiting_player['id'],
            'waitingPlayerName': waiting_player['name'],
            'adminNotes': f"3-player {level.capitalize()}_SF: Winner gets Position 1, Loser plays {waiting_player['name']} in Final"
        })
        
        return [sf_match]
    
    def generate_4_player_sf_matches(self, tournament_id: str, entity_id: str, players: List[Dict], level: str = 'community') -> List[Dict]:
        """Generate 4-player scenario Semi-Finals (2 matches: A vs B, C vs D) for any level"""
        print(f"      🎯 Generating 4-player {level.capitalize()}_SF: 2 matches")
        
        if len(players) != 4:
            print(f"      ❌ Expected 4 players, got {len(players)}")
            return []
        
        # Randomly pair players
        import random
        shuffled_players = players.copy()
        random.shuffle(shuffled_players)
        
        # Create level-specific round name and prefix
        round_name = f"{level.capitalize()}_SF"
        level_prefix = self.get_level_prefix(level)
        
        # Create two matches
        matches = []
        
        # Match 1: Player A vs Player B
        match1_id = f"{round_name}_{level_prefix}_{entity_id}_match_1"
        match1 = self.create_comprehensive_match(
            match1_id, tournament_id, round_name, entity_id, 1,
            shuffled_players[0], shuffled_players[1], level
        )
        match1.update({
            'matchType': '4player_sf',
            'adminNotes': f"4-player {level.capitalize()}_SF Match 1: Winner advances to WF Winners, Loser to WF Losers"
        })
        
        # Match 2: Player C vs Player D  
        match2_id = f"{round_name}_{level_prefix}_{entity_id}_match_2"
        match2 = self.create_comprehensive_match(
            match2_id, tournament_id, round_name, entity_id, 2,
            shuffled_players[2], shuffled_players[3], level
        )
        match2.update({
            'matchType': '4player_sf',
            'adminNotes': f"4-player {level.capitalize()}_SF Match 2: Winner advances to WF Winners, Loser to WF Losers"
        })
        
        matches.extend([match1, match2])
        
        print(f"      📋 SF Match 1: {shuffled_players[0]['name']} vs {shuffled_players[1]['name']}")
        print(f"      📋 SF Match 2: {shuffled_players[2]['name']} vs {shuffled_players[3]['name']}")
        
        return matches
    
    def generate_4_player_wf_matches(self, tournament_id: str, entity_id: str, previous_round: str, level: str = 'community') -> List[Dict]:
        """Generate 4-player Winners Final (2 matches: Winners match + Losers match) for any level"""
        print(f"      🎯 Generating 4-player {level.capitalize()}_WF: Winners match + Losers match")
        
        # Get SF matches to determine winners and losers
        sf_round_name = f"{level.capitalize()}_SF"
        sf_matches = self.get_round_matches(tournament_id, entity_id, sf_round_name)
        
        if len(sf_matches) != 2:
            print(f"      ❌ Expected 2 SF matches, got {len(sf_matches)}")
            return []
        
        # Collect winners and losers from SF
        winners = []
        losers = []
        
        for match in sf_matches:
            if match.get('status') != 'completed':
                print(f"      ❌ SF match {match['id']} not completed")
                return []
            
            # Determine winner based on points
            player1_points = match.get('player1Points', 0)
            player2_points = match.get('player2Points', 0)
            
            if player1_points > player2_points:
                winners.append({
                    'id': match['player1Id'],
                    'name': match['player1Name'],
                    'communityId': match['player1CommunityId']
                })
                losers.append({
                    'id': match['player2Id'],
                    'name': match['player2Name'],
                    'communityId': match['player2CommunityId']
                })
            else:
                winners.append({
                    'id': match['player2Id'],
                    'name': match['player2Name'],
                    'communityId': match['player2CommunityId']
                })
                losers.append({
                    'id': match['player1Id'],
                    'name': match['player1Name'],
                    'communityId': match['player1CommunityId']
                })
        
        if len(winners) != 2 or len(losers) != 2:
            print(f"      ❌ Expected 2 winners and 2 losers, got {len(winners)} winners, {len(losers)} losers")
            return []
        
        matches = []
        
        # Create level-specific round name and prefix
        wf_round_name = f"{level.capitalize()}_WF"
        level_prefix = self.get_level_prefix(level)
        
        # Winners Match (determines Position 1)
        winners_match_id = f"{wf_round_name}_{level_prefix}_{entity_id}_winners"
        winners_match = self.create_comprehensive_match(
            winners_match_id, tournament_id, wf_round_name, entity_id, 1,
            winners[0], winners[1], level
        )
        winners_match.update({
            'matchType': '4player_wf_winners',
            'adminNotes': f"{level.capitalize()}_WF Winners Match: Winner gets Position 1, Loser plays in Final for Position 2"
        })
        
        # Losers Match (winner goes to Final)
        losers_match_id = f"{wf_round_name}_{level_prefix}_{entity_id}_losers"
        losers_match = self.create_comprehensive_match(
            losers_match_id, tournament_id, wf_round_name, entity_id, 2,
            losers[0], losers[1], level
        )
        losers_match.update({
            'matchType': '4player_wf_losers',
            'adminNotes': f"{level.capitalize()}_WF Losers Match: Winner advances to Final, Loser gets Position 3"
        })
        
        matches.extend([winners_match, losers_match])
        
        print(f"      📋 WF Winners: {winners[0]['name']} vs {winners[1]['name']} (Winner = Position 1)")
        print(f"      📋 WF Losers: {losers[0]['name']} vs {losers[1]['name']} (Winner to Final)")
        
        return matches
    
    def generate_3_player_final_matches(self, tournament_id: str, entity_id: str, previous_round: str, level: str = 'community') -> List[Dict]:
        """Generate 3-player Final (SF loser vs waiting player) for any level"""
        print(f"      🎯 Generating 3-player {level.capitalize()}_Final: SF loser vs waiting player")
        
        # Get SF match to determine loser  
        sf_round_name = f"{level.capitalize()}_SF"
        sf_matches = self.get_round_matches(tournament_id, entity_id, sf_round_name)
        
        if len(sf_matches) != 1:
            print(f"      ❌ Expected 1 SF match, got {len(sf_matches)}")
            return []
        
        sf_match = sf_matches[0]
        
        if sf_match.get('status') != 'completed':
            print(f"      ❌ SF match not completed")
            return []
        
        # Get SF loser
        player1_points = sf_match.get('player1Points', 0)
        player2_points = sf_match.get('player2Points', 0)
        
        if player1_points > player2_points:
            sf_loser = {
                'id': sf_match['player2Id'],
                'name': sf_match['player2Name'],
                'communityId': sf_match['player2CommunityId']
            }
        else:
            sf_loser = {
                'id': sf_match['player1Id'],
                'name': sf_match['player1Name'],
                'communityId': sf_match['player1CommunityId']
            }
        
        # Get waiting player
        waiting_player = {
            'id': sf_match.get('waitingPlayerId'),
            'name': sf_match.get('waitingPlayerName'),
            'communityId': entity_id  # Use entity_id for any level
        }
        
        if not waiting_player['id']:
            print(f"      ❌ No waiting player found in SF match")
            return []
        
        # Create level-specific final match
        final_round_name = f"{level.capitalize()}_Final"
        level_prefix = self.get_level_prefix(level)
        final_match_id = f"{final_round_name}_{level_prefix}_{entity_id}_match_1"
        final_match = self.create_comprehensive_match(
            final_match_id, tournament_id, final_round_name, entity_id, 1,
            sf_loser, waiting_player, level
        )
        final_match.update({
            'matchType': '3player_final',
            'adminNotes': f"3-player {level.capitalize()}_Final: Winner gets Position 2, Loser gets Position 3"
        })
        
        print(f"      📋 {level.capitalize()}_Final: {sf_loser['name']} vs {waiting_player['name']} (Winner = Position 2)")
        
        return [final_match]
    
    def generate_4_player_final_matches(self, tournament_id: str, entity_id: str, previous_round: str, level: str = 'community') -> List[Dict]:
        """Generate 4-player Final (WF Winners loser vs WF Losers winner) for any level"""
        print(f"      🎯 Generating 4-player {level.capitalize()}_Final: WF Winners loser vs WF Losers winner")
        
        # Get WF matches
        wf_round_name = f"{level.capitalize()}_WF"
        wf_matches = self.get_round_matches(tournament_id, entity_id, wf_round_name)
        
        if len(wf_matches) != 2:
            print(f"      ❌ Expected 2 WF matches, got {len(wf_matches)}")
            return []
        
        winners_match = None
        losers_match = None
        
        for match in wf_matches:
            if match.get('matchType') == '4player_wf_winners':
                winners_match = match
            elif match.get('matchType') == '4player_wf_losers':
                losers_match = match
        
        if not winners_match or not losers_match:
            print(f"      ❌ Could not find WF winners and losers matches")
            return []
        
        if winners_match.get('status') != 'completed' or losers_match.get('status') != 'completed':
            print(f"      ❌ WF matches not completed")
            return []
        
        # Get WF Winners loser (Position 2 candidate)
        player1_points = winners_match.get('player1Points', 0)
        player2_points = winners_match.get('player2Points', 0)
        
        if player1_points > player2_points:
            wf_winners_loser = {
                'id': winners_match['player2Id'],
                'name': winners_match['player2Name'],
                'communityId': winners_match['player2CommunityId']
            }
        else:
            wf_winners_loser = {
                'id': winners_match['player1Id'],
                'name': winners_match['player1Name'],
                'communityId': winners_match['player1CommunityId']
            }
        
        # Get WF Losers winner (Position 2 candidate)
        player1_points = losers_match.get('player1Points', 0)
        player2_points = losers_match.get('player2Points', 0)
        
        if player1_points > player2_points:
            wf_losers_winner = {
                'id': losers_match['player1Id'],
                'name': losers_match['player1Name'],
                'communityId': losers_match['player1CommunityId']
            }
        else:
            wf_losers_winner = {
                'id': losers_match['player2Id'],
                'name': losers_match['player2Name'],
                'communityId': losers_match['player2CommunityId']
            }
        
        # Create level-specific final match
        final_round_name = f"{level.capitalize()}_Final"
        level_prefix = self.get_level_prefix(level)
        final_match_id = f"{final_round_name}_{level_prefix}_{entity_id}_match_1"
        final_match = self.create_comprehensive_match(
            final_match_id, tournament_id, final_round_name, entity_id, 1,
            wf_winners_loser, wf_losers_winner, level
        )
        final_match.update({
            'matchType': '4player_final',
            'adminNotes': f"4-player {level.capitalize()}_Final: Winner gets Position 2, Loser gets Position 3"
        })
        
        print(f"      📋 {level.capitalize()}_Final: {wf_winners_loser['name']} vs {wf_losers_winner['name']} (Winner = Position 2)")
        
        return [final_match]
    
    def generate_direct_final_matches(self, tournament_id: str, entity_id: str, players: List[Dict], level: str = 'community') -> List[Dict]:
        """Generate direct final for 2 or fewer players for any level"""
        print(f"      🎯 Generating direct {level.capitalize()}_Final for {len(players)} players")
        
        if len(players) == 0:
            print(f"      ❌ No players for final")
            return []
        
        if len(players) == 1:
            # Single player auto-advances
            print(f"      ✅ Single player {players[0]['name']} auto-advances to Position 1")
            return []
        
        if len(players) == 2:
            # Direct final between 2 players
            final_round_name = f"{level.capitalize()}_Final"
            level_prefix = self.get_level_prefix(level)
            final_match_id = f"{final_round_name}_{level_prefix}_{entity_id}_match_1"
            final_match = self.create_comprehensive_match(
                final_match_id, tournament_id, final_round_name, entity_id, 1,
                players[0], players[1], level
            )
            final_match.update({
                'matchType': '2player_final',
                'adminNotes': f"Direct {level.capitalize()}_Final: Winner gets Position 1, Loser gets Position 2"
            })
            
            print(f"      📋 Direct {level.capitalize()}_Final: {players[0]['name']} vs {players[1]['name']}")
            return [final_match]
        
        print(f"      ❌ Unexpected player count for direct final: {len(players)}")
        return []
    
    # =================== BRACKET AND DATA WRITING METHODS ===================
    
    def write_tournament_initialization_data(self, tournament_id: str, bracket: Dict, matches: List[Dict]) -> bool:
        """Write tournament initialization data to Firebase or JSON"""
        try:
            print(f"🔄 Starting tournament initialization data write for tournament: {tournament_id}")
            
            # Validate inputs
            if not tournament_id:
                print(f"❌ Error: tournament_id is required")
                return False
            
            if not bracket:
                print(f"❌ Error: bracket structure is required")
                return False
            
            if not matches:
                print(f"❌ Error: matches list is required")
                return False
            
            # Verify bracket has required structure
            if not bracket.get('rounds'):
                print(f"❌ Error: bracket missing rounds structure")
                return False
            
            print(f"✅ Input validation passed for tournament initialization")
            print(f"   Tournament ID: {tournament_id}")
            print(f"   Bracket communities: {len(bracket.get('rounds', {}))}")
            print(f"   Matches count: {len(matches)}")
            
            # First organize matches by community and round for bracket structure
            print(f"🔄 Organizing matches in bracket structure...")
            self.organize_matches_in_bracket(bracket, matches)
            
            # Verify organization was successful
            rounds_count = sum(len(rounds) for rounds in bracket['rounds'].values())
            if rounds_count == 0:
                print(f"❌ Error: no rounds found in bracket after organization")
                return False
            
            print(f"✅ Matches organized successfully: {rounds_count} rounds in bracket")
            
            # Write to Firebase database
            print(f"🔥 Writing to Firebase database")
            return self.write_initialization_to_firebase(tournament_id, bracket, matches)
                
        except Exception as e:
            print(f"❌ Error writing tournament initialization data: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def write_initialization_to_firebase(self, tournament_id: str, bracket: Dict, matches: List[Dict]) -> bool:
        """Write initialization data to Firebase"""
        try:
            print(f"\n💾 Writing initialization data to Firebase...")
            
            # Validate inputs before writing
            if not tournament_id:
                print(f"❌ Error: tournament_id is required")
                return False
            
            if not bracket:
                print(f"❌ Error: bracket structure is empty")
                return False
            
            if not matches:
                print(f"❌ Error: no matches to write")
                return False
            
            # Validate bracket structure
            required_bracket_fields = ['tournamentId', 'rounds', 'bracketLevels']
            for field in required_bracket_fields:
                if field not in bracket:
                    print(f"❌ Error: bracket missing required field: {field}")
                    return False
            
            print(f"✅ Input validation passed:")
            print(f"   Tournament ID: {tournament_id}")
            print(f"   Bracket fields: {list(bracket.keys())}")
            print(f"   Matches count: {len(matches)}")
            print(f"   Bracket rounds: {list(bracket.get('rounds', {}).keys())}")
            
            # Write bracket structure to tournament_brackets collection
            print(f"🔄 Writing bracket to tournament_brackets/{tournament_id}...")
            bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
            bracket_ref.set(bracket)
            print(f"✅ Bracket structure written successfully")
            
            # Write matches to tournaments/{tournament_id}/matches subcollection
            print(f"🔄 Writing matches to tournaments/{tournament_id}/matches subcollection...")
            matches_collection = self.db.collection('tournaments').document(tournament_id).collection('matches')
            
            # Write each match as a separate document in the subcollection
            for match in matches:
                match_id = match['id']
                match_ref = matches_collection.document(match_id)
                match_ref.set(match)
                print(f"   ✅ Written match: {match_id}")
            
            print(f"✅ All {len(matches)} matches written to subcollection successfully")
            
            # Verify the write was successful by reading back
            print(f"🔍 Verifying tournament bracket was created...")
            bracket_verification = bracket_ref.get()
            if bracket_verification.exists:
                print(f"✅ Tournament bracket verified in database")
            else:
                print(f"❌ Tournament bracket not found in database after write")
                return False
            
            print(f"✅ Successfully written to Firebase:")
            print(f"   📊 Bracket structure: tournament_brackets/{tournament_id}")
            print(f"   🎯 {len(matches)} matches: tournaments/{tournament_id}/matches subcollection")
            
            return True
            
        except Exception as e:
            print(f"❌ Error writing to Firebase: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    
    def write_community_round_data(self, tournament_id: str, community_id: str, round_number: str, matches: List[Dict]) -> bool:
        """Write new round data to Firebase"""
        try:
            return self.write_community_round_to_firebase(tournament_id, community_id, round_number, matches)
        except Exception as e:
            print(f"❌ Error writing community round data: {e}")
            return False
    
    def write_community_round_to_firebase(self, tournament_id: str, community_id: str, round_number: str, matches: List[Dict]) -> bool:
        """Write community round to Firebase"""
        try:
            print(f"💾 Writing {round_number} data to Firebase for community {community_id}...")
            
            # Write matches to tournaments/{tournament_id}/matches subcollection
            matches_collection = self.db.collection('tournaments').document(tournament_id).collection('matches')
            
            # Write/update each match as a separate document in the subcollection
            for match in matches:
                match_id = match['id']
                match_ref = matches_collection.document(match_id)
                match_ref.set(match)
                print(f"   ✅ Written/updated match: {match_id}")
            
            # Update bracket structure properly organized by community
            self.update_community_bracket_structure(tournament_id, community_id, round_number, matches, 'firebase', 'community')
            
            print(f"✅ Successfully written {len(matches)} {round_number} matches to tournaments/{tournament_id}/matches subcollection")
            return True
            
        except Exception as e:
            print(f"❌ Error writing community round to Firebase: {e}")
            return False
    
    def write_community_round_to_json(self, tournament_id: str, community_id: str, round_number: str, matches: List[Dict]) -> bool:
        """Write community round to JSON files for testing"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Write new matches
            round_filename = f"community_round_{community_id}_{round_number}_{timestamp}.json"
            with open(round_filename, 'w', encoding='utf-8') as f:
                json.dump({
                    'tournamentId': tournament_id,
                    'communityId': community_id,
                    'roundNumber': round_number,
                    'matches': matches,
                    'createdAt': datetime.now().isoformat()
                }, f, indent=2, ensure_ascii=False, default=str)
            
            # Update bracket structure in JSON file
            self.update_community_bracket_structure(tournament_id, community_id, round_number, matches, 'json', 'community')
            
            print(f"💾 TESTING MODE - {round_number} data written to: {round_filename}")
            return True
            
        except Exception as e:
            print(f"❌ Error writing community round to JSON: {e}")
            return False
    
    # =================== BRACKET STRUCTURE MANAGEMENT ===================
    
    def organize_matches_in_bracket(self, bracket: Dict, matches: List[Dict]):
        """Organize matches in bracket structure: rounds -> level -> geographical_id -> round_names -> [match_ids]"""
        try:
            print(f"🏗️ Organizing {len(matches)} matches in bracket structure with level hierarchy...")
            
            # Ensure rounds structure exists with all levels
            if 'rounds' not in bracket:
                bracket['rounds'] = {
                    'community': {},
                    'county': {},
                    'regional': {},
                    'national': {}
                }
            
            # Ensure all level sections exist
            for level in ['community', 'county', 'regional', 'national']:
                if level not in bracket['rounds']:
                    bracket['rounds'][level] = {}
            
            matches_added = 0
            matches_skipped = 0
            
            # Organize matches by level first, then geographical unit, then round
            for i, match in enumerate(matches):
                match_id = match.get('id')
                round_number = match.get('roundNumber')
                tournament_level = match.get('tournamentLevel', 'community')  # Default to community
                is_special_tournament = match.get('specialTournament', False)
                
                # Debug output for each match
                print(f"   Processing match {i+1}/{len(matches)}: {match_id}")
                print(f"     tournamentLevel: '{tournament_level}', roundNumber: '{round_number}', special: {is_special_tournament}")
                
                # Determine geographical unit based on tournament level
                geographical_id = None
                if tournament_level == 'community':
                    geographical_id = match.get('communityId')
                    # Handle None communityId
                    if geographical_id is None:
                        if is_special_tournament:
                            geographical_id = 'SPECIAL'
                            print(f"     Special tournament - using geographical_id: {geographical_id}")
                        else:
                            # Extract from player data
                            player1_community = match.get('player1CommunityId')
                            player2_community = match.get('player2CommunityId')
                            
                            if player1_community and player2_community and player1_community == player2_community:
                                geographical_id = player1_community
                                print(f"     Extracted geographical_id: {geographical_id}")
                            elif player1_community:
                                geographical_id = player1_community
                                print(f"     Using player1 geographical_id: {geographical_id}")
                            else:
                                print(f"     ❌ Cannot determine community for match")
                                matches_skipped += 1
                                continue
                elif tournament_level == 'county':
                    geographical_id = match.get('countyId')
                elif tournament_level == 'regional':
                    geographical_id = match.get('regionId')
                elif tournament_level == 'national':
                    geographical_id = 'national'  # Single national entity
                else:
                    print(f"     ❌ Unknown tournament level: {tournament_level}")
                    matches_skipped += 1
                    continue
                
                if geographical_id and round_number and match_id and tournament_level:
                    # Ensure level exists in rounds
                    if tournament_level not in bracket['rounds']:
                        bracket['rounds'][tournament_level] = {}
                        print(f"     Created level section: {tournament_level}")
                    
                    # Ensure geographical unit exists in this level
                    if geographical_id not in bracket['rounds'][tournament_level]:
                        bracket['rounds'][tournament_level][geographical_id] = {}
                        print(f"     Created geographical section: {tournament_level}/{geographical_id}")
                    
                    # Ensure round exists in this geographical unit
                    if round_number not in bracket['rounds'][tournament_level][geographical_id]:
                        bracket['rounds'][tournament_level][geographical_id][round_number] = []
                        print(f"     Created round section: {tournament_level}/{geographical_id}/{round_number}")
                    
                    # Add match ID to the list
                    if match_id not in bracket['rounds'][tournament_level][geographical_id][round_number]:
                        bracket['rounds'][tournament_level][geographical_id][round_number].append(match_id)
                        print(f"     ✅ Added {match_id} to rounds/{tournament_level}/{geographical_id}/{round_number}")
                        matches_added += 1
                    else:
                        print(f"     ⚠️ Match {match_id} already exists in rounds/{tournament_level}/{geographical_id}/{round_number}")
                else:
                    print(f"     ❌ Skipping match - missing required fields:")
                    print(f"        level: {tournament_level}, geographical_id: {geographical_id}, roundNumber: {round_number}, id: {match_id}")
                    matches_skipped += 1
            
            # Log the hierarchical structure for verification
            print(f"✅ Matches organized in bracket structure: {matches_added} added, {matches_skipped} skipped")
            print(f"📊 Final rounds structure with level hierarchy:")
            for level, geographical_units in bracket['rounds'].items():
                if geographical_units:  # Only show levels that have data
                    print(f"   📍 Level: {level}")
                    for geographical_id, rounds in geographical_units.items():
                        for round_number, match_ids in rounds.items():
                            print(f"      {geographical_id}/{round_number}: {len(match_ids)} matches {match_ids}")
            
            # Also populate positions structure for easy access
            if 'positions' not in bracket:
                bracket['positions'] = {
                    'community': {},
                    'county': {},
                    'regional': {},
                    'national': {}
                }
            
            # Initialize position tracking for each geographical unit that has rounds
            for level, geographical_units in bracket['rounds'].items():
                if level not in bracket['positions']:
                    bracket['positions'][level] = {}
                for geographical_id in geographical_units.keys():
                    if geographical_id not in bracket['positions'][level]:
                        bracket['positions'][level][geographical_id] = {}
                        print(f"     Initialized positions tracking: {level}/{geographical_id}")
            
            # Safety check - ensure we have some matches in rounds
            if matches_added == 0 and len(matches) > 0:
                print(f"⚠️ WARNING: No matches were added to rounds map despite having {len(matches)} matches!")
                
        except Exception as e:
            print(f"❌ Error organizing matches in bracket: {e}")
            import traceback
            traceback.print_exc()
    
    def update_community_bracket_structure(self, tournament_id: str, community_id: str, 
                                         round_number: str, matches: List[Dict], mode: str, level: str = 'community'):
        """Update community bracket structure with new round matches with level hierarchy"""
        try:
            print(f"🔄 Updating bracket structure for {level}/{community_id} {round_number}...")
            
            match_ids = [match['id'] for match in matches]
            
            if mode == 'firebase':
                self.update_bracket_firebase(tournament_id, community_id, round_number, match_ids, level)
            elif mode == 'json':
                self.update_bracket_json(tournament_id, community_id, round_number, match_ids, level)
            
        except Exception as e:
            print(f"❌ Error updating community bracket structure: {e}")
    
    def update_bracket_firebase(self, tournament_id: str, community_id: str, 
                              round_number: str, match_ids: List[str], level: str = 'community'):
        """Update bracket structure in Firebase using rounds -> level -> geographical_id -> round -> [match_ids]"""
        try:
            bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
            
            # Update using the new level hierarchy: level -> geographical_id -> round -> match_ids
            update_path = f'rounds.{level}.{community_id}.{round_number}'
            bracket_ref.update({
                update_path: match_ids,
                'lastUpdated': firestore.SERVER_TIMESTAMP
            })
            
            # Initialize or update position holders for this community
            self.update_community_position_holders(tournament_id, community_id, round_number, level)
            
            print(f"✅ Firebase bracket updated: rounds/{level}/{community_id}/{round_number} with {len(match_ids)} matches")
                
        except Exception as e:
            print(f"❌ Error updating Firebase bracket: {e}")
    
    def update_bracket_json(self, tournament_id: str, community_id: str, 
                          round_number: str, match_ids: List[str], level: str = 'community'):
        """Update bracket structure in JSON file using rounds -> level -> geographical_id -> round -> [match_ids]"""
        try:
            # Find the latest bracket file
            bracket_files = [f for f in os.listdir('.') if f.startswith(f'tournament_brackets_{tournament_id}')]
            if not bracket_files:
                print(f"❌ No bracket file found for {tournament_id}")
                return
            
            # Sort by modification time to get the latest
            bracket_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            bracket_file = bracket_files[0]
            
            # Read current bracket
            with open(bracket_file, 'r', encoding='utf-8') as f:
                bracket_data = json.load(f)
            
            # Ensure rounds structure exists with level hierarchy
            if 'rounds' not in bracket_data:
                bracket_data['rounds'] = {
                    'community': {},
                    'county': {},
                    'regional': {},
                    'national': {}
                }
            
            # Ensure level exists in rounds
            if level not in bracket_data['rounds']:
                bracket_data['rounds'][level] = {}
            
            # Ensure geographical unit exists in this level
            if community_id not in bracket_data['rounds'][level]:
                bracket_data['rounds'][level][community_id] = {}
            
            # Update round matches for this geographical unit using new hierarchy
            bracket_data['rounds'][level][community_id][round_number] = match_ids
            
            # Update last modified timestamp
            bracket_data['lastUpdated'] = datetime.now().isoformat()
            
            # Also update current round in bracket level for tracking
            if level in bracket_data.get('bracketLevels', {}) and community_id in bracket_data['bracketLevels'][level]:
                bracket_data['bracketLevels'][level][community_id]['currentRound'] = round_number
            
            # Write updated bracket
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            new_bracket_file = f"tournament_brackets_{tournament_id}_{timestamp}.json"
            
            with open(new_bracket_file, 'w', encoding='utf-8') as f:
                json.dump(bracket_data, f, indent=2, ensure_ascii=False, default=str)
            
            print(f"✅ JSON bracket updated: rounds/{level}/{community_id}/{round_number} with {len(match_ids)} matches")
            print(f"   New bracket file: {new_bracket_file}")
            
        except Exception as e:
            print(f"❌ Error updating JSON bracket: {e}")
    
    # =================== VALIDATION AND DATA RETRIEVAL METHODS ===================
    
    def validate_round_completion(self, tournament_id: str, entity_id: str, round_number: str, level: str) -> Dict:
        """Validate that all matches in a round are completed before generating next round"""
        try:
            print(f"🔍 Validating {round_number} completion for {level} {entity_id}")
            
            # Check match completion from Firebase database
            
            # Get tournament matches
            tournament_ref = self.db.collection('tournaments').document(tournament_id)
            tournament_doc = tournament_ref.get()
            
            if not tournament_doc.exists:
                return {
                    'status': 'error',
                    'message': f'Tournament {tournament_id} not found',
                    'completed': False
                }
            
            tournament_data = tournament_doc.to_dict()
            tournament_matches = tournament_data.get('matches', {})
            
            # Filter matches for this round and level
            matches = []
            for match_id, match_data in tournament_matches.items():
                if (match_data.get('tournamentId') == tournament_id and 
                    match_data.get('roundNumber') == round_number and 
                    match_data.get('tournamentLevel') == level):
                    
                    # Filter by entity based on level
                    if level == 'community' and match_data.get('communityId') == entity_id:
                        matches.append(match_data)
                    elif level == 'county' and match_data.get('countyId') == entity_id:
                        matches.append(match_data)
                    elif level == 'regional' and match_data.get('regionId') == entity_id:
                        matches.append(match_data)
                    elif level == 'national':
                        matches.append(match_data)
            
            incomplete_matches = []
            total_matches = 0
            
            for match_data in matches:
                total_matches += 1
                
                # Check if match has results and proper completion
                if match_data.get('status') != 'completed':
                    incomplete_matches.append(match_data.get('id'))
                    continue
                
                # Determine winner based on points if not already set
                if not match_data.get('winnerId'):
                    winner_id = self.determine_match_winner(match_data)
                    if not winner_id:
                        incomplete_matches.append(match_data.get('id'))
            
            if incomplete_matches:
                return {
                    'success': False,
                    'error': f'Previous round {round_number} not completed',
                    'incompleteMatches': incomplete_matches,
                    'totalMatches': total_matches,
                    'completedMatches': total_matches - len(incomplete_matches)
                }
            
            print(f"✅ All {total_matches} matches in {round_number} are completed")
            return {'success': True, 'completedMatches': total_matches}
            
        except Exception as e:
            print(f"❌ Error validating round completion: {e}")
            return {'success': False, 'error': f'Validation error: {str(e)}'}
    
    def validate_round_completion_json(self, tournament_id: str, entity_id: str, round_number: str, level: str) -> Dict:
        """Validate round completion for testing mode using JSON files"""
        try:
            print(f"🧪 TESTING MODE: Validating {round_number} completion for {level} {entity_id}")
            
            # Find the latest matches collection file
            matches_files = [f for f in os.listdir('.') if f.startswith(f'matches_collection_{tournament_id}')]
            if not matches_files:
                print(f"❌ No matches collection file found for tournament {tournament_id}")
                return {'success': False, 'error': f'No matches file found for tournament {tournament_id}'}
            
            # Sort by modification time to get the latest
            matches_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            matches_file = matches_files[0]
            
            with open(matches_file, 'r', encoding='utf-8') as f:
                matches_data = json.load(f)
            
            # Find matches for this round, level, and entity
            round_matches = []
            for match_id, match_data in matches_data.items():
                if (match_data.get('tournamentId') == tournament_id and
                    match_data.get('roundNumber') == round_number and
                    match_data.get('tournamentLevel') == level):
                    
                    # Check level-specific entity match
                    if level == 'community' and match_data.get('communityId') == entity_id:
                        round_matches.append((match_id, match_data))
                    elif level == 'county' and match_data.get('countyId') == entity_id:
                        round_matches.append((match_id, match_data))
                    elif level == 'regional' and match_data.get('regionId') == entity_id:
                        round_matches.append((match_id, match_data))
                    elif level == 'special' and match_data.get('specialTournament'):
                        round_matches.append((match_id, match_data))
            
            if not round_matches:
                print(f"⚠️ No matches found for {level} {entity_id} round {round_number}")
                return {'success': False, 'error': f'No matches found for {level} {entity_id} round {round_number}'}
            
            # Check completion status
            incomplete_matches = []
            total_matches = len(round_matches)
            
            for match_id, match_data in round_matches:
                status = match_data.get('status')
                winner_id = match_data.get('winnerId')
                
                # Check if match is completed
                if status != 'completed':
                    incomplete_matches.append(match_id)
                    print(f"   ❌ Incomplete: {match_id} (status: {status})")
                    continue
                
                # Determine winner based on points if not already set
                if not winner_id:
                    determined_winner = self.determine_match_winner(match_data)
                    if not determined_winner:
                        incomplete_matches.append(match_id)
                        print(f"   ❌ No winner determined: {match_id}")
                else:
                    print(f"   ✅ Complete: {match_id}")
            
            if incomplete_matches:
                print(f"❌ Found {len(incomplete_matches)} incomplete matches in {round_number}")
                return {
                    'success': False,
                    'error': f'Previous round {round_number} not completed',
                    'incompleteMatches': incomplete_matches,
                    'totalMatches': total_matches,
                    'completedMatches': total_matches - len(incomplete_matches)
                }
            
            print(f"✅ All {total_matches} matches in {round_number} are completed")
            return {'success': True, 'completedMatches': total_matches}
            
        except Exception as e:
            print(f"❌ Error validating round completion from JSON: {e}")
            return {'success': False, 'error': f'JSON validation error: {str(e)}'}
    
    def get_community_round_winners(self, tournament_id: str, community_id: str, round_number: str) -> List[Dict]:
        """Get winners from specific community round using subcollection"""
        
        try:
            # Get matches from tournaments/{tournament_id}/matches subcollection
            matches_collection = self.db.collection('tournaments').document(tournament_id).collection('matches')
            
            # Query for matches in this community and round that are completed
            matches_query = matches_collection.where('communityId', '==', community_id).where('roundNumber', '==', round_number).where('status', '==', 'completed')
            matches_docs = matches_query.get()
            
            winners = []
            for doc in matches_docs:
                match_data = doc.to_dict()
                match_data['id'] = doc.id  # Ensure match has ID
                
                # Determine winner from points instead of winnerId
                winner_data = self.get_match_winner_data(match_data)
                
                if winner_data:
                    winners.append(winner_data)
            
            print(f"   Found {len(winners)} winners from {round_number} in community {community_id}")
            return winners
            
        except Exception as e:
            print(f"❌ Error getting community round winners: {e}")
            return []
    
    def get_community_round_losers(self, tournament_id: str, community_id: str, round_number: str) -> List[Dict]:
        """Get losers from specific community round"""
        try:
            # Get tournament matches
            tournament_ref = self.db.collection('tournaments').document(tournament_id)
            tournament_doc = tournament_ref.get()
            
            if not tournament_doc.exists:
                print(f"❌ Tournament {tournament_id} not found")
                return []
            
            tournament_data = tournament_doc.to_dict()
            tournament_matches = tournament_data.get('matches', {})
            
            # Filter matches for this community and round
            losers = []
            for match_id, match_data in tournament_matches.items():
                if (match_data.get('tournamentId') == tournament_id and 
                    match_data.get('communityId') == community_id and 
                    match_data.get('roundNumber') == round_number and 
                    match_data.get('status') == 'completed'):
                    
                    # Determine loser from points instead of loserId
                    loser_data = self.get_match_loser_data(match_data)
                    
                    if loser_data:
                        losers.append(loser_data)
            
            print(f"   Found {len(losers)} losers from {round_number} in community {community_id}")
            return losers
            
        except Exception as e:
            print(f"❌ Error getting community round losers: {e}")
            return []
    
    # =================== MISSING UTILITY METHODS ===================
    
    def get_tournament_configuration(self, tournament_id: str) -> Dict:
        """Get tournament configuration from tournaments collection"""
        try:
            print(f"🔍 Getting tournament configuration for: {tournament_id}")
            
            tournament_ref = self.db.collection('tournaments').document(tournament_id)
            tournament_doc = tournament_ref.get()
            
            if tournament_doc.exists:
                config = tournament_doc.to_dict()
                print(f"✅ Tournament found: {config.get('tournamentName', 'Unknown')}")
                print(f"   Hierarchy Level: {config.get('hierarchicalLevel', 'community')}")
                print(f"   Status: {config.get('status', 'unknown')}")
                
                # Ensure participantScope exists (for configuration only, NOT for tournament type decision)
                if 'participantScope' not in config:
                    print("⚠️ No participantScope found, detecting from registrations...")
                    print("   NOTE: This detection is for configuration only, NOT for determining tournament type")
                    config['participantScope'] = self.detect_participant_scope(tournament_id)
                
                return config
            else:
                print(f"❌ Tournament not found: {tournament_id}")
                return {}
        except Exception as e:
            print(f"❌ Error getting tournament configuration: {e}")
            return {}
    
    def detect_participant_scope(self, tournament_id: str) -> Dict:
        """Auto-detect participant scope from registrations (for configuration only, NOT tournament type)"""
        try:
            print("   🔍 Auto-detecting participant scope from registrations...")
            print("   🔐 NOTE: This is for configuration purposes only, does NOT determine tournament type")
            
            # Get tournament document to access registeredPlayersIds
            tournament_ref = self.db.collection('tournaments').document(tournament_id)
            tournament_doc = tournament_ref.get()
            
            if not tournament_doc.exists:
                print(f"❌ Tournament {tournament_id} not found")
                return {}
            
            tournament_data = tournament_doc.to_dict()
            print(f"🔍 DEBUG: Tournament document keys: {list(tournament_data.keys())}")
            print(f"🔍 DEBUG: Tournament document data: {tournament_data}")
            
            # First try the expected field name (with 's')
            registered_player_ids = tournament_data.get('registeredPlayersIds', [])
            print(f"🔍 DEBUG: Found {len(registered_player_ids)} player IDs in 'registeredPlayersIds': {registered_player_ids}")
            
            # Check for common alternative field name (without 's')
            if not registered_player_ids:
                registered_player_ids = tournament_data.get('registeredPlayerIds', [])
                if registered_player_ids:
                    print(f"🔧 FIELD NAME FIX: Using 'registeredPlayerIds' (without 's') - found {len(registered_player_ids)} players")
                    print(f"🔍 DEBUG: Player IDs from 'registeredPlayerIds': {registered_player_ids}")
            
            print(f"🔍 DEBUG: Final registered_player_ids to process: {registered_player_ids}")
            print(f"🔍 DEBUG: Number of players to process: {len(registered_player_ids)}")
            
            community_ids = set()
            county_ids = set()
            region_ids = set()
            
            for i, player_id in enumerate(registered_player_ids, 1):
                print(f"🔍 DEBUG: Processing player {i}/{len(registered_player_ids)}: {player_id}")
                
                # Get user's geographical data
                user_ref = self.db.collection('users').document(player_id)
                user_doc = user_ref.get()
                
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    community_id = user_data.get('communityId')
                    print(f"   ✅ User document found, communityId: {community_id}")
                    
                    if community_id:
                        community_ids.add(community_id)
                        print(f"   ✅ Added to community_ids: {community_id}")
                        
                        # SIMPLIFIED: Get county and region directly from user data
                        county_id = user_data.get('countyId')
                        region_id = user_data.get('regionId')
                        print(f"   📍 User geographical data: county={county_id}, region={region_id}")
                        
                        if county_id:
                            county_ids.add(county_id)
                            print(f"   ✅ Added to county_ids: {county_id}")
                        if region_id:
                            region_ids.add(region_id)
                            print(f"   ✅ Added to region_ids: {region_id}")
                    else:
                        print(f"   ❌ User has no communityId field")
                else:
                    print(f"   ❌ User document does not exist: {player_id}")
            
            print(f"🔍 DEBUG: Final scope detection results:")
            print(f"   Communities found: {list(community_ids)} (count: {len(community_ids)})")
            print(f"   Counties found: {list(county_ids)} (count: {len(county_ids)})")
            print(f"   Regions found: {list(region_ids)} (count: {len(region_ids)})")
            
            scope = {
                'allowedCommunityIds': list(community_ids),
                'allowedCountyIds': list(county_ids),
                'allowedRegionIds': list(region_ids),
                'scopeType': 'auto_detected'
            }
            
            print(f"   ✅ Detected scope: {len(community_ids)} communities, {len(county_ids)} counties, {len(region_ids)} regions")
            return scope
            
        except Exception as e:
            print(f"❌ Error detecting participant scope: {e}")
            return {
                'allowedCommunityIds': [],
                'allowedCountyIds': [],
                'allowedRegionIds': [],
                'scopeType': 'error'
            }
    
    def get_geographical_context(self, community_id: str) -> Dict:
        """Get geographical context for community"""
        try:
            if community_id in ['N/A', 'UNKNOWN', 'ERROR']:
                return {'countyId': 'N/A', 'regionId': 'N/A'}
            
            # Try geographical_units first
            geo_ref = self.db.collection('geographical_units').document(community_id)
            geo_doc = geo_ref.get()
            
            if geo_doc.exists:
                geo_data = geo_doc.to_dict()
                return {
                    'communityName': geo_data.get('communityName') or geo_data.get('name', 'Unknown'),
                    'countyId': geo_data.get('countyId', 'N/A'),
                    'countyName': geo_data.get('countyName', 'Unknown'),
                    'regionId': geo_data.get('regionId', 'N/A'),
                    'regionName': geo_data.get('regionName', 'Unknown')
                }
            
            return {'countyId': 'N/A', 'regionId': 'N/A', 'communityName': 'Unknown'}
            
        except Exception as e:
            print(f"⚠️ Error getting geographical context for {community_id}: {e}")
            return {'countyId': 'N/A', 'regionId': 'N/A', 'communityName': 'Error'}
    
    def get_community_registered_players(self, tournament_id: str, community_id: str) -> List[Dict]:
        """SIMPLIFIED: Get registered players for specific community - no filtering, just group by community"""
        # Call the new method and return players for the specific community
        players_by_community = self.get_all_registered_players_grouped_by_community(tournament_id)
        return players_by_community.get(community_id, [])
    
    def get_all_registered_players_grouped_by_community(self, tournament_id: str) -> Dict[str, List[Dict]]:
        """SIMPLIFIED: Get ALL registered players grouped by their community - no filtering"""
        try:
            print(f"🔍 SIMPLIFIED: Getting ALL registered players and grouping by community...")
            
            # Get tournament document
            tournament_ref = self.db.collection('tournaments').document(tournament_id)
            tournament_doc = tournament_ref.get()
            
            if not tournament_doc.exists:
                print(f"❌ Tournament {tournament_id} not found")
                return {}
            
            tournament_data = tournament_doc.to_dict()
            
            # Get registered players (try both field names)
            registered_player_ids = tournament_data.get('registeredPlayersIds', [])
            if not registered_player_ids:
                registered_player_ids = tournament_data.get('registeredPlayerIds', [])
            
            print(f"   📊 Found {len(registered_player_ids)} registered players total")
            
            if not registered_player_ids:
                print(f"   ⚠️ No registered players found")
                return {}
            
            # Group players by community
            players_by_community = {}
            
            for i, player_id in enumerate(registered_player_ids, 1):
                print(f"   🔍 Processing player {i}/{len(registered_player_ids)}: {player_id}")
                
                user_ref = self.db.collection('users').document(player_id)
                user_doc = user_ref.get()
                
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    community_id = user_data.get('communityId', 'UNKNOWN_COMMUNITY')
                    
                    player_name = (user_data.get('playerName') or 
                                 user_data.get('displayName') or 
                                 user_data.get('fullName') or 
                                 user_data.get('name') or
                                 f"Player_{player_id[-6:]}")
                    
                    # Create player data
                    player_data = {
                        'id': player_id,
                        'name': player_name,
                        'communityId': community_id,
                        'email': user_data.get('email', 'N/A'),
                        'skillRating': user_data.get('skillRating', 1000),
                        'registrationId': player_id,
                        'avatar': user_data.get('avatar', None),
                        'countyId': user_data.get('countyId'),
                        'regionId': user_data.get('regionId'),
                        'tournamentId': tournament_id,
                        'phone': user_data.get('phone', ''),
                        'level': 'community',
                        'roundNumber': 'R1'
                    }
                    
                    # Add to community group
                    if community_id not in players_by_community:
                        players_by_community[community_id] = []
                    
                    players_by_community[community_id].append(player_data)
                    print(f"      ✅ Added to community {community_id}: {player_data['name']}")
                else:
                    print(f"      ❌ User document not found: {player_id}")
            
            # Log results
            for community_id, players in players_by_community.items():
                print(f"   ✅ Community {community_id}: {len(players)} players")
            
            print(f"   🎯 Total communities with players: {len(players_by_community)}")
            return players_by_community
            
        except Exception as e:
            print(f"❌ Error getting players by community: {e}")
            return {}
    
    def create_complete_bracket_structure(self, tournament_id: str, config: Dict) -> Dict:
        """Create complete bracket structure for tournament"""
        try:
            print(f"🏗️ Creating complete bracket structure for tournament: {tournament_id}")
            
            bracket = {
                'tournamentId': tournament_id,
                'hierarchicalLevel': config.get('hierarchicalLevel', 'community'),
                'bracketType': 'single_elimination',
                'participantScope': config.get('participantScope', {}),
                'rounds': {},  # Will be populated as: round -> community -> [match_ids]
                'roundStatus': {},
                'advancementRules': {
                    'type': 'single_elimination',
                    'winnersAdvance': True,
                    'losersEliminated': True,
                    'positioningRules': {
                        '3_players': 'quarter_final_semi_final',
                        '4_players': 'semi_final_system',
                        'final_positions': [1, 2, 3]
                    }
                },
                'bracketLevels': {
                    'community': {},
                    'county': {},
                    'regional': {},
                    'national': {}
                },
                'winners': {
                    'community': {},
                    'county': {},
                    'regional': {},
                    'national': {}
                },
                'createdAt': datetime.now().isoformat(),
                'lastUpdated': datetime.now().isoformat()
            }
            
            # Create bracket levels based on participant scope
            participant_scope = config.get('participantScope', {})
            allowed_communities = participant_scope.get('allowedCommunityIds', [])
            
            # Community level brackets
            community_brackets = {}
            
            print(f"   Processing {len(allowed_communities)} communities for bracket structure...")
            
            for community_id in allowed_communities:
                # Get player count for this community
                print(f"🔍 DEBUG: Calling get_community_registered_players for tournament {tournament_id}, community {community_id}")
                community_players = self.get_community_registered_players(tournament_id, community_id)
                player_count = len(community_players)
                print(f"🔍 DEBUG: get_community_registered_players returned {player_count} players: {[p.get('name', 'Unknown') for p in community_players]}")
                
                if player_count >= 1:  # Changed from 2 to 1 to handle single player
                    if player_count == 1:
                        rounds_needed = 1  # Just final positioning
                        community_rounds = ["Community_Final"]
                        current_round = "Community_Final"
                    elif player_count == 2:
                        rounds_needed = 1  # Direct final
                        community_rounds = ["Community_Final"]
                        current_round = "Community_Final"
                    else:
                        rounds_needed = self.calculate_rounds_needed(player_count)
                        community_rounds = []
                        for i in range(rounds_needed - 1):
                            community_rounds.append(f"R{i + 1}")
                        community_rounds.append("Community_Final")
                        current_round = "R1"
                    
                    community_brackets[community_id] = {
                        'communityId': community_id,
                        'playerCount': player_count,
                        'roundsNeeded': rounds_needed,
                        'rounds': community_rounds,
                        'currentRound': current_round,
                        'status': 'active',
                        'level': 'community',
                        'specialHandling': {
                            'singlePlayer': player_count == 1,
                            'twoPlayers': player_count == 2,
                            'enhancedPositioning': player_count >= 3
                        }
                    }
                    
                    print(f"      Community {community_id}: {player_count} players, {rounds_needed} rounds")
            
            bracket['bracketLevels']['community'] = community_brackets
            
            # Rounds structure will be populated by organize_matches_in_bracket function
            # No need to initialize empty structure here
            
            # Initialize round status tracking (including 4-player system rounds)
            bracket['roundStatus'] = {
                'R1': 'in_progress',
                'R2': 'pending',
                'R3': 'pending',
                'R4': 'pending',
                'R5': 'pending',
                'Community_SF': 'pending',      # 4-player semi-finals
                'Community_WF': 'pending',      # 4-player Winners Final
                'Community_LF': 'pending',      # 4-player Losers Final
                'Community_Final': 'pending'    # Final positioning match
            }
            
            print(f"✅ Bracket structure created with {len(community_brackets)} communities")
            return bracket
            
        except Exception as e:
            print(f"❌ Error creating bracket structure: {e}")
            return {}
    
    def calculate_rounds_needed(self, player_count: int) -> int:
        """Calculate number of rounds needed for elimination tournament"""
        if player_count <= 1:
            return 1  # Single player or less
        if player_count <= 2:
            return 1  # Two players need just one round
        return math.ceil(math.log2(player_count))
    
    def get_next_community_round_smart(self, current_round: str, winners_count: int) -> Optional[str]:
        """Get next community round name based on current round and winner count"""
        print(f"   🎯 Determining next round: current={current_round}, winners={winners_count}")
        
        # If already at final, return None (tournament complete - use finalize endpoint)
        if current_round == 'Community_Final':
            print(f"   🏁 Community_Final completed → Tournament finished, use finalize endpoint")
            return None
        
        # Handle SF progression - need to determine if 3-player or 4-player scenario
        if current_round == 'Community_SF':
            # For now, determine by winner count since we can't pass tournament_id here
            # Will be improved in the calling method to pass proper context
            if winners_count == 1:
                # 3-player scenario: SF (1 match) had 1 winner → Final
                print(f"   ✅ 3-player Community_SF completed → Community_Final")
                return 'Community_Final'
            elif winners_count == 2:
                # 4-player scenario: SF (2 matches) had 2 winners → WF
                print(f"   ✅ 4-player Community_SF completed → Community_WF")
                return 'Community_WF'
            else:
                print(f"   ⚠️ Unexpected winner count {winners_count} for Community_SF")
                return 'Community_Final'
        
        if current_round == 'Community_WF':
            # 4-player WF completed → Final
            print(f"   ✅ Community_WF completed → Community_Final")
            return 'Community_Final'
        
        # Smart logic: determine scenario based on winner count
        if winners_count == 3:
            print(f"   ✅ {winners_count} winners → Community_SF (3-player scenario)")
            return 'Community_SF'
        
        if winners_count == 4:
            print(f"   ✅ {winners_count} winners → Community_SF (4-player scenario)")
            return 'Community_SF'
        
        # 2 or fewer winners: go directly to Community_Final (if needed)
        if winners_count <= 2:
            print(f"   ✅ {winners_count} winners → Community_Final")
            return 'Community_Final'
        
        # Otherwise continue standard progression until we get to 3 or 4 winners
        round_progression = {
            'R1': 'R2',
            'R2': 'R3', 
            'R3': 'R4',
            'R4': 'R5',
            'R5': 'Community_Final'
        }
        
        next_round = round_progression.get(current_round, 'Community_Final')
        print(f"   ✅ {winners_count} winners → {next_round}")
        return next_round
    
    def get_next_community_round(self, current_round: str) -> Optional[str]:
        """Get next community round name"""
        round_progression = {
            'R1': 'R2',
            'R2': 'R3',
            'R3': 'R4',
            'R4': 'R5',
            'R5': 'Community_Final'
        }
        
        # If already at final, return None (tournament complete)
        if current_round == 'Community_Final':
            return None
        
        return round_progression.get(current_round, 'Community_Final')
    
    def get_winner_player_data(self, match_data: Dict, winner_id: str) -> Dict:
        """
        Get winner player data from match
        Winner is determined by comparing player1Points vs player2Points
        The player with higher points is the winner
        """
        if match_data.get('player1Id') == winner_id:
            return {
                'id': winner_id,
                'name': match_data.get('player1Name', 'Unknown'),
                'communityId': match_data.get('player1CommunityId'),
                'countyId': match_data.get('player1CountyId'),
                'regionId': match_data.get('player1RegionId'),
                'points': match_data.get('player1Points', 0)
            }
        else:
            return {
                'id': winner_id,
                'name': match_data.get('player2Name', 'Unknown'),
                'communityId': match_data.get('player2CommunityId'),
                'countyId': match_data.get('player2CountyId'),
                'regionId': match_data.get('player2RegionId'),
                'points': match_data.get('player2Points', 0)
            }
    
    def get_match_winner_id(self, match_data: Dict) -> Optional[str]:
        """
        Get winner ID based purely on points comparison
        Does NOT set winnerId/loserId fields
        """
        player1_points = match_data.get('player1Points', 0)
        player2_points = match_data.get('player2Points', 0)
        player1_id = match_data.get('player1Id')
        player2_id = match_data.get('player2Id')
        
        if player1_points > player2_points:
            return player1_id
        elif player2_points > player1_points:
            return player2_id
        else:
            # Tie scenario
            print(f"⚠️ Tie detected in match {match_data.get('id')}: {player1_points} vs {player2_points}")
            return None
    
    def get_match_loser_id(self, match_data: Dict) -> Optional[str]:
        """
        Get loser ID based purely on points comparison
        Does NOT set winnerId/loserId fields
        """
        player1_points = match_data.get('player1Points', 0)
        player2_points = match_data.get('player2Points', 0)
        player1_id = match_data.get('player1Id')
        player2_id = match_data.get('player2Id')
        
        if player1_points > player2_points:
            return player2_id
        elif player2_points > player1_points:
            return player1_id
        else:
            # Tie scenario
            print(f"⚠️ Tie detected in match {match_data.get('id')}: {player1_points} vs {player2_points}")
            return None
    
    def get_match_winner_data(self, match_data: Dict) -> Optional[Dict]:
        """
        Get winner player data based purely on points comparison
        """
        winner_id = self.get_match_winner_id(match_data)
        if winner_id:
            return self.get_winner_player_data(match_data, winner_id)
        return None
    
    def get_match_loser_data(self, match_data: Dict) -> Optional[Dict]:
        """
        Get loser player data based purely on points comparison
        """
        loser_id = self.get_match_loser_id(match_data)
        if loser_id:
            return self.get_winner_player_data(match_data, loser_id)
        return None

    def determine_match_winner(self, match_data: Dict) -> str:
        """
        DEPRECATED: This function sets winnerId/loserId which we no longer want to use
        Use get_match_winner_id() instead
        """
        print("⚠️ WARNING: determine_match_winner() is deprecated. Use get_match_winner_id() instead")
        return self.get_match_winner_id(match_data)
    
    def update_match_winner(self, match_id: str, winner_id: str, loser_id: str):
        """
        DEPRECATED: Do not use this function as we no longer store winnerId/loserId
        Winners should be determined from points at runtime
        """
        print("⚠️ WARNING: update_match_winner() is deprecated. Winners should be determined from points.")
        return  # Do nothing
        try:
            # NOTE: This code is unreachable due to early return above
            # But updating for consistency - would need tournament_id parameter to work
            # tournament_ref = self.db.collection('tournaments').document(tournament_id)
            # tournament_doc = tournament_ref.get()
            # if tournament_doc.exists:
            #     tournament_data = tournament_doc.to_dict()
            #     matches = tournament_data.get('matches', {})
            #     if match_id in matches:
            #         matches[match_id].update({
            #             'winnerId': winner_id,
            #             'loserId': loser_id,
            #             'resultApprovalStatus': 'approved',
            #             'resultSubmittedAt': datetime.now(),
            #             'resultSubmittedBy': 'algorithm'
            #         })
            #         tournament_ref.update({'matches': matches})
            print(f"⚠️ DEPRECATED: update_match_winner() called but does nothing")
        except Exception as e:
            print(f"❌ Error updating match winner: {e}")
    
    def generate_next_round_with_bracket_logic(self, tournament_id: str, community_id: str, 
                                             current_round: str, current_round_winners: List[Dict]) -> List[Dict]:
        """
        Generate next round matches with complex bracket logic for 2-match and 3-match scenarios
        """
        print(f"🎯 Generating next round with advanced bracket logic")
        print(f"   Tournament: {tournament_id}, Community: {community_id}")
        print(f"   Current round: {current_round}, Winners: {len(current_round_winners)}")
        
        # Get current round matches to analyze scenario
        current_matches = self.get_round_matches(tournament_id, community_id, current_round)
        completed_matches = [m for m in current_matches if m.get('status') == 'completed']
        
        print(f"   Completed matches in current round: {len(completed_matches)}")
        
        if len(completed_matches) == 2:
            return self.handle_two_match_scenario(tournament_id, community_id, current_round, 
                                                completed_matches, current_round_winners)
        elif len(completed_matches) == 3:
            return self.handle_three_match_scenario(tournament_id, community_id, current_round, 
                                                  completed_matches, current_round_winners)
        else:
            # Standard progression
            return self.generate_standard_next_round(tournament_id, community_id, current_round, 
                                                   current_round_winners)
    
    def handle_two_match_scenario(self, tournament_id: str, community_id: str, current_round: str,
                                completed_matches: List[Dict], current_round_winners: List[Dict]) -> List[Dict]:
        """
        Handle 2-match scenario: Create winners bracket, losers bracket, and final positioning
        Two matches -> Two winners and two losers
        Create: Winner vs Winner, Loser vs Loser, then final positioning
        """
        print(f"🏆 Handling 2-match scenario for {current_round}")
        
        # Get losers from current round
        current_round_losers = self.get_community_round_losers(tournament_id, community_id, current_round)
        
        if len(current_round_winners) != 2 or len(current_round_losers) != 2:
            print(f"❌ Invalid 2-match scenario: {len(current_round_winners)} winners, {len(current_round_losers)} losers")
            return []
        
        next_round = self.get_next_community_round(current_round)
        matches = []
        
        # Create match 1: Winner vs Winner (determines 1st place contender)
        match_1_id = f"{next_round}_WINNERS_BRACKET_{community_id}_match_1"
        winners_match = self.create_comprehensive_match(
            match_1_id, tournament_id, f"{next_round}_WB", community_id, 1,
            current_round_winners[0], current_round_winners[1], 'community'
        )
        matches.append(winners_match)
        
        # Create match 2: Loser vs Loser (determines 3rd/4th place)
        match_2_id = f"{next_round}_LOSERS_BRACKET_{community_id}_match_1"
        losers_match = self.create_comprehensive_match(
            match_2_id, tournament_id, f"{next_round}_LB", community_id, 2,
            current_round_losers[0], current_round_losers[1], 'community'
        )
        matches.append(losers_match)
        
        print(f"   Created 2 matches for winners/losers brackets")
        print(f"   Winners bracket: {current_round_winners[0]['name']} vs {current_round_winners[1]['name']}")
        print(f"   Losers bracket: {current_round_losers[0]['name']} vs {current_round_losers[1]['name']}")
        
        return matches
    
    def handle_three_match_scenario(self, tournament_id: str, community_id: str, current_round: str,
                                  completed_matches: List[Dict], current_round_winners: List[Dict]) -> List[Dict]:
        """
        Handle 3-match scenario: Three winners compete in special bracket
        Player A vs Player B -> Winner gets 1st place, Loser plays Player C
        Winner of (Loser vs Player C) gets 2nd place, Loser gets 3rd place
        """
        print(f"🏆 Handling 3-match scenario for {current_round}")
        
        if len(current_round_winners) != 3:
            print(f"❌ Invalid 3-match scenario: {len(current_round_winners)} winners")
            return []
        
        next_round = self.get_next_community_round(current_round)
        matches = []
        
        # Randomly select two players for first match, third player waits
        players = current_round_winners.copy()
        random.shuffle(players)
        player_a, player_b, player_c = players[0], players[1], players[2]
        
        # Create match 1: Player A vs Player B (winner gets 1st place)
        match_1_id = f"{next_round}_THREE_WAY_SEMI_{community_id}_match_1"
        semi_match = self.create_comprehensive_match(
            match_1_id, tournament_id, f"{next_round}_3WS", community_id, 1,
            player_a, player_b, 'community'
        )
        matches.append(semi_match)
        
        print(f"   Created 3-way semi-final: {player_a['name']} vs {player_b['name']}")
        print(f"   Player C ({player_c['name']}) awaits winner of losers")
        
        # Note: The second match (loser vs player_c) will be created after this match completes
        # This is handled in the next round generation when this match is completed
        
        return matches
    
    def generate_standard_next_round(self, tournament_id: str, community_id: str, current_round: str,
                                   current_round_winners: List[Dict]) -> List[Dict]:
        """Generate standard next round matches (updated logic for 4-player system)"""
        next_round = self.get_next_community_round_smart(current_round, len(current_round_winners))
        
        if next_round == "Community_SF":
            # 4-player system: Create semi-finals
            return self.create_four_player_positioning_matches(tournament_id, community_id, current_round_winners)
        elif next_round == "Community_Final":
            return self.generate_community_final_matches(tournament_id, community_id, current_round_winners)
        else:
            # Handle odd numbers by adding the best-performing loser
            players = current_round_winners.copy()
            if len(players) % 2 == 1:
                current_round_losers = self.get_community_round_losers(tournament_id, community_id, current_round)
                if current_round_losers:
                    # Select the best-performing loser (highest points/score)
                    best_loser = self.select_best_loser(current_round_losers)
                    players.append(best_loser)
                    print(f"   Added best-performing loser {best_loser['name']} to make even pairs")
            
            return self.generate_community_round_matches(tournament_id, community_id, next_round, players)
    
    def get_round_matches(self, tournament_id: str, community_id: str, round_number: str) -> List[Dict]:
        """Get all matches for a specific round using subcollection"""
        
        try:
            # Get matches from tournaments/{tournament_id}/matches subcollection
            matches_collection = self.db.collection('tournaments').document(tournament_id).collection('matches')
            
            # Query for matches in this community and round
            matches_query = matches_collection.where('communityId', '==', community_id).where('roundNumber', '==', round_number)
            matches_docs = matches_query.get()
            
            matches = []
            for doc in matches_docs:
                match_data = doc.to_dict()
                match_data['id'] = doc.id  # Ensure match has ID
                matches.append(match_data)
            
            print(f"   Found {len(matches)} matches for {community_id} round {round_number}")
            return matches
        except Exception as e:
            print(f"❌ Error getting round matches: {e}")
            return []
    
    def get_round_matches_from_json(self, tournament_id: str, community_id: str, round_number: str) -> List[Dict]:
        """Get round matches from JSON files for testing"""
        try:
            matches_files = [f for f in os.listdir('.') if f.startswith(f'matches_collection_{tournament_id}')]
            if not matches_files:
                return []
            
            matches_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            matches_file = matches_files[0]
            
            with open(matches_file, 'r', encoding='utf-8') as f:
                matches_data = json.load(f)
            
            round_matches = []
            for match_id, match_data in matches_data.items():
                if (match_data.get('tournamentId') == tournament_id and
                    match_data.get('communityId') == community_id and
                    match_data.get('roundNumber') == round_number):
                    round_matches.append(match_data)
            
            return round_matches
        except Exception as e:
            print(f"❌ Error getting round matches from JSON: {e}")
            return []
    
    def complete_bracket_scenario_final(self, tournament_id: str, community_id: str, current_round: str) -> Dict:
        """
        Complete the final positioning for 2-match or 3-match bracket scenarios
        This is called after the bracket matches are completed
        """
        print(f"🏁 Completing bracket scenario final for {community_id}")
        
        # Check if this is a winners/losers bracket scenario
        if "_WB" in current_round or "_LB" in current_round:
            return self.complete_two_match_bracket_final(tournament_id, community_id, current_round)
        elif "_3WS" in current_round:  # Three-way semi
            return self.complete_three_match_bracket_final(tournament_id, community_id, current_round)
        else:
            return {'success': False, 'error': 'Unknown bracket scenario'}
    
    def complete_two_match_bracket_final(self, tournament_id: str, community_id: str, current_round: str) -> Dict:
        """
        Complete 2-match bracket scenario:
        - Winner of winners bracket = Position 1
        - Loser of winners bracket vs Winner of losers bracket = Position 2/3 match
        - Loser of losers bracket = Position 4 (eliminated)
        """
        print(f"🏆 Completing 2-match bracket final")
        
        # Get winners bracket match
        base_round = current_round.replace("_WB", "").replace("_LB", "")
        wb_matches = self.get_matches_by_round_pattern(tournament_id, community_id, f"{base_round}_WB")
        lb_matches = self.get_matches_by_round_pattern(tournament_id, community_id, f"{base_round}_LB")
        
        if not wb_matches or not lb_matches:
            return {'success': False, 'error': 'Could not find bracket matches'}
        
        wb_match = wb_matches[0]
        lb_match = lb_matches[0]
        
        # Position 1: Winner of winners bracket
        position_1_winner = self.get_winner_player_data(wb_match, wb_match.get('winnerId'))
        
        # Position 4: Loser of losers bracket (eliminated)
        position_4_loser = self.get_winner_player_data(lb_match, lb_match.get('loserId'))
        
        # Create final positioning match: Loser of WB vs Winner of LB
        wb_loser = self.get_winner_player_data(wb_match, wb_match.get('loserId'))
        lb_winner = self.get_winner_player_data(lb_match, lb_match.get('winnerId'))
        
        # Create final positioning match
        final_match_id = f"Community_Final_POSITIONING_{community_id}_match_1"
        final_match = self.create_comprehensive_match(
            final_match_id, tournament_id, "Community_Final", community_id, 1,
            wb_loser, lb_winner, 'community'
        )
        
        print(f"   Position 1: {position_1_winner['name']} (Winner of Winners Bracket)")
        print(f"   Position 2/3 Match: {wb_loser['name']} vs {lb_winner['name']}")
        print(f"   Position 4: {position_4_loser['name']} (Eliminated)")
        
        return {
            'success': True,
            'finalMatches': [final_match],
            'positions': {
                '1': position_1_winner,
                '4': position_4_loser
            },
            'finalMatchPlayers': [wb_loser, lb_winner]
        }
    
    def complete_three_match_bracket_final(self, tournament_id: str, community_id: str, current_round: str) -> Dict:
        """
        Complete 3-match bracket scenario:
        After Player A vs Player B completes:
        - Winner gets Position 1
        - Loser plays Player C for Position 2/3
        """
        print(f"🏆 Completing 3-match bracket final")
        
        # Get the completed 3-way semi match
        base_round = current_round.replace("_3WS", "")
        semi_matches = self.get_matches_by_round_pattern(tournament_id, community_id, f"{base_round}_3WS")
        
        if not semi_matches:
            return {'success': False, 'error': 'Could not find 3-way semi match'}
        
        semi_match = semi_matches[0]
        
        # Position 1: Winner of semi match
        position_1_winner = self.get_winner_player_data(semi_match, semi_match.get('winnerId'))
        
        # Get the loser who will play Player C
        semi_loser = self.get_winner_player_data(semi_match, semi_match.get('loserId'))
        
        # Find Player C (the one who didn't play in the semi)
        # This requires getting the original 3 winners and finding who didn't play
        original_winners = self.get_community_round_winners(tournament_id, community_id, 
                                                          self.get_previous_round(base_round))
        
        player_c = None
        for winner in original_winners:
            if (winner['id'] != semi_match.get('player1Id') and 
                winner['id'] != semi_match.get('player2Id')):
                player_c = winner
                break
        
        if not player_c:
            return {'success': False, 'error': 'Could not find Player C'}
        
        # Create final positioning match: Semi Loser vs Player C
        final_match_id = f"Community_Final_3WAY_FINAL_{community_id}_match_1"
        final_match = self.create_comprehensive_match(
            final_match_id, tournament_id, "Community_Final", community_id, 1,
            semi_loser, player_c, 'community'
        )
        
        print(f"   Position 1: {position_1_winner['name']} (Winner of Semi)")
        print(f"   Position 2/3 Match: {semi_loser['name']} vs {player_c['name']}")
        
        return {
            'success': True,
            'finalMatches': [final_match],
            'positions': {
                '1': position_1_winner
            },
            'finalMatchPlayers': [semi_loser, player_c]
        }
    
    def get_matches_by_round_pattern(self, tournament_id: str, community_id: str, round_pattern: str) -> List[Dict]:
        """Get matches that match a round pattern"""
        all_matches = self.get_round_matches(tournament_id, community_id, round_pattern)
        return [m for m in all_matches if round_pattern in m.get('roundNumber', '')]
    
    def get_previous_round(self, current_round: str) -> str:
        """Get the previous round name"""
        if current_round == "R2":
            return "R1"
        elif current_round == "R3":
            return "R2"
        elif current_round == "R4":
            return "R3"
        elif current_round == "R5":
            return "R4"
        else:
            return "R1"  # Default fallback
    
    def extract_base_round(self, round_name: str) -> str:
        """Extract base round from bracket suffixes (R2_WB -> R2, R3_3WS -> R3)"""
        if '_WB' in round_name:
            return round_name.replace('_WB', '')
        elif '_LB' in round_name:
            return round_name.replace('_LB', '')
        elif '_3WS' in round_name:
            return round_name.replace('_3WS', '')
        else:
            return round_name
    
    def finalize_tournament_positions(self, tournament_id: str, entity_id: str, level: str) -> Dict:
        """
        Finalize tournament positions after final matches are completed.
        Updates positioning matches with actual winners/losers and determines final positions.
        """
        print(f"🏁 Finalizing {level} tournament positions for {entity_id}")
        
        try:
            # Get all final/positioning matches for this entity
            if level == 'community':
                # For 4-player system, collect matches from all rounds
                community_final_matches = self.get_round_matches(tournament_id, entity_id, 'Community_Final')
                community_f_matches = self.get_round_matches(tournament_id, entity_id, 'Community_F')
                community_sf_matches = self.get_round_matches(tournament_id, entity_id, 'Community_SF')
                community_wf_matches = self.get_round_matches(tournament_id, entity_id, 'Community_WF')
                community_lf_matches = self.get_round_matches(tournament_id, entity_id, 'Community_LF')
                
                # Combine all 4-player system matches
                final_matches = community_final_matches + community_f_matches + community_sf_matches + community_wf_matches + community_lf_matches
            elif level == 'county':
                final_matches = self.get_round_matches(tournament_id, entity_id, 'County_Final')
            elif level == 'regional':
                final_matches = self.get_round_matches(tournament_id, entity_id, 'Regional_Final')
            elif level == 'national':
                final_matches = self.get_round_matches(tournament_id, None, 'National_Final')
            else:
                return {'success': False, 'error': f'Unsupported level: {level}'}
            
            if not final_matches:
                return {'success': False, 'error': f'No final matches found for {level} {entity_id}'}
            
            # Determine scenario based on matches
            scenario = self.detect_positioning_scenario(final_matches)
            print(f"   Detected scenario: {scenario}")
            
            if scenario == '3_player':
                return self.finalize_3_player_positions(tournament_id, entity_id, level, final_matches)
            elif scenario == '4_player':
                return self.finalize_4_player_positions(tournament_id, entity_id, level, final_matches)
            elif scenario == '2_player':
                return self.finalize_2_player_positions(tournament_id, entity_id, level, final_matches)
            elif scenario == '1_player':
                return self.finalize_1_player_positions(tournament_id, entity_id, level, final_matches)
            else:
                return {'success': False, 'error': f'Unknown positioning scenario: {scenario}'}
                
        except Exception as e:
            print(f"❌ Error finalizing positions: {e}")
            return {'success': False, 'error': str(e)}
    
    def detect_positioning_scenario(self, final_matches: List[Dict]) -> str:
        """Detect the positioning scenario based on final matches"""
        print(f"🔍 Analyzing {len(final_matches)} final matches for scenario detection:")
        
        # Group matches by round for analysis
        round_groups = {}
        match_types = []
        
        for match in final_matches:
            round_num = match.get('roundNumber', '')
            match_type = match.get('matchType', '')
            match_types.append(match_type)
            
            if round_num not in round_groups:
                round_groups[round_num] = []
            round_groups[round_num].append(match)
            
            print(f"   Match: {match.get('id', 'unknown')} | Round: {round_num} | Type: {match_type}")
        
        # Count matches in key rounds
        community_sf_count = len(round_groups.get('Community_SF', []))
        community_final_count = len(round_groups.get('Community_Final', []))
        community_wf_count = len(round_groups.get('Community_WF', []))
        community_lf_count = len(round_groups.get('Community_LF', []))
        
        print(f"   Round analysis: SF={community_sf_count}, Final={community_final_count}, WF={community_wf_count}, LF={community_lf_count}")
        
        # Detection logic based on round structure and match types
        if 'three_player_initial' in match_types or 'three_player_final' in match_types:
            return '3_player'
        elif community_sf_count == 1 and community_final_count == 1 and community_wf_count == 0:
            # 3-player scenario: 1 SF match + 1 Final match, no WF/LF
            return '3_player'
        elif community_sf_count == 2 or community_wf_count > 0 or community_lf_count > 0:
            # 4-player scenario: 2 SF matches OR WF/LF matches exist
            return '4_player'
        elif 'semi_final' in match_types or 'winners_final' in match_types or 'losers_final' in match_types:
            return '4_player'
        elif community_final_count == 1 and community_sf_count == 0:
            # Direct final match - could be 2-player or 1-player
            final_match = round_groups['Community_Final'][0]
            if final_match.get('matchType') == 'two_player_final' or final_match.get('player2Id'):
                return '2_player'
            else:
                return '1_player'
        elif 'two_player_final' in match_types:
            return '2_player'
        elif len(final_matches) == 1 and 'auto_advancement' in match_types:
            return '1_player'
        elif len(final_matches) == 1:
            # Single match - determine if 1 or 2 player based on match data
            single_match = final_matches[0]
            if single_match.get('player2Id') and single_match.get('player2Id') != single_match.get('player1Id'):
                return '2_player'
            else:
                return '1_player'
        else:
            print(f"   ⚠️ Could not determine scenario from available data")
            return 'unknown'
    
    def finalize_3_player_positions(self, tournament_id: str, entity_id: str, level: str, final_matches: List[Dict]) -> Dict:
        """
        Finalize 3-player positioning based on user specification:
        - SF has only 1 match, winner gets position 1
        - Final: loser of SF vs 3rd player, winner is pos 2, loser is pos 3
        """
        print("   Finalizing 3-player positioning system")
        
        # Find the SF and final matches
        sf_match = None
        final_match = None
        
        for match in final_matches:
            if match.get('matchType') == 'three_player_initial' or match.get('roundNumber') == 'Community_SF':
                sf_match = match
            elif match.get('matchType') == 'three_player_final' or match.get('roundNumber') == 'Community_Final':
                final_match = match
        
        if not sf_match:
            return {'success': False, 'error': 'Semi-Final match not found'}
        
        # Check if SF match is completed
        if sf_match.get('status') != 'completed':
            return {'success': False, 'error': 'Semi-Final match not completed'}
        
        # Position 1: Winner of SF match (based on points)
        position_1_player = self.get_match_winner_data(sf_match)
        if not position_1_player:
            return {'success': False, 'error': 'Cannot determine winner for SF match'}
        
        # Check if final positioning match exists and is completed
        if final_match:
            if final_match.get('status') == 'completed':
                # Get positions 2 and 3 based on points
                position_2_player = self.get_match_winner_data(final_match)
                position_3_player = self.get_match_loser_data(final_match)
                
                if not position_2_player or not position_3_player:
                    return {'success': False, 'error': 'Cannot determine winner/loser for final match'}
                
                positions = {
                    '1': position_1_player,
                    '2': position_2_player,
                    '3': position_3_player
                }
                
                # CRITICAL: Save positions to bracket structure
                print(f"💾 Saving final positions to bracket for {entity_id}")
                # Convert positions dict to list format expected by update function
                winners_list = [position_1_player, position_2_player, position_3_player]
                update_success = self.update_bracket_with_community_winners(
                    tournament_id, entity_id, winners_list
                )
                
                if not update_success:
                    print(f"❌ Failed to save positions to bracket, but returning calculated positions")
                else:
                    print(f"✅ Successfully saved positions to tournament bracket")
                
                return {
                    'success': True,
                    'positions': positions,
                    'finalizedMatches': 2,
                    'message': '3-player positioning completed'
                }
            else:
                return {
                    'success': False,
                    'error': 'Final positioning match not completed. Complete the final match first.',
                    'positions': {'1': position_1_player}
                }
        else:
            return {
                'success': False,
                'error': 'Final positioning match not found. Call next-round first to generate it.',
                'positions': {'1': position_1_player}
            }
    
    def finalize_4_player_positions(self, tournament_id: str, entity_id: str, level: str, final_matches: List[Dict]) -> Dict:
        """Finalize 4-player positioning: Winners Final winner = pos1, Final determines pos2/3"""
        print("   Finalizing 4-player positioning system")
        
        # Find matches by type
        semi_finals = [m for m in final_matches if m.get('matchType') == 'semi_final']
        winners_final = next((m for m in final_matches if m.get('matchType') == 'winners_final'), None)
        losers_final = next((m for m in final_matches if m.get('matchType') == 'losers_final'), None)
        final_match = next((m for m in final_matches if m.get('matchType') == 'final'), None)
        
        if len(semi_finals) != 2:
            return {'success': False, 'error': 'Expected 2 semi-final matches'}
        
        # Check if semi-finals are completed
        for sf in semi_finals:
            if sf.get('status') != 'completed':
                return {'success': False, 'error': f'Semi-final {sf.get("id")} not completed'}
        
        # Check if winners final exists and is completed
        if not winners_final:
            return {
                'success': False, 
                'error': 'Winners Final not found. Call next-round to generate Winners/Losers Finals.'
            }
        
        if winners_final.get('status') != 'completed':
            return {'success': False, 'error': 'Winners Final not completed'}
        
        # Position 1: Winner of Winners Final (based on points)
        position_1_player = self.get_match_winner_data(winners_final)
        if not position_1_player:
            return {'success': False, 'error': 'Cannot determine winner for Winners Final'}
        
        # Check if final match (Position 2/3) exists and is completed
        if final_match:
            if final_match.get('status') == 'completed':
                # Get positions 2 and 3 based on points
                position_2_player = self.get_match_winner_data(final_match)
                position_3_player = self.get_match_loser_data(final_match)
                
                if not position_2_player or not position_3_player:
                    return {'success': False, 'error': 'Cannot determine winner/loser for final match'}
                
                # Get eliminated player (loser of losers final based on points)
                eliminated_player = None
                if losers_final and losers_final.get('status') == 'completed':
                    eliminated_player = self.get_match_loser_data(losers_final)
                
                positions = {
                    '1': position_1_player,
                    '2': position_2_player,
                    '3': position_3_player
                }
                
                # CRITICAL: Save positions to bracket structure
                print(f"💾 Saving final positions to bracket for {entity_id}")
                # Convert positions dict to list format expected by update function
                winners_list = [position_1_player, position_2_player, position_3_player]
                update_success = self.update_bracket_with_community_winners(
                    tournament_id, entity_id, winners_list
                )
                
                if not update_success:
                    print(f"❌ Failed to save positions to bracket, but returning calculated positions")
                else:
                    print(f"✅ Successfully saved positions to tournament bracket")
                
                return {
                    'success': True,
                    'positions': positions,
                    'eliminated': eliminated_player,
                    'finalizedMatches': 5,  # 2 SF + winners final + losers final + final
                    'message': '4-player positioning completed',
                    'bracketUpdated': update_success
                }
            else:
                return {
                    'success': False,
                    'error': 'Final match not completed. Complete the final match first.',
                    'positions': {'1': position_1_player}
                }
        else:
            return {
                'success': False,
                'error': 'Final match not found. Call next-round to generate it.',
                'positions': {'1': position_1_player}
            }
    
    def finalize_2_player_positions(self, tournament_id: str, entity_id: str, level: str, final_matches: List[Dict]) -> Dict:
        """Finalize 2-player positioning: direct final"""
        final_match = final_matches[0]
        
        if final_match.get('status') != 'completed':
            return {'success': False, 'error': 'Final match not completed'}
        
        # Get positions based on points
        position_1_player = self.get_match_winner_data(final_match)
        position_2_player = self.get_match_loser_data(final_match)
        
        if not position_1_player or not position_2_player:
            return {'success': False, 'error': 'Cannot determine winner/loser for final match'}
        
        positions = {
            '1': position_1_player,
            '2': position_2_player,
            '3': None
        }
        
        # CRITICAL: Save positions to bracket structure
        print(f"💾 Saving final positions to bracket for {entity_id}")
        # Convert positions dict to list format expected by update function
        winners_list = [position_1_player, position_2_player, None]
        update_success = self.update_bracket_with_community_winners(
            tournament_id, entity_id, winners_list
        )
        
        if not update_success:
            print(f"❌ Failed to save positions to bracket, but returning calculated positions")
        else:
            print(f"✅ Successfully saved positions to tournament bracket")
        
        return {
            'success': True,
            'positions': positions,
            'finalizedMatches': 1,
            'message': '2-player positioning completed'
        }
    
    def finalize_1_player_positions(self, tournament_id: str, entity_id: str, level: str, final_matches: List[Dict]) -> Dict:
        """Finalize 1-player positioning: automatic position 1"""
        final_match = final_matches[0]
        # For 1-player match, player1 is always the winner
        position_1_player = self.get_winner_player_data(final_match, final_match.get('player1Id'))
        
        positions = {
            '1': position_1_player,
            '2': None,
            '3': None
        }
        
        # CRITICAL: Save positions to bracket structure
        print(f"💾 Saving final positions to bracket for {entity_id}")
        # Convert positions dict to list format expected by update function
        winners_list = [position_1_player, None, None]
        update_success = self.update_bracket_with_community_winners(
            tournament_id, entity_id, winners_list
        )
        
        if not update_success:
            print(f"❌ Failed to save positions to bracket, but returning calculated positions")
        else:
            print(f"✅ Successfully saved positions to tournament bracket")
        
        return {
            'success': True,
            'positions': positions,
            'finalizedMatches': 1,
            'message': '1-player positioning completed'
        }

    def check_bracket_scenario_completion(self, tournament_id: str, community_id: str, base_round: str) -> Dict:
        """
        Check if bracket scenario for a round is complete and needs final positioning match
        Returns: {'complete': bool, 'scenario': '2match'|'3match'|None, 'action': 'create_final'|'tournament_complete'|None}
        """
        print(f"🔍 Checking bracket scenario completion for round {base_round}")
        
        # Get all matches for this base round
        all_round_matches = []
        
        # Check for bracket matches
        wb_matches = self.get_round_matches(tournament_id, community_id, f"{base_round}_WB")
        lb_matches = self.get_round_matches(tournament_id, community_id, f"{base_round}_LB")
        semi_matches = self.get_round_matches(tournament_id, community_id, f"{base_round}_3WS")
        
        all_round_matches.extend(wb_matches)
        all_round_matches.extend(lb_matches)
        all_round_matches.extend(semi_matches)
        
        # Check for regular round matches if no bracket matches found
        if not all_round_matches:
            regular_matches = self.get_round_matches(tournament_id, community_id, base_round)
            all_round_matches.extend(regular_matches)
        
        if not all_round_matches:
            return {'complete': False, 'scenario': None, 'action': None}
        
        # Check if all matches are completed
        completed_matches = [m for m in all_round_matches if m.get('status') == 'completed']
        all_complete = len(completed_matches) == len(all_round_matches)
        
        print(f"   Found {len(all_round_matches)} matches, {len(completed_matches)} completed")
        
        if not all_complete:
            return {'complete': False, 'scenario': None, 'action': None}
        
        # Determine scenario and next action
        if wb_matches and lb_matches:
            # 2-match bracket scenario - need final positioning match
            print(f"   ✅ 2-match bracket scenario complete for {base_round}")
            
            # Check if final positioning match already exists
            final_matches = self.get_round_matches(tournament_id, community_id, "Community_Final_POSITIONING")
            if final_matches:
                return {'complete': True, 'scenario': '2match', 'action': 'tournament_complete'}
            else:
                return {'complete': True, 'scenario': '2match', 'action': 'create_final'}
                
        elif semi_matches:
            # 3-match scenario - need final positioning match  
            print(f"   ✅ 3-match semi scenario complete for {base_round}")
            
            # Check if final positioning match already exists
            final_matches = self.get_round_matches(tournament_id, community_id, "Community_Final_3WAY_FINAL")
            if final_matches:
                return {'complete': True, 'scenario': '3match', 'action': 'tournament_complete'}
            else:
                return {'complete': True, 'scenario': '3match', 'action': 'create_final'}
        else:
            # Regular matches - use standard progression
            return {'complete': True, 'scenario': 'regular', 'action': 'next_round'}
    
    def create_final_positioning_match_from_brackets(self, tournament_id: str, community_id: str, 
                                                   base_round: str, scenario: str) -> List[Dict]:
        """
        Create the final positioning match after bracket completion
        """
        print(f"🏁 Creating final positioning match for {scenario} scenario")
        
        if scenario == '2match':
            return self.create_final_match_from_two_brackets(tournament_id, community_id, base_round)
        elif scenario == '3match':
            return self.create_final_match_from_three_way(tournament_id, community_id, base_round)
        else:
            return []
    
    def create_final_match_from_two_brackets(self, tournament_id: str, community_id: str, base_round: str) -> List[Dict]:
        """
        Create final positioning match from 2-bracket scenario:
        Loser of Winners Bracket vs Winner of Losers Bracket
        """
        wb_matches = self.get_round_matches(tournament_id, community_id, f"{base_round}_WB")
        lb_matches = self.get_round_matches(tournament_id, community_id, f"{base_round}_LB")
        
        if not wb_matches or not lb_matches:
            print(f"❌ Could not find bracket matches for {base_round}")
            return []
        
        wb_match = wb_matches[0]
        lb_match = lb_matches[0]
        
        # Get players for final match
        wb_loser = self.get_winner_player_data(wb_match, wb_match.get('loserId'))
        lb_winner = self.get_winner_player_data(lb_match, lb_match.get('winnerId'))
        
        # Create final positioning match
        final_match_id = f"Community_Final_POSITIONING_{community_id}_match_1"
        final_match = self.create_comprehensive_match(
            final_match_id, tournament_id, "Community_Final_POSITIONING", community_id, 1,
            wb_loser, lb_winner, 'community'
        )
        
        print(f"   🆚 Final positioning match: {wb_loser['name']} vs {lb_winner['name']}")
        print(f"   🏆 Position 1: {self.get_winner_player_data(wb_match, wb_match.get('winnerId'))['name']} (Winner of Winners Bracket)")
        print(f"   ❌ Eliminated: {self.get_winner_player_data(lb_match, lb_match.get('loserId'))['name']} (Loser of Losers Bracket)")
        print(f"   📝 Note: Final match will determine positions 2 and 3")
        
        return [final_match]
    
    def create_final_match_from_three_way(self, tournament_id: str, community_id: str, base_round: str) -> List[Dict]:
        """
        Create final positioning match from 3-way scenario:
        Loser of Semi vs Player C (who didn't play in semi)
        """
        semi_matches = self.get_round_matches(tournament_id, community_id, f"{base_round}_3WS")
        
        if not semi_matches:
            print(f"❌ Could not find 3-way semi match for {base_round}")
            return []
        
        semi_match = semi_matches[0]
        
        # Get the loser who will play Player C
        semi_loser = self.get_winner_player_data(semi_match, semi_match.get('loserId'))
        
        # Find Player C (the one who didn't play in the semi)
        previous_round = self.get_previous_round(base_round)
        original_winners = self.get_community_round_winners(tournament_id, community_id, previous_round)
        
        player_c = None
        for winner in original_winners:
            if (winner['id'] != semi_match.get('player1Id') and
                winner['id'] != semi_match.get('player2Id')):
                player_c = winner
                break
        
        if not player_c:
            print(f"❌ Could not find Player C for 3-way final")
            return []
        
        # Create final positioning match
        final_match_id = f"Community_Final_3WAY_FINAL_{community_id}_match_1"
        final_match = self.create_comprehensive_match(
            final_match_id, tournament_id, "Community_Final_3WAY_FINAL", community_id, 1,
            semi_loser, player_c, 'community'
        )
        
        print(f"   🆚 Final positioning match: {semi_loser['name']} vs {player_c['name']}")
        print(f"   🏆 Position 1: {self.get_winner_player_data(semi_match, semi_match.get('winnerId'))['name']} (Winner of Semi)")
        
        return [final_match]
    
    def get_tournament_positions(self, tournament_id: str, entity_id: str, level: str) -> Dict:
        """
        Get final tournament positions (1st, 2nd, 3rd place) for a tournament
        """
        print(f"🏆 Getting tournament positions for {level} {entity_id}")
        
        positions = {
            'position_1': None,
            'position_2': None,  
            'position_3': None,
            'position_4': None,
            'tournament_complete': False
        }
        
        # Check different completion scenarios
        
        # 1. Check for 2-match bracket final positioning match completion
        final_positioning_matches = self.get_round_matches(tournament_id, entity_id, "Community_Final_POSITIONING")
        if final_positioning_matches:
            final_match = final_positioning_matches[0]
            if final_match.get('status') == 'completed':
                # Get bracket matches to determine positions
                base_round = self.find_base_round_for_brackets(tournament_id, entity_id)
                if base_round:
                    wb_matches = self.get_round_matches(tournament_id, entity_id, f"{base_round}_WB")
                    lb_matches = self.get_round_matches(tournament_id, entity_id, f"{base_round}_LB")
                    
                    if wb_matches and lb_matches:
                        wb_match = wb_matches[0]
                        lb_match = lb_matches[0]
                        
                        # Position 1: Winner of winners bracket
                        positions['position_1'] = self.get_winner_player_data(wb_match, wb_match.get('winnerId'))
                        
                        # Position 2: Winner of final positioning match
                        positions['position_2'] = self.get_winner_player_data(final_match, final_match.get('winnerId'))
                        
                        # Position 3: Loser of final positioning match
                        positions['position_3'] = self.get_winner_player_data(final_match, final_match.get('loserId'))
                        
                        # Eliminated: Loser of losers bracket (not tracked in positions)
                        eliminated_player = self.get_winner_player_data(lb_match, lb_match.get('loserId'))
                        positions['eliminated_players'] = [eliminated_player]
                        
                        positions['tournament_complete'] = True
                        return positions
        
        # 2. Check for 3-way final positioning match completion
        three_way_final_matches = self.get_round_matches(tournament_id, entity_id, "Community_Final_3WAY_FINAL")
        if three_way_final_matches:
            three_way_final = three_way_final_matches[0]
            if three_way_final.get('status') == 'completed':
                # Get semi match to determine position 1
                base_round = self.find_base_round_for_brackets(tournament_id, entity_id)
                if base_round:
                    semi_matches = self.get_round_matches(tournament_id, entity_id, f"{base_round}_3WS")
                    
                    if semi_matches:
                        semi_match = semi_matches[0]
                        
                        # Position 1: Winner of semi match
                        positions['position_1'] = self.get_winner_player_data(semi_match, semi_match.get('winnerId'))
                        
                        # Position 2: Winner of 3-way final
                        positions['position_2'] = self.get_winner_player_data(three_way_final, three_way_final.get('winnerId'))
                        
                        # Position 3: Loser of 3-way final
                        positions['position_3'] = self.get_winner_player_data(three_way_final, three_way_final.get('loserId'))
                        
                        positions['tournament_complete'] = True
                        return positions
        
        # 3. Check for standard Community_Final completion
        community_final_matches = self.get_round_matches(tournament_id, entity_id, "Community_Final")
        if community_final_matches:
            completed_finals = [m for m in community_final_matches if m.get('status') == 'completed']
            if len(completed_finals) >= 1:
                # Simple 3-person final or other standard completion
                # This would need more logic based on the specific final structure
                pass
        
        # 4. Check for partial completion (position 1 determined but not final match)
        base_round = self.find_base_round_for_brackets(tournament_id, entity_id)
        if base_round:
            wb_matches = self.get_round_matches(tournament_id, entity_id, f"{base_round}_WB")
            semi_matches = self.get_round_matches(tournament_id, entity_id, f"{base_round}_3WS")
            
            if wb_matches and wb_matches[0].get('status') == 'completed':
                # Position 1 from winners bracket
                positions['position_1'] = self.get_winner_player_data(wb_matches[0], wb_matches[0].get('winnerId'))
            elif semi_matches and semi_matches[0].get('status') == 'completed':
                # Position 1 from 3-way semi
                positions['position_1'] = self.get_winner_player_data(semi_matches[0], semi_matches[0].get('winnerId'))
        
        return positions
    
    def find_base_round_for_brackets(self, tournament_id: str, entity_id: str) -> str:
        """Find the base round that has bracket matches"""
        # Check common rounds for bracket matches
        for round_num in ['R2', 'R3', 'R4', 'R5']:
            wb_matches = self.get_round_matches(tournament_id, entity_id, f"{round_num}_WB")
            lb_matches = self.get_round_matches(tournament_id, entity_id, f"{round_num}_LB")  
            semi_matches = self.get_round_matches(tournament_id, entity_id, f"{round_num}_3WS")
            
            if wb_matches or lb_matches or semi_matches:
                return round_num
        
        return None
    
    def get_community_rounds_from_bracket(self, tournament_id: str, community_id: str) -> Dict:
        """Get all rounds that exist in the bracket for a specific community"""
        try:
            return self.get_community_rounds_from_bracket_firebase(tournament_id, community_id)
        except Exception as e:
            print(f"❌ Error getting community rounds from bracket: {e}")
            return {}
    
    def get_community_rounds_from_bracket_firebase(self, tournament_id: str, community_id: str) -> Dict:
        """Get community rounds from Firebase bracket using new level hierarchy"""
        try:
            bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
            bracket_doc = bracket_ref.get()
            
            if not bracket_doc.exists:
                print(f"   No bracket document found for tournament {tournament_id}")
                return {}
            
            bracket_data = bracket_doc.to_dict()
            
            # Navigate the new level hierarchy: rounds -> community -> community_id
            rounds_data = bracket_data.get('rounds', {})
            community_level = rounds_data.get('community', {})
            community_rounds = community_level.get(community_id, {})
            
            print(f"   Found {len(community_rounds)} rounds in bracket for {community_id}")
            return community_rounds
            
        except Exception as e:
            print(f"❌ Error getting community rounds from Firebase bracket: {e}")
            return {}
    
    def get_community_rounds_from_bracket_json(self, tournament_id: str, community_id: str) -> Dict:
        """Get community rounds from JSON bracket file using new level hierarchy"""
        try:
            # Find the latest bracket file
            bracket_files = [f for f in os.listdir('.') if f.startswith(f'tournament_brackets_{tournament_id}')]
            if not bracket_files:
                print(f"   No bracket file found for {tournament_id}")
                return {}
            
            bracket_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            bracket_file = bracket_files[0]
            
            with open(bracket_file, 'r', encoding='utf-8') as f:
                bracket_data = json.load(f)
            
            # Navigate the new level hierarchy: rounds -> community -> community_id
            rounds_data = bracket_data.get('rounds', {})
            community_level = rounds_data.get('community', {})
            community_rounds = community_level.get(community_id, {})
            
            print(f"   Found {len(community_rounds)} rounds in bracket for {community_id}")
            return community_rounds
            
        except Exception as e:
            print(f"❌ Error getting community rounds from JSON bracket: {e}")
            return {}
    
    def validate_round_fully_completed(self, tournament_id: str, community_id: str, round_name: str) -> bool:
        """Check if ALL matches in a specific round are completed (not just some)"""
        try:
            # Get all matches in this round
            round_matches = self.get_round_matches(tournament_id, community_id, round_name)
            
            if not round_matches:
                print(f"     No matches found for round {round_name}")
                return False
            
            # Check that ALL matches are completed
            total_matches = len(round_matches)
            completed_matches = 0
            
            for match in round_matches:
                if match.get('status') == 'completed':
                    completed_matches += 1
            
            is_fully_complete = completed_matches == total_matches
            print(f"     Round {round_name}: {completed_matches}/{total_matches} matches completed")
            
            return is_fully_complete
            
        except Exception as e:
            print(f"❌ Error validating round completion: {e}")
            return False
    
    def detect_current_round_from_matches(self, tournament_id: str, community_id: str, provided_round: str) -> str:
        """Fallback method to detect current round by analyzing matches directly"""
        try:
            print(f"   Fallback: Analyzing matches directly for {community_id}")
            
            # Get all matches for this community
            all_matches = self.get_all_community_matches_from_firebase(tournament_id, community_id)
            
            if not all_matches:
                print(f"   No matches found, using provided round: {provided_round}")
                return provided_round
            
            # Group matches by round and check completion
            rounds_completion = {}
            for match in all_matches:
                round_name = match.get('roundNumber', '')
                if round_name not in rounds_completion:
                    rounds_completion[round_name] = {'total': 0, 'completed': 0}
                
                rounds_completion[round_name]['total'] += 1
                if match.get('status') == 'completed':
                    rounds_completion[round_name]['completed'] += 1
            
            # Find highest fully completed round
            completed_rounds = []
            for round_name, stats in rounds_completion.items():
                if stats['completed'] == stats['total']:
                    completed_rounds.append(round_name)
                    print(f"   Round {round_name}: FULLY COMPLETE ({stats['completed']}/{stats['total']})")
                else:
                    print(f"   Round {round_name}: INCOMPLETE ({stats['completed']}/{stats['total']})")
            
            if completed_rounds:
                # Return highest completed round
                regular_completed = [r for r in completed_rounds if r.startswith('R') and '_' not in r]
                if regular_completed:
                    regular_completed.sort(key=lambda x: int(x[1:]) if x[1:].isdigit() else 0, reverse=True)
                    return regular_completed[0]
                else:
                    return completed_rounds[0]
            
            # No fully completed rounds
            print(f"   No fully completed rounds found, using provided: {provided_round}")
            return provided_round
            
        except Exception as e:
            print(f"❌ Error in fallback round detection: {e}")
            return provided_round
    
    def detect_actual_current_round(self, tournament_id: str, community_id: str, provided_round: str) -> str:
        """
        Auto-detect the actual current round state by checking bracket structure and ensuring ALL matches in each round are completed
        Key rule: ALL matches in a round must be completed before advancing to next round
        """
        try:
            print(f"🔍 Auto-detecting current round for {community_id} - checking bracket structure")
            
            # Get bracket structure to see what rounds exist
            bracket_rounds = self.get_community_rounds_from_bracket(tournament_id, community_id)
            if not bracket_rounds:
                print(f"   No bracket rounds found, checking matches directly")
                return self.detect_current_round_from_matches(tournament_id, community_id, provided_round)
            
            print(f"   Found rounds in bracket: {sorted(bracket_rounds.keys())}")
            
            # Check completion status - SPECIAL ROUNDS FIRST (SF, WF, Final), then regular rounds
            regular_rounds = [r for r in bracket_rounds.keys() if r.startswith('R') and '_' not in r]
            special_rounds = [r for r in bracket_rounds.keys() if not r.startswith('R') or '_' in r]
            
            # Sort special rounds by priority (Final > WF > SF)
            special_round_priority = {
                'Community_Final': 30, 'County_Final': 30, 'Regional_Final': 30, 'National_Final': 30, 'Special_Final': 30,
                'Community_WF': 20, 'County_WF': 20, 'Regional_WF': 20, 'National_WF': 20, 'Special_WF': 20,
                'Community_SF': 10, 'County_SF': 10, 'Regional_SF': 10, 'National_SF': 10, 'Special_SF': 10
            }
            special_rounds.sort(key=lambda x: special_round_priority.get(x, 0), reverse=True)
            
            # Sort regular rounds by number (R1, R2, R3, etc.)
            regular_rounds.sort(key=lambda x: int(x[1:]) if x[1:].isdigit() else 0, reverse=True)
            
            # Check special rounds FIRST (highest priority)
            for round_name in special_rounds:
                is_fully_complete = self.validate_round_fully_completed(tournament_id, community_id, round_name)
                print(f"   Special Round {round_name}: {'FULLY COMPLETE' if is_fully_complete else 'INCOMPLETE'}")
                
                if is_fully_complete:
                    print(f"   ✅ Found highest fully completed special round: {round_name}")
                    return round_name
            
            # Check regular rounds only if no special rounds are complete
            for round_name in regular_rounds:
                is_fully_complete = self.validate_round_fully_completed(tournament_id, community_id, round_name)
                print(f"   Regular Round {round_name}: {'FULLY COMPLETE' if is_fully_complete else 'INCOMPLETE'}")
                
                if is_fully_complete:
                    print(f"   ✅ Found highest fully completed regular round: {round_name}")
                    return round_name
            
            # If no rounds are fully complete, return the first round
            if regular_rounds:
                first_round = sorted([r for r in regular_rounds], key=lambda x: int(x[1:]) if x[1:].isdigit() else 0)[0]
                print(f"   No fully completed rounds found, starting from: {first_round}")
                return first_round
            
            # Fallback to provided round
            print(f"   No rounds detected, using provided round: {provided_round}")
            return provided_round
            
        except Exception as e:
            print(f"❌ Error detecting actual current round: {e}")
            return provided_round
    
    def get_all_community_matches_from_firebase(self, tournament_id: str, community_id: str) -> List[Dict]:
        """Get all matches for a community from Firebase subcollection"""
        try:
            # Get matches from tournaments/{tournament_id}/matches subcollection
            matches_collection = self.db.collection('tournaments').document(tournament_id).collection('matches')
            matches_query = matches_collection.where('communityId', '==', community_id)
            matches_docs = matches_query.get()
            
            matches = []
            for doc in matches_docs:
                match_data = doc.to_dict()
                match_data['id'] = doc.id  # Ensure match has ID
                matches.append(match_data)
            
            print(f"   Found {len(matches)} matches for community {community_id} in subcollection")
            return matches
        except Exception as e:
            print(f"❌ Error getting community matches from Firebase subcollection: {e}")
            return []
    
    def get_all_community_matches_from_json(self, tournament_id: str, community_id: str) -> List[Dict]:
        """Get all matches for a community from JSON files"""
        try:
            matches_files = [f for f in os.listdir('.') if f.startswith(f'matches_collection_{tournament_id}')]
            if not matches_files:
                return []
            
            matches_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            matches_file = matches_files[0]
            
            with open(matches_file, 'r', encoding='utf-8') as f:
                matches_data = json.load(f)
            
            community_matches = []
            for match_id, match_data in matches_data.items():
                if (match_data.get('tournamentId') == tournament_id and
                    match_data.get('communityId') == community_id):
                    community_matches.append(match_data)
            
            return community_matches
        except Exception as e:
            print(f"❌ Error getting community matches from JSON: {e}")
            return []
    
    def get_bracket_scenario_winners(self, tournament_id: str, community_id: str, base_round: str, scenario: str) -> List[Dict]:
        """
        Get winners for bracket scenarios (2match or 3match)
        This is used when we need to collect participants for the final positioning match
        """
        try:
            print(f"🏆 Getting bracket scenario winners for {scenario} in {base_round}")
            
            if scenario == '2match':
                # For 2-match scenario, get winner of WB and winner of LB
                wb_matches = self.get_round_matches(tournament_id, community_id, f"{base_round}_WB")
                lb_matches = self.get_round_matches(tournament_id, community_id, f"{base_round}_LB")
                
                winners = []
                
                # Get loser of winners bracket (will play in final)
                if wb_matches and wb_matches[0].get('status') == 'completed':
                    wb_loser = self.get_winner_player_data(wb_matches[0], wb_matches[0].get('loserId'))
                    winners.append(wb_loser)
                    print(f"   Added WB loser: {wb_loser['name']}")
                
                # Get winner of losers bracket (will play in final)
                if lb_matches and lb_matches[0].get('status') == 'completed':
                    lb_winner = self.get_winner_player_data(lb_matches[0], lb_matches[0].get('winnerId'))
                    winners.append(lb_winner)
                    print(f"   Added LB winner: {lb_winner['name']}")
                
                return winners
                
            elif scenario == '3match':
                # For 3-match scenario, get loser of semi and the waiting player C
                semi_matches = self.get_round_matches(tournament_id, community_id, f"{base_round}_3WS")
                
                if semi_matches and semi_matches[0].get('status') == 'completed':
                    semi_match = semi_matches[0]
                    semi_loser = self.get_winner_player_data(semi_match, semi_match.get('loserId'))
                    
                    # Find Player C (who didn't play in semi)
                    previous_round = self.get_previous_round(base_round)
                    original_winners = self.get_community_round_winners(tournament_id, community_id, previous_round)
                    
                    player_c = None
                    for winner in original_winners:
                        if (winner['id'] != semi_match.get('player1Id') and 
                            winner['id'] != semi_match.get('player2Id')):
                            player_c = winner
                            break
                    
                    if player_c:
                        print(f"   Added semi loser: {semi_loser['name']}")
                        print(f"   Added Player C: {player_c['name']}")
                        return [semi_loser, player_c]
                
            return []
            
        except Exception as e:
            print(f"❌ Error getting bracket scenario winners: {e}")
            return []
    
    def update_community_position_holders(self, tournament_id: str, community_id: str, round_number: str, level: str = 'community'):
        """
        Update or initialize position holders in the bracket structure
        Positions get filled as tournament progresses
        """
        try:
            self.update_position_holders_firebase(tournament_id, community_id, round_number, level)
        except Exception as e:
            print(f"❌ Error updating position holders: {e}")
    
    def update_level_position_holders(self, tournament_id: str, entity_id: str, round_number: str, level: str):
        """
        Update position holders for any tournament level
        """
        try:
            self.update_position_holders_firebase(tournament_id, entity_id, round_number, level)
        except Exception as e:
            print(f"❌ Error updating {level} position holders: {e}")
    
    def update_position_holders_firebase(self, tournament_id: str, entity_id: str, round_number: str, level: str = 'community'):
        """Update position holders in Firebase for any level"""
        try:
            bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
            
            # Determine the correct path based on level
            if level == 'national':
                positions_path = 'positions.national'
            else:
                positions_path = f'positions.{level}.{entity_id}'
            
            # Get current positions to avoid overwriting filled positions
            current_bracket = bracket_ref.get()
            current_positions = {}
            
            if current_bracket.exists:
                bracket_data = current_bracket.to_dict()
                if level == 'national':
                    current_positions = bracket_data.get('positions', {}).get('national', {})
                else:
                    level_positions = bracket_data.get('positions', {}).get(level, {})
                    current_positions = level_positions.get(entity_id, {}) if isinstance(level_positions, dict) else {}
            
            # Initialize position holders if not already set
            # Note: Only positions 1, 2, 3 are tracked (position 4 players are eliminated)
            position_structure = {
                'position_1': current_positions.get('position_1', {'player': None, 'round_determined': None, 'status': 'pending'}),
                'position_2': current_positions.get('position_2', {'player': None, 'round_determined': None, 'status': 'pending'}), 
                'position_3': current_positions.get('position_3', {'player': None, 'round_determined': None, 'status': 'pending'}),
                'tournament_complete': current_positions.get('tournament_complete', False),
                'last_round_played': round_number,
                'eliminated_players': current_positions.get('eliminated_players', [])
            }
            
            # Check if we can fill any positions based on current round
            self.fill_positions_from_current_state(tournament_id, entity_id, position_structure, level)
            
            # Update Firebase
            bracket_ref.update({
                positions_path: position_structure,
                'lastUpdated': firestore.SERVER_TIMESTAMP
            })
            
            print(f"✅ Position holders updated for {level} {entity_id}")
            
        except Exception as e:
            print(f"❌ Error updating position holders in Firebase: {e}")
    
    def update_position_holders_json(self, tournament_id: str, community_id: str, round_number: str):
        """Update position holders in JSON files for testing"""
        try:
            # Find the latest bracket file
            bracket_files = [f for f in os.listdir('.') if f.startswith(f'tournament_bracket_{tournament_id}')]
            if not bracket_files:
                print(f"❌ No bracket file found for tournament {tournament_id}")
                return
            
            bracket_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            bracket_file = bracket_files[0]
            
            # Read current bracket
            with open(bracket_file, 'r', encoding='utf-8') as f:
                bracket_data = json.load(f)
            
            # Initialize positions structure
            if 'positions' not in bracket_data:
                bracket_data['positions'] = {}
            
            if community_id not in bracket_data['positions']:
                bracket_data['positions'][community_id] = {}
            
            current_positions = bracket_data['positions'][community_id]
            
            position_structure = {
                'position_1': current_positions.get('position_1', {'player': None, 'round_determined': None, 'status': 'pending'}),
                'position_2': current_positions.get('position_2', {'player': None, 'round_determined': None, 'status': 'pending'}),
                'position_3': current_positions.get('position_3', {'player': None, 'round_determined': None, 'status': 'pending'}),
                'tournament_complete': current_positions.get('tournament_complete', False),
                'last_round_played': round_number,
                'eliminated_players': current_positions.get('eliminated_players', [])
            }
            
            # Check if we can fill any positions based on current state
            self.fill_positions_from_current_state(tournament_id, community_id, position_structure)
            
            # Update bracket data
            bracket_data['positions'][community_id] = position_structure
            bracket_data['lastUpdated'] = datetime.now().isoformat()
            
            # Write updated bracket
            with open(bracket_file, 'w', encoding='utf-8') as f:
                json.dump(bracket_data, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Position holders updated in JSON for community {community_id}")
            
        except Exception as e:
            print(f"❌ Error updating position holders in JSON: {e}")
    
    def fill_positions_from_current_state(self, tournament_id: str, entity_id: str, position_structure: Dict, level: str = 'community'):
        """
        Fill position holders based on current tournament state
        """
        try:
            # Handle special cases for small communities first
            if level == 'community':
                self.handle_small_community_positions(tournament_id, entity_id, position_structure)
            
            # Check for winners bracket completion (position 1)
            base_round = self.find_base_round_for_brackets(tournament_id, entity_id)
            if base_round:
                wb_matches = self.get_round_matches(tournament_id, entity_id, f"{base_round}_WB")
                if wb_matches and wb_matches[0].get('status') == 'completed':
                    winner = self.get_winner_player_data(wb_matches[0], wb_matches[0].get('winnerId'))
                    if position_structure['position_1']['player'] is None:
                        position_structure['position_1'] = {
                            'player': winner,
                            'round_determined': f"{base_round}_WB", 
                            'status': 'determined'
                        }
                        print(f"   🏆 Position 1 determined: {winner['name']}")
            
            # Check for 4-player Winners Final completion (position 1)
            wf_matches = self.get_round_matches(tournament_id, entity_id, "Community_WF")
            if wf_matches and wf_matches[0].get('status') == 'completed':
                winner = self.get_winner_player_data(wf_matches[0], wf_matches[0].get('winnerId'))
                if position_structure['position_1']['player'] is None:
                    position_structure['position_1'] = {
                        'player': winner,
                        'round_determined': "Community_WF",
                        'status': 'determined'
                    }
                    print(f"   🏆 Position 1 determined from Winners Final: {winner['name']}")
            
            # Check for 3-way semi completion (position 1)
            if base_round:
                semi_matches = self.get_round_matches(tournament_id, entity_id, f"{base_round}_3WS")
                if semi_matches and semi_matches[0].get('status') == 'completed':
                    winner = self.get_winner_player_data(semi_matches[0], semi_matches[0].get('winnerId'))
                    if position_structure['position_1']['player'] is None:
                        position_structure['position_1'] = {
                            'player': winner,
                            'round_determined': f"{base_round}_3WS",
                            'status': 'determined'
                        }
                        print(f"   🏆 Position 1 determined: {winner['name']}")
            
            # Check for final positioning match completion (positions 2 & 3)
            final_matches = self.get_round_matches(tournament_id, entity_id, "Community_Final_POSITIONING")
            if final_matches and final_matches[0].get('status') == 'completed':
                final_match = final_matches[0]
                winner = self.get_winner_player_data(final_match, final_match.get('winnerId'))
                loser = self.get_winner_player_data(final_match, final_match.get('loserId'))
                
                if position_structure['position_2']['player'] is None:
                    position_structure['position_2'] = {
                        'player': winner,
                        'round_determined': 'Community_Final_POSITIONING',
                        'status': 'determined'
                    }
                    print(f"   🥈 Position 2 determined: {winner['name']}")
                
                if position_structure['position_3']['player'] is None:
                    position_structure['position_3'] = {
                        'player': loser,
                        'round_determined': 'Community_Final_POSITIONING', 
                        'status': 'determined'
                    }
                    print(f"   🥉 Position 3 determined: {loser['name']}")
                
                # Track eliminated player from losers bracket
                if base_round:
                    lb_matches = self.get_round_matches(tournament_id, entity_id, f"{base_round}_LB")
                    if lb_matches and lb_matches[0].get('status') == 'completed':
                        lb_match = lb_matches[0]
                        eliminated_player = self.get_winner_player_data(lb_match, lb_match.get('loserId'))
                        if eliminated_player not in position_structure.get('eliminated_players', []):
                            position_structure['eliminated_players'].append(eliminated_player)
                            print(f"   ❌ Player eliminated: {eliminated_player['name']}")
            
            # Check for 3-way final completion (positions 2 & 3)
            three_way_final = self.get_round_matches(tournament_id, entity_id, "Community_Final_3WAY_FINAL")
            if three_way_final and three_way_final[0].get('status') == 'completed':
                final_match = three_way_final[0]
                winner = self.get_winner_player_data(final_match, final_match.get('winnerId'))
                loser = self.get_winner_player_data(final_match, final_match.get('loserId'))
                
                if position_structure['position_2']['player'] is None:
                    position_structure['position_2'] = {
                        'player': winner,
                        'round_determined': 'Community_Final_3WAY_FINAL',
                        'status': 'determined'
                    }
                    print(f"   🥈 Position 2 determined: {winner['name']}")
                
                if position_structure['position_3']['player'] is None:
                    position_structure['position_3'] = {
                        'player': loser,
                        'round_determined': 'Community_Final_3WAY_FINAL',
                        'status': 'determined'
                    }
                    print(f"   🥉 Position 3 determined: {loser['name']}")
            
            # Check if tournament is complete (depends on scenario)
            if level == 'community':
                # For communities, tournament completion depends on the specific scenario
                if position_structure.get('tournament_complete'):
                    # Already marked complete by small community handler
                    pass
                else:
                    # Standard completion check - at least position 1 and either 2 matches or 3 players
                    positions_filled = [
                        position_structure['position_1']['player'] is not None,
                        position_structure['position_2']['player'] is not None,
                        position_structure['position_3']['player'] is not None
                    ]
                    
                    if all(positions_filled):
                        position_structure['tournament_complete'] = True
                        print(f"   🏁 Tournament complete for {level} {entity_id}")
            else:
                # For other levels, standard completion check
                positions_filled = [
                    position_structure['position_1']['player'] is not None,
                    position_structure['position_2']['player'] is not None,
                    position_structure['position_3']['player'] is not None
                ]
                
                if all(positions_filled):
                    position_structure['tournament_complete'] = True
                    print(f"   🏁 Tournament complete for {level} {entity_id}")
            
        except Exception as e:
            print(f"❌ Error filling positions from current state: {e}")
    
    def handle_small_community_positions(self, tournament_id: str, community_id: str, position_structure: Dict):
        """
        Handle position filling for small communities (1, 2, or 3 players)
        """
        try:
            # Check for single player automatic advancement
            auto_matches = self.get_round_matches(tournament_id, community_id, "Community_Final")
            for match in auto_matches:
                if (match.get('isAutoAdvancement') == True and 
                    match.get('status') == 'completed' and
                    position_structure['position_1']['player'] is None):
                    
                    winner = self.get_winner_player_data(match, match.get('winnerId'))
                    position_structure['position_1'] = {
                        'player': winner,
                        'round_determined': 'AUTO_ADVANCEMENT',
                        'status': 'determined'
                    }
                    print(f"   🏆 Position 1 determined (single player): {winner['name']}")
                    # For single player, tournament is complete with only position 1
                    position_structure['tournament_complete'] = True
                    return
            
            # Check for two-player final
            for match in auto_matches:
                if (match.get('twoPlayerFinal') == True and 
                    match.get('status') == 'completed'):
                    
                    winner = self.get_winner_player_data(match, match.get('winnerId'))
                    loser = self.get_winner_player_data(match, match.get('loserId'))
                    
                    if position_structure['position_1']['player'] is None:
                        position_structure['position_1'] = {
                            'player': winner,
                            'round_determined': 'TWO_PLAYER_FINAL',
                            'status': 'determined'
                        }
                        print(f"   🏆 Position 1 determined (two-player final): {winner['name']}")
                    
                    if position_structure['position_2']['player'] is None:
                        position_structure['position_2'] = {
                            'player': loser,
                            'round_determined': 'TWO_PLAYER_FINAL',
                            'status': 'determined'
                        }
                        print(f"   🥈 Position 2 determined (two-player final): {loser['name']}")
                    
                    # For two players, tournament is complete with positions 1 & 2
                    position_structure['tournament_complete'] = True
                    return
            
            # Three-player scenario is handled by the main positioning logic
            # as it uses the same complex 3-match system as when we're left with 3 winners
            
        except Exception as e:
            print(f"❌ Error handling small community positions: {e}")
    
    # =================== TESTING MODE METHODS ===================
    
    def get_community_round_winners_from_json(self, tournament_id: str, community_id: str, round_number: str) -> List[Dict]:
        """Get winners from JSON files for testing"""
        try:
            print(f"📁 TESTING MODE: Reading {round_number} winners for {community_id} from JSON files")
            
            # Find the latest matches collection file
            matches_files = [f for f in os.listdir('.') if f.startswith(f'matches_collection_{tournament_id}')]
            if not matches_files:
                print(f"❌ No matches collection file found for tournament {tournament_id}")
                return []
            
            # Sort by modification time to get the latest
            matches_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            matches_file = matches_files[0]
            
            with open(matches_file, 'r', encoding='utf-8') as f:
                matches_data = json.load(f)
            
            # Find completed matches for this round and community
            winners = []
            for match_id, match_data in matches_data.items():
                if (match_data.get('tournamentId') == tournament_id and
                    match_data.get('communityId') == community_id and
                    match_data.get('roundNumber') == round_number and
                    match_data.get('status') == 'completed'):
                    
                    # Determine winner from points instead of winnerId
                    winner_data = self.get_match_winner_data(match_data)
                    if winner_data:
                        winners.append(winner_data)
                        print(f"   Found winner: {winner_data['name']} from match {match_id}")
            
            print(f"   ✅ Found {len(winners)} winners from {round_number} in community {community_id}")
            return winners
            
        except Exception as e:
            print(f"❌ Error reading winners from JSON: {e}")
            return []
    
    def get_community_round_losers_from_json(self, tournament_id: str, community_id: str, round_number: str) -> List[Dict]:
        """Get losers from JSON files for testing"""
        try:
            print(f"📁 TESTING MODE: Reading {round_number} losers for {community_id} from JSON files")
            
            # Find the latest matches collection file
            matches_files = [f for f in os.listdir('.') if f.startswith(f'matches_collection_{tournament_id}')]
            if not matches_files:
                print(f"❌ No matches collection file found for tournament {tournament_id}")
                return []
            
            # Sort by modification time to get the latest
            matches_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            matches_file = matches_files[0]
            
            with open(matches_file, 'r', encoding='utf-8') as f:
                matches_data = json.load(f)
            
            # Find completed matches for this round and community
            losers = []
            for match_id, match_data in matches_data.items():
                if (match_data.get('tournamentId') == tournament_id and
                    match_data.get('communityId') == community_id and
                    match_data.get('roundNumber') == round_number and
                    match_data.get('status') == 'completed'):
                    
                    # Determine loser from points instead of loserId
                    loser_data = self.get_match_loser_data(match_data)
                    if loser_data:
                        losers.append(loser_data)
                        print(f"   Found loser: {loser_data['name']} from match {match_id}")
            
            print(f"   ✅ Found {len(losers)} losers from {round_number} in community {community_id}")
            return losers
            
        except Exception as e:
            print(f"❌ Error reading losers from JSON: {e}")
            return []
    
    def finalize_community_winners(self, tournament_id: str, community_id: str) -> Dict:
        """
        Finalize community winners after all positioning matches are complete
        Determines positions 1, 2, and 3 based on match results
        """
        try:
            print(f"🏁 Finalizing winners for community {community_id}")
            print(f"🔍 POSITION LOGGING: Starting finalization process for tournament {tournament_id}, community {community_id}")
            
            # Get all Community_Final matches
            final_matches = self.get_community_final_matches(tournament_id, community_id)
            
            # Log the number of matches found
            print(f"🔍 POSITION LOGGING: Found {len(final_matches)} Community_Final matches")
            
            if not final_matches:
                print(f"🔍 POSITION LOGGING: No Community_Final matches found for community {community_id}")
                return {'success': False, 'error': 'No Community_Final matches found'}
            
            # Determine player count scenario based on number of matches
            player_count = 0
            if len(final_matches) == 1:
                player_count = 2  # Single match = 2 players
            elif len(final_matches) == 2:
                player_count = 3  # Two matches = 3 players
            elif len(final_matches) >= 3 and len(final_matches) <= 5:
                player_count = 4  # 3-5 matches = 4 players
            else:
                player_count = "many"  # More than 5 matches = many players
            
            print(f"🔍 POSITION LOGGING: Detected {player_count}-player community scenario based on {len(final_matches)} matches")
            
            # Check if all positioning matches are complete
            incomplete_matches = [m for m in final_matches if m.get('status') != 'completed']
            if incomplete_matches:
                print(f"🔍 POSITION LOGGING: Found {len(incomplete_matches)} incomplete matches: {[m['id'] for m in incomplete_matches]}")
                return {
                    'success': False,
                    'error': f'{len(incomplete_matches)} positioning matches still incomplete',
                    'incompleteMatches': [m['id'] for m in incomplete_matches]
                }
            
            print(f"🔍 POSITION LOGGING: All {len(final_matches)} matches are complete, proceeding to determine positions")
            
            # Determine final positions based on match results
            positions = self.determine_final_positions(final_matches)
            
            print(f"🔍 POSITION LOGGING: Determined {len(positions)} positions from match results")
            
            if not positions:
                print(f"🔍 POSITION LOGGING: No positions determined from matches")
                return {'success': False, 'error': 'Unable to determine final positions'}
            
            if len(positions) < 3:
                print(f"🔍 POSITION LOGGING: Only {len(positions)} positions determined, need 3")
                return {'success': False, 'error': 'Unable to determine final positions'}
            
            # Log positions before updating bracket
            print(f"🔍 POSITION LOGGING: Positions determined before updating bracket:")
            for i, pos in enumerate(positions):
                print(f"🔍 POSITION LOGGING: Position {i+1}: ID={pos.get('id')}, Name={pos.get('name')}")
            
            # Update bracket with community winners
            print(f"🔍 POSITION LOGGING: Updating bracket with {len(positions)} positions")
            update_success = self.update_bracket_with_community_winners(
                tournament_id, community_id, positions
            )
            
            if update_success:
                print(f"✅ Community {community_id} winners finalized:")
                print(f"   Position 1: {positions[0]['name']}")
                print(f"   Position 2: {positions[1]['name']}")
                print(f"   Position 3: {positions[2]['name']}")
                print(f"🔍 POSITION LOGGING: Successfully finalized all positions for {player_count}-player community {community_id}")
            else:
                print(f"🔍 POSITION LOGGING: Failed to update bracket with positions")
            
            # Prepare response with detailed position information
            response = {
                'success': update_success,
                'tournamentId': tournament_id,
                'communityId': community_id,
                'winners': {
                    'position1': positions[0],
                    'position2': positions[1],
                    'position3': positions[2]
                },
                'message': f'Community {community_id} tournament complete'
            }
            
            print(f"🔍 POSITION LOGGING: Returning response with success={update_success}")
            return response
            
        except Exception as e:
            print(f"❌ Error finalizing community winners: {e}")
            print(f"🔍 POSITION LOGGING: Exception in finalize_community_winners: {traceback.format_exc()}")
            return {'success': False, 'error': str(e)}
    
    def get_community_final_matches(self, tournament_id: str, community_id: str) -> List[Dict]:
        """Get all Community_Final matches for a community"""
        try:
            print(f"🔍 POSITION LOGGING: Retrieving Community_Final matches for tournament {tournament_id}, community {community_id}")
            
            if self.testing_mode:
                print(f"🔍 POSITION LOGGING: Using testing mode - retrieving matches from JSON files")
                matches_files = [f for f in os.listdir('.') if f.startswith(f'matches_collection_{tournament_id}')]
                
                if not matches_files:
                    print(f"🔍 POSITION LOGGING: No matches files found for tournament {tournament_id}")
                    return []
                
                matches_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                matches_file = matches_files[0]
                print(f"🔍 POSITION LOGGING: Using most recent matches file: {matches_file}")
                
                with open(matches_file, 'r', encoding='utf-8') as f:
                    matches_data = json.load(f)
                
                print(f"🔍 POSITION LOGGING: Loaded {len(matches_data)} total matches from file")
                
                final_matches = []
                for match_id, match_data in matches_data.items():
                    if (match_data.get('tournamentId') == tournament_id and
                        match_data.get('communityId') == community_id and
                        match_data.get('roundNumber') == 'Community_Final'):
                        final_matches.append(match_data)
                        print(f"🔍 POSITION LOGGING: Found Community_Final match: ID={match_id}, Type={match_data.get('matchType')}, Status={match_data.get('status')}")
                
                print(f"🔍 POSITION LOGGING: Found {len(final_matches)} Community_Final matches in JSON file")
                
                # Log match types for debugging
                match_types = {}
                for match in final_matches:
                    match_type = match.get('matchType', 'unknown')
                    if match_type not in match_types:
                        match_types[match_type] = 0
                    match_types[match_type] += 1
                
                print(f"🔍 POSITION LOGGING: Match types found: {match_types}")
                
                return final_matches
            else:
                # Firebase implementation
                print(f"🔍 POSITION LOGGING: Using Firestore - querying tournament matches")
                tournament_ref = self.db.collection('tournaments').document(tournament_id)
                tournament_doc = tournament_ref.get()
                
                if not tournament_doc.exists:
                    print(f"❌ Tournament {tournament_id} not found")
                    return []
                
                tournament_data = tournament_doc.to_dict()
                tournament_matches = tournament_data.get('matches', {})
                
                print(f"🔍 POSITION LOGGING: Filtering Community_Final matches from tournament matches")
                final_matches = []
                for match_id, match_data in tournament_matches.items():
                    if (match_data.get('tournamentId') == tournament_id and
                        match_data.get('communityId') == community_id and
                        match_data.get('roundNumber') == 'Community_Final'):
                        final_matches.append(match_data)
                
                print(f"🔍 POSITION LOGGING: Found {len(final_matches)} Community_Final matches in tournament")
                
                # Log match types for debugging
                match_types = {}
                for match in final_matches:
                    match_type = match.get('matchType', 'unknown')
                    if match_type not in match_types:
                        match_types[match_type] = 0
                    match_types[match_type] += 1
                    print(f"🔍 POSITION LOGGING: Found Community_Final match: ID={match.get('id')}, Type={match.get('matchType')}, Status={match.get('status')}")
                
                print(f"🔍 POSITION LOGGING: Match types found: {match_types}")
                
                return final_matches
                
        except Exception as e:
            print(f"❌ Error getting community final matches: {e}")
            print(f"🔍 POSITION LOGGING: Exception in get_community_final_matches: {traceback.format_exc()}")
            return []
    
    def determine_final_positions(self, final_matches: List[Dict]) -> List[Dict]:
        """
        Determine final positions based on positioning match results
        For 3-player or 4-player positioning systems
        """
        try:
            print(f"🔍 POSITION LOGGING: Determining final positions from {len(final_matches)} matches")
            
            # Identify match types
            position_1_match = None
            position_23_match = None
            
            # Log all matches for debugging
            for i, match in enumerate(final_matches):
                match_id = match.get('id', 'unknown')
                match_type = match.get('matchType', 'unknown')
                match_status = match.get('status', 'unknown')
                winner_id = match.get('winnerId', 'none')
                loser_id = match.get('loserId', 'none')
                print(f"🔍 POSITION LOGGING: Match {i+1}: ID={match_id}, Type={match_type}, Status={match_status}, Winner={winner_id}, Loser={loser_id}")
            
            # Identify specific position matches
            for match in final_matches:
                match_type = match.get('matchType', '')
                match_round = match.get('roundNumber', '')
                admin_notes = match.get('adminNotes', '')
                
                # Check for position 1 match (Winners Final)
                if ('position_1' in match_type or 
                    match_round == 'Community_WF' or 
                    'Winner = Position 1' in admin_notes or
                    match_type == 'winners_final'):
                    position_1_match = match
                    print(f"🔍 POSITION LOGGING: Found position_1 match: ID={match.get('id')}, Type={match_type}")
                
                # Check for position 2/3 match (Final positioning match)
                elif ('position_2_3' in match_type or 
                      'position_2/3' in match_type or 
                      match_round == 'Community_Final_POSITIONING' or
                      'Winner = Position 2, Loser = Position 3' in admin_notes or
                      match_type == 'final'):
                    position_23_match = match
                    print(f"🔍 POSITION LOGGING: Found position_2_3 match: ID={match.get('id')}, Type={match_type}")
            
            # Handle case where one or both position matches are not found
            if not position_1_match and not position_23_match:
                print("❌ Required positioning matches not found")
                print(f"🔍 POSITION LOGGING: Missing matches - position_1_match: {position_1_match is not None}, position_23_match: {position_23_match is not None}")
                return []
            
            # If only position_1_match is missing, try to find it from other matches
            if not position_1_match and position_23_match:
                print("⚠️ Position 1 match not found, attempting to determine from other matches")
                # Look for a match that has a player who isn't in the position_23_match
                for match in final_matches:
                    if match != position_23_match:
                        player1_id = match.get('player1Id')
                        player2_id = match.get('player2Id')
                        pos23_player1_id = position_23_match.get('player1Id')
                        pos23_player2_id = position_23_match.get('player2Id')
                        
                        # If this match has players not in position_23_match, it might be position_1_match
                        if (player1_id != pos23_player1_id and player1_id != pos23_player2_id) or \
                           (player2_id != pos23_player1_id and player2_id != pos23_player2_id):
                            position_1_match = match
                            print(f"🔍 POSITION LOGGING: Found potential position_1 match: ID={match.get('id')}")
                            break
            
            # If only position_23_match is missing, try to find it from other matches
            if position_1_match and not position_23_match:
                print("⚠️ Position 2/3 match not found, attempting to determine from other matches")
                # Look for a match that has a player who isn't in the position_1_match
                for match in final_matches:
                    if match != position_1_match:
                        position_23_match = match
                        print(f"🔍 POSITION LOGGING: Found potential position_2_3 match: ID={match.get('id')}")
                        break
            
            # Final check if we have at least one match to work with
            if not position_1_match and not position_23_match:
                print("❌ Could not determine any position matches")
                return []
            
            # Extract winners with error handling
            position_1_id = None
            position_2_id = None
            position_3_id = None
            
            # Get position 1 ID if position_1_match exists
            if position_1_match:
                # Always determine from points
                print(f"🔍 POSITION LOGGING: Determining position 1 from points")
                position_1_id = self.get_match_winner_id(position_1_match)
            
            # Get positions 2 and 3 IDs if position_23_match exists
            if position_23_match:
                # Always determine from points
                print(f"🔍 POSITION LOGGING: Determining positions 2 and 3 from points")
                position_2_id = self.get_match_winner_id(position_23_match)
                position_3_id = self.get_match_loser_id(position_23_match)
            
            print(f"🔍 POSITION LOGGING: Extracted position IDs - Position 1: {position_1_id}, Position 2: {position_2_id}, Position 3: {position_3_id}")
            
            # Get player data
            positions = []
            
            # Position 1
            if position_1_id:
                print(f"🔍 POSITION LOGGING: Getting player data for Position 1 (ID: {position_1_id})")
                player_data = self.get_winner_player_data(position_1_match, position_1_id)
                if player_data:
                    print(f"🔍 POSITION LOGGING: Position 1 player data retrieved: {player_data.get('name')}")
                    positions.append(player_data)
                else:
                    print(f"🔍 POSITION LOGGING: Failed to retrieve Position 1 player data for ID: {position_1_id}")
            else:
                print(f"🔍 POSITION LOGGING: Position 1 ID is missing or invalid")
            
            # Position 2
            if position_2_id:
                print(f"🔍 POSITION LOGGING: Getting player data for Position 2 (ID: {position_2_id})")
                player_data = self.get_winner_player_data(position_23_match, position_2_id)
                if player_data:
                    print(f"🔍 POSITION LOGGING: Position 2 player data retrieved: {player_data.get('name')}")
                    positions.append(player_data)
                else:
                    print(f"🔍 POSITION LOGGING: Failed to retrieve Position 2 player data for ID: {position_2_id}")
            else:
                print(f"🔍 POSITION LOGGING: Position 2 ID is missing or invalid")
            
            # Position 3
            if position_3_id and position_3_id != 'BYE':
                print(f"🔍 POSITION LOGGING: Getting player data for Position 3 (ID: {position_3_id})")
                player_data = self.get_winner_player_data(position_23_match, position_3_id)
                if player_data:
                    print(f"🔍 POSITION LOGGING: Position 3 player data retrieved: {player_data.get('name')}")
                    positions.append(player_data)
                else:
                    print(f"🔍 POSITION LOGGING: Failed to retrieve Position 3 player data for ID: {position_3_id}")
            else:
                print(f"🔍 POSITION LOGGING: Position 3 ID is missing, invalid, or BYE: {position_3_id}")
            
            print(f"🔍 POSITION LOGGING: Final positions determined: {len(positions)} positions")
            for i, pos in enumerate(positions):
                print(f"🔍 POSITION LOGGING: Position {i+1}: ID={pos.get('id')}, Name={pos.get('name')}")
            
            return positions
            
        except Exception as e:
            print(f"❌ Error determining final positions: {e}")
            print(f"🔍 POSITION LOGGING: Exception in determine_final_positions: {traceback.format_exc()}")
            return []
    
    def update_bracket_with_community_winners(self, tournament_id: str, community_id: str, 
                                            winners: List[Dict]) -> bool:
        """Store community winners in bracket for county level progression"""
        try:
            print(f"📝 Updating bracket with community {community_id} winners")
            
            # Validate winners list
            if not winners or not isinstance(winners, list):
                print(f"❌ Invalid winners data: {winners}")
                return False
                
            # Log detailed information about the winners being saved
            print(f"🔍 POSITION LOGGING: Number of winners being saved: {len(winners)}")
            print(f"🔍 POSITION LOGGING: Player count scenario: {len(winners)}-player community")
            
            # Log detailed position information with proper error handling
            position1_data = winners[0] if len(winners) > 0 else None
            position2_data = winners[1] if len(winners) > 1 else None
            position3_data = winners[2] if len(winners) > 2 else None
            
            if position1_data:
                print(f"🔍 POSITION LOGGING: Position 1 data: ID={position1_data.get('id')}, Name={position1_data.get('name')}")
            else:
                print(f"🔍 POSITION LOGGING: Position 1 data: None")
                
            if position2_data:
                print(f"🔍 POSITION LOGGING: Position 2 data: ID={position2_data.get('id')}, Name={position2_data.get('name')}")
            else:
                print(f"🔍 POSITION LOGGING: Position 2 data: None")
                
            if position3_data:
                print(f"🔍 POSITION LOGGING: Position 3 data: ID={position3_data.get('id')}, Name={position3_data.get('name')}")
            else:
                print(f"🔍 POSITION LOGGING: Position 3 data: None")
            
            # Firebase implementation - write directly to database
            print(f"🔍 POSITION LOGGING: Preparing Firestore update for tournament_brackets/{tournament_id}")
            
            # Create the positions update data structure with proper error handling
            positions_data = {}
            if position1_data:
                positions_data['1'] = position1_data
            if position2_data:
                positions_data['2'] = position2_data
            if position3_data:
                positions_data['3'] = position3_data
            
            update_data = {
                f'positions.community.{community_id}': positions_data,
                'lastUpdated': firestore.SERVER_TIMESTAMP
            }
            
            # Log the Firestore update operation
            print(f"🔍 POSITION LOGGING: Firestore update data structure:")
            print(f"🔍 POSITION LOGGING: Document path: tournament_brackets/{tournament_id}")
            print(f"🔍 POSITION LOGGING: Field path: positions.community.{community_id}")
            print(f"🔍 POSITION LOGGING: position 1 included: {'1' in positions_data}")
            print(f"🔍 POSITION LOGGING: position 2 included: {'2' in positions_data}")
            print(f"🔍 POSITION LOGGING: position 3 included: {'3' in positions_data}")
            
            # Perform the update
            bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
            try:
                bracket_ref.update(update_data)
                print(f"🔍 POSITION LOGGING: Firestore update operation completed successfully")
                
                # Verify the update by reading back the data
                try:
                    bracket_doc = bracket_ref.get()
                    if bracket_doc.exists:
                        bracket_data = bracket_doc.to_dict()
                        positions_read_back = bracket_data.get('positions', {}).get('community', {}).get(community_id, {})
                        print(f"🔍 POSITION LOGGING: Verification - Read back data from Firestore:")
                        print(f"🔍 POSITION LOGGING: position 1 exists: {positions_read_back.get('1') is not None}")
                        print(f"🔍 POSITION LOGGING: position 2 exists: {positions_read_back.get('2') is not None}")
                        print(f"🔍 POSITION LOGGING: position 3 exists: {positions_read_back.get('3') is not None}")
                    else:
                        print(f"🔍 POSITION LOGGING: Verification - Document does not exist after update")
                except Exception as verify_error:
                    print(f"🔍 POSITION LOGGING: Verification read failed: {verify_error}")
                
                return True
            except Exception as update_error:
                print(f"🔍 POSITION LOGGING: Firestore update operation failed: {update_error}")
                raise update_error
                
        except Exception as e:
            print(f"❌ Error updating bracket with winners: {e}")
            print(f"🔍 POSITION LOGGING: Exception stack trace: {traceback.format_exc()}")
            return False
    
    def get_county_data_from_community_winners(self, tournament_id: str) -> Dict[str, List[Dict]]:
        """Organize community winners by county"""
        try:
            print(f"🏛️ Organizing community winners by county")
            
            if self.testing_mode:
                bracket_files = [f for f in os.listdir('.') if f.startswith(f'tournament_brackets_{tournament_id}')]
                if not bracket_files:
                    return {}
                
                bracket_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                bracket_file = bracket_files[0]
                
                with open(bracket_file, 'r', encoding='utf-8') as f:
                    bracket_data = json.load(f)
                
                county_players = {}
                community_winners = bracket_data.get('winners', {}).get('community', {})
                
                for community_id, positions in community_winners.items():
                    # Get all three positions from each community
                    for position, player in positions.items():
                        if player and position.startswith('position'):
                            county_id = player.get('countyId')
                            if county_id:
                                if county_id not in county_players:
                                    county_players[county_id] = []
                                
                                # Add position info to player
                                player_with_position = player.copy()
                                player_with_position['communityPosition'] = int(position[-1])
                                county_players[county_id].append(player_with_position)
                
                return county_players
                
            else:
                # Firebase implementation
                bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
                bracket_doc = bracket_ref.get()
                
                if not bracket_doc.exists:
                    return {}
                
                bracket_data = bracket_doc.to_dict()
                county_players = {}
                
                community_winners = bracket_data.get('winners', {}).get('community', {})
                for community_id, positions in community_winners.items():
                    for position, player in positions.items():
                        if player and position.startswith('position'):
                            county_id = player.get('countyId')
                            if county_id:
                                if county_id not in county_players:
                                    county_players[county_id] = []
                                player_with_position = player.copy()
                                player_with_position['communityPosition'] = int(position[-1])
                                county_players[county_id].append(player_with_position)
                
                return county_players
                
        except Exception as e:
            print(f"❌ Error getting county data: {e}")
            return {}
    
    # =================== PLACEHOLDER METHODS FOR OTHER LEVELS ===================
    
    def initialize_county_level(self, tournament_id: str, county_ids: List[str] = None) -> Dict:
        """COUNTY INITIALIZATION: Start county level when communities complete"""
        try:
            print(f"🏛️ Initializing county level for tournament {tournament_id}")
            
            # Get county data from community winners
            county_players = self.get_county_data_from_community_winners(tournament_id)
            
            if not county_players:
                return {'success': False, 'error': 'No community winners found for county initialization'}
            
            # Filter by specific county IDs if provided
            if county_ids:
                county_players = {cid: players for cid, players in county_players.items() if cid in county_ids}
            
            all_matches = []
            counties_initialized = []
            
            for county_id, players in county_players.items():
                print(f"\n   Processing county {county_id} with {len(players)} players")
                
                # Sort players by community position for better pairing
                players.sort(key=lambda x: x.get('communityPosition', 999))
                
                # Pair players position-wise when possible
                county_matches = self.generate_county_initial_matches(
                    tournament_id, county_id, players
                )
                
                all_matches.extend(county_matches)
                counties_initialized.append(county_id)
                
                # Update bracket with county initialization
                self.update_bracket_county_status(tournament_id, county_id, 'active', len(players))
            
            # Write matches to collection
            write_success = self.write_level_matches(tournament_id, all_matches, 'county')
            
            return {
                'success': write_success,
                'tournamentId': tournament_id,
                'level': 'county',
                'countiesInitialized': counties_initialized,
                'totalMatches': len(all_matches),
                'message': f'Initialized {len(counties_initialized)} counties with {len(all_matches)} matches'
            }
            
        except Exception as e:
            print(f"❌ Error initializing county level: {e}")
            return {'success': False, 'error': str(e)}
    
    def generate_county_next_round(self, tournament_id: str, county_id: str, current_round: str) -> Dict:
        """COUNTY PROGRESSION: Generate next round for specific county"""
        try:
            print(f"🏛️ Generating county next round for {county_id}, current round: {current_round}")
            
            # Validate round completion
            validation_result = self.validate_round_completion(tournament_id, county_id, current_round, 'county')
            if not validation_result['success']:
                return validation_result
            
            # Get winners from current round
            county_winners = self.get_level_round_winners(tournament_id, county_id, current_round, 'county')
            
            if len(county_winners) < 1:
                return {'success': False, 'error': 'No winners found from current round'}
            
            # Determine if this is the final round
            if len(county_winners) <= 4:
                # County final - determine positions 1, 2, 3
                final_matches = self.generate_county_final_matches(
                    tournament_id, county_id, county_winners
                )
                
                # Write matches and update bracket
                write_success = self.write_level_matches(tournament_id, final_matches, 'county')
                
                # If this was the final, store winners in bracket
                if len(county_winners) == 3:
                    self.update_bracket_with_county_winners(tournament_id, county_id, county_winners)
                
                return {
                    'success': write_success,
                    'tournamentId': tournament_id,
                    'countyId': county_id,
                    'roundGenerated': 'County_Final',
                    'matchesGenerated': len(final_matches),
                    'isFinalRound': len(county_winners) <= 3
                }
            else:
                # Regular elimination round
                next_round = self.get_next_round_name(current_round)
                
                # Handle odd number of winners
                if len(county_winners) % 2 == 1:
                    # Get a loser from previous round
                    county_losers = self.get_level_round_losers(tournament_id, county_id, current_round, 'county')
                    if county_losers:
                        best_loser = self.select_best_loser(county_losers)
                        county_winners.append(best_loser)
                        print(f"   Added best-performing loser {best_loser['name']} to make even pairs")
                
                # Generate matches
                next_matches = self.generate_county_round_matches(
                    tournament_id, county_id, next_round, county_winners
                )
                
                # Write matches
                write_success = self.write_level_matches(tournament_id, next_matches, 'county')
                
                return {
                    'success': write_success,
                    'tournamentId': tournament_id,
                    'countyId': county_id,
                    'roundGenerated': next_round,
                    'matchesGenerated': len(next_matches),
                    'playersAdvancing': len(county_winners)
                }
                
        except Exception as e:
            print(f"❌ Error generating county next round: {e}")
            return {'success': False, 'error': str(e)}
    
    def generate_county_initial_matches(self, tournament_id: str, county_id: str, 
                                      players: List[Dict]) -> List[Dict]:
        """Generate initial matches for county level with position-based pairing"""
        print(f"      🎯 Generating initial matches for county {county_id}")
        matches = []
        
        # Group players by position
        position_groups = {1: [], 2: [], 3: []}
        for player in players:
            pos = player.get('communityPosition', 3)
            position_groups[pos].append(player)
        
        # First pair position 1s, then 2s, then 3s
        available_players = []
        for pos in [1, 2, 3]:
            available_players.extend(position_groups[pos])
        
        match_number = 1
        round_number = "County_R1"
        
        while len(available_players) >= 2:
            player1 = available_players.pop(0)
            player2 = available_players.pop(0)
            
            match_id = f"{round_number}_COUNTY_{county_id}_match_{match_number}"
            
            match = self.create_comprehensive_match(
                match_id, tournament_id, round_number, None, match_number,
                player1, player2, 'county'
            )
            
            # Add county-specific fields
            match['countyId'] = county_id
            match['positionPairing'] = f"{player1.get('communityPosition', 0)} vs {player2.get('communityPosition', 0)}"
            
            matches.append(match)
            print(f"         Match {match_number}: {player1['name']} (pos {player1.get('communityPosition', 0)}) vs {player2['name']} (pos {player2.get('communityPosition', 0)})")
            match_number += 1
        
        # Handle odd player with bye
        if available_players:
            bye_player = available_players[0]
            bye_match = self.create_county_bye_match(tournament_id, county_id, round_number, bye_player, match_number)
            matches.append(bye_match)
            print(f"         Bye Match: {bye_player['name']} (pos {bye_player.get('communityPosition', 0)}) gets automatic advancement")
        
        return matches
    
    def generate_county_round_matches(self, tournament_id: str, county_id: str,
                                    round_number: str, players: List[Dict]) -> List[Dict]:
        """Generate matches for county round"""
        matches = []
        available_players = players.copy()
        random.shuffle(available_players)
        
        match_number = 1
        while len(available_players) >= 2:
            player1 = available_players.pop(0)
            player2 = available_players.pop(0)
            
            match_id = f"{round_number}_COUNTY_{county_id}_match_{match_number}"
            
            match = self.create_comprehensive_match(
                match_id, tournament_id, round_number, None, match_number,
                player1, player2, 'county'
            )
            
            match['countyId'] = county_id
            matches.append(match)
            match_number += 1
        
        # Handle odd player
        if available_players:
            bye_player = available_players[0]
            bye_match = self.create_county_bye_match(tournament_id, county_id, round_number, bye_player, match_number)
            matches.append(bye_match)
        
        return matches
    
    def generate_county_final_matches(self, tournament_id: str, county_id: str,
                                    players: List[Dict]) -> List[Dict]:
        """Generate final matches for county with positioning"""
        print(f"🏆 Generating County Final for {county_id} with {len(players)} players")
        
        if len(players) == 3:
            return self.create_three_player_positioning_matches_county(tournament_id, county_id, players)
        elif len(players) == 4:
            return self.create_four_player_positioning_matches_county(tournament_id, county_id, players)
        else:
            # Continue elimination
            return self.generate_county_round_matches(tournament_id, county_id, "County_Final", players)
    
    def create_three_player_positioning_matches_county(self, tournament_id: str, county_id: str,
                                                     players: List[Dict]) -> List[Dict]:
        """Create 3-player positioning matches for county level"""
        matches = []
        round_number = "County_Final"
        
        # Same logic as community but for county level
        match1_id = f"{round_number}_COUNTY_{county_id}_SF1"
        match1 = self.create_comprehensive_match(
            match1_id, tournament_id, round_number, None, 1,
            players[0], players[1], 'county'
        )
        match1['countyId'] = county_id
        match1['matchType'] = 'semifinal'
        match1['positioningRound'] = 1
        matches.append(match1)
        
        # Position 1 decider
        match2_id = f"{round_number}_COUNTY_{county_id}_POS1"
        match2 = self.create_comprehensive_match(
            match2_id, tournament_id, round_number, None, 2,
            {'name': 'Winner of SF1', 'id': 'TBD_WINNER_SF1'},
            players[2], 'county'
        )
        match2['countyId'] = county_id
        match2['matchType'] = 'position_1_decider'
        match2['dependsOn'] = [match1_id]
        match2['positioningRound'] = 2
        matches.append(match2)
        
        # Position 2/3 decider
        match3_id = f"{round_number}_COUNTY_{county_id}_POS23"
        match3 = self.create_comprehensive_match(
            match3_id, tournament_id, round_number, None, 3,
            {'name': 'Loser of SF1', 'id': 'TBD_LOSER_SF1'},
            {'name': 'Loser of Position 1 Match', 'id': 'TBD_LOSER_POS1'},
            'county'
        )
        match3['countyId'] = county_id
        match3['matchType'] = 'position_2_3_decider'
        match3['dependsOn'] = [match1_id, match2_id]
        match3['positioningRound'] = 3
        matches.append(match3)
        
        return matches
    
    def create_four_player_positioning_matches_county(self, tournament_id: str, county_id: str,
                                                    players: List[Dict]) -> List[Dict]:
        """Create 4-player positioning matches for county level"""
        matches = []
        round_number = "County_Final"
        
        # Two semifinals
        for i in range(2):
            match_id = f"{round_number}_COUNTY_{county_id}_SF{i+1}"
            p1_idx = 0 if i == 0 else 1
            p2_idx = 3 if i == 0 else 2
            
            match = self.create_comprehensive_match(
                match_id, tournament_id, round_number, None, i+1,
                players[p1_idx], players[p2_idx], 'county'
            )
            match['countyId'] = county_id
            match['matchType'] = 'semifinal'
            match['positioningRound'] = 1
            matches.append(match)
        
        # Winners final
        match3_id = f"{round_number}_COUNTY_{county_id}_WF"
        match3 = self.create_comprehensive_match(
            match3_id, tournament_id, round_number, None, 3,
            {'name': 'Winner of SF1', 'id': 'TBD_WINNER_SF1'},
            {'name': 'Winner of SF2', 'id': 'TBD_WINNER_SF2'},
            'county'
        )
        match3['countyId'] = county_id
        match3['matchType'] = 'winners_final'
        match3['dependsOn'] = [f"{round_number}_COUNTY_{county_id}_SF1", f"{round_number}_COUNTY_{county_id}_SF2"]
        match3['positioningRound'] = 2
        matches.append(match3)
        
        # Losers match
        match4_id = f"{round_number}_COUNTY_{county_id}_LM"
        match4 = self.create_comprehensive_match(
            match4_id, tournament_id, round_number, None, 4,
            {'name': 'Loser of SF1', 'id': 'TBD_LOSER_SF1'},
            {'name': 'Loser of SF2', 'id': 'TBD_LOSER_SF2'},
            'county'
        )
        match4['countyId'] = county_id
        match4['matchType'] = 'losers_match'
        match4['dependsOn'] = [f"{round_number}_COUNTY_{county_id}_SF1", f"{round_number}_COUNTY_{county_id}_SF2"]
        match4['positioningRound'] = 2
        matches.append(match4)
        
        # Position 1 final
        match5_id = f"{round_number}_COUNTY_{county_id}_POS1"
        match5 = self.create_comprehensive_match(
            match5_id, tournament_id, round_number, None, 5,
            {'name': 'Winner of Winners Final', 'id': 'TBD_WINNER_WF'},
            {'name': 'Winner of Losers Match', 'id': 'TBD_WINNER_LM'},
            'county'
        )
        match5['countyId'] = county_id
        match5['matchType'] = 'position_1_final'
        match5['dependsOn'] = [match3_id, match4_id]
        match5['positioningRound'] = 3
        matches.append(match5)
        
        # Position 2/3 final
        match6_id = f"{round_number}_COUNTY_{county_id}_POS23"
        match6 = self.create_comprehensive_match(
            match6_id, tournament_id, round_number, None, 6,
            {'name': 'Loser of Winners Final', 'id': 'TBD_LOSER_WF'},
            {'name': 'Loser of Position 1 Final', 'id': 'TBD_LOSER_POS1'},
            'county'
        )
        match6['countyId'] = county_id
        match6['matchType'] = 'position_2_3_final'
        match6['dependsOn'] = [match3_id, match5_id]
        match6['positioningRound'] = 4
        matches.append(match6)
        
        return matches
    
    def create_county_bye_match(self, tournament_id: str, county_id: str, round_number: str,
                              bye_player: Dict, match_number: int) -> Dict:
        """Create bye match for county level"""
        match_id = f"{round_number}_COUNTY_{county_id}_BYE_{match_number}"
        
        bye_match = self.create_comprehensive_match(
            match_id, tournament_id, round_number, None, match_number,
            bye_player, {'id': 'BYE', 'name': 'BYE'}, 'county'
        )
        
        # Set as completed with bye player as winner
        bye_match.update({
            'countyId': county_id,
            'status': 'completed',
            'winnerId': bye_player['id'],
            'winnerName': bye_player['name'],
            'loserId': 'BYE',
            'loserName': 'BYE',
            'player1Score': 21,
            'player2Score': 0,
            'completedAt': datetime.now().isoformat(),
            'adminNotes': 'County level bye - automatic advancement'
        })
        
        return bye_match
    
    def update_bracket_county_status(self, tournament_id: str, county_id: str, 
                                   status: str, player_count: int) -> bool:
        """Update county status in bracket"""
        try:
            if self.testing_mode:
                bracket_files = [f for f in os.listdir('.') if f.startswith(f'tournament_brackets_{tournament_id}')]
                if not bracket_files:
                    return False
                
                bracket_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                bracket_file = bracket_files[0]
                
                with open(bracket_file, 'r', encoding='utf-8') as f:
                    bracket_data = json.load(f)
                
                if county_id not in bracket_data['bracketLevels']['county']:
                    bracket_data['bracketLevels']['county'][county_id] = {}
                
                bracket_data['bracketLevels']['county'][county_id].update({
                    'status': status,
                    'playerCount': player_count,
                    'currentRound': 'County_R1',
                    'lastUpdated': datetime.now().isoformat()
                })
                
                # Save updated bracket
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                new_bracket_file = f'tournament_brackets_{tournament_id}_{timestamp}.json'
                with open(new_bracket_file, 'w', encoding='utf-8') as f:
                    json.dump(bracket_data, f, indent=2, ensure_ascii=False)
                
                return True
            else:
                # Firebase implementation
                bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
                bracket_ref.update({
                    f'bracketLevels.county.{county_id}': {
                        'status': status,
                        'playerCount': player_count,
                        'currentRound': 'County_R1',
                        'lastUpdated': firestore.SERVER_TIMESTAMP
                    }
                })
                return True
                
        except Exception as e:
            print(f"❌ Error updating county status: {e}")
            return False
    
    def update_bracket_with_county_winners(self, tournament_id: str, county_id: str,
                                         winners: List[Dict]) -> bool:
        """Store county winners in bracket for regional progression"""
        try:
            print(f"🔍 POSITION LOGGING: Updating bracket with county winners - tournament: {tournament_id}, county: {county_id}")
            print(f"🔍 POSITION LOGGING: Number of county winners: {len(winners)}")
            
            # Log detailed winner information
            for i, winner in enumerate(winners[:3], 1):
                player_id = winner.get('id', 'Unknown')
                player_name = winner.get('name', 'Unknown')
                print(f"🔍 POSITION LOGGING: Position {i} data - Player ID: {player_id}, Name: {player_name}")
            
            if self.testing_mode:
                print(f"🔍 POSITION LOGGING: Running in testing mode, updating JSON file")
                bracket_files = [f for f in os.listdir('.') if f.startswith(f'tournament_brackets_{tournament_id}')]
                if not bracket_files:
                    print(f"🔍 POSITION LOGGING: No bracket files found for tournament {tournament_id}")
                    return False
                
                bracket_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                bracket_file = bracket_files[0]
                print(f"🔍 POSITION LOGGING: Using bracket file: {bracket_file}")
                
                with open(bracket_file, 'r', encoding='utf-8') as f:
                    bracket_data = json.load(f)
                
                if 'winners' not in bracket_data:
                    bracket_data['winners'] = {}
                if 'county' not in bracket_data['winners']:
                    bracket_data['winners']['county'] = {}
                
                # Create the data structure to save
                county_data = {
                    'position1': winners[0] if len(winners) > 0 else None,
                    'position2': winners[1] if len(winners) > 1 else None,
                    'position3': winners[2] if len(winners) > 2 else None,
                    'completedAt': datetime.now().isoformat()
                }
                print(f"🔍 POSITION LOGGING: County data structure being saved: {county_data}")
                
                bracket_data['winners']['county'][county_id] = county_data
                
                # Get region ID for these winners
                if winners and winners[0].get('regionId'):
                    region_id = winners[0]['regionId']
                    print(f"🔍 POSITION LOGGING: Region ID for these winners: {region_id}")
                    if region_id not in bracket_data['bracketLevels']['regional']:
                        print(f"🔍 POSITION LOGGING: Creating new region entry in bracket data")
                        bracket_data['bracketLevels']['regional'][region_id] = {
                            'regionId': region_id,
                            'counties': [],
                            'status': 'pending'
                        }
                    
                    if county_id not in bracket_data['bracketLevels']['regional'][region_id]['counties']:
                        print(f"🔍 POSITION LOGGING: Adding county {county_id} to region {region_id}")
                        bracket_data['bracketLevels']['regional'][region_id]['counties'].append(county_id)
                
                # Save updated bracket
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                new_bracket_file = f'tournament_brackets_{tournament_id}_{timestamp}.json'
                print(f"🔍 POSITION LOGGING: Saving updated bracket to {new_bracket_file}")
                with open(new_bracket_file, 'w', encoding='utf-8') as f:
                    json.dump(bracket_data, f, indent=2, ensure_ascii=False)
                
                print(f"🔍 POSITION LOGGING: Successfully updated bracket with county winners in testing mode")
                return True
            else:
                # Firebase implementation
                print(f"🔍 POSITION LOGGING: Running in production mode, updating Firestore")
                bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
                
                # Create the positions data structure  
                positions_data = {}
                if len(winners) > 0 and winners[0]:
                    positions_data['1'] = winners[0]
                if len(winners) > 1 and winners[1]:
                    positions_data['2'] = winners[1]
                if len(winners) > 2 and winners[2]:
                    positions_data['3'] = winners[2]
                
                print(f"🔍 POSITION LOGGING: County positions structure being saved to Firestore: {positions_data}")
                
                # Update Firestore with positions structure
                bracket_ref.update({
                    f'positions.county.{county_id}': positions_data,
                    'lastUpdated': firestore.SERVER_TIMESTAMP
                })
                
                # Verify the update by reading back the data
                try:
                    print(f"🔍 POSITION LOGGING: Verifying Firestore update for county winners")
                    updated_doc = bracket_ref.get().to_dict()
                    if updated_doc and 'positions' in updated_doc and 'county' in updated_doc['positions'] and county_id in updated_doc['positions']['county']:
                        print(f"🔍 POSITION LOGGING: Firestore update verified for county {county_id}")
                    else:
                        print(f"🔍 POSITION LOGGING: Warning - Could not verify Firestore update for county {county_id}")
                except Exception as verify_error:
                    print(f"🔍 POSITION LOGGING: Error verifying Firestore update: {verify_error}")
                
                print(f"🔍 POSITION LOGGING: Successfully updated bracket with county winners in Firestore")
                return True
                
        except Exception as e:
            print(f"❌ Error updating bracket with county winners: {e}")
            print(f"🔍 POSITION LOGGING: Exception in update_bracket_with_county_winners: {traceback.format_exc()}")
            return False
    
    def get_level_round_winners(self, tournament_id: str, entity_id: str, 
                              round_number: str, level: str) -> List[Dict]:
        """Get winners from specific level and round"""
        try:
            if self.testing_mode:
                matches_files = [f for f in os.listdir('.') if f.startswith(f'matches_collection_{tournament_id}')]
                if not matches_files:
                    return []
                
                matches_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                matches_file = matches_files[0]
                
                with open(matches_file, 'r', encoding='utf-8') as f:
                    matches_data = json.load(f)
                
                winners = []
                for match_id, match_data in matches_data.items():
                    if (match_data.get('tournamentId') == tournament_id and
                        match_data.get('roundNumber') == round_number and
                        match_data.get('tournamentLevel') == level and
                        match_data.get('status') == 'completed'):
                        
                        # Check entity match
                        entity_match = False
                        if level == 'county' and match_data.get('countyId') == entity_id:
                            entity_match = True
                        elif level == 'regional' and match_data.get('regionId') == entity_id:
                            entity_match = True
                        elif level == 'national':
                            entity_match = True
                        
                        if entity_match and match_data.get('winnerId'):
                            winner_data = self.get_winner_player_data(match_data, match_data['winnerId'])
                            winners.append(winner_data)
                
                return winners
            else:
                # Firebase implementation
                tournament_ref = self.db.collection('tournaments').document(tournament_id)
                tournament_doc = tournament_ref.get()
                
                if not tournament_doc.exists:
                    print(f"❌ Tournament {tournament_id} not found")
                    return []
                
                tournament_data = tournament_doc.to_dict()
                tournament_matches = tournament_data.get('matches', {})
                
                winners = []
                for match_id, match_data in tournament_matches.items():
                    if (match_data.get('tournamentId') == tournament_id and
                        match_data.get('roundNumber') == round_number and
                        match_data.get('tournamentLevel') == level and
                        match_data.get('status') == 'completed'):
                        
                        # Check entity match
                        entity_match = False
                        if level == 'county' and match_data.get('countyId') == entity_id:
                            entity_match = True
                        elif level == 'regional' and match_data.get('regionId') == entity_id:
                            entity_match = True
                        elif level == 'national':
                            entity_match = True
                        
                        if entity_match:
                            winner_id = match_data.get('winnerId')
                            if winner_id:
                                winner_data = self.get_winner_player_data(match_data, winner_id)
                                winners.append(winner_data)
                
                return winners
                
        except Exception as e:
            print(f"❌ Error getting level round winners: {e}")
            return []
    
    def get_level_round_losers(self, tournament_id: str, entity_id: str,
                             round_number: str, level: str) -> List[Dict]:
        """Get losers from specific level and round"""
        try:
            if self.testing_mode:
                matches_files = [f for f in os.listdir('.') if f.startswith(f'matches_collection_{tournament_id}')]
                if not matches_files:
                    return []
                
                matches_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                matches_file = matches_files[0]
                
                with open(matches_file, 'r', encoding='utf-8') as f:
                    matches_data = json.load(f)
                
                losers = []
                for match_id, match_data in matches_data.items():
                    if (match_data.get('tournamentId') == tournament_id and
                        match_data.get('roundNumber') == round_number and
                        match_data.get('tournamentLevel') == level and
                        match_data.get('status') == 'completed'):
                        
                        # Check entity match
                        entity_match = False
                        if level == 'county' and match_data.get('countyId') == entity_id:
                            entity_match = True
                        elif level == 'regional' and match_data.get('regionId') == entity_id:
                            entity_match = True
                        elif level == 'national':
                            entity_match = True
                        
                        if entity_match and match_data.get('loserId'):
                            loser_data = self.get_winner_player_data(match_data, match_data['loserId'])
                            losers.append(loser_data)
                
                return losers
            else:
                # Firebase implementation
                tournament_ref = self.db.collection('tournaments').document(tournament_id)
                tournament_doc = tournament_ref.get()
                
                if not tournament_doc.exists:
                    print(f"❌ Tournament {tournament_id} not found")
                    return []
                
                tournament_data = tournament_doc.to_dict()
                tournament_matches = tournament_data.get('matches', {})
                
                losers = []
                for match_id, match_data in tournament_matches.items():
                    if (match_data.get('tournamentId') == tournament_id and
                        match_data.get('roundNumber') == round_number and
                        match_data.get('tournamentLevel') == level and
                        match_data.get('status') == 'completed'):
                        
                        # Check entity match
                        entity_match = False
                        if level == 'county' and match_data.get('countyId') == entity_id:
                            entity_match = True
                        elif level == 'regional' and match_data.get('regionId') == entity_id:
                            entity_match = True
                        elif level == 'national':
                            entity_match = True
                        
                        if entity_match:
                            loser_id = match_data.get('loserId')
                            if loser_id:
                                loser_data = self.get_winner_player_data(match_data, loser_id)
                                losers.append(loser_data)
                
                return losers
                
        except Exception as e:
            print(f"❌ Error getting level round losers: {e}")
            return []
    
    def write_level_matches(self, tournament_id: str, matches: List[Dict], level: str) -> bool:
        """Write matches for any level"""
        try:
            if self.testing_mode:
                # Read existing matches
                matches_files = [f for f in os.listdir('.') if f.startswith(f'matches_collection_{tournament_id}')]
                existing_matches = {}
                
                if matches_files:
                    matches_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                    with open(matches_files[0], 'r', encoding='utf-8') as f:
                        existing_matches = json.load(f)
                
                # Add new matches
                for match in matches:
                    existing_matches[match['id']] = match
                
                # Save updated collection
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                new_matches_file = f'matches_collection_{tournament_id}_{timestamp}.json'
                with open(new_matches_file, 'w', encoding='utf-8') as f:
                    json.dump(existing_matches, f, indent=2, ensure_ascii=False)
                
                print(f"✅ Wrote {len(matches)} {level} matches to {new_matches_file}")
                return True
            else:
                # Firebase implementation - write to tournaments/{tournament_id}/matches subcollection
                matches_collection = self.db.collection('tournaments').document(tournament_id).collection('matches')
                
                # Write/update each match as a separate document in the subcollection
                for match in matches:
                    match_id = match['id']
                    match_ref = matches_collection.document(match_id)
                    match_ref.set(match)
                
                print(f"✅ Wrote {len(matches)} {level} matches to tournaments/{tournament_id}/matches subcollection")
                return True
                
        except Exception as e:
            print(f"❌ Error writing {level} matches: {e}")
            return False
    
    def get_next_round_name(self, current_round: str) -> str:
        #"\"\"Get next round name for any level\"\"\"
        if '_R' in current_round:
            parts = current_round.split('_R')
            prefix = parts[0]
            round_num = int(parts[1])
            return f"{prefix}_R{round_num + 1}"
        else:
            # Already at final
            return None
    
    def get_regional_data_from_county_winners(self, tournament_id: str) -> Dict[str, List[Dict]]:
        """Organize county winners by region"""
        try:
            print(f"🌍 Organizing county winners by region")
            
            if self.testing_mode:
                bracket_files = [f for f in os.listdir('.') if f.startswith(f'tournament_brackets_{tournament_id}')]
                if not bracket_files:
                    return {}
                
                bracket_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                bracket_file = bracket_files[0]
                
                with open(bracket_file, 'r', encoding='utf-8') as f:
                    bracket_data = json.load(f)
                
                regional_players = {}
                county_winners = bracket_data.get('winners', {}).get('county', {})
                
                for county_id, positions in county_winners.items():
                    for position, player in positions.items():
                        if player and position.startswith('position'):
                            region_id = player.get('regionId')
                            if region_id:
                                if region_id not in regional_players:
                                    regional_players[region_id] = []
                                
                                player_with_position = player.copy()
                                player_with_position['countyPosition'] = int(position[-1])
                                regional_players[region_id].append(player_with_position)
                
                return regional_players
            else:
                # Firebase implementation
                bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
                bracket_doc = bracket_ref.get()
                
                if not bracket_doc.exists:
                    return {}
                
                bracket_data = bracket_doc.to_dict()
                regional_players = {}
                
                county_winners = bracket_data.get('winners', {}).get('county', {})
                for county_id, positions in county_winners.items():
                    for position, player in positions.items():
                        if player and position.startswith('position'):
                            region_id = player.get('regionId')
                            if region_id:
                                if region_id not in regional_players:
                                    regional_players[region_id] = []
                                player_with_position = player.copy()
                                player_with_position['countyPosition'] = int(position[-1])
                                regional_players[region_id].append(player_with_position)
                
                return regional_players
                
        except Exception as e:
            print(f"❌ Error getting regional data: {e}")
            return {}
    
    def initialize_regional_level(self, tournament_id: str, region_ids: List[str] = None) -> Dict:
        """REGIONAL INITIALIZATION: Start regional level when counties complete"""
        try:
            print(f"🌍 Initializing regional level for tournament {tournament_id}")
            
            # Get regional data from county winners
            regional_players = self.get_regional_data_from_county_winners(tournament_id)
            
            if not regional_players:
                return {'success': False, 'error': 'No county winners found for regional initialization'}
            
            # Filter by specific region IDs if provided
            if region_ids:
                regional_players = {rid: players for rid, players in regional_players.items() if rid in region_ids}
            
            all_matches = []
            regions_initialized = []
            
            for region_id, players in regional_players.items():
                print(f"\n   Processing region {region_id} with {len(players)} players")
                
                # Sort players by county position for better pairing
                players.sort(key=lambda x: x.get('countyPosition', 999))
                
                # Generate initial regional matches
                regional_matches = self.generate_regional_initial_matches(
                    tournament_id, region_id, players
                )
                
                all_matches.extend(regional_matches)
                regions_initialized.append(region_id)
                
                # Update bracket with regional initialization
                self.update_bracket_regional_status(tournament_id, region_id, 'active', len(players))
            
            # Write matches to collection
            write_success = self.write_level_matches(tournament_id, all_matches, 'regional')
            
            return {
                'success': write_success,
                'tournamentId': tournament_id,
                'level': 'regional',
                'regionsInitialized': regions_initialized,
                'totalMatches': len(all_matches),
                'message': f'Initialized {len(regions_initialized)} regions with {len(all_matches)} matches'
            }
            
        except Exception as e:
            print(f"❌ Error initializing regional level: {e}")
            return {'success': False, 'error': str(e)}
    
    def generate_regional_next_round(self, tournament_id: str, region_id: str, current_round: str) -> Dict:
        """REGIONAL PROGRESSION: Generate next round for specific region"""
        try:
            print(f"🌍 Generating regional next round for {region_id}, current round: {current_round}")
            
            # Validate round completion
            validation_result = self.validate_round_completion(tournament_id, region_id, current_round, 'regional')
            if not validation_result['success']:
                return validation_result
            
            # Get winners from current round
            regional_winners = self.get_level_round_winners(tournament_id, region_id, current_round, 'regional')
            
            if len(regional_winners) < 1:
                return {'success': False, 'error': 'No winners found from current round'}
            
            # Determine if this is the final round
            if len(regional_winners) <= 4:
                # Regional final - determine positions 1, 2, 3
                final_matches = self.generate_regional_final_matches(
                    tournament_id, region_id, regional_winners
                )
                
                # Write matches
                write_success = self.write_level_matches(tournament_id, final_matches, 'regional')
                
                # If this was the final, store winners in bracket
                if len(regional_winners) == 3:
                    self.update_bracket_with_regional_winners(tournament_id, region_id, regional_winners)
                
                return {
                    'success': write_success,
                    'tournamentId': tournament_id,
                    'regionId': region_id,
                    'roundGenerated': 'Regional_Final',
                    'matchesGenerated': len(final_matches),
                    'isFinalRound': len(regional_winners) <= 3
                }
            else:
                # Regular elimination round
                next_round = self.get_next_round_name(current_round)
                
                # Handle odd number of winners
                if len(regional_winners) % 2 == 1:
                    # Get a loser from previous round
                    regional_losers = self.get_level_round_losers(tournament_id, region_id, current_round, 'regional')
                    if regional_losers:
                        best_loser = self.select_best_loser(regional_losers)
                        regional_winners.append(best_loser)
                        print(f"   Added best-performing loser {best_loser['name']} to make even pairs")
                
                # Generate matches
                next_matches = self.generate_regional_round_matches(
                    tournament_id, region_id, next_round, regional_winners
                )
                
                # Write matches
                write_success = self.write_level_matches(tournament_id, next_matches, 'regional')
                
                return {
                    'success': write_success,
                    'tournamentId': tournament_id,
                    'regionId': region_id,
                    'roundGenerated': next_round,
                    'matchesGenerated': len(next_matches),
                    'playersAdvancing': len(regional_winners)
                }
                
        except Exception as e:
            print(f"❌ Error generating regional next round: {e}")
            return {'success': False, 'error': str(e)}
    
    def generate_regional_initial_matches(self, tournament_id: str, region_id: str,
                                        players: List[Dict]) -> List[Dict]:
        """Generate initial matches for regional level"""
        print(f"      🎯 Generating initial matches for region {region_id}")
        matches = []
        
        # Group players by position
        position_groups = {1: [], 2: [], 3: []}
        for player in players:
            pos = player.get('countyPosition', 3)
            position_groups[pos].append(player)
        
        # First pair position 1s, then 2s, then 3s
        available_players = []
        for pos in [1, 2, 3]:
            available_players.extend(position_groups[pos])
        
        match_number = 1
        round_number = "Regional_R1"
        
        while len(available_players) >= 2:
            player1 = available_players.pop(0)
            player2 = available_players.pop(0)
            
            match_id = f"{round_number}_REGIONAL_{region_id}_match_{match_number}"
            
            match = self.create_comprehensive_match(
                match_id, tournament_id, round_number, None, match_number,
                player1, player2, 'regional'
            )
            
            # Add regional-specific fields
            match['regionId'] = region_id
            match['positionPairing'] = f"{player1.get('countyPosition', 0)} vs {player2.get('countyPosition', 0)}"
            
            matches.append(match)
            print(f"         Match {match_number}: {player1['name']} (pos {player1.get('countyPosition', 0)}) vs {player2['name']} (pos {player2.get('countyPosition', 0)})")
            match_number += 1
        
        # Handle odd player with bye
        if available_players:
            bye_player = available_players[0]
            bye_match = self.create_regional_bye_match(tournament_id, region_id, round_number, bye_player, match_number)
            matches.append(bye_match)
            print(f"         Bye Match: {bye_player['name']} (pos {bye_player.get('countyPosition', 0)}) gets automatic advancement")
        
        return matches
    
    def generate_regional_round_matches(self, tournament_id: str, region_id: str,
                                      round_number: str, players: List[Dict]) -> List[Dict]:
        """Generate matches for regional round"""
        matches = []
        available_players = players.copy()
        random.shuffle(available_players)
        
        match_number = 1
        while len(available_players) >= 2:
            player1 = available_players.pop(0)
            player2 = available_players.pop(0)
            
            match_id = f"{round_number}_REGIONAL_{region_id}_match_{match_number}"
            
            match = self.create_comprehensive_match(
                match_id, tournament_id, round_number, None, match_number,
                player1, player2, 'regional'
            )
            
            match['regionId'] = region_id
            matches.append(match)
            match_number += 1
        
        # Handle odd player
        if available_players:
            bye_player = available_players[0]
            bye_match = self.create_regional_bye_match(tournament_id, region_id, round_number, bye_player, match_number)
            matches.append(bye_match)
        
        return matches
    
    def generate_regional_final_matches(self, tournament_id: str, region_id: str,
                                      players: List[Dict]) -> List[Dict]:
        """Generate final matches for regional with positioning"""
        print(f"🏆 Generating Regional Final for {region_id} with {len(players)} players")
        
        if len(players) == 3:
            return self.create_three_player_positioning_matches_regional(tournament_id, region_id, players)
        elif len(players) == 4:
            return self.create_four_player_positioning_matches_regional(tournament_id, region_id, players)
        else:
            # Continue elimination
            return self.generate_regional_round_matches(tournament_id, region_id, "Regional_Final", players)
    
    def create_three_player_positioning_matches_regional(self, tournament_id: str, region_id: str,
                                                       players: List[Dict]) -> List[Dict]:
        """Create 3-player positioning matches for regional level"""
        matches = []
        round_number = "Regional_Final"
        
        # Same logic as other levels but for regional
        match1_id = f"{round_number}_REGIONAL_{region_id}_SF1"
        match1 = self.create_comprehensive_match(
            match1_id, tournament_id, round_number, None, 1,
            players[0], players[1], 'regional'
        )
        match1['regionId'] = region_id
        match1['matchType'] = 'semifinal'
        match1['positioningRound'] = 1
        matches.append(match1)
        
        # Position 1 decider
        match2_id = f"{round_number}_REGIONAL_{region_id}_POS1"
        match2 = self.create_comprehensive_match(
            match2_id, tournament_id, round_number, None, 2,
            {'name': 'Winner of SF1', 'id': 'TBD_WINNER_SF1'},
            players[2], 'regional'
        )
        match2['regionId'] = region_id
        match2['matchType'] = 'position_1_decider'
        match2['dependsOn'] = [match1_id]
        match2['positioningRound'] = 2
        matches.append(match2)
        
        # Position 2/3 decider
        match3_id = f"{round_number}_REGIONAL_{region_id}_POS23"
        match3 = self.create_comprehensive_match(
            match3_id, tournament_id, round_number, None, 3,
            {'name': 'Loser of SF1', 'id': 'TBD_LOSER_SF1'},
            {'name': 'Loser of Position 1 Match', 'id': 'TBD_LOSER_POS1'},
            'regional'
        )
        match3['regionId'] = region_id
        match3['matchType'] = 'position_2_3_decider'
        match3['dependsOn'] = [match1_id, match2_id]
        match3['positioningRound'] = 3
        matches.append(match3)
        
        return matches
    
    def create_four_player_positioning_matches_regional(self, tournament_id: str, region_id: str,
                                                      players: List[Dict]) -> List[Dict]:
        """Create 4-player positioning matches for regional level"""
        matches = []
        round_number = "Regional_Final"
        
        # Two semifinals
        for i in range(2):
            match_id = f"{round_number}_REGIONAL_{region_id}_SF{i+1}"
            p1_idx = 0 if i == 0 else 1
            p2_idx = 3 if i == 0 else 2
            
            match = self.create_comprehensive_match(
                match_id, tournament_id, round_number, None, i+1,
                players[p1_idx], players[p2_idx], 'regional'
            )
            match['regionId'] = region_id
            match['matchType'] = 'semifinal'
            match['positioningRound'] = 1
            matches.append(match)
        
        # Winners final
        match3_id = f"{round_number}_REGIONAL_{region_id}_WF"
        match3 = self.create_comprehensive_match(
            match3_id, tournament_id, round_number, None, 3,
            {'name': 'Winner of SF1', 'id': 'TBD_WINNER_SF1'},
            {'name': 'Winner of SF2', 'id': 'TBD_WINNER_SF2'},
            'regional'
        )
        match3['regionId'] = region_id
        match3['matchType'] = 'winners_final'
        match3['dependsOn'] = [f"{round_number}_REGIONAL_{region_id}_SF1", f"{round_number}_REGIONAL_{region_id}_SF2"]
        match3['positioningRound'] = 2
        matches.append(match3)
        
        # Losers match
        match4_id = f"{round_number}_REGIONAL_{region_id}_LM"
        match4 = self.create_comprehensive_match(
            match4_id, tournament_id, round_number, None, 4,
            {'name': 'Loser of SF1', 'id': 'TBD_LOSER_SF1'},
            {'name': 'Loser of SF2', 'id': 'TBD_LOSER_SF2'},
            'regional'
        )
        match4['regionId'] = region_id
        match4['matchType'] = 'losers_match'
        match4['dependsOn'] = [f"{round_number}_REGIONAL_{region_id}_SF1", f"{round_number}_REGIONAL_{region_id}_SF2"]
        match4['positioningRound'] = 2
        matches.append(match4)
        
        # Position 1 final
        match5_id = f"{round_number}_REGIONAL_{region_id}_POS1"
        match5 = self.create_comprehensive_match(
            match5_id, tournament_id, round_number, None, 5,
            {'name': 'Winner of Winners Final', 'id': 'TBD_WINNER_WF'},
            {'name': 'Winner of Losers Match', 'id': 'TBD_WINNER_LM'},
            'regional'
        )
        match5['regionId'] = region_id
        match5['matchType'] = 'position_1_final'
        match5['dependsOn'] = [match3_id, match4_id]
        match5['positioningRound'] = 3
        matches.append(match5)
        
        # Position 2/3 final
        match6_id = f"{round_number}_REGIONAL_{region_id}_POS23"
        match6 = self.create_comprehensive_match(
            match6_id, tournament_id, round_number, None, 6,
            {'name': 'Loser of Winners Final', 'id': 'TBD_LOSER_WF'},
            {'name': 'Loser of Position 1 Final', 'id': 'TBD_LOSER_POS1'},
            'regional'
        )
        match6['regionId'] = region_id
        match6['matchType'] = 'position_2_3_final'
        match6['dependsOn'] = [match3_id, match5_id]
        match6['positioningRound'] = 4
        matches.append(match6)
        
        return matches
    
    def create_regional_bye_match(self, tournament_id: str, region_id: str, round_number: str,
                                bye_player: Dict, match_number: int) -> Dict:
        """Create bye match for regional level"""
        match_id = f"{round_number}_REGIONAL_{region_id}_BYE_{match_number}"
        
        bye_match = self.create_comprehensive_match(
            match_id, tournament_id, round_number, None, match_number,
            bye_player, {'id': 'BYE', 'name': 'BYE'}, 'regional'
        )
        
        # Set as completed with bye player as winner
        bye_match.update({
            'regionId': region_id,
            'status': 'completed',
            'winnerId': bye_player['id'],
            'winnerName': bye_player['name'],
            'loserId': 'BYE',
            'loserName': 'BYE',
            'player1Score': 21,
            'player2Score': 0,
            'completedAt': datetime.now().isoformat(),
            'adminNotes': 'Regional level bye - automatic advancement'
        })
        
        return bye_match
    
    def update_bracket_regional_status(self, tournament_id: str, region_id: str,
                                     status: str, player_count: int) -> bool:
        """Update regional status in bracket"""
        try:
            if self.testing_mode:
                bracket_files = [f for f in os.listdir('.') if f.startswith(f'tournament_brackets_{tournament_id}')]
                if not bracket_files:
                    return False
                
                bracket_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                bracket_file = bracket_files[0]
                
                with open(bracket_file, 'r', encoding='utf-8') as f:
                    bracket_data = json.load(f)
                
                if region_id not in bracket_data['bracketLevels']['regional']:
                    bracket_data['bracketLevels']['regional'][region_id] = {}
                
                bracket_data['bracketLevels']['regional'][region_id].update({
                    'status': status,
                    'playerCount': player_count,
                    'currentRound': 'Regional_R1',
                    'lastUpdated': datetime.now().isoformat()
                })
                
                # Save updated bracket
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                new_bracket_file = f'tournament_brackets_{tournament_id}_{timestamp}.json'
                with open(new_bracket_file, 'w', encoding='utf-8') as f:
                    json.dump(bracket_data, f, indent=2, ensure_ascii=False)
                
                return True
            else:
                # Firebase implementation
                bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
                bracket_ref.update({
                    f'bracketLevels.regional.{region_id}': {
                        'status': status,
                        'playerCount': player_count,
                        'currentRound': 'Regional_R1',
                        'lastUpdated': firestore.SERVER_TIMESTAMP
                    }
                })
                return True
                
        except Exception as e:
            print(f"❌ Error updating regional status: {e}")
            return False
    
    def update_bracket_with_regional_winners(self, tournament_id: str, region_id: str,
                                           winners: List[Dict]) -> bool:
        """Store regional winners in bracket for national progression"""
        try:
            print(f"🔍 POSITION LOGGING: Updating bracket with regional winners - tournament: {tournament_id}, region: {region_id}")
            print(f"🔍 POSITION LOGGING: Number of regional winners: {len(winners)}")
            
            # Log detailed winner information
            for i, winner in enumerate(winners[:3], 1):
                player_id = winner.get('id', 'Unknown')
                player_name = winner.get('name', 'Unknown')
                print(f"🔍 POSITION LOGGING: Position {i} data - Player ID: {player_id}, Name: {player_name}")
            
            if self.testing_mode:
                print(f"🔍 POSITION LOGGING: Running in testing mode, updating JSON file")
                bracket_files = [f for f in os.listdir('.') if f.startswith(f'tournament_brackets_{tournament_id}')]
                if not bracket_files:
                    print(f"🔍 POSITION LOGGING: No bracket files found for tournament {tournament_id}")
                    return False
                
                bracket_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                bracket_file = bracket_files[0]
                print(f"🔍 POSITION LOGGING: Using bracket file: {bracket_file}")
                
                with open(bracket_file, 'r', encoding='utf-8') as f:
                    bracket_data = json.load(f)
                
                if 'winners' not in bracket_data:
                    bracket_data['winners'] = {}
                if 'regional' not in bracket_data['winners']:
                    bracket_data['winners']['regional'] = {}
                
                # Create the data structure to save
                regional_data = {
                    'position1': winners[0] if len(winners) > 0 else None,
                    'position2': winners[1] if len(winners) > 1 else None,
                    'position3': winners[2] if len(winners) > 2 else None,
                    'completedAt': datetime.now().isoformat()
                }
                print(f"🔍 POSITION LOGGING: Regional data structure being saved: {regional_data}")
                
                bracket_data['winners']['regional'][region_id] = regional_data
                
                # Mark national level as ready if all regions complete
                bracket_data['bracketLevels']['national']['status'] = 'pending'
                print(f"🔍 POSITION LOGGING: Setting national level status to 'pending'")
                
                # Save updated bracket
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                new_bracket_file = f'tournament_brackets_{tournament_id}_{timestamp}.json'
                print(f"🔍 POSITION LOGGING: Saving updated bracket to {new_bracket_file}")
                with open(new_bracket_file, 'w', encoding='utf-8') as f:
                    json.dump(bracket_data, f, indent=2, ensure_ascii=False)
                
                print(f"🔍 POSITION LOGGING: Successfully updated bracket with regional winners in testing mode")
                return True
            else:
                # Firebase implementation
                print(f"🔍 POSITION LOGGING: Running in production mode, updating Firestore")
                bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
                
                # Create the positions data structure
                positions_data = {}
                if len(winners) > 0 and winners[0]:
                    positions_data['1'] = winners[0]
                if len(winners) > 1 and winners[1]:
                    positions_data['2'] = winners[1]
                if len(winners) > 2 and winners[2]:
                    positions_data['3'] = winners[2]
                
                print(f"🔍 POSITION LOGGING: Regional positions structure being saved to Firestore: {positions_data}")
                
                # Update Firestore with positions structure
                update_data = {
                    f'positions.regional.{region_id}': positions_data,
                    'bracketLevels.national.status': 'pending',
                    'lastUpdated': firestore.SERVER_TIMESTAMP
                }
                print(f"🔍 POSITION LOGGING: Setting national level status to 'pending' in Firestore")
                bracket_ref.update(update_data)
                
                # Verify the update by reading back the data
                try:
                    print(f"🔍 POSITION LOGGING: Verifying Firestore update for regional winners")
                    updated_doc = bracket_ref.get().to_dict()
                    if updated_doc and 'positions' in updated_doc and 'regional' in updated_doc['positions'] and region_id in updated_doc['positions']['regional']:
                        print(f"🔍 POSITION LOGGING: Firestore update verified for region {region_id}")
                    else:
                        print(f"🔍 POSITION LOGGING: Warning - Could not verify Firestore update for region {region_id}")
                except Exception as verify_error:
                    print(f"🔍 POSITION LOGGING: Error verifying Firestore update: {verify_error}")
                
                print(f"🔍 POSITION LOGGING: Successfully updated bracket with regional winners in Firestore")
                return True
                
        except Exception as e:
            print(f"❌ Error updating bracket with regional winners: {e}")
            print(f"🔍 POSITION LOGGING: Exception in update_bracket_with_regional_winners: {traceback.format_exc()}")
            return False
    
    def initialize_national_level(self, tournament_id: str) -> Dict:
        """NATIONAL INITIALIZATION: Start national level when all regions complete"""
        try:
            print(f"🇰🇪 Initializing national level for tournament {tournament_id}")
            
            # Get all regional winners
            national_players = self.get_national_data_from_regional_winners(tournament_id)
            
            if not national_players:
                return {'success': False, 'error': 'No regional winners found for national initialization'}
            
            print(f"   Found {len(national_players)} players for national level")
            
            # Sort players by regional position for better pairing
            national_players.sort(key=lambda x: x.get('regionalPosition', 999))
            
            # Generate initial national matches
            national_matches = self.generate_national_initial_matches(
                tournament_id, national_players
            )
            
            # Update bracket with national initialization
            self.update_bracket_national_status(tournament_id, 'active', len(national_players))
            
            # Write matches to collection
            write_success = self.write_level_matches(tournament_id, national_matches, 'national')
            
            return {
                'success': write_success,
                'tournamentId': tournament_id,
                'level': 'national',
                'totalMatches': len(national_matches),
                'playersInNational': len(national_players),
                'message': f'Initialized national level with {len(national_matches)} matches'
            }
            
        except Exception as e:
            print(f"❌ Error initializing national level: {e}")
            return {'success': False, 'error': str(e)}
    
    def generate_national_next_round(self, tournament_id: str, current_round: str) -> Dict:
        """NATIONAL PROGRESSION: Generate next round for national level"""
        try:
            print(f"🇰🇪 Generating national next round, current round: {current_round}")
            
            # Validate round completion
            validation_result = self.validate_round_completion(tournament_id, 'national', current_round, 'national')
            if not validation_result['success']:
                return validation_result
            
            # Get winners from current round
            national_winners = self.get_level_round_winners(tournament_id, 'national', current_round, 'national')
            
            if len(national_winners) < 1:
                return {'success': False, 'error': 'No winners found from current round'}
            
            # Determine if this is the final round
            if len(national_winners) <= 4:
                # National final - determine positions 1, 2, 3
                final_matches = self.generate_national_final_matches(
                    tournament_id, national_winners
                )
                
                # Write matches
                write_success = self.write_level_matches(tournament_id, final_matches, 'national')
                
                # If this was the final, store winners in bracket
                if len(national_winners) == 3:
                    self.update_bracket_with_national_winners(tournament_id, national_winners)
                
                return {
                    'success': write_success,
                    'tournamentId': tournament_id,
                    'roundGenerated': 'National_Final',
                    'matchesGenerated': len(final_matches),
                    'isFinalRound': len(national_winners) <= 3,
                    'tournamentComplete': len(national_winners) == 3
                }
            else:
                # Regular elimination round
                next_round = self.get_next_round_name(current_round)
                
                # Handle odd number of winners
                if len(national_winners) % 2 == 1:
                    # Get a loser from previous round
                    national_losers = self.get_level_round_losers(tournament_id, 'national', current_round, 'national')
                    if national_losers:
                        best_loser = self.select_best_loser(national_losers)
                        national_winners.append(best_loser)
                        print(f"   Added best-performing loser {best_loser['name']} to make even pairs")
                
                # Generate matches
                next_matches = self.generate_national_round_matches(
                    tournament_id, next_round, national_winners
                )
                
                # Write matches
                write_success = self.write_level_matches(tournament_id, next_matches, 'national')
                
                return {
                    'success': write_success,
                    'tournamentId': tournament_id,
                    'roundGenerated': next_round,
                    'matchesGenerated': len(next_matches),
                    'playersAdvancing': len(national_winners)
                }
                
        except Exception as e:
            print(f"❌ Error generating national next round: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_national_data_from_regional_winners(self, tournament_id: str) -> List[Dict]:
        """Get all regional winners for national level"""
        try:
            print(f"🇰🇪 Collecting regional winners for national level")
            
            if self.testing_mode:
                bracket_files = [f for f in os.listdir('.') if f.startswith(f'tournament_brackets_{tournament_id}')]
                if not bracket_files:
                    return []
                
                bracket_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                bracket_file = bracket_files[0]
                
                with open(bracket_file, 'r', encoding='utf-8') as f:
                    bracket_data = json.load(f)
                
                national_players = []
                regional_winners = bracket_data.get('winners', {}).get('regional', {})
                
                for region_id, positions in regional_winners.items():
                    for position, player in positions.items():
                        if player and position.startswith('position'):
                            player_with_position = player.copy()
                            player_with_position['regionalPosition'] = int(position[-1])
                            player_with_position['regionId'] = region_id
                            national_players.append(player_with_position)
                
                return national_players
            else:
                # Firebase implementation
                bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
                bracket_doc = bracket_ref.get()
                
                if not bracket_doc.exists:
                    return []
                
                bracket_data = bracket_doc.to_dict()
                national_players = []
                
                regional_winners = bracket_data.get('winners', {}).get('regional', {})
                for region_id, positions in regional_winners.items():
                    for position, player in positions.items():
                        if player and position.startswith('position'):
                            player_with_position = player.copy()
                            player_with_position['regionalPosition'] = int(position[-1])
                            player_with_position['regionId'] = region_id
                            national_players.append(player_with_position)
                
                return national_players
                
        except Exception as e:
            print(f"❌ Error getting national data: {e}")
            return []
    
    def generate_national_initial_matches(self, tournament_id: str, players: List[Dict]) -> List[Dict]:
        """Generate initial matches for national level"""
        print(f"      🎯 Generating initial national matches")
        matches = []
        
        # Group players by position
        position_groups = {1: [], 2: [], 3: []}
        for player in players:
            pos = player.get('regionalPosition', 3)
            position_groups[pos].append(player)
        
        # First pair position 1s, then 2s, then 3s
        available_players = []
        for pos in [1, 2, 3]:
            available_players.extend(position_groups[pos])
        
        match_number = 1
        round_number = "National_R1"
        
        while len(available_players) >= 2:
            player1 = available_players.pop(0)
            player2 = available_players.pop(0)
            
            match_id = f"{round_number}_NATIONAL_match_{match_number}"
            
            match = self.create_comprehensive_match(
                match_id, tournament_id, round_number, None, match_number,
                player1, player2, 'national'
            )
            
            # Add national-specific fields
            match['positionPairing'] = f"{player1.get('regionalPosition', 0)} vs {player2.get('regionalPosition', 0)}"
            match['player1Region'] = player1.get('regionId', 'Unknown')
            match['player2Region'] = player2.get('regionId', 'Unknown')
            
            matches.append(match)
            print(f"         Match {match_number}: {player1['name']} (pos {player1.get('regionalPosition', 0)}, region {player1.get('regionId', 'Unknown')}) vs {player2['name']} (pos {player2.get('regionalPosition', 0)}, region {player2.get('regionId', 'Unknown')})")
            match_number += 1
        
        # Handle odd player with bye
        if available_players:
            bye_player = available_players[0]
            bye_match = self.create_national_bye_match(tournament_id, round_number, bye_player, match_number)
            matches.append(bye_match)
            print(f"         Bye Match: {bye_player['name']} (pos {bye_player.get('regionalPosition', 0)}) gets automatic advancement")
        
        return matches
    
    def generate_national_round_matches(self, tournament_id: str, round_number: str,
                                      players: List[Dict]) -> List[Dict]:
        """Generate matches for national round"""
        matches = []
        available_players = players.copy()
        random.shuffle(available_players)
        
        match_number = 1
        while len(available_players) >= 2:
            player1 = available_players.pop(0)
            player2 = available_players.pop(0)
            
            match_id = f"{round_number}_NATIONAL_match_{match_number}"
            
            match = self.create_comprehensive_match(
                match_id, tournament_id, round_number, None, match_number,
                player1, player2, 'national'
            )
            
            matches.append(match)
            match_number += 1
        
        # Handle odd player
        if available_players:
            bye_player = available_players[0]
            bye_match = self.create_national_bye_match(tournament_id, round_number, bye_player, match_number)
            matches.append(bye_match)
        
        return matches
    
    def generate_national_final_matches(self, tournament_id: str, players: List[Dict]) -> List[Dict]:
        """Generate final matches for national with positioning"""
        print(f"🏆 Generating National Final with {len(players)} players")
        
        if len(players) == 3:
            return self.create_three_player_positioning_matches_national(tournament_id, players)
        elif len(players) == 4:
            return self.create_four_player_positioning_matches_national(tournament_id, players)
        else:
            # Continue elimination
            return self.generate_national_round_matches(tournament_id, "National_Final", players)
    
    def create_three_player_positioning_matches_national(self, tournament_id: str,
                                                       players: List[Dict]) -> List[Dict]:
        """Create 3-player positioning matches for national level"""
        matches = []
        round_number = "National_Final"
        
        # Same logic as other levels but for national
        match1_id = f"{round_number}_NATIONAL_SF1"
        match1 = self.create_comprehensive_match(
            match1_id, tournament_id, round_number, None, 1,
            players[0], players[1], 'national'
        )
        match1['matchType'] = 'semifinal'
        match1['positioningRound'] = 1
        matches.append(match1)
        
        # Position 1 decider
        match2_id = f"{round_number}_NATIONAL_POS1"
        match2 = self.create_comprehensive_match(
            match2_id, tournament_id, round_number, None, 2,
            {'name': 'Winner of SF1', 'id': 'TBD_WINNER_SF1'},
            players[2], 'national'
        )
        match2['matchType'] = 'position_1_decider'
        match2['dependsOn'] = [match1_id]
        match2['positioningRound'] = 2
        matches.append(match2)
        
        # Position 2/3 decider
        match3_id = f"{round_number}_NATIONAL_POS23"
        match3 = self.create_comprehensive_match(
            match3_id, tournament_id, round_number, None, 3,
            {'name': 'Loser of SF1', 'id': 'TBD_LOSER_SF1'},
            {'name': 'Loser of Position 1 Match', 'id': 'TBD_LOSER_POS1'},
            'national'
        )
        match3['matchType'] = 'position_2_3_decider'
        match3['dependsOn'] = [match1_id, match2_id]
        match3['positioningRound'] = 3
        matches.append(match3)
        
        return matches
    
    def create_four_player_positioning_matches_national(self, tournament_id: str,
                                                      players: List[Dict]) -> List[Dict]:
        """Create 4-player positioning matches for national level"""
        matches = []
        round_number = "National_Final"
        
        # Two semifinals
        for i in range(2):
            match_id = f"{round_number}_NATIONAL_SF{i+1}"
            p1_idx = 0 if i == 0 else 1
            p2_idx = 3 if i == 0 else 2
            
            match = self.create_comprehensive_match(
                match_id, tournament_id, round_number, None, i+1,
                players[p1_idx], players[p2_idx], 'national'
            )
            match['matchType'] = 'semifinal'
            match['positioningRound'] = 1
            matches.append(match)
        
        # Winners final
        match3_id = f"{round_number}_NATIONAL_WF"
        match3 = self.create_comprehensive_match(
            match3_id, tournament_id, round_number, None, 3,
            {'name': 'Winner of SF1', 'id': 'TBD_WINNER_SF1'},
            {'name': 'Winner of SF2', 'id': 'TBD_WINNER_SF2'},
            'national'
        )
        match3['matchType'] = 'winners_final'
        match3['dependsOn'] = [f"{round_number}_NATIONAL_SF1", f"{round_number}_NATIONAL_SF2"]
        match3['positioningRound'] = 2
        matches.append(match3)
        
        # Losers match
        match4_id = f"{round_number}_NATIONAL_LM"
        match4 = self.create_comprehensive_match(
            match4_id, tournament_id, round_number, None, 4,
            {'name': 'Loser of SF1', 'id': 'TBD_LOSER_SF1'},
            {'name': 'Loser of SF2', 'id': 'TBD_LOSER_SF2'},
            'national'
        )
        match4['matchType'] = 'losers_match'
        match4['dependsOn'] = [f"{round_number}_NATIONAL_SF1", f"{round_number}_NATIONAL_SF2"]
        match4['positioningRound'] = 2
        matches.append(match4)
        
        # Position 1 final
        match5_id = f"{round_number}_NATIONAL_POS1"
        match5 = self.create_comprehensive_match(
            match5_id, tournament_id, round_number, None, 5,
            {'name': 'Winner of Winners Final', 'id': 'TBD_WINNER_WF'},
            {'name': 'Winner of Losers Match', 'id': 'TBD_WINNER_LM'},
            'national'
        )
        match5['matchType'] = 'position_1_final'
        match5['dependsOn'] = [match3_id, match4_id]
        match5['positioningRound'] = 3
        matches.append(match5)
        
        # Position 2/3 final
        match6_id = f"{round_number}_NATIONAL_POS23"
        match6 = self.create_comprehensive_match(
            match6_id, tournament_id, round_number, None, 6,
            {'name': 'Loser of Winners Final', 'id': 'TBD_LOSER_WF'},
            {'name': 'Loser of Position 1 Final', 'id': 'TBD_LOSER_POS1'},
            'national'
        )
        match6['matchType'] = 'position_2_3_final'
        match6['dependsOn'] = [match3_id, match5_id]
        match6['positioningRound'] = 4
        matches.append(match6)
        
        return matches
    
    def create_national_bye_match(self, tournament_id: str, round_number: str,
                                bye_player: Dict, match_number: int) -> Dict:
        """Create bye match for national level"""
        match_id = f"{round_number}_NATIONAL_BYE_{match_number}"
        
        bye_match = self.create_comprehensive_match(
            match_id, tournament_id, round_number, None, match_number,
            bye_player, {'id': 'BYE', 'name': 'BYE'}, 'national'
        )
        
        # Set as completed with bye player as winner
        bye_match.update({
            'status': 'completed',
            'winnerId': bye_player['id'],
            'winnerName': bye_player['name'],
            'loserId': 'BYE',
            'loserName': 'BYE',
            'player1Score': 21,
            'player2Score': 0,
            'completedAt': datetime.now().isoformat(),
            'adminNotes': 'National level bye - automatic advancement'
        })
        
        return bye_match
    
    def update_bracket_national_status(self, tournament_id: str, status: str, player_count: int) -> bool:
        """Update national status in bracket"""
        try:
            if self.testing_mode:
                bracket_files = [f for f in os.listdir('.') if f.startswith(f'tournament_brackets_{tournament_id}')]
                if not bracket_files:
                    return False
                
                bracket_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                bracket_file = bracket_files[0]
                
                with open(bracket_file, 'r', encoding='utf-8') as f:
                    bracket_data = json.load(f)
                
                bracket_data['bracketLevels']['national'].update({
                    'status': status,
                    'playerCount': player_count,
                    'currentRound': 'National_R1',
                    'lastUpdated': datetime.now().isoformat()
                })
                
                # Save updated bracket
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                new_bracket_file = f'tournament_brackets_{tournament_id}_{timestamp}.json'
                with open(new_bracket_file, 'w', encoding='utf-8') as f:
                    json.dump(bracket_data, f, indent=2, ensure_ascii=False)
                
                return True
            else:
                # Firebase implementation
                bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
                bracket_ref.update({
                    'bracketLevels.national': {
                        'status': status,
                        'playerCount': player_count,
                        'currentRound': 'National_R1',
                        'lastUpdated': firestore.SERVER_TIMESTAMP
                    }
                })
                return True
                
        except Exception as e:
            print(f"❌ Error updating national status: {e}")
            return False
    
    def update_bracket_with_national_winners(self, tournament_id: str, winners: List[Dict]) -> bool:
        """Store national winners in bracket - tournament complete"""
        try:
            if self.testing_mode:
                bracket_files = [f for f in os.listdir('.') if f.startswith(f'tournament_brackets_{tournament_id}')]
                if not bracket_files:
                    return False
                
                bracket_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                bracket_file = bracket_files[0]
                
                with open(bracket_file, 'r', encoding='utf-8') as f:
                    bracket_data = json.load(f)
                
                if 'winners' not in bracket_data:
                    bracket_data['winners'] = {}
                if 'national' not in bracket_data['winners']:
                    bracket_data['winners']['national'] = {}
                
                bracket_data['winners']['national'] = {
                    'position1': winners[0] if len(winners) > 0 else None,
                    'position2': winners[1] if len(winners) > 1 else None,
                    'position3': winners[2] if len(winners) > 2 else None,
                    'completedAt': datetime.now().isoformat()
                }
                
                # Mark tournament as complete
                bracket_data['tournamentComplete'] = True
                bracket_data['completedAt'] = datetime.now().isoformat()
                
                # Save updated bracket
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                new_bracket_file = f'tournament_brackets_{tournament_id}_{timestamp}.json'
                with open(new_bracket_file, 'w', encoding='utf-8') as f:
                    json.dump(bracket_data, f, indent=2, ensure_ascii=False)
                
                print(f"🏆 Tournament {tournament_id} complete!")
                print(f"   Position 1: {winners[0]['name'] if winners else 'Unknown'}")
                print(f"   Position 2: {winners[1]['name'] if len(winners) > 1 else 'Unknown'}")
                print(f"   Position 3: {winners[2]['name'] if len(winners) > 2 else 'Unknown'}")
                
                return True
            else:
                # Firebase implementation - use positions structure for national
                positions_data = {}
                if len(winners) > 0 and winners[0]:
                    positions_data['1'] = winners[0]
                if len(winners) > 1 and winners[1]:
                    positions_data['2'] = winners[1]
                if len(winners) > 2 and winners[2]:
                    positions_data['3'] = winners[2]
                
                bracket_ref = self.db.collection('tournament_brackets').document(tournament_id)
                bracket_ref.update({
                    'positions.national': positions_data,
                    'tournamentComplete': True,
                    'completedAt': firestore.SERVER_TIMESTAMP
                })
                return True
                
        except Exception as e:
            print(f"❌ Error updating bracket with national winners: {e}")
            return False
    
    def select_best_loser(self, losers: List[Dict]) -> Dict:
        """
        Select the best-performing loser from a list of losers.
        Uses a deterministic approach based on player performance rather than random selection.
        
        Args:
            losers: List of player dictionaries (losers from previous round)
            
        Returns:
            Dict: The best-performing loser player data
        """
        if not losers:
            return None
        
        if len(losers) == 1:
            return losers[0]
        
        print(f"🎯 Selecting best loser from {len(losers)} candidates...")
        
        # Selection criteria (in order of priority):
        # 1. Highest total points from all matches
        # 2. Highest average score
        # 3. Most recent match performance
        # 4. Alphabetical order (for consistency)
        
        best_loser = None
        best_score = -1
        best_points = -1
        
        for loser in losers:
            # Get player's performance metrics
            player_points = loser.get('totalPoints', 0)
            player_avg_score = loser.get('averageScore', 0) 
            player_name = loser.get('name', '')
            player_id = loser.get('id', '')
            
            # Primary criteria: total points
            is_better = False
            if player_points > best_points:
                is_better = True
            elif player_points == best_points:
                # Secondary criteria: average score
                if player_avg_score > best_score:
                    is_better = True
                elif player_avg_score == best_score:
                    # Tertiary criteria: alphabetical order for consistency
                    if best_loser is None or player_name < best_loser.get('name', ''):
                        is_better = True
            
            if is_better:
                best_loser = loser
                best_points = player_points
                best_score = player_avg_score
        
        if best_loser:
            print(f"   Selected {best_loser.get('name', 'Unknown')} (Points: {best_points}, Avg Score: {best_score:.1f})")
        else:
            # Fallback to first loser if no clear best
            best_loser = losers[0]
            print(f"   Fallback selection: {best_loser.get('name', 'Unknown')}")
        
        return best_loser

# Initialize algorithm instance
algorithm = TournamentProgressionAlgorithm()

# =================== API ENDPOINTS ===================
from flask import render_template

@bp.route('/')
def index():
    return render_template("index.html")

@bp.route('/initialize-tournament', methods=['POST'])
def api_initialize_tournament():
    """Enhanced initialize complete tournament structure with level support"""
    try:
        data = request.json
        tournament_id = data.get('tournamentId')
        special = data.get('special', False)  # Special tournament mode
        level = data.get('level', 'community')  # Tournament level: community, county, regional, national
        scheduling_preference = data.get('schedulingPreference', 'weekend')  # Scheduling preference
        
        if not tournament_id:
            return jsonify({'success': False, 'error': 'Tournament ID is required'}), 400
        
        # Validate level parameter
        valid_levels = ['community', 'county', 'regional', 'national']
        if level not in valid_levels:
            return jsonify({'success': False, 'error': f'Invalid level. Must be one of: {valid_levels}'}), 400
        
        print(f"\n🚀 API CALL: Enhanced Initialize Tournament")
        print(f"📝 Request data: {data}")
        print(f"🏆 Tournament Level: {level}")
        print(f"🌟 Special Mode: {special}")
        
        result = algorithm.initialize_tournament(tournament_id, special, level, scheduling_preference)
        
        print(f"✅ API Response: {result}")
        return jsonify(result)
        
    except Exception as e:
        error_msg = f"API Error in initialize_tournament: {str(e)}"
        print(f"❌ {error_msg}")
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/community/finalize-winners', methods=['POST'])
def api_finalize_community_winners():
    """Finalize community winners after positioning matches are complete"""
    try:
        data = request.json
        tournament_id = data.get('tournamentId')
        community_id = data.get('communityId')
        
        print(f"\n🏁 API CALL: Finalize Community Winners")
        print(f"📝 Request data: {data}")
        print(f"🔍 POSITION LOGGING: API endpoint called for finalizing winners - tournament: {tournament_id}, community: {community_id}")
        
        if not all([tournament_id, community_id]):
            print(f"🔍 POSITION LOGGING: Missing required parameters in API call")
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400
        
        # Get final positioning match results and determine winners
        print(f"🔍 POSITION LOGGING: Calling algorithm.finalize_community_winners method")
        result = algorithm.finalize_community_winners(tournament_id, community_id)
        
        # Log detailed result information
        success = result.get('success', False)
        print(f"🔍 POSITION LOGGING: finalize_community_winners returned success={success}")
        
        if success:
            winners = result.get('winners', {})
            position1 = winners.get('position1', {}).get('name', 'None')
            position2 = winners.get('position2', {}).get('name', 'None')
            position3 = winners.get('position3', {}).get('name', 'None')
            print(f"🔍 POSITION LOGGING: Winners in API response - Position 1: {position1}, Position 2: {position2}, Position 3: {position3}")
        else:
            error = result.get('error', 'Unknown error')
            print(f"🔍 POSITION LOGGING: Error in finalize_community_winners result: {error}")
            if 'incompleteMatches' in result:
                print(f"🔍 POSITION LOGGING: Incomplete matches: {result['incompleteMatches']}")
        
        print(f"✅ API Response: {result}")
        print(f"🔍 POSITION LOGGING: Returning API response with success={success}")
        return jsonify(result)
        
    except Exception as e:
        error_msg = f"API Error in finalize_community_winners: {str(e)}"
        print(f"❌ {error_msg}")
        print(f"🔍 POSITION LOGGING: Exception in API endpoint: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/community/next-round', methods=['POST'])
def api_community_next_round():
    """
    Generate next round for specific community
    POST /api/algorithm/community/next-round
    Body: {
        "tournamentId": "string",
        "communityId": "string"
    }
    Note: currentRound is auto-detected by the algorithm
    """
    try:
        data = request.json
        tournament_id = data.get('tournamentId')
        community_id = data.get('communityId')
        
        # currentRound is now optional - algorithm will auto-detect
        current_round = data.get('currentRound', 'auto-detect')
        
        if not all([tournament_id, community_id]):
            return jsonify({'success': False, 'error': 'Missing required parameters: tournamentId, communityId'}), 400
        
        print(f"\n🏘️ API CALL: Community Next Round")
        print(f"📝 Request data: {data}")
        print(f"🤖 Algorithm will auto-detect current round state")
        
        result = algorithm.generate_community_next_round(tournament_id, community_id, current_round)
        
        print(f"✅ API Response: {result}")
        return jsonify(result)
        
    except Exception as e:
        error_msg = f"API Error in community_next_round: {str(e)}"
        print(f"❌ {error_msg}")
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/county/initialize', methods=['POST'])
def api_initialize_county():
    """Initialize county level"""
    data = request.json
    tournament_id = data.get('tournamentId')
    county_ids = data.get('countyIds')
    
    result = algorithm.initialize_county_level(tournament_id, county_ids)
    return jsonify(result)

@bp.route('/county/next-round', methods=['POST'])
def api_county_next_round():
    """Generate next round for specific county"""
    data = request.json
    tournament_id = data.get('tournamentId')
    county_id = data.get('countyId')
    current_round = data.get('currentRound')
    
    result = algorithm.generate_county_next_round(tournament_id, county_id, current_round)
    return jsonify(result)

@bp.route('/regional/initialize', methods=['POST'])
def api_initialize_regional():
    """Initialize regional level"""
    data = request.json
    tournament_id = data.get('tournamentId')
    region_ids = data.get('regionIds')
    
    result = algorithm.initialize_regional_level(tournament_id, region_ids)
    return jsonify(result)

@bp.route('/regional/next-round', methods=['POST'])
def api_regional_next_round():
    """Generate next round for specific region"""
    data = request.json
    tournament_id = data.get('tournamentId')
    region_id = data.get('regionId')
    current_round = data.get('currentRound')
    
    result = algorithm.generate_regional_next_round(tournament_id, region_id, current_round)
    return jsonify(result)

@bp.route('/national/initialize', methods=['POST'])
def api_initialize_national():
    """Initialize national level"""
    data = request.json
    tournament_id = data.get('tournamentId')
    
    result = algorithm.initialize_national_level(tournament_id)
    return jsonify(result)

@bp.route('/national/next-round', methods=['POST'])
def api_national_next_round():
    """Generate next round for national level"""
    data = request.json
    tournament_id = data.get('tournamentId')
    current_round = data.get('currentRound')
    
    result = algorithm.generate_national_next_round(tournament_id, current_round)
    return jsonify(result)

@bp.route('/tournament/positions', methods=['POST'])
def api_get_tournament_positions():
    """
    Get tournament positions (1st, 2nd, 3rd place) for any level
    POST /api/algorithm/tournament/positions
    Body: {
        "tournamentId": "string",
        "entityId": "string",  // communityId, countyId, regionId, or null for national
        "level": "community|county|regional|national"
    }
    """
    try:
        data = request.json
        tournament_id = data.get('tournamentId')
        entity_id = data.get('entityId')
        level = data.get('level', 'community')
        
        if not tournament_id:
            return jsonify({
                'success': False,
                'error': 'tournamentId is required'
            }), 400
        
        # For national level, entity_id can be null
        if level != 'national' and not entity_id:
            return jsonify({
                'success': False,
                'error': f'entityId is required for {level} level'
            }), 400
        
        print(f"🏆 API: Getting tournament positions for {level} {entity_id}")
        
        algorithm = TournamentProgressionAlgorithm()
        positions = algorithm.get_tournament_positions(tournament_id, entity_id, level)
        
        return jsonify({
            'success': True,
            'tournamentId': tournament_id,
            'entityId': entity_id,
            'level': level,
            'positions': positions,
            'message': f'Tournament positions for {level} {entity_id}'
        })
        
    except Exception as e:
        print(f"❌ Error getting tournament positions: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to get tournament positions'
        }), 500

@bp.route('/finalize', methods=['POST'])
def finalize_tournament_positions():
    """
    Finalize tournament positions after final matches are completed.
    Updates positioning matches with actual winners/losers and determines final positions.
    
    Body: {
        "tournamentId": "string",
        "communityId": "string",     // for community level
        "countyId": "string",        // for county level  
        "regionId": "string",        // for regional level
        "level": "national"          // for national level
    }
    """
    try:
        data = request.json
        tournament_id = data.get('tournamentId')
        level = 'community'  # default
        entity_id = None
        
        # Determine level and entity ID
        if data.get('communityId'):
            level = 'community'
            entity_id = data.get('communityId')
        elif data.get('countyId'):
            level = 'county'
            entity_id = data.get('countyId')
        elif data.get('regionId'):
            level = 'regional'
            entity_id = data.get('regionId')
        elif data.get('level') == 'national':
            level = 'national'
            entity_id = 'national'
        else:
            return jsonify({
                'success': False,
                'error': 'Must specify communityId, countyId, regionId, or level=national'
            }), 400
        
        if not tournament_id:
            return jsonify({
                'success': False,
                'error': 'Tournament ID is required'
            }), 400
        
        print(f"🏁 API: Finalizing {level} tournament positions")
        print(f"   Tournament ID: {tournament_id}")
        print(f"   Entity ID: {entity_id}")
        
        algorithm = TournamentProgressionAlgorithm()
        result = algorithm.finalize_tournament_positions(tournament_id, entity_id, level)
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'tournamentId': tournament_id,
                'entityId': entity_id,
                'level': level,
                'positions': result.get('positions', {}),
                'finalizedMatches': result.get('finalizedMatches', 0),
                'message': f'{level.title()} tournament finalized successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error'),
                'message': f'Failed to finalize {level} tournament'
            }), 400
            
    except Exception as e:
        print(f"❌ Error finalizing tournament: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to finalize tournament positions'
        }), 500

@bp.route('/test-connection', methods=['GET'])
def test_connection():
    """Test Firebase connection"""
    try:
        db = get_firestore_client()
        test_ref = db.collection('test').document('connection')
        test_ref.set({'timestamp': firestore.SERVER_TIMESTAMP, 'status': 'connected'})
        
        return jsonify({
            'success': True,
            'message': 'Firebase connection successful!',
            'project': 'poolbilliard-167ad'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Firebase connection failed'
        }), 500