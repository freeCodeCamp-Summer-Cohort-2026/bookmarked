import ResourceCard, { groupReactions } from "../ResourceCard";
import { AuthState, Resource } from "@/lib/types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { addReaction } from "@/lib/api";
import { formatRelativeTime } from "@/app/utils/formatRelativeTime";

jest.mock("@/lib/api");

describe("groupReactions", () => {
  it("counts reactions by emoji", () => {
    const reactions = [
      { id: "r1", emoji: "⭐" },
      { id: "r2", emoji: "⭐" },
      { id: "r3", emoji: "🔖" },
    ];
    expect(groupReactions(reactions)).toEqual({ "⭐": 2, "🔖": 1 });
  });

  it("counts reactions by three or more and repeated emoji", () => {
    const newReactions = [
      { id: "r1", emoji: "⭐" },
      { id: "r2", emoji: "🔖" },
      { id: "r3", emoji: "⭐" },
      { id: "r4", emoji: "🔖" },
      { id: "r5", emoji: "✅" },
    ];
    expect(groupReactions(newReactions)).toEqual({ "⭐": 2, "🔖": 2, "✅": 1 });
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
    submittedBy: {
      id: "u1",
      displayName: "Amina Yusuf",
      email: "amina@example.com",
      role: "member",
    },
    reactions: [
      {
        id: "r1",
        emoji: "⭐",
        user: {
          id: "u2",
          displayName: "Diego",
          email: "d@example.com",
          role: "member",
        },
      },
    ],
  };
  const reactionHistory: string[] = [];
  const onReactionSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  const auth: AuthState = {
    token: "fake-token",
    user: {
      id: "u2",
      displayName: "Diego",
      email: "d@example.com",
      role: "member",
    },
  };

  it("renders the resource title, author, and tags", () => {
    render(
      <ResourceCard
        resource={resource}
        auth={null}
        reactionHistory={reactionHistory}
        onReactionSelected={onReactionSelected}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    expect(screen.getByText("MDN Async/Await Guide")).toBeInTheDocument();
    expect(screen.getByText("Amina Yusuf")).toBeInTheDocument();
    expect(screen.getByText("javascript")).toBeInTheDocument();
    expect(screen.getByText("beginner")).toBeInTheDocument();
  });

  it("copies the resource as a markdown link", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <ResourceCard
        resource={resource}
        auth={null}
        reactionHistory={reactionHistory}
        onReactionSelected={onReactionSelected}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy markdown" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "[MDN Async/Await Guide](https://developer.mozilla.org)",
      ),
    );
  });

  test("navigates to the correct link when 'View Details' is clicked", () => {
    render(
      <ResourceCard
        resource={resource}
        auth={null}
        reactionHistory={reactionHistory}
        onReactionSelected={onReactionSelected}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );
    expect(screen.getByRole("link", { name: "View Details" })).toHaveAttribute(
      "href",
      `/resources/${resource.id}`,
    );
  });

  it("does not show reaction buttons when logged out", () => {
    render(
      <ResourceCard
        resource={resource}
        auth={null}
        reactionHistory={reactionHistory}
        onReactionSelected={onReactionSelected}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

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
        reactionHistory={reactionHistory}
        onReactionSelected={onReactionSelected}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("opens a confirmation modal before deleting", () => {
    render(
      <ResourceCard
        resource={resource}
        auth={memberOwnerAuth}
        reactionHistory={reactionHistory}
        onReactionSelected={onReactionSelected}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      screen.getByRole("dialog", { name: "Delete resource" }),
    ).toBeInTheDocument();
  });

  it("does not show the delete button to another member", () => {
    render(
      <ResourceCard
        resource={resource}
        auth={memberOtherAuth}
        reactionHistory={reactionHistory}
        onReactionSelected={onReactionSelected}
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
        reactionHistory={reactionHistory}
        onReactionSelected={onReactionSelected}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("does not show the delete button when logged out", () => {
    render(
      <ResourceCard
        resource={resource}
        auth={null}
        reactionHistory={reactionHistory}
        onReactionSelected={onReactionSelected}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("shows the report button when logged in", () => {
    render(
      <ResourceCard
        resource={resource}
        auth={auth}
        reactionHistory={reactionHistory}
        onReactionSelected={onReactionSelected}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    expect(screen.getByText("Report broken link")).toBeInTheDocument();
  });

  it("records a reaction after a successful submission", async () => {
    const handleUpdated = jest.fn();
    const handleReactionSelected = jest.fn();

    (addReaction as jest.Mock).mockResolvedValue({
      resource,
    });

    render(
      <ResourceCard
        resource={resource}
        auth={auth}
        reactionHistory={reactionHistory}
        onReactionSelected={handleReactionSelected}
        onUpdated={handleUpdated}
        onDeleted={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "⭐" }));

    await waitFor(() => {
      expect(addReaction).toHaveBeenCalledWith(
        { resourceId: resource.id, emoji: "⭐" },
        auth.token,
      );
      expect(handleUpdated).toHaveBeenCalledWith(resource);
      expect(handleReactionSelected).toHaveBeenCalledWith("⭐");
    });

    expect(handleReactionSelected).toHaveBeenCalledTimes(1);
  });

  it("does not update state after a failed emoji submission", async () => {
    const handleUpdated = jest.fn();
    const handleReactionSelected = jest.fn();

    (addReaction as jest.Mock).mockRejectedValue(
      new Error("Submission failed"),
    );

    render(
      <ResourceCard
        resource={resource}
        auth={auth}
        reactionHistory={reactionHistory}
        onReactionSelected={handleReactionSelected}
        onUpdated={handleUpdated}
        onDeleted={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "⭐" }));

    await waitFor(() => {
      expect(screen.getByText("Submission failed")).toBeInTheDocument();
    });

    expect(handleUpdated).not.toHaveBeenCalled();
    expect(handleReactionSelected).not.toHaveBeenCalled();
  });
});

describe("formatRelativeTime (timestamp boundaries: issue#89)", () => {
  // fake timers for deterministic behavior
  beforeAll(() => {
    jest.useFakeTimers();
  });

  // restores real timers
  afterAll(() => {
    jest.useRealTimers();
  });

  // fixated now, so that tests are deterministic and doesnt depend on local timezone
  const fixedNow = new Date("2026-08-17T12:00:00.000Z");

  const setNow = () => {
    jest.setSystemTime(fixedNow);
  };

  it("future -> in future", () => {
    setNow();
    // 5 minutes in future
    const timeFactored = (5 * 60) * 1000;
    const t = new Date(fixedNow.getTime() + timeFactored);
    expect(formatRelativeTime(t)).toBe("in future");
  });

  it("59 seconds ago -> just now", () => {
    setNow();
    // 59 seconds
    const timeFactored = 59 * 1000;
    const t = new Date(fixedNow.getTime() - timeFactored);
    expect(formatRelativeTime(t)).toBe("just now");
  });

  it("59m40s ago -> 59 minutes ago", () => {
    setNow();
    // 59 minutes + 40 seconds
    const timeFactored = (59 * 60 + 40) * 1000;
    const t = new Date(fixedNow.getTime() - timeFactored);
    expect(formatRelativeTime(t)).toBe("59 minutes ago");
  });

  it("60 minutes ago -> 1 hour ago", () => {
    setNow();
    // 60 minutes
    const timeFactored = 60 * 60 * 1000;
    const t = new Date(fixedNow.getTime() - timeFactored);
    expect(formatRelativeTime(t)).toBe("1 hour ago");
  });

  it("23h40m ago -> 23 hours ago", () => {
    setNow();
    // 23 hours + 40 minutes
    const twentyThreeHours = 23 * 60 * 60 * 1000;
    const fortyMinutes = 40 * 60 * 1000;
    const timeFactored = twentyThreeHours + fortyMinutes;
    const t = new Date(fixedNow.getTime() - timeFactored);
    expect(formatRelativeTime(t)).toBe("23 hours ago");
  });

  it("24 hours ago -> 1 day ago", () => {
    setNow();
    // 24 hours
    const timeFactored = 24 * 60 * 60 * 1000;
    const t = new Date(fixedNow.getTime() - timeFactored);
    expect(formatRelativeTime(t)).toBe("1 day ago");
  });

  it("6 days 14 hours ago -> 6 days ago (not 7)", () => {
    setNow();
    // 6 days + 14 hours
    const sixDays = 6 * 24 * 60 * 60 * 1000;
    const fourteenHours = 14 * 60 * 60 * 1000;
    const timeFactored = sixDays + fourteenHours;
    const t = new Date(fixedNow.getTime() - timeFactored);
    expect(formatRelativeTime(t)).toBe("6 days ago");
  });

  it("exactly 7 days ago -> full localized date", () => {
    setNow();
    // 7 days
    const timeFactored = 7 * 24 * 60 * 60 * 1000;
    const t = new Date(fixedNow.getTime() - timeFactored);
    expect(formatRelativeTime(t)).toBe(t.toLocaleString());
  });
});
