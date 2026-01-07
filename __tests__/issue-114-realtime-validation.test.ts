/**
 * Test Suite for Issue #114: Real-time Blueprint Validation
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import DashboardPage from "../app/dashboard/blueprints/page";

// Mock the API responses
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock authentication
jest.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { id: "test-user", clerkId: "test-clerk-id" } }),
}));

// Mock DashboardLayout
jest.mock("../components/layout/dashboard-layout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

describe.skip("Real-time Blueprint Validation - Issue #114 (DEPRECATED - new validation system)", () => {
  beforeEach(() => {
    mockFetch.mockClear();

    // Mock initial data fetch
    mockFetch.mockImplementation((url) => {
      if (url === "/api/blueprints") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              projects: [],
              credits: 5,
              subscriptionTier: "free",
            }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      });
    });

    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should show character count for blueprint description field", async () => {
    render(React.createElement(DashboardPage));

    const createButton = await screen.findByText("Create First Blueprint");
    fireEvent.click(createButton);

    const descriptionField = screen.getByPlaceholderText(
      "Describe the blueprint you want to generate (10-1000 characters)",
    );
    expect(descriptionField).toBeInTheDocument();

    fireEvent.change(descriptionField, {
      target: { value: "This is a test blueprint description" },
    });

    // Check character count with flexible matcher
    expect(screen.getByText(/36/)).toBeInTheDocument();
    expect(screen.getByText(/1000/)).toBeInTheDocument();
  });

  test("should show character count for project name field", async () => {
    render(React.createElement(DashboardPage));

    const createButton = await screen.findByText("Create First Blueprint");
    fireEvent.click(createButton);

    const projectNameField = screen.getByPlaceholderText("Enter project name");
    expect(projectNameField).toBeInTheDocument();

    fireEvent.change(projectNameField, {
      target: { value: "My Test Project" },
    });

    // Look for the character count in the specific span next to the helper text
    expect(screen.getByText("15")).toBeInTheDocument();
    const characterCounts = screen.getAllByText("50");
    expect(characterCounts).toHaveLength(2); // Found in helper text and character count
  });

  test("should validate project name in real-time", async () => {
    render(React.createElement(DashboardPage));

    const createButton = await screen.findByText("Create First Blueprint");
    fireEvent.click(createButton);

    const projectNameField = screen.getByPlaceholderText("Enter project name");
    fireEvent.change(projectNameField, { target: { value: "ab" } });

    await waitFor(() => {
      expect(
        screen.getByText("Project name must be at least 3 characters"),
      ).toBeInTheDocument();
    });

    fireEvent.change(projectNameField, {
      target: { value: "Valid Project Name" },
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Project name must be at least 3 characters"),
      ).not.toBeInTheDocument();
    });
  });

  test("should validate blueprint description in real-time", async () => {
    render(React.createElement(DashboardPage));

    const createButton = await screen.findByText("Create First Blueprint");
    fireEvent.click(createButton);

    const descriptionField = screen.getByPlaceholderText(
      "Describe the blueprint you want to generate (10-1000 characters)",
    );
    fireEvent.change(descriptionField, { target: { value: "Short" } });

    await waitFor(() => {
      expect(
        screen.getByText("Input must be at least 10 characters"),
      ).toBeInTheDocument();
    });

    fireEvent.change(descriptionField, {
      target: { value: "This is a valid blueprint description" },
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Input must be at least 10 characters"),
      ).not.toBeInTheDocument();
    });
  });

  test("should enable submit button when form is valid", async () => {
    render(React.createElement(DashboardPage));

    const createButton = await screen.findByText("Create First Blueprint");
    fireEvent.click(createButton);

    const submitButton = screen.getByRole("button", {
      name: "Create Blueprint (1 Credit)",
    });
    const projectNameField = screen.getByPlaceholderText("Enter project name");
    const descriptionField = screen.getByPlaceholderText(
      "Describe the blueprint you want to generate (10-1000 characters)",
    );

    // Fill with valid data
    fireEvent.change(projectNameField, { target: { value: "Valid Project" } });
    fireEvent.change(descriptionField, {
      target: { value: "Valid blueprint description" },
    });

    await waitFor(
      () => {
        expect(submitButton).not.toBeDisabled();
      },
      { timeout: 3000 },
    );
  });

  test("should disable submit button when validation fails", async () => {
    render(React.createElement(DashboardPage));

    const createButton = await screen.findByText("Create First Blueprint");
    fireEvent.click(createButton);

    const submitButton = screen.getByRole("button", {
      name: "Create Blueprint (1 Credit)",
    });
    const projectNameField = screen.getByPlaceholderText("Enter project name");
    const descriptionField = screen.getByPlaceholderText(
      "Describe the blueprint you want to generate (10-1000 characters)",
    );

    // Fill with valid data first
    fireEvent.change(projectNameField, { target: { value: "Valid Project" } });
    fireEvent.change(descriptionField, {
      target: { value: "Valid blueprint description" },
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    // Make invalid
    fireEvent.change(projectNameField, { target: { value: "a" } });

    await waitFor(() => {
      expect(
        screen.getByText("Project name must be at least 3 characters"),
      ).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  test("should disable submit button when insufficient credits", async () => {
    mockFetch.mockImplementation((url) => {
      if (url === "/api/blueprints") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              projects: [],
              credits: 0,
              subscriptionTier: "free",
            }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    render(React.createElement(DashboardPage));

    const createButton = await screen.findByText("Create First Blueprint");
    fireEvent.click(createButton);

    const projectNameField = screen.getByPlaceholderText("Enter project name");
    const descriptionField = screen.getByPlaceholderText(
      "Describe the blueprint you want to generate (10-1000 characters)",
    );

    fireEvent.change(projectNameField, {
      target: { value: "Valid Project Name" },
    });
    fireEvent.change(descriptionField, {
      target: { value: "Valid blueprint description for testing" },
    });

    const submitButton = screen.getByRole("button", {
      name: "Create Blueprint (1 Credit)",
    });
    expect(submitButton).toBeDisabled();
  });

  test("should handle form submission with validation errors", async () => {
    mockFetch.mockImplementation((url, options) => {
      if (url === "/api/blueprints" && options?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: "API validation error" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ projects: [], credits: 5 }),
      });
    });

    render(React.createElement(DashboardPage));

    const createButton = await screen.findByText("Create First Blueprint");
    fireEvent.click(createButton);

    const projectNameField = screen.getByPlaceholderText("Enter project name");
    const descriptionField = screen.getByPlaceholderText(
      "Describe the blueprint you want to generate (10-1000 characters)",
    );

    fireEvent.change(projectNameField, { target: { value: "Test Project" } });
    fireEvent.change(descriptionField, {
      target: { value: "Test blueprint description" },
    });

    const submitButton = screen.getByRole("button", {
      name: "Create Blueprint (1 Credit)",
    });
    fireEvent.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText("API validation error")).toBeInTheDocument();
    });
  });

  test("should provide helpful placeholder text", async () => {
    render(React.createElement(DashboardPage));

    const createButton = await screen.findByText("Create First Blueprint");
    fireEvent.click(createButton);

    const projectNameField = screen.getByPlaceholderText("Enter project name");
    const descriptionField = screen.getByPlaceholderText(
      "Describe the blueprint you want to generate (10-1000 characters)",
    );

    expect(projectNameField).toHaveAttribute(
      "placeholder",
      "Enter project name",
    );
    expect(descriptionField).toHaveAttribute(
      "placeholder",
      "Describe the blueprint you want to generate (10-1000 characters)",
    );
  });

  test("should highlight invalid fields visually", async () => {
    render(React.createElement(DashboardPage));

    const createButton = await screen.findByText("Create First Blueprint");
    fireEvent.click(createButton);

    const projectNameField = screen.getByPlaceholderText("Enter project name");
    fireEvent.change(projectNameField, { target: { value: "a" } }); // Invalid

    await waitFor(() => {
      expect(projectNameField).toHaveClass("border-red-300");
    });

    // Fix the validation
    fireEvent.change(projectNameField, { target: { value: "Valid Name" } });

    await waitFor(() => {
      expect(projectNameField).not.toHaveClass("border-red-300");
    });
  });

  test("should handle form cancellation correctly", async () => {
    render(React.createElement(DashboardPage));

    const createButton = await screen.findByText("Create First Blueprint");
    fireEvent.click(createButton);

    // Fill some data
    const projectNameField = screen.getByPlaceholderText("Enter project name");
    fireEvent.change(projectNameField, { target: { value: "Test Project" } });

    // Click cancel
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    // Form should close
    expect(screen.queryByText("Project Name *")).not.toBeInTheDocument();
  });
});
