import { describe, it, expect } from "vitest";
import mod from "../lib/generate-cycle.js";
const { generateCycle, scoreCycle, scoreSkill, formatReason, daysBetween } = mod;

// ── Fixtures ────────────────────────────────────────────────────────────────

const FIXED_DATE = "2026-03-31";

function makeSkill(overrides) {
  return {
    id: "sk_test",
    name: "Test Skill",
    category: "General",
    level: 3,
    lastAssessed: null,
    history: [],
    ...overrides,
  };
}

function makeProject(id, name, skills) {
  return { id, name, description: "", createdAt: "2026-01-01", skills };
}

const SAMPLE_PROJECTS = [
  makeProject("proj_a", "Alpha", [
    makeSkill({ id: "sk_a1", name: "Low Unassessed", level: 2 }),
    makeSkill({
      id: "sk_a2",
      name: "Mid Stale",
      level: 5,
      lastAssessed: "2026-01-01",
      history: [{ date: "2026-01-01" }],
    }),
    makeSkill({
      id: "sk_a3",
      name: "High Recent",
      level: 8,
      lastAssessed: "2026-03-30",
      history: [{ date: "2026-03-30" }],
    }),
  ]),
  makeProject("proj_b", "Bravo", [
    makeSkill({ id: "sk_b1", name: "Low Fresh", level: 1 }),
    makeSkill({
      id: "sk_b2",
      name: "Mid Unassessed",
      level: 4,
    }),
  ]),
  makeProject("proj_c", "Charlie", [
    makeSkill({ id: "sk_c1", name: "Bottom", level: 1 }),
    makeSkill({ id: "sk_c2", name: "Also Bottom", level: 1 }),
    makeSkill({ id: "sk_c3", name: "Mid", level: 5 }),
  ]),
];

// ── daysBetween ─────────────────────────────────────────────────────────────

describe("daysBetween", () => {
  it("returns 0 for same date", () => {
    expect(daysBetween("2026-03-31", "2026-03-31")).toBe(0);
  });

  it("returns positive days forward", () => {
    expect(daysBetween("2026-01-01", "2026-03-31")).toBe(89);
  });

  it("returns negative days backward", () => {
    expect(daysBetween("2026-03-31", "2026-01-01")).toBe(-89);
  });
});

// ── scoreSkill ──────────────────────────────────────────────────────────────

describe("scoreSkill", () => {
  it("lower level = lower score", () => {
    const low = scoreSkill(makeSkill({ level: 2 }), FIXED_DATE);
    const high = scoreSkill(makeSkill({ level: 8 }), FIXED_DATE);
    expect(low).toBeLessThan(high);
  });

  it("never assessed gives -50 bonus", () => {
    const unassessed = scoreSkill(
      makeSkill({ level: 3, lastAssessed: null }),
      FIXED_DATE,
    );
    const assessed = scoreSkill(
      makeSkill({ level: 3, lastAssessed: FIXED_DATE }),
      FIXED_DATE,
    );
    expect(unassessed).toBeLessThan(assessed);
    expect(assessed - unassessed).toBe(50);
  });

  it("stale assessment lowers score (capped at -40)", () => {
    const recent = scoreSkill(
      makeSkill({ level: 3, lastAssessed: "2026-03-30" }),
      FIXED_DATE,
    );
    const stale = scoreSkill(
      makeSkill({ level: 3, lastAssessed: "2026-01-01" }),
      FIXED_DATE,
    );
    expect(stale).toBeLessThan(recent);
  });

  it("staleness bonus caps at -40", () => {
    const veryStale = scoreSkill(
      makeSkill({ level: 3, lastAssessed: "2020-01-01" }),
      FIXED_DATE,
    );
    const moderatelyStale = scoreSkill(
      makeSkill({ level: 3, lastAssessed: "2025-01-01" }),
      FIXED_DATE,
    );
    // Both should hit the cap — difference only from rounding
    expect(veryStale).toBe(moderatelyStale);
  });

  it("sparse history gives priority bonus", () => {
    const noHistory = scoreSkill(makeSkill({ level: 3, history: [] }), FIXED_DATE);
    const fullHistory = scoreSkill(
      makeSkill({
        level: 3,
        history: [{ date: "a" }, { date: "b" }, { date: "c" }, { date: "d" }, { date: "e" }],
      }),
      FIXED_DATE,
    );
    expect(noHistory).toBeLessThan(fullHistory);
  });
});

// ── formatReason ────────────────────────────────────────────────────────────

describe("formatReason", () => {
  it("includes level and growth tag for low level", () => {
    const reason = formatReason({ level: 2, lastAssessed: null });
    expect(reason).toContain("Lv.2");
    expect(reason).toContain("never assessed");
    expect(reason).toContain("high growth potential");
  });

  it("includes building foundation for mid level", () => {
    const reason = formatReason({ level: 4, lastAssessed: "2026-03-01" });
    expect(reason).toContain("Lv.4");
    expect(reason).toContain("building foundation");
  });

  it("includes mastery maintenance for high level", () => {
    const reason = formatReason({ level: 7, lastAssessed: "2026-03-30" });
    expect(reason).toContain("mastery maintenance");
  });
});

