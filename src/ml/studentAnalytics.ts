import { StudentInput, StudentCalculatedMetrics, RecommendationItem } from '../types';

export function calculateStudentMetrics(input: StudentInput): StudentCalculatedMetrics {
  const marks = Object.entries(input.subjectMarks || {})
    .filter(([_, val]) => typeof val === 'number' && !isNaN(val))
    .map(([sub, val]) => ({ subject: sub, score: val as number }));

  const averageSubjectScore = marks.length > 0
    ? Number((marks.reduce((sum, item) => sum + item.score, 0) / marks.length).toFixed(1))
    : (input.previousSemesterGpa ? input.previousSemesterGpa * 9.5 : 70);

  const maxInternal = input.maxInternalMarks || 25;
  const normalizedInternalPercentage = Number(((input.internalMarks / maxInternal) * 100).toFixed(1));

  let attendanceRisk: 'Optimal' | 'Satisfactory' | 'At-Risk' | 'Critical' = 'Satisfactory';
  let attendanceAnalysis = '';

  if (input.attendancePercentage >= 85) {
    attendanceRisk = 'Optimal';
    attendanceAnalysis = `High attendance (${input.attendancePercentage}%). Meets all institutional eligibility and honors requirements.`;
  } else if (input.attendancePercentage >= 75) {
    attendanceRisk = 'Satisfactory';
    attendanceAnalysis = `Standard compliance (${input.attendancePercentage}%). Maintains required threshold but leaves little margin for emergencies.`;
  } else if (input.attendancePercentage >= 65) {
    attendanceRisk = 'At-Risk';
    attendanceAnalysis = `Below recommended threshold (${input.attendancePercentage}%). Danger of condonation fines and laboratory examination debarment.`;
  } else {
    attendanceRisk = 'Critical';
    attendanceAnalysis = `Critical attendance deficit (${input.attendancePercentage}%). Falls below statutory semester eligibility (75%). Immediate intervention required.`;
  }

  // Practical skill index (0-100)
  const practicalScore = Math.min(100, (input.numberOfProjects * 18) + (input.numberOfCertifications * 12));

  // Composite Academic Score (0 - 100)
  const rawComposite = (
    averageSubjectScore * 0.35 +
    normalizedInternalPercentage * 0.20 +
    input.technicalSkillScore * 0.15 +
    input.aptitudeScore * 0.10 +
    input.communicationScore * 0.08 +
    practicalScore * 0.12
  ) - (input.backlogs * 5.5);

  const compositeAcademicScore = Math.max(0, Math.min(100, Number(rawComposite.toFixed(1))));

  // Skill Index
  const skillIndex = Number((
    (input.technicalSkillScore * 0.40) +
    (input.aptitudeScore * 0.30) +
    (input.communicationScore * 0.20) +
    (practicalScore * 0.10)
  ).toFixed(1));

  // Learning Efficiency Index: Score achieved per unit of weekly study effort
  const studyHours = Math.max(1, input.studyHoursPerWeek || 5);
  const learningEfficiencyIndex = Number((compositeAcademicScore / (studyHours * 1.6)).toFixed(2));

  // Academic Trend
  const currentGpaEquivalent = compositeAcademicScore / 10;
  let academicTrend: 'Upward' | 'Consistent' | 'Declining' = 'Consistent';
  if (input.previousSemesterGpa > 0) {
    const diff = currentGpaEquivalent - input.previousSemesterGpa;
    if (diff >= 0.3) academicTrend = 'Upward';
    else if (diff <= -0.3) academicTrend = 'Declining';
    else academicTrend = 'Consistent';
  }

  // Academic Risk Score: 0 (safe) to 100 (high risk)
  let riskCalc = 0;
  if (input.attendancePercentage < 75) riskCalc += (75 - input.attendancePercentage) * 1.5;
  if (averageSubjectScore < 60) riskCalc += (60 - averageSubjectScore) * 1.2;
  if (input.backlogs > 0) riskCalc += input.backlogs * 15;
  if (input.technicalSkillScore < 50) riskCalc += 12;
  if (input.internalMarks < (maxInternal * 0.5)) riskCalc += 15;
  const academicRiskScore = Math.min(100, Math.max(0, Math.round(riskCalc)));

  // Identify Strong and Weak Areas
  const strongAreas: string[] = [];
  const weakAreas: string[] = [];

  marks.forEach(m => {
    const name = m.subject.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    if (m.score >= 75) strongAreas.push(`${name} (${m.score}%)`);
    else if (m.score < 55) weakAreas.push(`${name} (${m.score}%)`);
  });

  if (input.technicalSkillScore >= 75) strongAreas.push(`Technical Knowledge (${input.technicalSkillScore}/100)`);
  else if (input.technicalSkillScore < 50) weakAreas.push(`Technical Foundations (${input.technicalSkillScore}/100)`);

  if (input.communicationScore >= 80) strongAreas.push(`Professional Communication (${input.communicationScore}/100)`);
  else if (input.communicationScore < 55) weakAreas.push(`Communication & Articulation (${input.communicationScore}/100)`);

  if (input.aptitudeScore >= 80) strongAreas.push(`Quantitative & Analytical Aptitude (${input.aptitudeScore}/100)`);
  else if (input.aptitudeScore < 50) weakAreas.push(`Problem Solving & Aptitude (${input.aptitudeScore}/100)`);

  if (input.numberOfProjects >= 3) strongAreas.push(`Portfolio & Project Experience (${input.numberOfProjects} projects)`);
  else if (input.numberOfProjects === 0) weakAreas.push(`Applied Project Work (0 completed projects)`);

  if (input.backlogs > 0) weakAreas.push(`Active Academic Backlogs (${input.backlogs} pending subject${input.backlogs > 1 ? 's' : ''})`);

  if (strongAreas.length === 0) strongAreas.push('Foundational learning potential', 'Course engagement');
  if (weakAreas.length === 0) weakAreas.push('Advanced competitive specializations');

  return {
    averageSubjectScore,
    normalizedInternalPercentage,
    attendanceRisk,
    compositeAcademicScore,
    skillIndex,
    learningEfficiencyIndex,
    academicRiskScore,
    strongAreas,
    weakAreas,
    attendanceAnalysis,
    academicTrend,
    skillProfile: {
      technical: input.technicalSkillScore,
      communication: input.communicationScore,
      aptitude: input.aptitudeScore,
      practical: practicalScore,
    },
  };
}

