# TeamService Decomposition Analysis

## Task: Module Extraction - Decompose TeamService (1486 lines)

### Analysis Date: January 15, 2026

## Current Architecture

**File**: `lib/services/team-service.ts` (1486 lines)

**Responsibilities Identified**:
1. **Team CRUD Operations** - Create, read, update, delete teams
2. **Team Member Management** - Invite, update role, remove members
3. **Team Project Management** - Add projects to teams, get team projects
4. **Team Analytics** - Team statistics, analytics, member/project counts
5. **Access Control** - Verify team access, subscription tier validation
6. **Cache Management** - Team and member data caching

## Architectural Smells Detected

### 1. Violation of Single Responsibility Principle
- TeamService handles 6 distinct responsibilities (blueprint.md:505 requires atomic design)
- 1486 lines exceeds optimal service size (recommended: 200-500 lines)

### 2. Method Complexity
- `deleteTeam()` method handles database transactions, webhook dispatch, activity feed, notifications (100+ lines)
- `inviteTeamMember()` method combines validation, access control, notifications, caching (175+ lines)

### 3. Tight Coupling
- Direct imports of 5 different services (ActivityFeedService, WebhookEventDispatcher, NotificationService, cache orchestrator)
- Mix of business logic, data access, caching, and external service calls

## Proposed Atomic Service Decomposition

Based on blueprint.md Service Layer principles (blueprint.md:498-501), following atomic services should be extracted:

### 1. TeamCoreService
- **Purpose**: Core team CRUD operations with validation
- **Methods**:
  - `createTeam(request)` - Create new team with validation
  - `getTeamById(teamId)` - Get team details
  - `updateTeamName(teamId, name, userId)` - Update team name
  - `deleteTeam(teamId, userId)` - Delete team with cascading cleanup
  - `getUserTeams(userId, options)` - Get paginated user teams
- **Lines**: ~350 lines (from current 1486)
- **Dependencies**: Database, TeamAccessControlService, TeamAnalyticsService

### 2. TeamMemberService
- **Purpose**: Team member invitation and management
- **Methods**:
  - `inviteTeamMember(teamId, request, userId)` - Invite member with validation
  - `updateTeamMemberRole(teamId, memberId, role, userId)` - Update member role
  - `removeTeamMember(teamId, memberId, userId)` - Remove member
  - `getTeamMembers(teamId, options)` - Get paginated team members
- **Lines**: ~400 lines
- **Dependencies**: Database, TeamAccessControlService, NotificationService, ActivityFeedService, WebhookEventDispatcher

### 3. TeamProjectService
- **Purpose**: Team-project association management
- **Methods**:
  - `addProjectToTeam(teamId, projectId, userId)` - Add project to team
  - `removeProjectFromTeam(teamId, projectId, userId)` - Remove project from team
  - `getTeamProjects(teamId, options)` - Get paginated team projects
- **Lines**: ~250 lines
- **Dependencies**: Database, TeamAccessControlService, ActivityFeedService

### 4. TeamAnalyticsService
- **Purpose**: Team statistics and analytics
- **Methods**:
  - `getTeamAnalytics(teamId)` - Get team analytics
  - `getUserActiveTeamCount(userId)` - Get user's active team count
  - `getTeamMemberCount(teamId)` - Get team member count
  - `getTeamProjectCount(teamId)` - Get team project count
- **Lines**: ~300 lines
- **Dependencies**: Database, CacheOrchestrator

### 5. TeamAccessControlService
- **Purpose**: Access control and subscription validation
- **Methods**:
  - `verifyTeamAccess(teamId, userId, allowedRoles)` - Verify user has required access
  - `getMaxTeamsForSubscription(subscriptionTier)` - Get max teams for subscription tier
  - `canUserCreateTeam(userId)` - Check if user can create team
- **Lines**: ~200 lines
- **Dependencies**: Database, UserService

### 6. Type Definitions (team-types.ts)
- **Purpose**: Centralized type definitions for all team services
- **Exports**:
  - `TeamRole` - Admin, member, viewer roles
  - `TeamCreationRequest` - Team creation interface
  - `TeamMemberInvitationRequest` - Member invitation interface
  - `TeamWithMembers` - Team with members extended type
  - `ProjectTeamAccess` - Project-team access interface
  - `TeamAnalyticsData` - Analytics data interface
- **Lines**: ~40 lines

## Implementation Strategy

### Phase 1: Type Extraction
1. Create `lib/services/team-types.ts` with all team-related types
2. Export types for use across services

### Phase 2: Core Service Extraction
1. Create `TeamAccessControlService` (lowest dependency, foundation for others)
2. Create `TeamAnalyticsService` (independent of other new services)
3. Create `TeamCoreService` (depends on TeamAccessControlService, TeamAnalyticsService)

