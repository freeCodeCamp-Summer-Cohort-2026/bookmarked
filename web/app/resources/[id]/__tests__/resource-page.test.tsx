import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthState, Resource } from "@/lib/types";
import { getResource, reportResource } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

import Page from "../page";
import { useAuth } from "@/lib/useAuth";
import { REACTION_OPTIONS } from "@/app/components/ResourceCard";

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

jest.mock("@/lib/api", () => ({
  getResource: jest.fn(),
  reportResource: jest.fn(),
})); // mock /lib/api call to 'getResource(id)'

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
})); // mock useParams and useRouter

jest.mock("@/lib/useAuth", () => ({
  useAuth: jest.fn(),
})); // mock auth call

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

beforeEach(() => {
  (useParams as jest.Mock).mockReturnValue({ id: resource.id });
  (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  (getResource as jest.Mock).mockResolvedValue({ resource }); // mockResolvedValue because it loads the Page from the useEffect
  (reportResource as jest.Mock).mockResolvedValue({ resource });
});

test("loads resource for expected id, do not show delete / reaction buttons when logged out", async () => {
  (useAuth as jest.Mock).mockReturnValue({ auth: null, ready: true });

  render(<Page />);

  expect(await screen.findByText(resource.title)).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Delete" }),
  ).not.toBeInTheDocument();

  //check for each reaction from imported options in case it changes, since button for any shouldn't be there, only labels
  REACTION_OPTIONS.forEach((name) => {
    expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });
});

//show delete button to owner
test("show delete button to resource owner", async () => {
  (useAuth as jest.Mock).mockReturnValue({
    auth: memberOwnerAuth,
    ready: true,
  });

  render(<Page />);

  expect(
    await screen.findByRole("button", { name: "Delete" }),
  ).toBeInTheDocument();
});
//dont show to non-owner
test("doesn't display delete button if not the resource owner", async () => {
  (useAuth as jest.Mock).mockReturnValue({
    auth: memberOtherAuth,
    ready: true,
  });

  render(<Page />);

  //need to await the promise from the fetch/render first or else it wont show the button in time for the query
  await screen.findByText(resource.title);

  // then you can actually query the button after it validates and loads the page + auth + getResource query
  expect(
    screen.queryByRole("button", { name: "Delete" }),
  ).not.toBeInTheDocument();
});

// show delete button to moderators
test("shows delete button to moderators", async () => {
  (useAuth as jest.Mock).mockReturnValue({ auth: moderatorAuth, ready: true });

  render(<Page />);

  expect(
    await screen.findByRole("button", { name: "Delete" }),
  ).toBeInTheDocument();
});

const auths = [memberOtherAuth, memberOwnerAuth, moderatorAuth];
auths.forEach((a) => {
  // report button disables/relabels correctly for all users
  test(`report button disables and relabels correctly on click for ${a.user.role}`, async () => {
    const user = userEvent.setup();
    (useAuth as jest.Mock).mockReturnValue({ auth: a, ready: true });

    render(<Page />);

    expect(await screen.findByRole("button", { name: "Report broken link" }));
    await user.click(screen.getByText("Report broken link"));
    expect(
      await screen.findByRole("button", { name: "Reported" }),
    ).toBeInTheDocument();
  });
});
