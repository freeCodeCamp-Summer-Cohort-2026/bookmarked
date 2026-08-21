import { fireEvent, render, screen, act } from "@testing-library/react";
import Feed, { matchesResourceSearch } from "../Feed";
import { listResources } from "@/lib/api";
import { AuthState, Resource } from "@/lib/types";
import { useReactionHistory } from "@/lib/useReactionHistory";
import type { Socket } from "socket.io-client";

type SocketHandler = (...args: any[]) => void;

function createMockSocket() {
  const listeners: Record<string, SocketHandler[]> = {};
  return {
    on: jest.fn((event: string, handler: SocketHandler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    off: jest.fn((event: string, handler: SocketHandler) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),
    emit: jest.fn(),
    trigger: (event: string, ...args: any[]) => {
      (listeners[event] || []).forEach((handler) => handler(...args));
    },
  };
}

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

jest.mock("@/lib/api", () => ({
  listResources: jest.fn(),
}));

jest.mock("@/lib/useReactionHistory", () => ({
  useReactionHistory: jest.fn(),
}));

jest.mock("../ResourceCard", () => ({
  __esModule: true,
  default: ({
    resource,
    reactionHistory,
    onReactionSelected,
  }: {
    resource: Resource;
    reactionHistory: string[];
    onReactionSelected: (emoji: string) => void;
  }) => (
    <div data-testid={`resource-card-${resource.id}`}>
      <span>{resource.title}</span>
      <button
        type="button"
        data-history={reactionHistory.join(",")}
        onClick={() => onReactionSelected("❤️")}
      >
        Mock resource card
      </button>
    </div>
  ),
}));

const mockListResources = listResources as jest.MockedFunction<
  typeof listResources
>;

describe("matchesResourceSearch", () => {
  it("matches multi-word queries across title and description", () => {
    const item = {
      title: "React Guide",
      description: "Learn CSS styling techniques",
    };
    expect(matchesResourceSearch(item, "React CSS")).toBe(true);
    expect(matchesResourceSearch(item, "react css")).toBe(true);
    expect(matchesResourceSearch(item, "css react")).toBe(true);
    expect(matchesResourceSearch(item, "guide learn")).toBe(true);
    expect(matchesResourceSearch(item, "react vue")).toBe(false);
  });

  it("returns true for empty or whitespace query", () => {
    const item = { title: "Any Title", description: "Any Description" };
    expect(matchesResourceSearch(item, "")).toBe(true);
    expect(matchesResourceSearch(item, "   ")).toBe(true);
  });
});

describe("Feed Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockListResources.mockResolvedValue({ resources: [resource] });
    (useReactionHistory as jest.Mock).mockReturnValue({
      history: reactionHistory,
      recordReaction,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the search input field", async () => {
    await act(async () => {
      render(<Feed auth={null} socket={null} />);
    });

    expect(
      screen.getByPlaceholderText("Search resources..."),
    ).toBeInTheDocument();
  });

  it("triggers listResources with debounced search query after 300ms", async () => {
    await act(async () => {
      render(<Feed auth={null} socket={null} />);
    });

    expect(mockListResources).toHaveBeenCalledWith({
      q: undefined,
      tag: undefined,
      submittedBy: undefined,
      days: null,
    });

    const searchInput = screen.getByPlaceholderText("Search resources...");

    act(() => {
      fireEvent.change(searchInput, { target: { value: "react" } });
    });

    expect(mockListResources).toHaveBeenLastCalledWith({
      q: undefined,
      tag: undefined,
      submittedBy: undefined,
      days: null,
    });

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    expect(mockListResources).toHaveBeenLastCalledWith({
      q: "react",
      tag: undefined,
      submittedBy: undefined,
      days: null,
    });
  });

  it("shares reaction history and its update callback with resource cards", async () => {
    await act(async () => {
      render(<Feed auth={auth} socket={null} />);
    });

    const card = await screen.findByRole("button", {
      name: "Mock resource card",
    });

    expect(card).toHaveAttribute("data-history", reactionHistory.join(","));

    fireEvent.click(card);

    expect(recordReaction).toHaveBeenCalledWith("❤️");
    expect(recordReaction).toHaveBeenCalledTimes(1);
  });

  it("includes created resource when multi-word query matches across title and description", async () => {
    const mockSocket = createMockSocket();

    await act(async () => {
      render(<Feed auth={null} socket={mockSocket as unknown as Socket} />);
    });

    const searchInput = screen.getByPlaceholderText("Search resources...");

    act(() => {
      fireEvent.change(searchInput, { target: { value: "React CSS" } });
    });

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    const matchingCreatedResource: Resource = {
      id: "2",
      title: "React Guide",
      url: "https://example.com/react-guide",
      description: "Learn CSS styling techniques.",
      tags: ["react", "css"],
      createdAt: new Date().toISOString(),
      submittedBy: {
        id: "u3",
        displayName: "John Doe",
        email: "john@example.com",
        role: "member",
      },
      reactions: [],
    };

    act(() => {
      mockSocket.trigger("resource:created", matchingCreatedResource);
    });

    expect(screen.getByText("React Guide")).toBeInTheDocument();

    const nonMatchingResource: Resource = {
      id: "3",
      title: "Vue Guide",
      url: "https://example.com/vue-guide",
      description: "Learn HTML layout techniques.",
      tags: ["vue", "html"],
      createdAt: new Date().toISOString(),
      submittedBy: {
        id: "u3",
        displayName: "John Doe",
        email: "john@example.com",
        role: "member",
      },
      reactions: [],
    };

    act(() => {
      mockSocket.trigger("resource:created", nonMatchingResource);
    });

    expect(screen.queryByText("Vue Guide")).not.toBeInTheDocument();
  });
});
