/**
 * Database Query Builder for Test Infrastructure
 *
 * Provides a fluent interface for building database mocks
 * that properly chain methods and return expected results.
 */

export class DatabaseQueryBuilder {
  private mock: any;

  constructor(initialData?: any[]) {
    this.mock = this.createBaseMock();
    if (initialData) {
      this.mock.queryResult = initialData;
    }
  }

  private createBaseMock() {
    return {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      queryResult: [],
    };
  }

  /**
   * Set the query result data
   */
  withQueryResult(data: any[]) {
    this.mock.queryResult = data;
    return this;
  }

  /**
   * Configure the mock to resolve with the query result
   * when a terminal method is called
   */
  private configureTerminalMethods() {
    if (this.mock.limit) {
      this.mock.limit.mockImplementation(() =>
        Promise.resolve(this.mock.queryResult),
      );
    }
    if (this.mock.orderBy) {
      this.mock.orderBy.mockImplementation(() =>
        Promise.resolve(this.mock.queryResult),
      );
    }
    if (this.mock.returning) {
      this.mock.returning.mockImplementation(() =>
        Promise.resolve(this.mock.queryResult),
      );
    }
    if (this.mock.run) {
      this.mock.run.mockImplementation(() =>
        Promise.resolve(this.mock.queryResult),
      );
    }
    if (this.mock.execute) {
      this.mock.execute.mockImplementation(() =>
        Promise.resolve(this.mock.queryResult),
      );
    }
  }

  /**
   * Build and return the final mock object
   */
  build() {
    this.configureTerminalMethods();
    return this.mock;
  }
}

/**
 * Factory function for creating database mocks
 */
export function createDatabaseMock(initialData?: any[]) {
  return new DatabaseQueryBuilder(initialData).build();
}
