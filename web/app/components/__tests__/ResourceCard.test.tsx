import { render, screen } from "@testing-library/react";
import ResourceCard, { groupReactions } from "../ResourceCard";
import { AuthState, Resource } from "@/lib/types";

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

  const memberOwnerAuth: AuthState = {
		token: "member-owner-token",
		user: {
			id: "u1",
			email: "amina@example.com",
			displayName: "Amina Yusuf",
			role: "member",
		},
  };

  const memberOtherAuth: AuthState = {
		token: "member-other-token",
		user: {
			id: "u2",
			email: "diego@example.com",
			displayName: "Diego",
			role: "member",
		},
  };

  const moderatorAuth: AuthState = {
		token: "moderator-token",
		user: {
			id: "u3",
			email: "moderator@example.com",
			displayName: "Moderator",
			role: "moderator",
		},
  };

  it("renders the resource title, author, and tags", () => {
    render(<ResourceCard resource={resource} auth={null} onUpdated={() => {}} onDeleted={() => {}}/>);

    expect(screen.getByText("MDN Async/Await Guide")).toBeInTheDocument();
    expect(screen.getByText("Amina Yusuf")).toBeInTheDocument();
    expect(screen.getByText("javascript")).toBeInTheDocument();
    expect(screen.getByText("beginner")).toBeInTheDocument();
  });

  it("does not show reaction buttons when logged out", () => {
    render(<ResourceCard resource={resource} auth={null} onUpdated={() => {}} onDeleted={() => {}}/>);

    expect(
      screen.queryByRole("button", { name: "⭐" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "🔖" }),
    ).not.toBeInTheDocument();
  });

  it("shows the delete button to the resource owner", () => {
		render(
			<ResourceCard
				resource={resource}
				auth={memberOwnerAuth}
				onUpdated={() => {}}
				onDeleted={() => {}}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Delete" }),
		).toBeInTheDocument();
  });

  it("does not show the delete button to another member", () => {
		render(
			<ResourceCard
				resource={resource}
				auth={memberOtherAuth}
				onUpdated={() => {}}
				onDeleted={() => {}}
			/>,
		);

		expect(
			screen.queryByRole("button", { name: "Delete" }),
		).not.toBeInTheDocument();
  });

  it("shows the delete button to moderators", () => {
		render(
			<ResourceCard
				resource={resource}
				auth={moderatorAuth}
				onUpdated={() => {}}
				onDeleted={() => {}}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Delete" }),
		).toBeInTheDocument();
  });

  it("does not show the delete button when logged out", () => {
		render(
			<ResourceCard
				resource={resource}
				auth={null}
				onUpdated={() => {}}
				onDeleted={() => {}}
			/>,
		);

		expect(
			screen.queryByRole("button", { name: "Delete" }),
		).not.toBeInTheDocument();
  });
});
