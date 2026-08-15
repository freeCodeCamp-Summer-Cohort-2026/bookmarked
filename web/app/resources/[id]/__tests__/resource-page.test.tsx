import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthState, Resource } from "@/lib/types";
import { addReaction, getResource } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useReactionHistory } from "@/lib/useReactionHistory";

import Page from "../page";

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

jest.mock("@/lib/api"); // mock /lib/api call to 'getResource(id)'
jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
})); // mock useParams and useRouter
jest.mock("@/lib/useAuth", () => ({
  useAuth: jest.fn(),
}));
jest.mock("@/lib/useReactionHistory", () => ({
  useReactionHistory: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();

  (useParams as jest.Mock).mockReturnValue({
    id: resource.id,
  });

  (useRouter as jest.Mock).mockReturnValue({
    push: jest.fn(),
  });

  (getResource as jest.Mock).mockResolvedValue({
    resource,
  });

  (useReactionHistory as jest.Mock).mockReturnValue({
    history: [],
    recordReaction,
  });
});

test("loads resource for the expected resource id", async () => {
  (useAuth as jest.Mock).mockReturnValue({
    auth: null,
    ready: true,
  });

  render(<Page />);

  expect(await screen.findByText(resource.title)).toBeInTheDocument();
});

test("records a reaction after a successful submission", async () => {
  (useAuth as jest.Mock).mockReturnValue({
    auth,
    ready: true,
  });

  (addReaction as jest.Mock).mockResolvedValue({
    resource,
  });

  render(<Page />);

  await screen.findByText(resource.title);

  fireEvent.click(
    screen.getByRole("button", {
      name: "⭐",
    }),
  );

  await waitFor(() => {
    expect(addReaction).toHaveBeenCalledWith(
      {
        resourceId: resource.id,
        emoji: "⭐",
      },
      auth.token,
    );

    expect(recordReaction).toHaveBeenCalledWith("⭐");
  });

  expect(recordReaction).toHaveBeenCalledTimes(1);
});

test("does not record a reaction after a failed submission", async () => {
  (useAuth as jest.Mock).mockReturnValue({
    auth,
    ready: true,
  });

  (addReaction as jest.Mock).mockRejectedValue(new Error("Submission failed"));

  render(<Page />);

  await screen.findByText(resource.title);

  fireEvent.click(
    screen.getByRole("button", {
      name: "⭐",
    }),
  );

  expect(await screen.findByText("Submission failed")).toBeInTheDocument();

  expect(recordReaction).not.toHaveBeenCalled();
});
