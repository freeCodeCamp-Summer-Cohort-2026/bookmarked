import { act, renderHook } from "@testing-library/react";
import {
  getReactionHistoryKey,
  useReactionHistory,
} from "../useReactionHistory";

beforeEach(() => {
  window.localStorage.clear();
});

describe("useReactionHistory", () => {
  it("keeps history empty for logged-out users", () => {
    const { result } = renderHook(() => useReactionHistory(null));

    expect(result.current.history).toEqual([]);

    act(() => {
      result.current.recordReaction("🔥");
    });

    expect(result.current.history).toEqual([]);
    expect(window.localStorage.length).toBe(0);
  });

  it("loads stored history for a logged-in user", () => {
    const userId = "u1";
    const key = getReactionHistoryKey(userId);
    window.localStorage.setItem(key, JSON.stringify(["🔥", "❤️"]));
    const { result } = renderHook(() => useReactionHistory(userId));

    expect(result.current.history).toEqual(["🔥", "❤️"]);
  });

  it("moves a repeated reaction to the front and persists it", () => {
    const userId = "u1";
    const key = getReactionHistoryKey(userId);

    window.localStorage.setItem(key, JSON.stringify(["❤️", "🔥"]));

    const { result } = renderHook(() => useReactionHistory(userId));

    act(() => {
      result.current.recordReaction("🔥");
    });

    expect(result.current.history).toEqual(["🔥", "❤️"]);

    const stored = window.localStorage.getItem(key);

    if (!stored) {
      throw new Error("Expected stored reaction history");
    }

    expect(JSON.parse(stored)).toEqual(["🔥", "❤️"]);
  });

  it("keeps reaction histories independent between users", () => {
    const userOneId = "u1";
    const userTwoId = "u2";

    const userOneHook = renderHook(() => useReactionHistory(userOneId));
    const userTwoHook = renderHook(() => useReactionHistory(userTwoId));

    act(() => {
      userOneHook.result.current.recordReaction("🔥");
    });

    act(() => {
      userTwoHook.result.current.recordReaction("🚀");
    });

    expect(userOneHook.result.current.history).toEqual(["🔥"]);
    expect(userTwoHook.result.current.history).toEqual(["🚀"]);

    const userOneStored = window.localStorage.getItem(
      getReactionHistoryKey(userOneId),
    );
    const userTwoStored = window.localStorage.getItem(
      getReactionHistoryKey(userTwoId),
    );

    if (!userOneStored || !userTwoStored) {
      throw new Error("Expected stored histories for both users");
    }

    expect(JSON.parse(userOneStored)).toEqual(["🔥"]);
    expect(JSON.parse(userTwoStored)).toEqual(["🚀"]);
  });
});
