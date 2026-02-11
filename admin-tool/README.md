# Admin Tool for Benchmark Drills & Masterclasses

Self-contained React components for managing benchmark drills and masterclasses.

## Setup

1. Copy this entire `admin-tool` folder to your web admin app
2. Update `lib/firebase.js` with your Firebase config (or import from your existing config)
3. Add routes for the pages in your router
4. Install any missing dependencies

## Required Dependencies

These should already be in your project based on your tech stack:
- react, react-dom
- firebase (10.x)
- lucide-react
- tailwindcss
- @tanstack/react-query (optional, for caching)
- zod (for validation)

## File Structure

```
admin-tool/
├── pages/
│   ├── BenchmarkDrillsPage.jsx    # List/manage benchmark drills
│   └── MasterclassesPage.jsx      # List/manage masterclasses
├── components/
│   ├── DrillModal.jsx             # Create/edit drill modal
│   ├── MasterclassModal.jsx       # Create/edit masterclass modal
│   ├── DrillCard.jsx              # Drill card display
│   ├── MasterclassCard.jsx        # Masterclass card display
│   ├── VideoUploader.jsx          # Video upload component
│   └── ImageUploader.jsx          # Image upload component
├── lib/
│   ├── firebase.js                # Firebase config (update with your config)
│   ├── drillService.js            # Benchmark drill CRUD operations
│   ├── masterclassService.js      # Masterclass CRUD operations
│   └── storageService.js          # Firebase Storage uploads
└── constants/
    └── drillOptions.js            # Sections, skill focus options
```

## Usage

### Routes (add to your router)

```jsx
import BenchmarkDrillsPage from './admin-tool/pages/BenchmarkDrillsPage';
import MasterclassesPage from './admin-tool/pages/MasterclassesPage';

// In your router:
<Route path="/admin/benchmark-drills" element={<BenchmarkDrillsPage />} />
<Route path="/admin/masterclasses" element={<MasterclassesPage />} />
```

### Firestore Collections

- `benchmark_drills` - Benchmark drill documents
- `masterclasses` - Masterclass documents

### Storage Paths

- `benchmark_drills/{drillId}/image.{ext}` - Drill images
- `benchmark_drills/{drillId}/video.{ext}` - Drill videos
- `masterclasses/{masterclassId}/cover.{ext}` - Masterclass cover photos
- `masterclasses/{masterclassId}/main-video.{ext}` - Masterclass main videos
