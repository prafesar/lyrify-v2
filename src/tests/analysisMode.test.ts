import { describe, it, expect } from "vitest";
import { 
  mapLegacyToCanonicalMode, 
  getDefaultAnalysisMode, 
  mapCanonicalToLegacyRequest 
} from "../services/analysisMode";

describe("AnalysisMode Canonical Model & Compatibility Layer Tests", () => {
  it("should have correct default mode of overview", () => {
    expect(getDefaultAnalysisMode()).toBe("overview");
  });

  it("should correctly map legacy modes to canonical modes", () => {
    expect(mapLegacyToCanonicalMode("compact")).toBe("overview");
    expect(mapLegacyToCanonicalMode("rich")).toBe("vocabulary");
    expect(mapLegacyToCanonicalMode(null)).toBe("overview");
    expect(mapLegacyToCanonicalMode(undefined)).toBe("overview");
    expect(mapLegacyToCanonicalMode("")).toBe("overview");
  });

  it("should preserve canonical modes correctly when mapping", () => {
    expect(mapLegacyToCanonicalMode("overview")).toBe("overview");
    expect(mapLegacyToCanonicalMode("vocabulary")).toBe("vocabulary");
    expect(mapLegacyToCanonicalMode("phrases")).toBe("phrases");
    expect(mapLegacyToCanonicalMode("style")).toBe("style");
  });

  it("should handle mixed case for legacy and canonical modes", () => {
    expect(mapLegacyToCanonicalMode("CoMpAcT")).toBe("overview");
    expect(mapLegacyToCanonicalMode("RiCh")).toBe("vocabulary");
    expect(mapLegacyToCanonicalMode("VoCaBuLaRy")).toBe("vocabulary");
  });

  it("should map canonical modes to legacy request variants for backward compatibility", () => {
    expect(mapCanonicalToLegacyRequest("overview")).toBe("compact");
    expect(mapCanonicalToLegacyRequest("vocabulary")).toBe("rich");
    expect(mapCanonicalToLegacyRequest("phrases")).toBe("rich");
    expect(mapCanonicalToLegacyRequest("style")).toBe("rich");
  });

  describe("Preferences fallbacks and State Mapping", () => {
    it("should fallback to legacy preference when canonical mode is not defined", () => {
      // Simulate state hydration fallback logic
      const storedAnalysisMode = null;
      const legacyVariant = "rich";
      
      const hydratedMode = storedAnalysisMode || mapLegacyToCanonicalMode(legacyVariant);
      expect(hydratedMode).toBe("vocabulary");
    });

    it("should map default legacy preference correctly", () => {
      const storedAnalysisMode = null;
      const legacyVariant = "compact";
      
      const hydratedMode = storedAnalysisMode || mapLegacyToCanonicalMode(legacyVariant);
      expect(hydratedMode).toBe("overview");
    });

    it("should prioritize stored canonical mode over legacy settings during hydration", () => {
      const storedAnalysisMode = "style";
      const legacyVariant = "compact"; // discrepancy, but canonical mode should win
      
      const hydratedMode = storedAnalysisMode || mapLegacyToCanonicalMode(legacyVariant);
      expect(hydratedMode).toBe("style");
    });
  });
});
