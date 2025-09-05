<template>
  <div class="space-y-6 p-3">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>

<!-- Error State -->
    <div v-else-if="error" class="text-center py-8 text-red-600">
      <p>{{ error }}</p>
      <Button @click="$router.back()" variant="outline" class="mt-4">
        <ArrowLeft class="h-4 w-4 mr-2" />
        Go Back
      </Button>
    </div>
    <!-- Tournament Details -->
    <div v-else-if="tournament" class="space-y-8">
      <!-- Header Section -->
      <div class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6">
        <div class="flex items-center justify-between mb-6">
          <Button @click="$router.back()" variant="outline" size="sm">
            <ArrowLeft class="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
          <div class="flex gap-2">
            <Button @click="editTournament" variant="outline" size="sm">
              <Edit class="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button @click="refreshData" variant="outline" size="sm" :disabled="refreshing">
              <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': refreshing }" />
              Refresh
            </Button>
          </div>
        </div>

        <div class="flex items-start space-x-6">
          <div v-if="tournament.bannerImage" class="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <img :src="tournament.bannerImage" :alt="tournament.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-32 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {{ getInitials(tournament.name) }}
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-4xl font-bold">{{ tournament.name }}</h1>
              <Badge v-if="tournament.isFeatured" variant="default" class="text-sm">Featured</Badge>
              <Badge v-if="tournament.isQualificationTournament" variant="secondary" class="text-sm">Qualification</Badge>
            </div>
            <p class="text-xl text-muted-foreground mb-3">{{ tournament.competitionLevel }}</p>
            <p class="text-lg text-muted-foreground mb-3">{{ tournament.location }}, {{ tournament.venue }}</p>
            <div class="flex gap-3 mb-4">
              <Badge :variant="getStatusVariant(tournament.status) as any" class="text-sm">
                {{ formatStatus(tournament.status) }}
              </Badge>
              <Badge :variant="getTypeVariant(tournament.type) as any" class="text-sm">
                {{ formatType(tournament.type) }}
              </Badge>
            </div>
            <p class="text-muted-foreground">{{ tournament.description }}</p>
          </div>
        </div>

        <!-- Key Stats Grid -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-green-600">{{ formatCurrency(tournament.prizePool, tournament.currency) }}</div>
            <div class="text-sm text-muted-foreground">Prize Pool</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-blue-600">{{ registeredPlayers.length }}/{{ tournament.maxPlayers }}</div>
            <div class="text-sm text-muted-foreground">Players</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-purple-600">{{ formatCurrency(tournament.entryFee, tournament.currency) }}</div>
            <div class="text-sm text-muted-foreground">Entry Fee</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-orange-600">{{ tournament.estimatedDuration }}</div>
            <div class="text-sm text-muted-foreground">Duration</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-red-600">{{ getDaysUntilStart() }}</div>
            <div class="text-sm text-muted-foreground">Days to Start</div>
          </div>
        </div>
      </div>

      <!-- Registration Actions -->
      <div v-if="showRegistrationSection" class="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-green-800 dark:text-green-300">Registration Open</h2>
            <p class="text-green-600 dark:text-green-400">
              Registration closes {{ formatDate(tournament.registrationEndDate) }}
            </p>
          </div>
          <div class="flex gap-3">
            <Button @click="registerPlayer" class="bg-green-600 hover:bg-green-700">
              <UserPlus class="h-4 w-4 mr-2" />
              Register Player
            </Button>
            <Button @click="openBulkRegistration" class="bg-blue-600 hover:bg-blue-700">
              <Users class="h-4 w-4 mr-2" />
              Bulk Register
            </Button>
            <Button @click="manageRegistrations" variant="outline">
              <Users class="h-4 w-4 mr-2" />
              Manage Registrations
            </Button>
          </div>
        </div>
        <!-- Registration Progress -->
        <div class="mt-4">
          <div class="flex justify-between text-sm mb-2">
            <span>Registration Progress</span>
            <span>{{ Math.round((registeredPlayers.length / tournament.maxPlayers) * 100) }}%</span>
          </div>
          <div class="w-full bg-green-200 dark:bg-green-800 rounded-full h-3">
            <div 
              class="bg-green-600 h-3 rounded-full transition-all duration-300"
              :style="{ width: `${Math.min((registeredPlayers.length / tournament.maxPlayers) * 100, 100)}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Tabs for Details -->
      <div class="border-b">
        <nav class="flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            ]"
          >
            {{ tab.label }} <span v-if="tab.count" class="ml-1 text-xs">({{ tab.count }})</span>
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="space-y-6">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Tournament Information -->
          <div class="space-y-6">
            <div class="bg-card rounded-lg border p-6">
              <h3 class="text-lg font-semibold mb-4 flex items-center">
                <Info class="h-5 w-5 mr-2" />
                Tournament Information
              </h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Tournament Series:</span>
                  <span class="font-medium">{{ tournament.tournamentSeries || 'N/A' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Level:</span>
                  <span class="font-medium">{{ formatType(tournament.hierarchicalLevel) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">National Tournament:</span>
                  <span class="font-medium">{{ tournament.isNationalTournament ? 'Yes' : 'No' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Created By:</span>
                  <span class="font-medium">{{ tournament.createdBy }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Created:</span>
                  <span class="font-medium">{{ formatDate(tournament.createdAt) }}</span>
                </div>
              </div>
            </div>

            <!-- Dates & Schedule -->
            <div class="bg-card rounded-lg border p-6">
              <h3 class="text-lg font-semibold mb-4 flex items-center">
                <Calendar class="h-5 w-5 mr-2" />
                Dates & Schedule
              </h3>
              <div class="space-y-4">
                <div class="flex items-center space-x-3">
                  <Clock class="h-5 w-5 text-blue-600" />
                  <div>
                    <div class="font-medium">Tournament Period</div>
                    <div class="text-sm text-muted-foreground">
                      {{ formatDate(tournament.startDate) }} - {{ formatDate(tournament.endDate) }}
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                  <UserPlus class="h-5 w-5 text-green-600" />
                  <div>
                    <div class="font-medium">Registration Period</div>
                    <div class="text-sm text-muted-foreground">
                      {{ formatDate(tournament.registrationStartDate) }} - {{ formatDate(tournament.registrationEndDate) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Location & Geographic Info -->
          <div class="space-y-6">
            <div class="bg-card rounded-lg border p-6">
              <h3 class="text-lg font-semibold mb-4 flex items-center">
                <MapPin class="h-5 w-5 mr-2" />
                Location & Venue
              </h3>
              <div class="space-y-3">
                <div>
                  <span class="text-muted-foreground block">Venue:</span>
                  <span class="font-medium">{{ tournament.venue }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground block">Location:</span>
                  <span class="font-medium">{{ tournament.location }}</span>
                </div>
                <div v-if="tournament.geographicalScope">
                  <span class="text-muted-foreground block">Geographic Scope:</span>
                  <div class="space-y-1 mt-2">
                    <div v-if="tournament.geographicalScope.communityName" class="text-sm">
                      <strong>Community:</strong> {{ tournament.geographicalScope.communityName }}
                    </div>
                    <div v-if="tournament.geographicalScope.countyName" class="text-sm">
                      <strong>County:</strong> {{ tournament.geographicalScope.countyName }}
                    </div>
                    <div v-if="tournament.geographicalScope.regionName" class="text-sm">
                      <strong>Region:</strong> {{ tournament.geographicalScope.regionName }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Financial Information -->
            <div class="bg-card rounded-lg border p-6">
              <h3 class="text-lg font-semibold mb-4 flex items-center">
                <DollarSign class="h-5 w-5 mr-2" />
                Financial Details
              </h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Entry Fee:</span>
                  <span class="font-medium text-lg">{{ formatCurrency(tournament.entryFee, tournament.currency) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Prize Pool:</span>
                  <span class="font-medium text-lg text-green-600">{{ formatCurrency(tournament.prizePool, tournament.currency) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Currency:</span>
                  <span class="font-medium">{{ tournament.currency }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Players Tab -->
        <div v-if="activeTab === 'players'" class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold">Registered Players</h2>
            <div class="flex gap-2">
              <Input
                v-model="playerSearchQuery"
                placeholder="Search players..."
                class="w-64"
              />
              <Button @click="exportPlayerList" variant="outline">
                <Download class="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button @click="registerPlayer">
                <UserPlus class="h-4 w-4 mr-2" />
                Add Player
              </Button>
              <Button @click="openBulkRegistration" class="bg-blue-600 hover:bg-blue-700">
                <Users class="h-4 w-4 mr-2" />
                Bulk Register
              </Button>
            </div>
          </div>

          <div v-if="loadingPlayers" class="flex justify-center py-8">
            <LoadingSpinner />
          </div>

          <div v-else-if="registeredPlayers.length === 0" class="text-center py-12">
            <Users class="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 class="text-lg font-medium mb-2">No Players Registered</h3>
            <p class="text-muted-foreground mb-4">No players have registered for this tournament yet.</p>
            <Button @click="registerPlayer" variant="outline">
              <UserPlus class="h-4 w-4 mr-2" />
              Register First Player
            </Button>
          </div>

          <div v-else class="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(player, index) in filteredPlayers" :key="player.id">
                  <TableCell>{{ index + 1 }}</TableCell>
                  <TableCell>
                    <div class="flex items-center space-x-3">
                      <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {{ getPlayerInitials(player.playerName) }}
                      </div>
                      <div>
                        <p class="font-medium">{{ player.playerName }}</p>
                        <p class="text-sm text-muted-foreground">{{ player.communityName }}</p>
                        <div class="flex items-center gap-2 mt-1">
                          <p class="text-xs text-muted-foreground">{{ formatCurrency(player.entryFee, 'KES') }}</p>
                          <Badge :variant="getPaymentStatusVariant(player.paymentStatus)" class="text-xs">
                            {{ formatPaymentStatus(player.paymentStatus) }}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{{ formatDate(player.registeredAt) }}</TableCell>
                  <TableCell>
                    <Badge :variant="getPlayerStatusVariant(player.status) as any">
                      {{ formatPlayerStatus(player.status) }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-2">
                      <Button size="sm" variant="outline" @click="viewPlayerDetails(player)">
                        <Eye class="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" @click="removePlayer(player)" class="text-red-600 hover:text-red-700">
                        <Trash class="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <!-- Matches Tab -->
        <div v-if="activeTab === 'matches'" class="space-y-6">
          <!-- Match Management Actions -->
          <div class="bg-card rounded-lg border p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold flex items-center">
                <Gamepad2 class="h-5 w-5 mr-2" />
                Tournament Matches
              </h3>
              <div class="flex items-center space-x-2">
                <Button @click="loadTournamentMatches" variant="outline" size="sm" :disabled="loadingMatches">
                  <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loadingMatches }" />
                  Refresh
                </Button>
                <Button @click="createManualMatch" variant="outline" size="sm">
                  <Plus class="h-4 w-4 mr-2" />
                  Create Match
                </Button>
                <Button @click="openInitializationModal" variant="outline" size="sm">
                  <Cpu class="h-4 w-4 mr-2" />
                  Initialize Algorithm
                </Button>
                <Button @click="showDebugModal = true" variant="ghost" size="sm">
                  <Info class="h-4 w-4" />
                </Button>
                <Button @click="initializeTournamentAutomation" :disabled="matchCreationLoading" class="bg-blue-600 hover:bg-blue-700">
                  <Bot class="h-4 w-4 mr-2" />
                  {{ matchCreationLoading ? 'Initializing...' : 'Initialize Automation' }}
                </Button>
              </div>
            </div>

            <!-- Match Statistics -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <div class="text-2xl font-bold text-blue-600">{{ getMatchCountByStatus('pending') + getMatchCountByStatus('scheduled') }}</div>
                <div class="text-sm text-blue-600">Upcoming</div>
              </div>
              <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                <div class="text-2xl font-bold text-green-600">{{ getMatchCountByStatus('in_progress') }}</div>
                <div class="text-sm text-green-600">In Progress</div>
              </div>
              <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
                <div class="text-2xl font-bold text-purple-600">{{ getMatchCountByStatus('completed') }}</div>
                <div class="text-sm text-purple-600">Completed</div>
              </div>
              <div class="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border-l-4 border-gray-500">
                <div class="text-2xl font-bold text-gray-600">{{ tournamentMatches.length }}</div>
                <div class="text-sm text-gray-600">Total Matches</div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div v-if="tournamentMatches.length === 0" class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Gamepad2 class="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 class="text-lg font-medium text-gray-600 mb-2">No matches created yet</h4>
              <p class="text-gray-500 mb-4">Get started by creating matches manually or initializing tournament automation.</p>
              <div class="flex justify-center space-x-4">
                <Button @click="createManualMatch" variant="outline">
                  <Plus class="h-4 w-4 mr-2" />
                  Create First Match
                </Button>
                <Button @click="openInitializationModal" variant="outline">
                  <Cpu class="h-4 w-4 mr-2" />
                  Initialize Algorithm
                </Button>
                <Button @click="initializeTournamentAutomation" :disabled="matchCreationLoading">
                  <Bot class="h-4 w-4 mr-2" />
                  {{ matchCreationLoading ? 'Initializing...' : 'Start Automation' }}
                </Button>
              </div>
            </div>
          </div>

          <!-- Matches List -->
          <div v-if="tournamentMatches.length > 0" class="bg-card rounded-lg border">
            <div class="p-4 border-b">
              <div class="flex items-center justify-between">
                <h4 class="font-medium">Tournament Matches</h4>
                <div class="flex items-center space-x-2">
                  <Button @click="viewAllMatches" variant="outline" size="sm">
                    <Eye class="h-4 w-4 mr-2" />
                    View All
                  </Button>
                  <Button @click="openMatchManagement" variant="outline" size="sm">
                    <Gamepad2 class="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </div>
              </div>
            </div>
            
            <div class="divide-y">
              <div 
                v-for="match in tournamentMatches.slice(0, 5)" 
                :key="match.id"
                class="p-4 hover:bg-muted/50 cursor-pointer"
                @click="viewMatchDetails(match)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="font-medium">
                      {{ match.player1Name }} vs {{ match.player2Name || 'BYE' }}
                    </div>
                    <div class="text-sm text-muted-foreground">
                      Round {{ match.roundNumber }} • Match {{ match.matchNumber }} • {{ match.matchType }}
                    </div>
                  </div>
                  <div class="text-right">
                    <Badge :variant="getMatchStatusVariant(match.status)">{{ match.status }}</Badge>
                    <div class="text-xs text-muted-foreground mt-1">
                      {{ formatMatchTime(match) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="tournamentMatches.length > 5" class="p-4 border-t bg-muted/20">
              <Button @click="viewAllMatches" variant="outline" size="sm" class="w-full">
                View All {{ tournamentMatches.length }} Matches
              </Button>
            </div>
          </div>
        </div>

        <!-- Qualification Tab -->
        <div v-if="activeTab === 'qualification'" class="space-y-6">
          <div class="bg-card rounded-lg border p-6">
            <h3 class="text-lg font-semibold mb-4 flex items-center">
              <Trophy class="h-5 w-5 mr-2" />
              Qualification Information
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Is Qualification Tournament:</span>
                  <span class="font-medium">{{ tournament.isQualificationTournament ? 'Yes' : 'No' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Progression Enabled:</span>
                  <span class="font-medium">{{ tournament.progressionEnabled ? 'Yes' : 'No' }}</span>
                </div>
                <div v-if="tournament.qualificationCriteria" class="flex justify-between">
                  <span class="text-muted-foreground">Qualification Criteria:</span>
                  <span class="font-medium">{{ tournament.qualificationCriteria }}</span>
                </div>
              </div>
              <div class="space-y-3">
                <div v-if="tournament.qualifiesPlayerCount" class="flex justify-between">
                  <span class="text-muted-foreground">Players to Qualify:</span>
                  <span class="font-medium">{{ tournament.qualifiesPlayerCount }}</span>
                </div>
                <div v-if="tournament.nextLevelTournamentId" class="flex justify-between">
                  <span class="text-muted-foreground">Next Level Tournament:</span>
                  <span class="font-medium font-mono">{{ tournament.nextLevelTournamentId }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Qualified Players -->
          <div v-if="tournament.qualifiedPlayersList.length > 0" class="bg-card rounded-lg border p-6">
            <h3 class="text-lg font-semibold mb-4">Qualified Players</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div v-for="playerId in tournament.qualifiedPlayersList" :key="playerId" 
                   class="bg-green-50 dark:bg-green-900/20 p-3 rounded border-l-4 border-green-500">
                <div class="font-mono text-sm">{{ playerId }}</div>
                <div class="text-xs text-muted-foreground">Qualified Player</div>
              </div>
            </div>
          </div>
        </div>

        <!-- History Tab -->
        <div v-if="activeTab === 'history'" class="space-y-6">
          <div class="bg-card rounded-lg border p-6">
            <h3 class="text-lg font-semibold mb-4 flex items-center">
              <Clock class="h-5 w-5 mr-2" />
              Tournament History
            </h3>
            <div class="space-y-4">
              <div class="border-l-4 border-blue-500 pl-4">
                <div class="font-medium">Tournament Created</div>
                <div class="text-sm text-muted-foreground">{{ formatDateTime(tournament.createdAt) }}</div>
                <div class="text-sm text-muted-foreground">Created by {{ tournament.createdBy }}</div>
              </div>
              <div v-if="tournament.updatedAt" class="border-l-4 border-yellow-500 pl-4">
                <div class="font-medium">Last Updated</div>
                <div class="text-sm text-muted-foreground">{{ formatDateTime(tournament.updatedAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tournament Details Modal -->
    <TournamentDetails
      v-if="tournament"
      :tournament="tournament"
      :open="showEditModal"
      @close="closeEditModal"
      @updated="handleTournamentUpdated"
    />

    <!-- Player Selection Modal -->
    <PlayerSelectionModal
      v-if="tournament"
      :open="showPlayerSelectionModal"
      :tournament-id="tournamentId"
      :tournament-name="tournament.name"
      :tournament="tournament"
      @close="showPlayerSelectionModal = false"
      @player-registered="handlePlayerRegistered"
      @open-bulk-registration="openBulkRegistration"
    />

    <!-- Bulk Player Registration Modal -->
    <BulkPlayerRegistrationModal
      v-if="tournament"
      :open="showBulkRegistrationModal"
      :tournament-id="tournamentId"
      :tournament-name="tournament.name"
      :tournament="tournament"
      @close="showBulkRegistrationModal = false"
      @players-registered="handlePlayersRegistered"
    />

    <!-- Tournament Initialization Modal -->
    <TournamentInitialization
      v-if="tournament"
      :open="showInitializationModal"
      :tournament="tournament"
      :registered-players="registeredPlayers"
      @close="showInitializationModal = false"
      @initialized="handleTournamentInitialized"
    />

    <!-- Algorithm Debug Modal -->
    <AlgorithmDebugModal
      v-if="tournament"
      :open="showDebugModal"
      :tournament="tournament"
      :registered-players="registeredPlayers"
      @close="showDebugModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { 
  ArrowLeft, 
  Edit, 
  RefreshCw, 
  UserPlus, 
  Users,
  Info,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Trophy,
  Download,
  Eye,
  Trash,
  Gamepad2,
  Plus,
  Bot,
  PlayCircle,
  Zap,
  Cpu
} from 'lucide-vue-next'
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc as getFirebaseDoc, updateDoc } from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'
import { useToast } from '@/composables/useToast'
import { useMatches } from '@/composables/useMatches'
import { useAutomation } from '@/composables/useAutomation'
import { useAuth } from '@/composables/useAuth'
import { matchService } from '@/services/matchService'
import { tournamentPlayerService } from '@/services/tournamentPlayerService'
import { algorithmTestService } from '@/services/algorithmTestService'
import { getDoc, formatTimestamp } from '@/utils/firestore'
import { autoFixRegistrationsCommunity } from '@/utils/fixRegistrationData'
import type { Tournament, TournamentRegistration } from '@/types/tournament'
import type { Match } from '@/types/match'

// Components
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import TournamentDetails from '@/components/tournaments/TournamentDetails.vue'
import PlayerSelectionModal from '@/components/tournaments/PlayerSelectionModal.vue'
import BulkPlayerRegistrationModal from '@/components/tournaments/BulkPlayerRegistrationModal.vue'
import TournamentInitialization from '@/components/tournaments/TournamentInitialization.vue'
import AlgorithmDebugModal from '@/components/tournaments/AlgorithmDebugModal.vue'

// UI Components
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import Input from '@/components/ui/input.vue'
import Table from '@/components/ui/table.vue'
import TableHeader from '@/components/ui/table-header.vue'
import TableBody from '@/components/ui/table-body.vue'
import TableRow from '@/components/ui/table-row.vue'
import TableHead from '@/components/ui/table-head.vue'
import TableCell from '@/components/ui/table-cell.vue'

const route = useRoute()
const { success, error: showError, warning } = useToast()
const { getMatchesByTournament, createMatchesBatch } = useMatches()
const { initializeAutomation, checkAlgorithmHealth } = useAutomation()

// State
const tournament = ref<(Tournament & { id: string }) | null>(null)
const loading = ref(true)
const loadingPlayers = ref(false)
const refreshing = ref(false)
const error = ref<string | null>(null)

// Tab and search state
const activeTab = ref('overview')
const playerSearchQuery = ref('')

// Modal state
const showEditModal = ref(false)
const showPlayerSelectionModal = ref(false)
const showBulkRegistrationModal = ref(false)
const showInitializationModal = ref(false)
const showDebugModal = ref(false)

// Tournament registrations
const registeredPlayers = ref<TournamentRegistration[]>([])
const registrationsUnsubscribe = ref<(() => void) | null>(null)

// Tournament matches
const tournamentMatches = ref<Match[]>([])
const loadingMatches = ref(false)
const matchCreationLoading = ref(false)

// Computed
const tournamentId = computed(() => route.params.id as string)

const filteredPlayers = computed(() => {
  if (!playerSearchQuery.value.trim()) return registeredPlayers.value
  
  const query = playerSearchQuery.value.toLowerCase()
  return registeredPlayers.value.filter(player => 
    player.playerName.toLowerCase().includes(query) ||
    player.playerId.toLowerCase().includes(query)
  )
})

const tabs = computed(() => [
  { id: 'overview', label: 'Overview' },
  { id: 'players', label: 'Players', count: registeredPlayers.value?.length || 0 },
  { id: 'matches', label: 'Matches', count: tournamentMatches.value?.length || 0 },
  { id: 'qualification', label: 'Qualification' },
  { id: 'history', label: 'History' }
])

const showRegistrationSection = computed(() => {
  if (!tournament.value) return false
  
  const now = new Date()
  const regStart = formatTimestamp(tournament.value.registrationStartDate)
  const regEnd = formatTimestamp(tournament.value.registrationEndDate)
  
  return tournament.value.status === 'registration_open' || 
         (tournament.value.status === 'upcoming' && 
          now >= regStart && 
          now <= regEnd && 
          registeredPlayers.value.length < tournament.value.maxPlayers)
})

// Methods
const loadTournament = async () => {
  try {
    loading.value = true
    error.value = null

    const tournamentData = await getDoc('tournaments', tournamentId.value)
    if (!tournamentData) {
      error.value = 'Tournament not found'
      return
    }

    tournament.value = {
      ...tournamentData,
      // Ensure required arrays exist with defaults
      registeredPlayerIds: tournamentData.registeredPlayerIds || [],
      qualifiedPlayersList: tournamentData.qualifiedPlayersList || [],
      parentTournamentIds: tournamentData.parentTournamentIds || [],
      childTournamentIds: tournamentData.childTournamentIds || [],
      allowedCommunityIds: tournamentData.allowedCommunityIds || [],
      currentRegistrations: tournamentData.currentRegistrations || 0,
      maxPlayers: tournamentData.maxPlayers || 16,
      prizePool: tournamentData.prizePool || 0,
      entryFee: tournamentData.entryFee || 0
    } as Tournament & { id: string }

    // Load tournament registrations and matches
    loadTournamentRegistrations()
    loadTournamentMatches()

  } catch (err) {
    console.error('Error loading tournament:', err)
    error.value = 'Failed to load tournament details'
    showError('Error', 'Failed to load tournament details')
  } finally {
    loading.value = false
  }
}

const loadTournamentRegistrations = () => {
  try {
    const db = getFirebaseDb()
    const registrationsRef = collection(db, 'tournament_registrations')
    const q = query(
      registrationsRef,
      where('tournamentId', '==', tournamentId.value)
    )

    // Clean up previous subscription
    if (registrationsUnsubscribe.value) {
      registrationsUnsubscribe.value()
    }

    // Subscribe to real-time updates
    registrationsUnsubscribe.value = onSnapshot(q, async (snapshot) => {
      registeredPlayers.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TournamentRegistration[]
      
      // Sync registeredPlayerIds array with actual registrations
      await syncRegisteredPlayerIds()
    }, (err) => {
      console.error('Error loading tournament registrations:', err)
      showError('Error', 'Failed to load tournament registrations')
    })

  } catch (err) {
    console.error('Error setting up registrations listener:', err)
    showError('Error', 'Failed to load tournament registrations')
  }
}

// Sync the registeredPlayerIds array in tournament document with actual registrations
const syncRegisteredPlayerIds = async () => {
  if (!tournament.value || !registeredPlayers.value) return
  
  try {
    const db = getFirebaseDb()
    const actualPlayerIds = registeredPlayers.value.map(reg => reg.playerId)
    const currentPlayerIds = tournament.value.registeredPlayerIds || []
    
    // Check if arrays are different
    const arraysMatch = currentPlayerIds.length === actualPlayerIds.length && 
                       currentPlayerIds.every(id => actualPlayerIds.includes(id))
    
    if (!arraysMatch) {
      console.log('Syncing registeredPlayerIds array with actual registrations')
      const tournamentRef = doc(db, 'tournaments', tournamentId.value)
      await updateDoc(tournamentRef, {
        registeredPlayerIds: actualPlayerIds,
        currentRegistrations: actualPlayerIds.length
      })
      
      // Update local tournament data
      tournament.value.registeredPlayerIds = actualPlayerIds
      tournament.value.currentRegistrations = actualPlayerIds.length
    }
  } catch (err) {
    console.error('Error syncing registeredPlayerIds:', err)
  }
}

const refreshData = async () => {
  refreshing.value = true
  await loadTournament()
  await loadTournamentMatches()
  refreshing.value = false
  success('Success', 'Tournament data refreshed')
}

// Match management methods
const loadTournamentMatches = async () => {
  try {
    loadingMatches.value = true
    const matches = await getMatchesByTournament(tournamentId.value)
    tournamentMatches.value = matches
  } catch (err) {
    console.error('Error loading tournament matches:', err)
    showError('Error', 'Failed to load tournament matches')
  } finally {
    loadingMatches.value = false
  }
}

const getMatchCountByStatus = (status: string): number => {
  return tournamentMatches.value.filter(match => match.status === status).length
}

const getMatchStatusVariant = (status: string) => {
  switch (status) {
    case 'in_progress': return 'destructive'
    case 'completed': return 'default'
    case 'scheduled': return 'secondary'
    case 'pending': return 'outline'
    default: return 'outline'
  }
}

const formatMatchTime = (match: Match): string => {
  if (match.scheduledDateTime) {
    return new Date(match.scheduledDateTime).toLocaleDateString()
  }
  if (match.actualStartTime) {
    return 'Started: ' + new Date(match.actualStartTime).toLocaleDateString()
  }
  if (match.actualEndTime) {
    return 'Completed: ' + new Date(match.actualEndTime).toLocaleDateString()
  }
  return 'Not scheduled'
}

const createManualMatch = () => {
  // Navigate to create match page with tournament pre-selected
  window.open(`/matches/create?tournamentId=${tournamentId.value}`, '_blank')
}

const openInitializationModal = async () => {
  // Check if there are registered players
  if (registeredPlayers.value.length === 0) {
    showError('No Players', 'Please register players before initializing the tournament')
    return
  }
  
  // Check if there are confirmed players
  const confirmedCount = registeredPlayers.value.filter(p => p.status === 'confirmed').length
  if (confirmedCount === 0) {
    showError('No Confirmed Players', 'Please ensure at least some players have confirmed status')
    return
  }
  
  // Check if players have community IDs
  const playersWithoutCommunity = registeredPlayers.value.filter(p => !p.communityId || p.communityId === '')
  if (playersWithoutCommunity.length > 0) {
    const shouldFix = confirm(`${playersWithoutCommunity.length} players are missing community information. Would you like to auto-fix this based on their player IDs?`)
    
    if (shouldFix) {
      try {
        const result = await autoFixRegistrationsCommunity(tournamentId.value)
        if (result.success) {
          success('Fixed', `Updated ${result.updated} player registrations with community information`)
          // Reload registrations
          await loadTournamentRegistrations()
        } else {
          showError('Fix Failed', result.error || 'Failed to fix registration data')
          return
        }
      } catch (error) {
        showError('Error', 'Failed to fix registration data')
        return
      }
    } else {
      warning('Missing Data', 'Players must have community information for the algorithm to work correctly')
    }
  }
  
  showInitializationModal.value = true
}

const handleTournamentInitialized = async (result: any) => {
  console.log('Tournament initialized with result:', result)
  
  // Refresh matches
  await loadTournamentMatches()
  
  // Show success message with details
  if (result.matches && result.matches.length > 0) {
    success(
      'Tournament Initialized',
      `Successfully created ${result.matches.length} matches. ${result.message || ''}`
    )
  } else {
    warning(
      'Tournament Initialized',
      'Tournament initialized but no matches were created. Check the algorithm response.'
    )
  }
  
  // Switch to matches tab
  activeTab.value = 'matches'
}

// Test function to debug algorithm integration
const testAlgorithmIntegration = async () => {
  if (!tournament.value) return
  
  try {
    const { user } = useAuth()
    if (!user.value) {
      throw new Error('User not authenticated')
    }
    
    console.log('🧪 Running algorithm integration test...')
    const testResult = await algorithmTestService.testTournamentInitialization(tournamentId.value, user.value.uid)
    
    if (testResult.success) {
      success('Test Successful', `Algorithm generated ${testResult.matches.length} matches with real player data`)
    } else {
      showError('Test Failed', testResult.error || 'Unknown test error')
    }
    
    console.log('🧪 Test completed:', testResult)
  } catch (error) {
    console.error('🧪 Test error:', error)
    showError('Test Error', error instanceof Error ? error.message : 'Test failed')
  }
}

const initializeTournamentAutomation = async () => {
  if (!tournament.value) return
  
  try {
    matchCreationLoading.value = true
    
    // Check authentication
    const { user } = useAuth()
    if (!user.value) {
      throw new Error('User not authenticated')
    }
    
    // Get confirmed registered players with full details
    const players = await tournamentPlayerService.getConfirmedRegisteredPlayers(tournamentId.value)
    if (players.length === 0) {
      throw new Error('No confirmed players registered for this tournament')
    }
    
    // Validate player requirements
    const validation = tournamentPlayerService.validatePlayerRequirements(players, tournament.value.type)
    if (!validation.valid) {
      throw new Error(validation.message)
    }
    
    console.log('🎯 Starting tournament automation initialization...')
    console.log('Tournament ID:', tournamentId.value)
    console.log('Confirmed Players:', players.length)
    console.log('Player List:', players.map(p => `${p.name} (${p.playerId})`))
    console.log('User ID:', user.value.uid)
    
    // Prepare players for algorithm
    const algorithmPlayers = tournamentPlayerService.preparePlayersForAlgorithm(players)
    
    // Initialize automation for this tournament
    const config = {
      tournamentId: tournamentId.value,
      enableAutomation: true,
      schedulingPreference: 'weekend' as const,
      autoAdvanceRounds: false,
      requireManualApproval: true,
      venueSettings: {
        autoAssignTables: true
      }
    }
    
    const fallbackConfig = {
      enabled: true,
      triggerThreshold: 2,
      fallbackStrategy: 'simple_pairing' as const,
      notifyAdmins: true,
      adminEmails: ['admin@tournament.com']
    }
    
    const result = await initializeAutomation(
      tournamentId.value,
      config,
      fallbackConfig,
      user.value.uid,
      algorithmPlayers
    )
    
    console.log('🎯 Algorithm response:', result)
    
    if (result.success) {
      success('Success', 'Tournament automation initialized successfully')
      await loadTournamentMatches()
      
      // Check if matches were actually created
      const matches = await matchService.getMatchesByTournament(tournamentId.value)
      console.log('✅ Matches created:', matches.length)
      
      if (matches.length === 0) {
        warning('Warning', 'Tournament initialized but no matches were created. Check algorithm response.')
      }
    } else {
      throw new Error(result.message)
    }
    
  } catch (err) {
    console.error('❌ Tournament automation error:', err)
    showError('Error', err instanceof Error ? err.message : 'Failed to initialize tournament automation')
  } finally {
    matchCreationLoading.value = false
  }
}

const viewMatchDetails = (match: Match) => {
  window.open(`/matches/${match.id}`, '_blank')
}

const viewAllMatches = () => {
  window.open(`/matches?tournamentId=${tournamentId.value}`, '_blank')
}

const openMatchManagement = () => {
  window.open('/matches', '_blank')
}

const getDaysUntilStart = () => {
  if (!tournament.value) return 0
  
  const now = new Date()
  const startDate = formatTimestamp(tournament.value.startDate)
  const diffTime = startDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

// Tournament actions
const editTournament = () => {
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
}

const handleTournamentUpdated = async () => {
  await loadTournament()
  success('Success', 'Tournament updated successfully')
}

// Player management
const registerPlayer = () => {
  showPlayerSelectionModal.value = true
}

const manageRegistrations = () => {
  // Switch to players tab
  activeTab.value = 'players'
}

const exportPlayerList = () => {
  if (registeredPlayers.value.length === 0) {
    showError('Error', 'No players to export')
    return
  }
  
  // Create CSV content
  const headers = ['Player Name', 'Community', 'Registration Date', 'Status', 'Entry Fee']
  const rows = registeredPlayers.value.map(player => [
    player.playerName,
    player.communityName,
    formatDate(player.registeredAt),
    formatPlayerStatus(player.status),
    formatCurrency(player.entryFee, 'KES')
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
  
  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${tournament.value?.name || 'tournament'}-players.csv`
  link.click()
  
  success('Success', 'Player list exported successfully')
}

const viewPlayerDetails = (player: TournamentRegistration) => {
  // TODO: Open player details modal with full player info
  console.log('View player details:', player)
}

const removePlayer = async (player: TournamentRegistration) => {
  // Enhanced safety checks
  if (!player?.id) {
    showError('Error', 'Invalid player registration data')
    return
  }

  if (!tournament.value) {
    showError('Error', 'Tournament data not available')
    return
  }

  // Check if tournament has already started
  const now = new Date()
  const startDate = formatTimestamp(tournament.value.startDate)
  if (now >= startDate) {
    if (!confirm(`This tournament has already started. Are you sure you want to remove ${player.playerName}? This action cannot be undone.`)) {
      return
    }
  } else {
    if (!confirm(`Are you sure you want to remove ${player.playerName} from this tournament?`)) {
      return
    }
  }
  
  try {
    const db = getFirebaseDb()
    
    // Remove from tournament_registrations collection
    await deleteDoc(doc(db, 'tournament_registrations', player.id))
    
    // Update tournament's currentRegistrations count and registeredPlayerIds array
    if (tournament.value) {
      const tournamentRef = doc(db, 'tournaments', tournamentId.value)
      const tournamentDoc = await getFirebaseDoc(tournamentRef)
      if (tournamentDoc.exists()) {
        const tournamentData = tournamentDoc.data()
        const currentCount = tournamentData.currentRegistrations || 0
        const currentPlayerIds = tournamentData.registeredPlayerIds || []
        
        // Remove player ID from registeredPlayerIds array
        const updatedPlayerIds = currentPlayerIds.filter((id: string) => id !== player.playerId)
        
        await updateDoc(tournamentRef, {
          currentRegistrations: Math.max(0, currentCount - 1), // Ensure it doesn't go below 0
          registeredPlayerIds: updatedPlayerIds
        })
      }
    }
    
    success('Success', `${player.playerName} has been removed from the tournament`)
  } catch (err) {
    console.error('Error removing player:', err)
    if (err.code === 'not-found') {
      showError('Error', 'Player registration was already removed')
    } else {
      showError('Error', 'Failed to remove player from tournament')
    }
  }
}

const handlePlayerRegistered = () => {
  // Player will be automatically added via the real-time listener
  // Switch to players tab to show the new registration
  activeTab.value = 'players'
}

const openBulkRegistration = () => {
  showPlayerSelectionModal.value = false
  showBulkRegistrationModal.value = true
}

const handlePlayersRegistered = (registrations: any[]) => {
  // Players will be automatically added via the real-time listener
  // Switch to players tab to show the new registrations
  activeTab.value = 'players'
  success('Success', `${registrations.length} players registered successfully`)
}

// Utility functions
const getInitials = (name: string) => {
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
}

const getPlayerInitials = (name: string) => {
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
}

const getStatusVariant = (status: string) => {
  const variants = {
    'upcoming': 'secondary',
    'registration_open': 'default',
    'registration_closed': 'outline',
    'ongoing': 'default',
    'completed': 'secondary',
    'cancelled': 'destructive'
  }
  return variants[status as keyof typeof variants] || 'secondary'
}

const getTypeVariant = (type: string) => {
  const variants = {
    'community': 'secondary',
    'county': 'default',
    'regional': 'default', 
    'national': 'default'
  }
  return variants[type as keyof typeof variants] || 'secondary'
}

const getPlayerStatusVariant = (status: string) => {
  const variants = {
    'pending': 'secondary',
    'confirmed': 'default',
    'cancelled': 'destructive'
  }
  return variants[status as keyof typeof variants] || 'secondary'
}

const getPaymentStatusVariant = (status: string | undefined) => {
  const variants = {
    'pending': 'secondary',
    'paid': 'default',
    'failed': 'destructive',
    'refunded': 'outline'
  }
  return variants[status as keyof typeof variants] || 'secondary'
}

const formatStatus = (status: string) => {
  const formats = {
    'upcoming': 'Upcoming',
    'registration_open': 'Registration Open',
    'registration_closed': 'Registration Closed',
    'ongoing': 'Ongoing',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  }
  return formats[status as keyof typeof formats] || status
}

const formatType = (type: string) => {
  const formats = {
    'community': 'Community',
    'county': 'County',
    'regional': 'Regional',
    'national': 'National'
  }
  return formats[type as keyof typeof formats] || type
}

const formatPlayerStatus = (status: string) => {
  const formats = {
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'cancelled': 'Cancelled'
  }
  return formats[status as keyof typeof formats] || status
}

const formatPaymentStatus = (status: string | undefined) => {
  const formats = {
    'pending': 'Pending',
    'paid': 'Paid',
    'failed': 'Failed',
    'refunded': 'Refunded'
  }
  return formats[status as keyof typeof formats] || 'Unknown'
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'KES') {
    return `KES ${amount.toLocaleString()}`
  }
  return `${currency} ${amount.toLocaleString()}`
}

const formatDate = (date: string | Date | any) => {
  const dateValue = formatTimestamp(date)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(dateValue)
}

const formatDateTime = (date: string | Date | any) => {
  const dateValue = formatTimestamp(date)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateValue)
}

// Lifecycle
onMounted(() => {
  loadTournament()
})

// Cleanup subscription when component unmounts
onUnmounted(() => {
  if (registrationsUnsubscribe.value) {
    registrationsUnsubscribe.value()
  }
})

// Watch for route changes
watch(() => route.params.id, (newId) => {
  if (newId && newId !== tournamentId.value) {
    // Clean up previous subscription
    if (registrationsUnsubscribe.value) {
      registrationsUnsubscribe.value()
    }
    loadTournament()
  }
})
</script>