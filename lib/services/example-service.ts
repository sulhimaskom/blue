import { ServiceErrorHandler, ServiceError } from "./service-error-handler";

/**
 * Example demonstration service showing standardized error handling
 */
export class ExampleService {
  /**
   * Demonstrate standardized validation
   */
  static validatedOperation(input: { name: string; email: string }): {
    id: string;
    name: string;
  } {
    return ServiceErrorHandler.wrap(
      (data) => {
        // Validate name
        ServiceErrorHandler.validate(
          data.name,
          (value) => value && value.length >= 2,
          "ExampleService",
          "validatedOperation",
          "name",
        );

        // Validate email format
        ServiceErrorHandler.validate(
          data.email,
          (value) => value && value.includes("@"),
          "ExampleService",
          "validatedOperation",
          "email",
        );

        // Return processed data
        return {
          id: Math.random().toString(36),
          name: data.name.trim(),
        };
      },
      "ExampleService",
      "validatedOperation",
    )(input);
  }

  /**
   * Demonstrate async operation with error handling
   */
  static async asyncOperation(success: boolean = true): Promise<string> {
    return ServiceErrorHandler.handleAsync(
      async () => {
        if (!success) {
          throw ServiceError.database(
            "Database connection failed",
            "ExampleService",
            "asyncOperation",
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
        return "Operation completed successfully";
      },
      "ExampleService",
      "asyncOperation",
      { success },
    );
  }

  /**
   * Demonstrate nested service calls
   */
  static async complexOperation(input: {
    name: string;
    email: string;
  }): Promise<string> {
    return ServiceErrorHandler.handleAsync(
      async () => {
        // First validate input
        const validated = this.validatedOperation(input);

        // Then perform async operation
        const result = await this.asyncOperation(true);

        return `Processed ${validated.name}: ${result}`;
      },
      "ExampleService",
      "complexOperation",
      { input },
    );
  }

  /**
   * Demonstrate service error creation
   */
  static demonstrateErrorCreation(): never {
    throw ServiceError.validation(
      "This is a demonstration validation error",
      "ExampleService",
      "demonstrateErrorCreation",
      { demo: true },
    );
  }
}
