export interface CandidateProfile {
  yearsExperience: number;
  skillsMatched: number;
  totalSkillsRequired: number;
  hasCertification: boolean;
}

export interface JobRequirement {
  minYearsRequired: number;
  totalSkillsRequired: number;
  minScoreThreshold: number;
}

export interface ScoreBreakdown {
  experienceScore: number;
  skillsScore: number;
  certBonus: number;
  matchScore: number;
  meetsMinCriteria: boolean;
  satisfiesScore: boolean;
  qualifies: boolean;
}

/**
 * 100% local, deterministic weighted scoring formula. Never leaves the browser.
 *   experienceScore = min(yearsExperience / minYearsRequired, 1) * 40
 *   skillsScore      = (skillsMatched / totalSkillsRequired) * 40
 *   certBonus        = hasCertification ? 20 : 0
 *   matchScore       = experienceScore + skillsScore + certBonus
 */
export function calculateMatchScore(
  yearsExperience: number,
  skillsMatched: number,
  totalSkillsRequired: number,
  hasCertification: boolean,
  minYearsRequired: number,
  minScoreThreshold: number
): ScoreBreakdown {
  const experienceScore =
    Math.min(yearsExperience / Math.max(minYearsRequired, 1), 1) * 40;
  const skillsScore =
    totalSkillsRequired > 0
      ? Math.min(skillsMatched / totalSkillsRequired, 1) * 40
      : 0;
  const certBonus = hasCertification ? 20 : 0;
  const matchScore = Math.round(experienceScore + skillsScore + certBonus);
  const meetsMinCriteria = yearsExperience >= minYearsRequired;
  const satisfiesScore = matchScore >= minScoreThreshold;
  const qualifies = satisfiesScore && meetsMinCriteria;

  return {
    experienceScore,
    skillsScore,
    certBonus,
    matchScore,
    meetsMinCriteria,
    satisfiesScore,
    qualifies,
  };
}

export const SCORING_FORMULA_TEXT = [
  "experienceScore = min(yearsExperience / minYearsRequired, 1) * 40",
  "skillsScore      = (skillsMatched / totalSkillsRequired) * 40",
  "certBonus        = hasCertification ? 20 : 0",
  "matchScore       = experienceScore + skillsScore + certBonus",
  "meetsMinCriteria = yearsExperience >= minYearsRequired",
  "qualifies        = (matchScore >= minScoreThreshold) AND meetsMinCriteria",
];
