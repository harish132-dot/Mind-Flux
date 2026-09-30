export interface TrainingSample {
  features: number[]; // 11 features
  label: 0 | 1 | 2; // 0: Needs Improvement, 1: Moderate Performance, 2: High Performance
  studentName?: string;
}

export const FEATURE_NAMES = [
  'Attendance %',
  'Average Subject Marks',
  'Internal Marks %',
  'Aptitude Score',
  'Communication Score',
  'Technical Skill',
  'Number of Projects',
  'Certifications',
  'Study Hours / Week',
  'Backlogs',
  'Previous GPA',
];

export const CLASS_LABELS: Record<number, 'Needs Improvement' | 'Moderate Performance' | 'High Performance'> = {
  0: 'Needs Improvement',
  1: 'Moderate Performance',
  2: 'High Performance',
};

// Seeded pseudo-random number generator for reproducibility
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateBenchmarkDataset(sampleCount = 500, seed = 42): TrainingSample[] {
  const rand = seededRandom(seed);
  const samples: TrainingSample[] = [];

  for (let i = 0; i < sampleCount; i++) {
    // Generate realistic student attributes with correlated variables
    const ability = rand(); // latent underlying ability 0 to 1
    const effort = rand(); // latent effort 0 to 1

    const attendance = Math.min(100, Math.max(45, Math.round(50 + effort * 45 + (rand() - 0.5) * 10)));
    const avgMarks = Math.min(100, Math.max(35, Math.round(35 + ability * 45 + effort * 20 + (rand() - 0.5) * 10)));
    const internal = Math.min(100, Math.max(40, Math.round(avgMarks * 0.9 + (rand() - 0.5) * 12)));
    const aptitude = Math.min(100, Math.max(30, Math.round(30 + ability * 60 + (rand() - 0.5) * 15)));
    const comm = Math.min(100, Math.max(35, Math.round(40 + (ability * 0.4 + rand() * 0.6) * 55)));
    const tech = Math.min(100, Math.max(25, Math.round(25 + ability * 50 + effort * 25 + (rand() - 0.5) * 10)));
    const projects = Math.max(0, Math.round((effort * 3 + ability * 2 + (rand() - 0.5) * 2)));
    const certs = Math.max(0, Math.round((effort * 2 + ability * 1.5 + (rand() - 0.7) * 2)));
    const studyHours = Math.min(40, Math.max(2, Math.round(3 + effort * 25 + (rand() - 0.5) * 5)));
    
    // Backlog probability increases when marks < 50 and attendance < 65
    let backlogs = 0;
    if (avgMarks < 50 || attendance < 65) {
      backlogs = Math.min(5, Math.max(1, Math.round((55 - avgMarks) / 10 + (rand() > 0.5 ? 1 : 0))));
    }

    const prevGpa = Math.min(10, Math.max(4.0, Number((4.5 + (ability * 0.6 + effort * 0.4) * 5.2 + (rand() - 0.5) * 0.6).toFixed(1))));

    // Composite ground truth formula for label assignment
    const academicScore = (
      avgMarks * 0.35 +
      internal * 0.15 +
      tech * 0.15 +
      aptitude * 0.10 +
      comm * 0.05 +
      (attendance >= 75 ? 10 : 0) +
      Math.min(15, projects * 4 + certs * 3) -
      backlogs * 12
    );

    let label: 0 | 1 | 2;
    if (academicScore >= 74 && backlogs === 0 && attendance >= 75) {
      label = 2; // High Performance
    } else if (academicScore < 54 || backlogs >= 2 || attendance < 65) {
      label = 0; // Needs Improvement
    } else {
      label = 1; // Moderate Performance
    }

    samples.push({
      features: [
        attendance,
        avgMarks,
        internal,
        aptitude,
        comm,
        tech,
        projects,
        certs,
        studyHours,
        backlogs,
        prevGpa,
      ],
      label,
      studentName: `Student-${i + 1}`,
    });
  }

  return samples;
}
