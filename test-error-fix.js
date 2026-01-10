// Simple test to verify error class usage
try {
  const { DatabaseError, ValidationError } = require('./lib/api-utils');
  
  // Test DatabaseError
  const dbError = new DatabaseError("Test database error");
  console.log("✅ DatabaseError created:", dbError.name);
  
  // Test ValidationError  
  const validationError = new ValidationError("Test validation error");
  console.log("✅ ValidationError created:", validationError.name);
  
  console.log("✅ All error classes working correctly");
} catch (error) {
  console.log("❌ Error test failed:", error.message);
}