import { DEFAULT_REACTIONS, getQuickReactions } from "../ReactionPicker";

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
