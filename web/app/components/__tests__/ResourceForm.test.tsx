import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError, createResource, getTagCounts } from "@/lib/api";
import { AuthState, Resource } from "@/lib/types";
import ResourceForm from "../ResourceForm";

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    createResource: jest.fn(),
    getTagCounts: jest.fn(),
  };
});

const mockedCreateResource = createResource as jest.MockedFunction<
  typeof createResource
>;
const mockedGetTagCounts = getTagCounts as jest.MockedFunction<
  typeof getTagCounts
>;

const mockedGetTagCounts = getTagCounts as jest.MockedFunction<
  typeof getTagCounts
>;

const auth: AuthState = {
  token: "test-token",
  user: {
    id: "user-1",
    email: "user@example.com",
    displayName: "Test User",
    role: "member",
  },
};

const createdResource: Resource = {
  id: "resource-2",
  title: "My new resource",
  url: "https://example.com/shared",
  description: "Keep my description",
  tags: ["typescript", "testing"],
  createdAt: new Date().toISOString(),
  submittedBy: auth.user,
  reactions: [],
};

describe("ResourceForm — logged out state", () => {
  it("shows login message when logged out", () => {
    render(<ResourceForm auth={null} />);

    expect(
      screen.getByText(/log in to share a resource/i)
    ).toBeInTheDocument();

    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });
});

describe("ResourceForm — basic rendering", () => {
  beforeEach(() => {
    mockedGetTagCounts.mockReset();
    mockedGetTagCounts.mockResolvedValue({ tagCounts: {} });
  });

  it("renders form fields when logged in", () => {
    render(<ResourceForm auth={auth} />);

    expect(screen.getByPlaceholderText("Title")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
  });
});

describe("ResourceForm — successful submit", () => {
  beforeEach(() => {
    mockedCreateResource.mockReset();
    mockedGetTagCounts.mockResolvedValue({ tagCounts: {} });
  });

  it("calls onPosted with new resource after submit", async () => {
    const mockResponse = {
      resource: {
        id: 123,
        title: "My Resource",
        url: "https://example.com",
        description: "A useful link",
        tags: ["tag1", "tag2"],
      },
    };

    mockedCreateResource.mockResolvedValue(mockResponse);

    const onPosted = jest.fn();

    render(<ResourceForm auth={auth} onPosted={onPosted} />);

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

    fireEvent.click(screen.getByRole("button", { name: "Share resource" }));

    await waitFor(() => {
      expect(mockedCreateResource).toHaveBeenCalled();
      expect(onPosted).toHaveBeenCalledWith(mockResponse.resource);
    });
  });
});

describe("ResourceForm — duplicate confirmation flow", () => {
  beforeEach(() => {
    mockedCreateResource.mockReset();
    mockedGetTagCounts.mockReset();
    mockedGetTagCounts.mockResolvedValue({ tagCounts: {} });
  });

  it("retries with confirmDuplicate when user confirms", async () => {
    mockedCreateResource
      .mockRejectedValueOnce(
        new ApiError(
          409,
          {
            duplicate: {
              id: "resource-1",
              title: "Existing resource",
              url: "https://example.com/shared",
            },
          },
          "A resource with this URL already exists"
        )
      )
      .mockResolvedValueOnce({ resource: createdResource });

    render(<ResourceForm auth={auth} />);

    fireEvent.change(screen.getByPlaceholderText("Title"), {
      target: { value: "My new resource" },
    });
    fireEvent.change(screen.getByPlaceholderText("https://..."), {
      target: { value: "https://example.com/shared" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Why is this worth sharing? (optional)"),
      { target: { value: "Keep my description" } }
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Tags, comma separated (e.g. javascript, beginner)"
      ),
      { target: { value: "typescript, testing" } }
    );

    fireEvent.click(screen.getByRole("button", { name: "Share resource" }));

    expect(
      await screen.findByRole("dialog", { name: "Duplicate resource" })
    ).toBeInTheDocument();

    expect(screen.getByText("Existing resource")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Add anyway/i }));

    await waitFor(() => expect(mockedCreateResource).toHaveBeenCalledTimes(2));

    expect(mockedCreateResource).toHaveBeenNthCalledWith(
      2,
      {
        title: "My new resource",
        url: "https://example.com/shared",
        description: "Keep my description",
        tags: ["typescript", "testing"],
        confirmDuplicate: true,
      },
      auth.token
    );
  });
});

describe("ResourceForm — tag autocomplete", () => {
  const tagsPlaceholder =
    "Tags, comma separated (e.g. javascript, beginner)";

  beforeEach(() => {
    mockedCreateResource.mockReset();
    mockedGetTagCounts.mockReset();
    mockedGetTagCounts.mockResolvedValue({
      tagCounts: { javascript: 5, java: 2, testing: 3 },
    });
  });

  it("suggests existing tags and inserts selected one", async () => {
    render(<ResourceForm auth={auth} />);

    const tagsInput = screen.getByPlaceholderText(tagsPlaceholder);
    fireEvent.change(tagsInput, { target: { value: "java" } });

    const suggestion = await screen.findByRole("option", {
      name: "javascript",
    });

    fireEvent.click(suggestion);

    expect((tagsInput as HTMLInputElement).value).toBe("javascript, ");
    expect(
      screen.queryByRole("option", { name: "javascript" })
    ).not.toBeInTheDocument();
  });

  it("keeps already typed tags when selecting a suggestion", async () => {
    render(<ResourceForm auth={auth} />);

    const tagsInput = screen.getByPlaceholderText(tagsPlaceholder);
    fireEvent.change(tagsInput, { target: { value: "react, test" } });

    const suggestion = await screen.findByRole("option", {
      name: "testing",
    });

    fireEvent.click(suggestion);

    expect((tagsInput as HTMLInputElement).value).toBe("react, testing, ");
  });
});
