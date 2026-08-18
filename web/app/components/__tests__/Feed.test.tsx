import { fireEvent, render, screen } from "@testing-library/react";
import { AuthState, Resource } from "@/lib/types";
import { listResources } from "@/lib/api";
import { useReactionHistory } from "@/lib/useReactionHistory";
import Feed from "../Feed";

const reactionHistory = ["❤️", "🔥"];
const recordReaction = jest.fn();
const auth: AuthState = {
  token: "test-token",
  user: {
    id: "u2",
    displayName: "Diego",
    email: "d@example.com",
    role: "member",
  },
};
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
  reactions: [],
};

jest.mock("@/lib/api");
jest.mock("@/lib/useReactionHistory", () => ({
  useReactionHistory: jest.fn(),
}));
jest.mock("../ResourceCard", () => ({
  __esModule: true,
  default: ({
    reactionHistory,
    onReactionSelected,
  }: {
    reactionHistory: string[];
    onReactionSelected: (emoji: string) => void;
  }) => (
    <button
      type="button"
      data-history={reactionHistory.join(",")}
      onClick={() => onReactionSelected("❤️")}
    >
      Mock resource card
    </button>
  ),
}));

beforeEach(() => {
  jest.clearAllMocks();

  (listResources as jest.Mock).mockResolvedValue({
    resources: [resource],
  });

  (useReactionHistory as jest.Mock).mockReturnValue({
    history: reactionHistory,
    recordReaction,
  });
});

test("shares reaction history and its update callback with resource cards", async () => {
  render(<Feed auth={auth} socket={null} />);

  const card = await screen.findByRole("button", {
    name: "Mock resource card",
  });

  expect(card).toHaveAttribute("data-history", reactionHistory.join(","));

  fireEvent.click(card);

  expect(recordReaction).toHaveBeenCalledWith("❤️");
  expect(recordReaction).toHaveBeenCalledTimes(1);
});
