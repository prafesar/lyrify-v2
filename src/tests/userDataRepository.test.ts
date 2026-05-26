import { describe, it, expect, vi, beforeEach } from "vitest";
import { userDataRepository } from "../application/adapters/browserUserDataRepository";

const mockInMemoryStore = new Set<string>();

vi.mock("idb-keyval", () => {
  return {
    del: async (key: string) => {
      mockInMemoryStore.delete(key);
    },
    get: async (_key: string) => {},
    set: async (key: string, _val: any) => {
      mockInMemoryStore.add(key);
    },
  };
});

describe("userDataRepository and Preferences unit tests", () => {
  beforeEach(() => {
    localStorage.clear();
    mockInMemoryStore.clear();
    vi.restoreAllMocks();
  });

  it("should support default and custom string preferences", () => {
    expect(userDataRepository.getPreference("some_key", "default_val")).toBe("default_val");
    userDataRepository.setPreference("some_key", "custom_val");
    expect(userDataRepository.getPreference("some_key", "default_val")).toBe("custom_val");
  });

  it("should support default and custom boolean preferences", () => {
    expect(userDataRepository.getBoolPreference("some_bool_key", false)).toBe(false);
    expect(userDataRepository.getBoolPreference("some_bool_key", true)).toBe(true);

    userDataRepository.setBoolPreference("some_bool_key", true);
    expect(userDataRepository.getBoolPreference("some_bool_key", false)).toBe(true);

    userDataRepository.setBoolPreference("some_bool_key", false);
    expect(userDataRepository.getBoolPreference("some_bool_key", true)).toBe(false);
  });

  it("should remove preferences correctly", () => {
    userDataRepository.setPreference("test_rem", "here");
    expect(userDataRepository.getPreference("test_rem", "not")).toBe("here");
    userDataRepository.removePreference("test_rem");
    expect(userDataRepository.getPreference("test_rem", "not")).toBe("not");
  });

  it("should clear all user data including localstorage and idb-keyval", async () => {
    userDataRepository.setPreference("pref_to_clear", "123");
    expect(userDataRepository.getPreference("pref_to_clear", "none")).toBe("123");

    await userDataRepository.clearAllUserData();

    expect(userDataRepository.getPreference("pref_to_clear", "none")).toBe("none");
  });
});
