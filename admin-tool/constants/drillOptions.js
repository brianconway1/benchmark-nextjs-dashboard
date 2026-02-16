// constants/drillOptions.js
// Drill-related constants for sections and skill focus options

export const SECTIONS = [
  'Warm-Up',
  'Activation & Mobility',
  'Main Session',
  'Cool Down',
  'Skills',
  'Games',
  'Fun',
  'Tactical',
  'Fitness',
  'Speed & Agility',
  'Recovery',
  'S&C',
  'Gym', // For exercises
];

export const SKILL_FOCUS_OPTIONS = [
  'Bounce & Solo',
  'Decision Making & Possession',
  'Defending & Tackling',
  'First Touch & Catching',
  'Fundamentals',
  'Hand Passing',
  'Kick Outs',
  'Kick Passing',
  'Pick Up',
  'Shooting',
  'Shot Stopping',
  'Speed & Agility',
  'Support Play & Line Breaks',
];

export const AGE_GROUPS = [
  'U6',
  'U8',
  'U10',
  'U12',
  'U14',
  'U16',
  'U18',
  'U20',
  'Senior',
  'Masters',
];

// Display labels for age groups (UI shows U6/U7, data stores U6)
export const AGE_GROUP_LABELS = {
  'U6': 'U6/U7',
  'U8': 'U8/U9',
  'U10': 'U10/U11',
  'U12': 'U12/U13',
  'U14': 'U14/U15',
  'U16': 'U16/U17',
  'U18': 'U18/U19',
};

export const SPORTS = [
  "Men's Football, Ladies' Football",
];

export const DEFAULT_RECOMMENDED_PARAMETERS = {
  parameterMode: 'duration',
  parameters: {
    durationMinutes: 10,
    enableSets: false,
    setsCount: 1,
    restBetweenSetsSeconds: 0,
    sets: 3,
    reps: 10,
    restSeconds: 30,
  },
};

export const getDefaultDrillData = () => ({
  title: '',
  description: '',
  section: [],
  skillFocus: [],
  ageGroups: [],
  sport: "Men's Football, Ladies' Football",
  image: null,
  video: null,
  youtubeUrl: '',
  youtubeVideoId: '',
  recommendedParameters: { ...DEFAULT_RECOMMENDED_PARAMETERS },
  coachesNotes: '',
  // Masterclass drill fields (optional)
  isMasterclassDrill: false,
  masterclassId: '',
});

export const getDefaultMasterclassData = () => ({
  // Required fields
  title: '',
  drillIds: [], // Array of benchmark_drills document IDs
  // Optional fields
  description: '',
  videoUrl: null, // Main masterclass video
  coachName: '',
  coachImage: null, // Coach photo
  sport: '',
  isActive: true, // Set false to hide
  order: 0, // For sorting (lower number = shows first)
});
