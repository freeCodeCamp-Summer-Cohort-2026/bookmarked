import { fireEvent, render, screen } from "@testing-library/react";
import ReactionPicker, {
  DEFAULT_REACTIONS,
  getQuickReactions,
} from "../ReactionPicker";

describe("getQuickReactions", () => {
  it("returns DEFAULT_REACTIONS", () => {
    const result = getQuickReactions([]);

    expect(result).toEqual(DEFAULT_REACTIONS);
  });

  it("returns one historical reaction first, followed by two unused defaults", () => {
    const result = getQuickReactions(["❤️"]);

    expect(result).toEqual(["❤️", "⭐", "🔖"]);
  });

  it("returns two historical reactions first, followed by one unused default", () => {
    const result = getQuickReactions(["❤️", "😂"]);

    expect(result).toEqual(["❤️", "😂", "⭐"]);
  });

  it("returns only the first three reactions, in the supplied order", () => {
    const result = getQuickReactions(["❤️", "😂", "🔥", "🚀"]);

    expect(result).toEqual(["❤️", "😂", "🔥"]);
  });

  it("returns only one instance of input when provided with duplicate", () => {
    const result = getQuickReactions(["❤️", "❤️"]);

    expect(result).toEqual(["❤️", "⭐", "🔖"]);
  });
});

describe("ReactionPicker", () => {
  it("renders quick buttons and toggle", () => {
    render(<ReactionPicker history={[]} onSelect={jest.fn()} />);

    expect(screen.getByRole("button", { name: "⭐" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "🔖" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "👍" })).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Toggle reaction menu" }),
    ).toBeInTheDocument();
  });

  it("opens the complete reaction menu", () => {
    render(<ReactionPicker history={[]} onSelect={jest.fn()} />);

    const toggle = screen.getByRole("button", {
      name: "Toggle reaction menu",
    });

    expect(
      screen.queryByRole("button", { name: "🔥" }),
    ).not.toBeInTheDocument();

    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "🔥" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "🚀" })).toBeInTheDocument();

    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("reports a quick-reaction selection", () => {
    const handleSelect = jest.fn();

    render(<ReactionPicker history={[]} onSelect={handleSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "⭐" }));

    expect(handleSelect).toHaveBeenCalledWith("⭐");
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it("reports a dropdown selection", () => {
    const handleSelect = jest.fn();

    render(<ReactionPicker history={[]} onSelect={handleSelect} />);

    const toggle = screen.getByRole("button", {
      name: "Toggle reaction menu",
    });

    fireEvent.click(toggle);

    fireEvent.click(screen.getByRole("button", { name: "🔥" }));

    expect(handleSelect).toHaveBeenCalledWith("🔥");
    expect(handleSelect).toHaveBeenCalledTimes(1);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("button", { name: "🔥" }),
    ).not.toBeInTheDocument();
  });
});
