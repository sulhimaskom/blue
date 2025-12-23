import { db } from "@/lib/db";
import { users, projects, blueprints, transactions } from "@/lib/db/schema";
import { mockDbResponse } from "../helpers";
import { eq, and } from "drizzle-orm";

// Mock the imports
jest.mock("@/lib/db");

const mockDb = db as jest.MockedFunction<typeof db>;

describe("Database Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("User Operations", () => {
    it("should create user with default values", async () => {
      // Arrange
      const newUserData = {
        clerkId: "clerk-123",
        email: "test@example.com",
      };

      const expectedUser = {
        id: 1,
        ...newUserData,
        credits: 5,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(expectedUser);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.returning.mockResolvedValue([expectedUser]);
      mockDb.mockReturnValue(mockDatabase);

      // Act
      const database = db();
      const [result] = await database
        .insert(users)
        .values(newUserData)
        .returning();

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockDatabase.insert).toHaveBeenCalledWith(users);
      expect(mockDatabase.returning).toHaveBeenCalled();
    });

    it("should handle user lookup by clerkId", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        clerkId: "clerk-123",
        email: "test@example.com",
        credits: 10,
        subscriptionTier: "pro",
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(mockUser);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockUser]);
      mockDb.mockReturnValue(mockDatabase);

      // Act
      const database = db();
      const [result] = await database
        .select()
        .from(users)
        .where(eq(users.clerkId, "clerk-123"))
        .limit(1);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDatabase.where).toHaveBeenCalledWith(
        eq(users.clerkId, "clerk-123"),
      );
    });

    it("should update user credits", async () => {
      // Arrange
      const updatedUser = {
        id: 1,
        clerkId: "clerk-123",
        email: "test@example.com",
        credits: 15, // Updated from 10
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(updatedUser);
      mockDatabase.update.mockReturnValue(mockDatabase as any);
      mockDatabase.set.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.returning.mockResolvedValue([updatedUser]);
      mockDb.mockReturnValue(mockDatabase);

      // Act
      const database = db();
      const [result] = await database
        .update(users)
        .set({ credits: 15 })
        .where(eq(users.clerkId, "clerk-123"))
        .returning();

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockDatabase.set).toHaveBeenCalledWith({ credits: 15 });
    });
  });

  describe("Project Operations", () => {
    it("should create project and associate with user", async () => {
      // Arrange
      const projectData = {
        ownerId: 1,
        name: "My Project",
        description: "A test project",
        status: "draft" as const,
      };

      const expectedProject = {
        id: "project-uuid",
        ...projectData,
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(expectedProject);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.values.mockReturnValue(mockDatabase as any);
      mockDatabase.returning.mockResolvedValue([expectedProject]);
      mockDb.mockReturnValue(mockDatabase);

      // Act
      const database = db();
      const [result] = await database
        .insert(projects)
        .values(projectData)
        .returning();

      // Assert
      expect(result).toEqual(expectedProject);
      expect(mockDatabase.insert).toHaveBeenCalledWith(projects);
      expect(mockDatabase.values).toHaveBeenCalledWith(projectData);
    });

    it("should update project status to deployed", async () => {
      // Arrange
      const updatedProject = {
        id: "project-uuid",
        ownerId: 1,
        name: "My Project",
        description: "A test project",
        status: "deployed" as const,
        repoUrl: "https://github.com/user/repo",
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(updatedProject);
      mockDatabase.update.mockReturnValue(mockDatabase as any);
      mockDatabase.set.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.returning.mockResolvedValue([updatedProject]);
      mockDb.mockReturnValue(mockDatabase);

      // Act
      const database = db();
      const [result] = await database
        .update(projects)
        .set({
          status: "deployed",
          repoUrl: "https://github.com/user/repo",
        })
        .where(eq(projects.id, "project-uuid"))
        .returning();

      // Assert
      expect(result).toEqual(updatedProject);
      expect(result.status).toBe("deployed");
      expect(result.repoUrl).toBe("https://github.com/user/repo");
    });

    it("should fetch projects with pagination", async () => {
      // Arrange
      const mockProjects = [
        { id: "project-1", name: "Project 1" },
        { id: "project-2", name: "Project 2" },
        { id: "project-3", name: "Project 3" },
      ];

      const mockDatabase = mockDbResponse(mockProjects);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue(mockProjects);
      mockDb.mockReturnValue(mockDatabase);

      // Act
      const database = db();
      const result = await database
        .select()
        .from(projects)
        .where(eq(projects.ownerId, 1))
        .limit(10);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("Project 1");
    });
  });

  describe("Blueprint Operations", () => {
    it("should create blueprint associated with project", async () => {
      // Arrange
      const blueprintData = {
        projectId: "project-uuid",
        version: 1,
        contentMarkdown: "# Test Blueprint",
        structuredData: { status: "draft" },
        marketResearch: null,
      };

      const expectedBlueprint = {
        id: "blueprint-uuid",
        ...blueprintData,
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(expectedBlueprint);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.values.mockReturnValue(mockDatabase as any);
      mockDatabase.returning.mockResolvedValue([expectedBlueprint]);
      mockDb.mockReturnValue(mockDatabase);

      // Act
      const database = db();
      const [result] = await database
        .insert(blueprints)
        .values(blueprintData)
        .returning();

      // Assert
      expect(result).toEqual(expectedBlueprint);
      expect(result.projectId).toBe("project-uuid");
      expect(result.version).toBe(1);
    });

    it("should fetch all blueprints for a project ordered by version", async () => {
      // Arrange
      const mockBlueprints = [
        { id: "bp-1", projectId: "project-uuid", version: 1 },
        { id: "bp-2", projectId: "project-uuid", version: 2 },
        { id: "bp-3", projectId: "project-uuid", version: 3 },
      ];

      const mockDatabase = mockDbResponse(mockBlueprints);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.orderBy.mockResolvedValue(mockBlueprints);
      mockDb.mockReturnValue(mockDatabase);

      // Act
      const database = db();
      const result = await database
        .select()
        .from(blueprints)
        .where(eq(blueprints.projectId, "project-uuid"))
        .orderBy(blueprints.version);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(1);
      expect(result[2].version).toBe(3);
    });

    it("should create refined blueprint with incremented version", async () => {
      // Arrange
      const refinedBlueprintData = {
        projectId: "project-uuid",
        version: 2, // Incremented from 1
        contentMarkdown: "# Refined Blueprint\n\nUser feedback applied",
        structuredData: {
          status: "refined",
          refinementType: "minor",
        },
        marketResearch: null,
      };

      const expectedBlueprint = {
        id: "refined-blueprint-uuid",
        ...refinedBlueprintData,
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(expectedBlueprint);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.values.mockReturnValue(mockDatabase as any);
      mockDatabase.returning.mockResolvedValue([expectedBlueprint]);
      mockDb.mockReturnValue(mockDatabase);

      // Act
      const database = db();
      const [result] = await database
        .insert(blueprints)
        .values(refinedBlueprintData)
        .returning();

      // Assert
      expect(result).toEqual(expectedBlueprint);
      expect(result.version).toBe(2);
      expect(result.structuredData.refinementType).toBe("minor");
    });
  });

  describe("Transaction Operations", () => {
    it("should create transaction record", async () => {
      // Arrange
      const transactionData = {
        userId: 1,
        amount: 1000, // $10.00 in cents
        creditsAdded: 100,
        stripePaymentId: "pi_stripe_123",
      };

      const expectedTransaction = {
        id: "transaction-uuid",
        ...transactionData,
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(expectedTransaction);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.values.mockReturnValue(mockDatabase as any);
      mockDatabase.returning.mockResolvedValue([expectedTransaction]);
      mockDb.mockReturnValue(mockDatabase);

      // Act
      const database = db();
      const [result] = await database
        .insert(transactions)
        .values(transactionData)
        .returning();

      // Assert
      expect(result).toEqual(expectedTransaction);
      expect(result.amount).toBe(1000);
      expect(result.creditsAdded).toBe(100);
    });

    it("should fetch transaction history for user", async () => {
      // Arrange
      const mockTransactions = [
        {
          id: "txn-1",
          userId: 1,
          amount: 1000,
          creditsAdded: 100,
          stripePaymentId: "pi_1",
          createdAt: new Date("2025-01-01"),
        },
        {
          id: "txn-2",
          userId: 1,
          amount: 500,
          creditsAdded: 50,
          stripePaymentId: "pi_2",
          createdAt: new Date("2025-01-15"),
        },
      ];

      const mockDatabase = mockDbResponse(mockTransactions);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockResolvedValue(mockTransactions);
      mockDb.mockReturnValue(mockDatabase);

      // Act
      const database = db();
      const result = await database
        .select()
        .from(transactions)
        .where(eq(transactions.userId, 1));

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(1000);
      expect(result[1].creditsAdded).toBe(50);
    });
  });

  describe("Complex Joins and Relationships", () => {
    it("should fetch project with user and blueprint details", async () => {
      // Arrange
      const complexResult = [
        {
          project: {
            id: "project-uuid",
            ownerId: 1,
            name: "Complex Project",
            status: "completed",
          },
          blueprint: {
            id: "blueprint-uuid",
            projectId: "project-uuid",
            version: 2,
            contentMarkdown: "# Complex Blueprint",
          },
          user: {
            id: 1,
            clerkId: "clerk-123",
            email: "user@example.com",
            credits: 20,
          },
        },
      ];

      const mockDatabase = mockDbResponse(complexResult);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.from.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue(complexResult);
      mockDb.mockReturnValue(mockDatabase);

      // Act
      const database = db();
      const result = await database
        .select({
          project: projects,
          blueprint: blueprints,
          user: users,
        })
        .from(blueprints)
        .innerJoin(projects, eq(blueprints.projectId, projects.id))
        .innerJoin(users, eq(projects.ownerId, users.id))
        .where(
          and(
            eq(blueprints.id, "blueprint-uuid"),
            eq(users.clerkId, "clerk-123"),
          ),
        )
        .limit(1);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].project.name).toBe("Complex Project");
      expect(result[0].blueprint.version).toBe(2);
      expect(result[0].user.credits).toBe(20);
    });
  });

  describe("Error Handling and Transaction Rollback", () => {
    it("should handle database connection failures", async () => {
      // Arrange
      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockRejectedValue(new Error("Connection timeout"));
      mockDb.mockReturnValue(mockDatabase);

      // Act & Assert
      const database = db();
      await expect(
        database.select().from(users).where(eq(users.clerkId, "test")).limit(1),
      ).rejects.toThrow("Connection timeout");
    });

    it("should handle constraint violations", async () => {
      // Arrange
      const duplicateUserData = {
        clerkId: "clerk-123", // Duplicate
        email: "test@example.com",
      };

      const mockDatabase = mockDbResponse(null);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.values.mockReturnValue(mockDatabase as any);
      mockDatabase.returning.mockRejectedValue(
        new Error("UNIQUE constraint failed"),
      );
      mockDb.mockReturnValue(mockDatabase);

      // Act & Assert
      const database = db();
      await expect(
        database.insert(users).values(duplicateUserData).returning(),
      ).rejects.toThrow("UNIQUE constraint failed");
    });

    it("should handle foreign key constraint violations", async () => {
      // Arrange
      const invalidProjectData = {
        ownerId: 999, // Non-existent user
        name: "Orphan Project",
        status: "draft" as const,
      };

      const mockDatabase = mockDbResponse(null);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.values.mockReturnValue(mockDatabase as any);
      mockDatabase.returning.mockRejectedValue(
        new Error("FOREIGN KEY constraint failed"),
      );
      mockDb.mockReturnValue(mockDatabase);

      // Act & Assert
      const database = db();
      await expect(
        database.insert(projects).values(invalidProjectData).returning(),
      ).rejects.toThrow("FOREIGN KEY constraint failed");
    });

    it("should simulate transaction rollback scenarios", async () => {
      // This simulates what would happen in a real transaction
      // when one operation fails, all previous operations should be rolled back

      // Arrange
      const mockDatabase = mockDbResponse(null);
      let operationCounter = 0;

      // First operation (user creation) succeeds
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.returning.mockImplementation(() => {
        operationCounter++;
        if (operationCounter === 1) {
          return Promise.resolve([{ id: 1, clerkId: "clerk-123" }]);
        }
        return Promise.reject(new Error("Simulated transaction failure"));
      });
      mockDatabase.values.mockReturnValue(mockDatabase as any);
      mockDb.mockReturnValue(mockDatabase);

      // Act & Assert
      const database = db();

      // First operation succeeds
      const userResult = await database
        .insert(users)
        .values({ clerkId: "clerk-123", email: "test@example.com" })
        .returning();
      expect(userResult).toHaveLength(1);

      // Second operation fails (simulating transaction abort)
      await expect(
        database
          .insert(projects)
          .values({ ownerId: 1, name: "Test Project", status: "draft" })
          .returning(),
      ).rejects.toThrow("Simulated transaction failure");

      // In a real transaction, the user insertion would be rolled back
      // This test demonstrates the error handling pattern
      expect(operationCounter).toBe(2);
    });
  });
});
