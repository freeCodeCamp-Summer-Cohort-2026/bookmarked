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

describe("ResourceForm duplicate confirmation", () => {
  beforeEach(() => {
    mockedCreateResource.mockReset();
    mockedGetTagCounts.mockReset();
    mockedGetTagCounts.mockResolvedValue({ tagCounts: {} });
  });

  it("retries with the original draft when the user confirms", async () => {
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
          "A resource with this URL already exists",
        ),
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
      { target: { value: "Keep my description" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Tags, comma separated (e.g. javascript, beginner)",
      ),
      { target: { value: "typescript, testing" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Share resource" }));

    expect(
      await screen.findByRole("dialog", { name: "Duplicate resource" }),
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
      auth.token,
    );
  });
});

describe("ResourceForm tag autocomplete", () => {
  beforeEach(() => {
    mockedCreateResource.mockReset();
    mockedGetTagCounts.mockReset();
    mockedGetTagCounts.mockResolvedValue({
      tagCounts: { javascript: 5, java: 2, testing: 3 },
    });
  });

  const tagsPlaceholder = "Tags, comma separated (e.g. javascript, beginner)";

  it("suggests existing tags and inserts the one selected", async () => {
    render(<ResourceForm auth={auth} />);

    const tagsInput = screen.getByPlaceholderText(tagsPlaceholder);
    fireEvent.change(tagsInput, { target: { value: "java" } });

    const suggestion = await screen.findByRole("option", {
      name: "javascript",
    });
    fireEvent.click(suggestion);

    expect((tagsInput as HTMLInputElement).value).toBe("javascript, ");
    expect(
      screen.queryByRole("option", { name: "javascript" }),
    ).not.toBeInTheDocument();
  });

  it("keeps already-typed tags when selecting a suggestion", async () => {
    render(<ResourceForm auth={auth} />);

    const tagsInput = screen.getByPlaceholderText(tagsPlaceholder);
    fireEvent.change(tagsInput, { target: { value: "react, test" } });

    const suggestion = await screen.findByRole("option", { name: "testing" });
    fireEvent.click(suggestion);

    expect((tagsInput as HTMLInputElement).value).toBe("react, testing, ");
  });
});
