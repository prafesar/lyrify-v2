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
});
