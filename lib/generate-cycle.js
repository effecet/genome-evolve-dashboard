/**
 * SKILLGENOME — Daily Cycle Generator
 *
 * Blended scoring algorithm: picks 5 skills prioritizing
 * low-level gaps, staleness, and project diversity.
 *
 * UMD: works in browser (window.generateCycle) and Node (require/import).
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.generateCycle = factory().generateCycle;
    root.scoreCycle = factory().scoreCycle;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function todayStr() {
    return new Date().toISOString().split("T")[0];
  }

  function daysBetween(dateA, dateB) {
    const a = new Date(dateA + "T00:00:00Z");
    const b = new Date(dateB + "T00:00:00Z");
    return Math.floor((b - a) / 86400000);
  }

  /**
   * Simple deterministic hash from a string.
   * Used to seed tiebreakers so same date = same output.
   */
  function hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  /**
   * Deterministic tiebreaker for two skills on the same date.
   */
  function tiebreaker(seed, skillId) {
    let h = seed;
    for (let i = 0; i < skillId.length; i++) {
      h = ((h << 5) - h + skillId.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % 10000;
  }

  /**
   * Score a single skill entry. Lower score = higher priority.
   *
   * Components:
   *   - level * 10        → lower level = smaller score = picked first
   *   - never assessed     → -50 bonus
   *   - staleness          → -2 per day since last assessed (capped at -40)
   *   - sparse history     → -5 per missing session (max 5 sessions benchmark)
   */
  function scoreSkill(skill, referenceDate) {
    let score = skill.level * 10;

    if (!skill.lastAssessed) {
      score -= 50;
    } else {
      const days = daysBetween(skill.lastAssessed, referenceDate);
      score -= Math.min(days * 2, 40);
    }

    const histLen = (skill.history || []).length;
    score -= Math.max(0, 5 - histLen) * 5;

    return score;
  }

  /**
   * Build a human-readable reason string for why a skill was picked.
   */
  function formatReason(entry) {
    const parts = ["Lv." + entry.level];

    if (!entry.lastAssessed) {
      parts.push("never assessed");
    } else {
      parts.push("last assessed " + entry.lastAssessed);
    }

    if (entry.level <= 2) {
      parts.push("high growth potential");
    } else if (entry.level <= 4) {
      parts.push("building foundation");
    } else {
      parts.push("mastery maintenance");
    }

    return parts.join(" \u2014 ");
  }

  /**
   * Flatten projects into a scored skill pool.
   * Exported for testing internals.
   */
  function scoreCycle(projects, options) {
    var opts = options || {};
    var date = opts.date || todayStr();

    var pool = [];
    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
      var skills = p.skills || [];
      for (var j = 0; j < skills.length; j++) {
        var s = skills[j];
        pool.push({
          skillId: s.id,
          projectId: p.id,
          projectName: p.name,
          skillName: s.name,
          level: s.level,
          lastAssessed: s.lastAssessed,
          history: s.history || [],
          score: scoreSkill(s, date),
        });
      }
    }

    var seed = hashStr(date);
    pool.sort(function (a, b) {
      if (a.score !== b.score) return a.score - b.score;
      return tiebreaker(seed, a.skillId) - tiebreaker(seed, b.skillId);
    });

    return pool;
  }

  /**
   * Generate a daily practice cycle.
   *
   * @param {Array} projects  — array of project objects with .skills[]
   * @param {Object} [options]
   * @param {string} [options.date]           — reference date (YYYY-MM-DD), default today
   * @param {number} [options.count]          — how many skills to pick, default 5
   * @param {number} [options.maxPerProject]  — diversity cap per project, default 2
   * @returns {{ date, generatedBy, skills: Array<{skillId, projectId, reason}> }}
   */
  function generateCycle(projects, options) {
    var opts = options || {};
    var date = opts.date || todayStr();
    var count = opts.count || 5;
    var maxPerProject = opts.maxPerProject || 2;

    var pool = scoreCycle(projects, { date: date });

    var picked = [];
    var projCount = {};
    for (var i = 0; i < pool.length; i++) {
      if (picked.length >= count) break;
      var s = pool[i];
      var pc = projCount[s.projectId] || 0;
      if (pc >= maxPerProject) continue;
      picked.push(s);
      projCount[s.projectId] = pc + 1;
    }

    return {
      date: date,
      generatedBy: "auto-cycle",
      skills: picked.map(function (s) {
        return {
          skillId: s.skillId,
          projectId: s.projectId,
          reason: formatReason(s),
        };
      }),
    };
  }

  return {
    generateCycle: generateCycle,
    scoreCycle: scoreCycle,
    scoreSkill: scoreSkill,
    formatReason: formatReason,
    daysBetween: daysBetween,
  };
});
