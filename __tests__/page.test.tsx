import { render, screen } from "@testing-library/react";
import Home from "../app/page";

describe("Home", () => {
  it("renders a_heading", () => {
    render(<Home />);
    const heading = screen.getByRole("heading", {
      name: /architect platform/i,
    });
    expect(heading).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<Home />);
    const description = screen.getByText(
      /AI-powered platform for generating software blueprints and repositories/i,
    );
    expect(description).toBeInTheDocument();
  });
});
