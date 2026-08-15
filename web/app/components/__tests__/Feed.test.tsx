import { render, screen } from "@testing-library/react";
import Feed from "../Feed";
import { listResources } from "@/lib/api";
import { Resource } from "@/lib/types";

jest.mock("@/lib/api");

describe("Feed", () => {
  it("shows loading state while resources are loading", () => {
    (listResources as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(<Feed auth={null}  />);
    expect(
      screen.getByText("Loading resources...")
    ).toBeInTheDocument();
  });

  it("shows no resources when none were received", async () => {
    (listResources as jest.Mock).mockResolvedValue(
      {resources : []});

    render(<Feed auth={null}  />);
    expect(
     await screen.findByText("No resources yet.")
    ).toBeInTheDocument();
  });

  it("renders a ResourceCard per resource once loaded", async () => {

    const resource1: Resource = {
    id: "1",
    title: "MDN Async/Await Guide",
    url: "https://developer.mozilla.org",
    description: "Great explainer for async/await.",
    tags: ["javascript", "beginner"],
    createdAt: new Date().toISOString(),
    submittedBy: {
      id: "u1",
      displayName: "Amina Yusuf",
      email: "amina@example.com",
      role: "member",
    },
    reactions : []
    };

    const resource2: Resource = {
    id: "2",
    title: "Some other Guide",
    url: "https://developer.mozilla.org",
    description: "Great explainer for loops.",
    tags: ["javascript", "beginner"],
    createdAt: new Date().toISOString(),
    submittedBy: {
      id: "u1",
      displayName: "Amina Yusuf",
      email: "amina@example.com",
      role: "member",
    },
    reactions : []
    };

    (listResources as jest.Mock).mockResolvedValue(
      {resources : [resource1, resource2]}
    );

    render(<Feed auth={null} />);
    const cards = await screen.findAllByRole("article");
    expect(cards).toHaveLength(2);
  });
});