import {screen, render, fireEvent, waitFor} from "@testing-library/react";
import ResourceForm from "./ResourceForm";
import { createResource } from "@/lib/api";

jest.mock("@/lib/api");

const mockAuth = {
  token: "test-token",
  user: { id: 1, name: "Test User" },
};

describe("ResourceForm", () => {
  test("shows login message when logged out", () => {
    render(<ResourceForm auth={null} />);

    expect(
      screen.getByText(/log in to share a resource/i)
    ).toBeInTheDocument();

    // Form should NOT be rendered
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  test("renders form fields when logged in", () => {
    render(<ResourceForm auth={mockAuth} />);

    expect(screen.getByPlaceholderText("Title")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
  });

  test("calls onPosted with new resource after submit", async () => {
  const mockResponse = {
    resource: {
      id: 123,
      title: "My Resource",
      url: "https://example.com",
      description: "A useful link",
      tags: ["tag1", "tag2"],
    },
  };

  (createResource as jest.Mock).mockResolvedValue(mockResponse);

  const onPosted = jest.fn();

  render(<ResourceForm auth={mockAuth} onPosted={onPosted} />);

  fireEvent.change(screen.getByPlaceholderText("Title"), {
    target: { value: "My Resource" },
  });

  fireEvent.change(screen.getByPlaceholderText("https://..."), {
    target: { value: "https://example.com" },
  });

  fireEvent.change(
    screen.getByPlaceholderText("Why is this worth sharing? (optional)"),
    { target: { value: "A useful link" } }
  );

  fireEvent.change(
    screen.getByPlaceholderText(
      "Tags, comma separated (e.g. javascript, beginner)"
    ),
    { target: { value: "tag1, tag2" } }
  );

  fireEvent.submit(screen.getByRole("form"));

  await waitFor(() => {
    expect(createResource).toHaveBeenCalled();
    expect(onPosted).toHaveBeenCalledWith(mockResponse.resource);
  });
});
