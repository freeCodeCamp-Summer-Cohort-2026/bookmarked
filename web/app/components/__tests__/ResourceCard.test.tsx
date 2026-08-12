import { render, screen } from "@testing-library/react";
import ResourceCard, { groupReactions } from "../ResourceCard";
import { Resource } from "@/lib/types";

describe("groupReactions", () => {
  it("counts reactions by emoji", () => {
    const reactions = [
      { id: "r1", emoji: "⭐" },
      { id: "r2", emoji: "⭐" },
      { id: "r3", emoji: "🔖" },
    ];
    expect(groupReactions(reactions)).toEqual({ "⭐": 2, "🔖": 1 });
  });

  it("counts reactions by three or more and repeated emoji", ()  => {
    const newReactions = [
      { id: "r1", emoji: "⭐" },
      { id: "r2", emoji: "🔖" },
      { id: "r3", emoji: "⭐" },
      { id: "r4", emoji: "🔖" },
      { id: "r5", emoji: "✅" },
    ];
    expect(groupReactions(newReactions)).toEqual({"⭐": 2, "🔖": 2,"✅": 1})
  });

  it("returns an empty object for no reactions", () => {
    expect(groupReactions([])).toEqual({});
  });
});

describe("ResourceCard", () => {
  const resource: Resource = {
    id: "1",
    title: "MDN Async/Await Guide",
    url: "https://developer.mozilla.org",
    description: "Great explainer for async/await.",
    tags: ["javascript", "beginner"],
    createdAt: new Date().toISOString(),
    submittedBy: { id: "u1", displayName: "Amina Yusuf", email: "amina@example.com" },
    reactions: [{ id: "r1", emoji: "⭐", user: { id: "u2", displayName: "Diego", email: "d@example.com" } }],
  };

  it("renders the resource title, author, and tags", () => {
    render(<ResourceCard resource={resource} auth={null} onUpdated={() => {}} />);

    expect(screen.getByText("MDN Async/Await Guide")).toBeInTheDocument();
    expect(screen.getByText("Amina Yusuf")).toBeInTheDocument();
    expect(screen.getByText("javascript")).toBeInTheDocument();
    expect(screen.getByText("beginner")).toBeInTheDocument();
  });

  it("does not show reaction buttons when logged out", () => {
    render(<ResourceCard resource={resource} auth={null} onUpdated={() => {}} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