### Phase 3: Feature Service Extraction
1. Create `TeamMemberService` (depends on TeamAccessControlService)
2. Create `TeamProjectService` (depends on TeamAccessControlService)

### Phase 4: Orchestration Layer
1. Create `TeamServiceOrchestrator` facade maintaining backward compatibility
2. Delegates to specialized services while preserving existing API
3. Mark original `TeamService` as deprecated

### Phase 5: Consumer Migration
1. Update direct consumers of `TeamService` methods to use specific services
2. Remove deprecated methods after migration complete

## Benefits of Decomposition

### Architectural Benefits
1. **Single Responsibility**: Each service has one clear, focused purpose
2. **Enhanced Testability**: Individual services can be unit tested in isolation
3. **Improved Maintainability**: Changes to specific features don't affect unrelated code
4. **Better Code Organization**: Clear separation of concerns

### Code Quality Benefits
1. **Reduced Complexity**: 1486 → ~1540 lines total (5 services + orchestrator)
2. **Main Service Reduction**: TeamServiceOrchestrator ~200 lines (86% reduction)
3. **Better Error Handling**: Isolated error handling per service
4. **Type Safety**: Full TypeScript compliance with proper interfaces

### Performance Benefits
1. **Smaller Bundle Size**: Better tree-shaking for unused functionality
2. **Reduced Memory Footprint**: Services only loaded when needed
3. **Better Caching Strategies**: Service-specific caching logic

## Consumers of TeamService

**Current Consumers** (6 files identified):
1. `app/api/teams/route.ts` - Team CRUD operations
2. `app/api/teams/[id]/route.ts` - Team details and updates
3. `app/api/teams/[id]/members/route.ts` - Member management
4. `app/api/teams/[id]/projects/route.ts` - Team projects
5. `lib/services/user-service.ts` - User team associations
6. `lib/services/project-data-service.ts` - Project team access

**Methods Used**:
- `createTeam()` - Team creation
- `getUserTeams()` - Get user teams (pagination)
- `getTeamById()` - Get team details
- `inviteTeamMember()` - Member invitation
- `updateTeamMemberRole()` - Role updates
- `removeTeamMember()` - Member removal
- `getTeamProjects()` - Get team projects
- `deleteTeam()` - Team deletion
- `getTeamAnalytics()` - Team analytics
- `updateTeamName()` - Team name updates

## Architectural Compliance

**Current Compliance with blueprint.md Principles**:
- ✅ **Modularity**: Current service has clear internal organization
- ✅ **Type Safety**: Full TypeScript strict mode compliance
- ✅ **Error Handling**: Comprehensive error handling with ServiceError pattern
- ⚠️ **Single Responsibility**: Current 1486-line file violates atomic design (blueprint.md:505)
- ⚠️ **Service Layer**: Mix of responsibilities should be in separate services (blueprint.md:208-209)

**Improvement Opportunity**: Decomposition into 5 atomic services (200-400 lines each) would achieve perfect blueprint.md compliance

## Risk Assessment

### Low Risk
- **No Breaking Changes**: Orchestration facade preserves existing API
- **Test Coverage**: Existing tests continue to work
- **Gradual Migration**: Consumers can migrate gradually

### Medium Risk
- **Consumer Updates**: 6 consumers need updates to use specific services
- **Testing Overhead**: Additional unit tests for new services

### Mitigation Strategies
1. Maintain backward compatibility through orchestrator facade
2. Update consumers incrementally, not all at once
3. Comprehensive testing at each phase
4. Documentation for migration guide

## Business Impact

**Developer Productivity**:
- **Improved Onboarding**: New developers can understand atomic services faster
- **Faster Development**: Smaller services easier to modify and test
- **Reduced Bugs**: Isolated services prevent unintended side effects

**Codebase Maintainability**:
- **Better Organization**: Clear separation of team-related functionality
- **Easier Debugging**: Issues isolated to specific services
- **Future-Proof**: Easy to add new team features without bloating services

**Performance**:
- **Better Tree-Shaking**: Unused services not bundled
- **Reduced Memory**: Services loaded on-demand
- **Improved Caching**: Service-specific cache strategies

## Success Criteria

- [x] Architectural Analysis Complete
- [ ] Type Extraction (team-types.ts)
- [ ] TeamAccessControlService Created
- [ ] TeamAnalyticsService Created
- [ ] TeamCoreService Created
- [ ] TeamMemberService Created
- [ ] TeamProjectService Created
- [ ] TeamServiceOrchestrator Facade Created
- [ ] All Tests Passing
- [ ] Zero Breaking Changes
- [ ] Updated Documentation

## Next Steps

**Immediate**: Begin Phase 1 - Type Extraction
**Timeline**: Complete all 5 phases within single development session
**Quality Gates**: Verify all quality gates pass after each phase
