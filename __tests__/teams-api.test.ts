import { describe, it, expect } from "@jest/globals";
import { teamService } from "@/lib/services/team-service";
import { db } from "@/lib/db";

// Mock database and dependencies
jest.mock("@/lib/db");
jest.mock("@/lib/logger");
jest.mock("@/lib/services/cache-orchestrator");

describe("TeamService - Basic Functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should be instantiated correctly", () => {
    expect(teamService).toBeDefined();
    expect(typeof teamService.createTeam).toBe("function");
    expect(typeof teamService.getUserTeams).toBe("function");
  });

  it("should have required methods", () => {
    expect(teamService).toHaveProperty("createTeam");
    expect(teamService).toHaveProperty("getUserTeams");
    expect(teamService).toHaveProperty("getTeamById");
  });
});