export function generateRuleBasedRecommendations(
  input: StudentInput,
  metrics: StudentCalculatedMetrics
): RecommendationItem[] {
  const recs: RecommendationItem[] = [];

  if (input.attendancePercentage < 75) {
    const hoursNeeded = Math.ceil(((0.75 * 60) - (input.attendancePercentage * 0.6)) / 0.75);
    recs.push({
      id: 'rec-att-1',
      title: 'Target Attendance Recovery Protocol',
      reason: `Current attendance is ${input.attendancePercentage}%, which is below the mandatory 75% institutional requirement.`,
      priority: 'critical',
      difficulty: 'medium',
      nextAction: `Maintain 100% attendance in the next ~${Math.max(4, hoursNeeded)} classroom lectures and request condonation documentation from the department office.`,
      assumptions: 'Assumes minimum 30 academic instructional days remaining in the current semester.',
      limitations: 'Institutional policy overrides may restrict condonation approvals below 65%.',
    });
  }

  if (input.backlogs > 0) {
    recs.push({
      id: 'rec-backlog-1',
      title: 'Clear Outstanding Subject Backlogs',
      reason: `${input.backlogs} active backlog(s) directly lowers placement eligibility and overall degree classification.`,
      priority: 'critical',
      difficulty: 'challenging',
      nextAction: 'Create dedicated weekend study blocks to review previous exam question papers and schedule faculty guidance hours.',
      assumptions: 'Supplementary or arrear examinations will be held in the upcoming exam cycle.',
      limitations: 'Requires balancing current semester syllabus with remedial coursework.',
    });
  }

  if (input.numberOfProjects < 2) {
    recs.push({
      id: 'rec-proj-1',
      title: 'Build Full-Stack or Domain Capstone Project',
      reason: 'Recruiters and higher education committees prioritize demonstrable GitHub portfolios over exam scores alone.',
      priority: 'high',
      difficulty: 'medium',
      nextAction: 'Select a domain problem related to your curriculum (e.g., student management, IoT monitor, or ML pipeline) and publish clean modular code to GitHub.',
      assumptions: 'Student has foundational knowledge of git and at least one programming language.',
      limitations: 'Requires consistent weekly commitment of 4-6 hours outside regular coursework.',
    });
  }

  if (input.technicalSkillScore < 60) {
    recs.push({
      id: 'rec-tech-1',
      title: 'Strengthen Core Technical & Coding Fundamentals',
      reason: `Technical skill evaluation is currently ${input.technicalSkillScore}/100, creating risk in technical screening rounds.`,
      priority: 'high',
      difficulty: 'challenging',
      nextAction: 'Solve 2 foundational Data Structures & Algorithms problems daily on LeetCode/HackerRank, emphasizing arrays, hash maps, and recursion.',
      assumptions: 'Basic syntax in Python/Java/C++ is understood.',
      limitations: 'Algorithmic intuition requires steady repetition over 6-8 weeks.',
    });
  }

  if (input.communicationScore < 65) {
    recs.push({
      id: 'rec-comm-1',
      title: 'Participate in Technical Seminars & Group Discussions',
      reason: `Communication score is ${input.communicationScore}/100, which affects group discussions and HR interview outcomes.`,
      priority: 'medium',
      difficulty: 'easy',
      nextAction: 'Deliver a 5-minute technical presentation in your departmental student chapter or record mock interview answers.',
      assumptions: 'Institutional peer groups or technical symposiums are available.',
      limitations: 'Confidence develops over multiple speaking iterations.',
    });
  }

  if (input.studyHoursPerWeek < 8) {
    recs.push({
      id: 'rec-study-1',
      title: 'Implement Structured Pomodoro Study Schedule',
      reason: `Weekly study hours (${input.studyHoursPerWeek} hrs) are insufficient for optimal retention in Semester ${input.semester}.`,
      priority: 'medium',
      difficulty: 'easy',
      nextAction: 'Allocate two 90-minute focused distraction-free study blocks every Tuesday, Thursday, and Saturday.',
      assumptions: 'No major conflicting external job obligations.',
      limitations: 'Consistency depends on personal schedule adherence.',
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: 'rec-opt-1',
      title: 'Pursue Advanced Industry Certifications & Research',
      reason: 'Profile exhibits robust performance across academics, skills, and projects. Next step is elite competitive positioning.',
      priority: 'low',
      difficulty: 'challenging',
      nextAction: 'Prepare for specialized certifications (e.g. AWS Certified Developer, TensorFlow Developer) or write a technical paper with a professor.',
      assumptions: 'Curriculum foundations are thoroughly mastered.',
      limitations: 'May incur exam certification fees.',
    });
  }

  return recs;
}