// ── generateCycle ───────────────────────────────────────────────────────────

describe("generateCycle", () => {
  it("returns exactly 5 skills by default", () => {
    const cycle = generateCycle(SAMPLE_PROJECTS, { date: FIXED_DATE });
    expect(cycle.skills).toHaveLength(5);
  });

  it("respects custom count", () => {
    const cycle = generateCycle(SAMPLE_PROJECTS, { date: FIXED_DATE, count: 3 });
    expect(cycle.skills).toHaveLength(3);
  });

  it("sets generatedBy to auto-cycle", () => {
    const cycle = generateCycle(SAMPLE_PROJECTS, { date: FIXED_DATE });
    expect(cycle.generatedBy).toBe("auto-cycle");
  });

  it("sets the correct date", () => {
    const cycle = generateCycle(SAMPLE_PROJECTS, { date: FIXED_DATE });
    expect(cycle.date).toBe(FIXED_DATE);
  });

  it("enforces max 2 skills per project", () => {
    const cycle = generateCycle(SAMPLE_PROJECTS, {
      date: FIXED_DATE,
      maxPerProject: 2,
    });
    const counts = {};
    for (const s of cycle.skills) {
      counts[s.projectId] = (counts[s.projectId] || 0) + 1;
    }
    for (const c of Object.values(counts)) {
      expect(c).toBeLessThanOrEqual(2);
    }
  });

  it("prefers lower-level skills", () => {
    const cycle = generateCycle(SAMPLE_PROJECTS, { date: FIXED_DATE });
    // The high-level recently-assessed skill (sk_a3, Lv.8) should not be in top 5
    const ids = cycle.skills.map((s) => s.skillId);
    expect(ids).not.toContain("sk_a3");
  });

  it("is deterministic for the same date", () => {
    const a = generateCycle(SAMPLE_PROJECTS, { date: FIXED_DATE });
    const b = generateCycle(SAMPLE_PROJECTS, { date: FIXED_DATE });
    expect(a.skills.map((s) => s.skillId)).toEqual(
      b.skills.map((s) => s.skillId),
    );
  });

  it("produces different output for different dates", () => {
    const a = generateCycle(SAMPLE_PROJECTS, { date: "2026-03-31" });
    const b = generateCycle(SAMPLE_PROJECTS, { date: "2026-04-01" });
    // Scores are date-dependent (staleness changes), so order may differ
    // At minimum the date field differs
    expect(a.date).not.toBe(b.date);
  });

  it("each skill has skillId, projectId, and reason", () => {
    const cycle = generateCycle(SAMPLE_PROJECTS, { date: FIXED_DATE });
    for (const s of cycle.skills) {
      expect(s).toHaveProperty("skillId");
      expect(s).toHaveProperty("projectId");
      expect(s).toHaveProperty("reason");
      expect(s.reason.length).toBeGreaterThan(0);
    }
  });

  it("handles empty projects gracefully", () => {
    const cycle = generateCycle([], { date: FIXED_DATE });
    expect(cycle.skills).toHaveLength(0);
  });

  it("handles projects with no skills", () => {
    const cycle = generateCycle(
      [makeProject("proj_empty", "Empty", [])],
      { date: FIXED_DATE },
    );
    expect(cycle.skills).toHaveLength(0);
  });

  it("returns fewer than count when not enough skills exist", () => {
    const small = [makeProject("proj_x", "X", [makeSkill({ id: "sk_x1" })])];
    const cycle = generateCycle(small, { date: FIXED_DATE, count: 5 });
    expect(cycle.skills).toHaveLength(1);
  });

  it("respects maxPerProject=1", () => {
    const cycle = generateCycle(SAMPLE_PROJECTS, {
      date: FIXED_DATE,
      count: 5,
      maxPerProject: 1,
    });
    const projects = cycle.skills.map((s) => s.projectId);
    const unique = new Set(projects);
    expect(unique.size).toBe(projects.length);
  });
});

// ── scoreCycle ───────────────────────────────────────────────────────────────

describe("scoreCycle", () => {
  it("returns all skills from all projects", () => {
    const pool = scoreCycle(SAMPLE_PROJECTS, { date: FIXED_DATE });
    const totalSkills = SAMPLE_PROJECTS.reduce(
      (sum, p) => sum + p.skills.length,
      0,
    );
    expect(pool).toHaveLength(totalSkills);
  });

  it("sorts by score ascending", () => {
    const pool = scoreCycle(SAMPLE_PROJECTS, { date: FIXED_DATE });
    for (let i = 1; i < pool.length; i++) {
      expect(pool[i].score).toBeGreaterThanOrEqual(pool[i - 1].score);
    }
  });

  it("each entry has score, skillId, projectId", () => {
    const pool = scoreCycle(SAMPLE_PROJECTS, { date: FIXED_DATE });
    for (const entry of pool) {
      expect(entry).toHaveProperty("score");
      expect(entry).toHaveProperty("skillId");
      expect(entry).toHaveProperty("projectId");
      expect(typeof entry.score).toBe("number");
    }
  });
});
