import { render, screen } from "@testing-library/react";
import { Resource } from "@/lib/types";
import { getResource } from "@/lib/api";
import { useParams } from "next/navigation";

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
  },
  reactions: [
    {
      id: "r1",
      emoji: "⭐",
      user: { id: "u2", displayName: "Diego", email: "d@example.com" },
    },
  ],
};

jest.mock("@/lib/api"); // mock /lib/api call to 'getResource(id)'
jest.mock("next/navigation", () => ({ useParams: jest.fn() })); // mock useParams
jest.mock("@/lib/useAuth", () => ({
  useAuth: () => ({ auth: null, ready: true }),
})); // mock auth call

test("loads resource for the expected resource id", async () => {
  (useParams as jest.Mock).mockReturnValue({ id: `${resource.id}` });
  (getResource as jest.Mock).mockResolvedValue({ resource: resource });

  render(<Page />);

  expect(await screen.findByText(resource.title)).toBeInTheDocument();
});
