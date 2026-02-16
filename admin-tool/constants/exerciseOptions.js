// constants/exerciseOptions.js
// Exercise-related constants for categories and parameters

export const EXERCISE_CATEGORIES = [
  'Lifts',
  'Accessories',
  'Mobility',
  'Jumps',
  'Injury Prevention',
  'Core',
];

export const SPORTS = [
  "Men's Football, Ladies' Football",
];

export const PARAMETER_MODES = [
  { value: 'setsRepsRest', label: 'Sets / Reps / Rest' },
  { value: 'duration', label: 'Duration' },
  { value: 'timeTrial', label: 'Time Trial' },
];

export const DEFAULT_EXERCISE_PARAMETERS = {
  parameterMode: 'setsRepsRest',
  parameters: {
    sets: 3,
    reps: 5,
    restSeconds: 120,
    durationMinutes: 10,
  },
};

export const getDefaultExerciseData = () => ({
  title: '',
  description: '',
  sport: "Men's Football, Ladies' Football",
  category: [],
  section: ['Gym'], // Hardcoded, not user-editable
  image: null,
  video: null,
  videoThumbnail: null,
  youtubeUrl: '',
  youtubeVideoId: '',
  recommendedParameters: { ...DEFAULT_EXERCISE_PARAMETERS },
});
