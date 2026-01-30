'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Stack,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin } from '@/lib/permissions';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Club, Team } from '@/types';
import PageLoader from '@/components/shared/PageLoader';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import {
  Upload as UploadIcon,
  Warning as WarningIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { appColors } from '@/theme';
import { useToast } from '@/contexts/ToastContext';
import { uploadImageForBulkUpload, findImageForDrill, processDrillForUpload } from '@/utils/bulkUpload';
import { importDrillsFromJson, clearBenchmarkDrills, clearClubDrills, clearTeamDrills } from '@/utils/drillFS';
import { fixAllYouTubeUrls, type YouTubeFixResults } from '@/utils/fixYouTubeUrls';
import { compressImage } from '@/utils/imageCompression';

export default function BulkUploadPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [drillsJson, setDrillsJson] = useState<Array<Record<string, unknown>>>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetType, setTargetType] = useState<'team' | 'club' | 'benchmark'>('team');
  const [targetId, setTargetId] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [results, setResults] = useState<{ success: number; failed: number; errors: Array<{ drill: string; error: string }> } | null>(null);
  const [dangerClubId, setDangerClubId] = useState('');
  const [dangerTeamId, setDangerTeamId] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [fixingYouTube, setFixingYouTube] = useState(false);
  const [youtubeFixResults, setYoutubeFixResults] = useState<YouTubeFixResults | null>(null);
  
  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [clearBenchmarkDialogOpen, setClearBenchmarkDialogOpen] = useState(false);
  const [clearBenchmarkFinalDialogOpen, setClearBenchmarkFinalDialogOpen] = useState(false);
  const [clearClubDialogOpen, setClearClubDialogOpen] = useState(false);
  const [clearTeamDialogOpen, setClearTeamDialogOpen] = useState(false);
  const [fixYouTubeDialogOpen, setFixYouTubeDialogOpen] = useState(false);
  const [isClearingBenchmark, setIsClearingBenchmark] = useState(false);
  const [isClearingClub, setIsClearingClub] = useState(false);
  const [isClearingTeam, setIsClearingTeam] = useState(false);

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      if (!user || authLoading) return;

      try {
        const hasAccess = await isSuperAdmin(user.uid);
        if (!hasAccess) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        await loadClubsAndTeams();
      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccessAndLoad();
  }, [user, authLoading]);

  const loadClubsAndTeams = async () => {
    try {
      const [clubsSnapshot, teamsSnapshot] = await Promise.all([
        getDocs(collection(db, 'sports_clubs')),
        getDocs(collection(db, 'teams')),
      ]);

      setClubs(clubsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Club)));
      setTeams(teamsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Team)));
    } catch (error) {
      console.error('Error loading clubs/teams:', error);
    }
  };

  const promptForAdminEmail = (): string | null => {
    return prompt('⚠️ Super Admin Email Required\n\nEnter your super admin email to confirm this action:');
  };

  const fixEncoding = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      return obj
        .replace(/‚Äì/g, '-')
        .replace(/‚Äî/g, '-')
        .replace(/‚Ä¢/g, '•')
        .replace(/‚Äô/g, "'")
        .replace(/‚Äù/g, '"')
        .replace(/‚Äú/g, '"')
        .replace(/‚Ä¶/g, '...')
        .replace(/Â/g, '');
    } else if (Array.isArray(obj)) {
      return obj.map((item) => fixEncoding(item));
    } else if (obj && typeof obj === 'object') {
      const fixed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        fixed[key] = fixEncoding(value);
      }
      return fixed;
    }
    return obj;
  };

  // Type-safe version for arrays
  const fixEncodingArray = (arr: Array<Record<string, unknown>>): Array<Record<string, unknown>> => {
    return arr.map((item) => fixEncoding(item) as Record<string, unknown>);
  };

  const parseCSV = (csvContent: string): Array<Record<string, string>> => {
    // Simplified CSV parser - for production, consider using a library like PapaParse
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const data: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= headers.length && values[0]) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }

    return data;
  };

  const handleLoadJson = async (file: File) => {
    try {
      const content = await file.text();
      let data: Array<Record<string, unknown>>;

      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        data = parseCSV(content);
      } else {
        data = JSON.parse(content);
        if (!Array.isArray(data)) {
          throw new Error('Expected an array of drills');
        }
      }

      const cleanedData = fixEncodingArray(data);
      setDrillsJson(cleanedData);
      showToast(`${cleanedData.length} drills loaded`, 'success');
    } catch (error) {
      console.error('Error loading file:', error);
      showToast('Error loading file: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    }
  };

  const handleLoadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setCompressing(true);
    setCompressionProgress(0);

    const fileArray = Array.from(files);
    const compressedFiles: File[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setCompressionProgress(((i + 1) / fileArray.length) * 100);

      const compressedFile = await compressImage(file);
      compressedFiles.push(compressedFile);
    }

    setImageFiles(compressedFiles);
    setCompressing(false);
    setCompressionProgress(0);

    const totalOriginalSize = fileArray.reduce((sum, f) => sum + f.size, 0);
    const totalCompressedSize = compressedFiles.reduce((sum, f) => sum + f.size, 0);
    const savings = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100).toFixed(1);

    showToast(
      `Loaded ${compressedFiles.length} images (${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB → ${(totalCompressedSize / 1024 / 1024).toFixed(2)}MB, ${savings}% savings)`,
      'success'
    );
  };

  const handleLoadZipFile = async (file: File) => {
    try {
      // Dynamic import for JSZip
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);
      const imageFilesFromZip: File[] = [];

      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir && /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
          const blob = await zipEntry.async('blob');
          const imageFile = new File([blob], filename, { type: blob.type });
          imageFilesFromZip.push(imageFile);
        }
      }

      if (imageFilesFromZip.length === 0) {
        showToast('No image files found in the zip file', 'warning');
        return;
      }

      setCompressing(true);
      setCompressionProgress(0);

      const compressedFiles: File[] = [];
      for (let i = 0; i < imageFilesFromZip.length; i++) {
        const file = imageFilesFromZip[i];
        setCompressionProgress(((i + 1) / imageFilesFromZip.length) * 100);
        const compressedFile = await compressImage(file);
        compressedFiles.push(compressedFile);
      }

      setImageFiles(compressedFiles);
      setCompressing(false);
      setCompressionProgress(0);

      showToast(`Extracted and compressed ${compressedFiles.length} images from zip`, 'success');
    } catch (error) {
      console.error('Error extracting zip file:', error);
      showToast('Error extracting zip file: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      setCompressing(false);
    }
  };

  const handleUploadClick = () => {
    if (drillsJson.length === 0) {
      showToast('Please load a JSON file first', 'warning');
      return;
    }

    if (targetType !== 'benchmark' && !targetId) {
      showToast(`Please select a ${targetType}`, 'warning');
      return;
    }

    setUploadDialogOpen(true);
  };

  const handleUploadConfirm = async () => {
    setUploadDialogOpen(false);

    setUploading(true);
    setProgress(0);
    const uploadResults = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ drill: string; error: string }>,
    };

    for (let i = 0; i < drillsJson.length; i++) {
      const drill = drillsJson[i];
      setProgress((i / drillsJson.length) * 100);

      try {
        // Safely extract string values from drill object
        const drillId = typeof drill.id === 'string' ? drill.id : String(drill.id || '');
        const imageFileName = typeof drill.imageFileName === 'string' 
          ? drill.imageFileName 
          : (drill.imageFileName ? String(drill.imageFileName) : null);
        
        const matchingImage = findImageForDrill(drillId, imageFileName, imageFiles);

        let imageUrl = null;
        if (matchingImage) {
          try {
            const ownerId = targetType === 'benchmark' ? 'benchmark' : targetId;
            imageUrl = await uploadImageForBulkUpload(matchingImage, ownerId);
          } catch (error) {
            console.error(`⚠️ Failed to upload image for drill ${drillId}:`, error);
          }
        }

        const processedDrill = processDrillForUpload(drill, targetType === 'team' ? targetId : null);
        processedDrill.image = imageUrl;

        if (targetType === 'club') {
          processedDrill.clubId = targetId;
        }

        await importDrillsFromJson([processedDrill], {
          to: targetType,
          teamId: targetType === 'team' ? targetId : undefined,
          clubId: targetType === 'club' ? targetId : undefined,
        });

        uploadResults.success++;
      } catch (error) {
        uploadResults.failed++;
        console.error(`❌ Failed: ${drill.title || drill.id}`, error);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setUploading(false);
    setResults(uploadResults);
    setProgress(100);
    showToast(`Upload complete! Success: ${uploadResults.success}, Failed: ${uploadResults.failed}`, 'success');
  };

  const handleUploadCancel = () => {
    setUploadDialogOpen(false);
  };

  const handleClearBenchmarkClick = () => {
    const email = promptForAdminEmail();
    if (!email) {
      showToast('Email confirmation required to proceed', 'warning');
      return;
    }
    setClearBenchmarkDialogOpen(true);
  };

  const handleClearBenchmarkConfirm = () => {
    setClearBenchmarkDialogOpen(false);
    setClearBenchmarkFinalDialogOpen(true);
  };

  const handleClearBenchmarkFinalConfirm = async () => {
    setClearBenchmarkFinalDialogOpen(false);
    try {
      setIsClearingBenchmark(true);
      await clearBenchmarkDrills();
      showToast('All benchmark drills deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to clear benchmark drills:', error);
      showToast('Failed to clear benchmark drills: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setIsClearingBenchmark(false);
    }
  };

  const handleClearClubDrillsClick = () => {
    if (!dangerClubId) {
      showToast('Please select a club', 'warning');
      return;
    }

    const email = promptForAdminEmail();
    if (!email) {
      showToast('Email confirmation required to proceed', 'warning');
      return;
    }

    setClearClubDialogOpen(true);
  };

  const handleClearClubDrillsConfirm = async () => {
    setClearClubDialogOpen(false);
    const club = clubs.find((c) => c.id === dangerClubId);
    const clubName = club ? club.name : dangerClubId;

    try {
      setIsClearingClub(true);
      await clearClubDrills(dangerClubId);
      showToast(`All drills for "${clubName}" deleted successfully`, 'success');
    } catch (error) {
      console.error('Failed to clear club drills:', error);
      showToast('Failed to clear club drills: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setIsClearingClub(false);
    }
  };

  const handleClearTeamDrillsClick = () => {
    if (!dangerTeamId) {
      showToast('Please select a team', 'warning');
      return;
    }

    const email = promptForAdminEmail();
    if (!email) {
      showToast('Email confirmation required to proceed', 'warning');
      return;
    }

    setClearTeamDialogOpen(true);
  };

  const handleClearTeamDrillsConfirm = async () => {
    setClearTeamDialogOpen(false);
    const team = teams.find((t) => t.id === dangerTeamId);
    const teamName = team ? `${team.name} (${team.sport || 'N/A'})` : dangerTeamId;

    try {
      setIsClearingTeam(true);
      await clearTeamDrills(dangerTeamId);
      showToast(`All drills for "${teamName}" deleted successfully`, 'success');
    } catch (error) {
      console.error('Failed to clear team drills:', error);
      showToast('Failed to clear team drills: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setIsClearingTeam(false);
    }
  };

  const handleFixYouTubeUrlsClick = () => {
    if (fixingYouTube) return;
    setFixYouTubeDialogOpen(true);
  };

  const handleFixYouTubeUrlsConfirm = async () => {
    setFixYouTubeDialogOpen(false);

    setFixingYouTube(true);
    setYoutubeFixResults(null);

    try {
      const results = await fixAllYouTubeUrls();
      setYoutubeFixResults(results);

      const totalFixed = Object.values(results).reduce((sum, r) => sum + r.fixed, 0);
      showToast(`Fixed ${totalFixed} YouTube URLs successfully!`, 'success');
    } catch (error) {
      console.error('Failed to fix YouTube URLs:', error);
      showToast('Failed to fix YouTube URLs: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setFixingYouTube(false);
    }
  };

  if (authLoading || loading) {
    return <PageLoader />;
  }

  if (accessDenied) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Access denied. You must be a super admin to view this page.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Bulk Drill Upload
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload multiple drills with images to Firebase Storage and Firestore
        </Typography>
      </Box>

      {/* Step 1: File Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 2 }}>
          Step 1: Select Files
        </Typography>
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>✅ Automatic Compression:</strong> All images are automatically compressed to 200KB max on upload.
            YouTube links in your JSON will be automatically stored.
          </Typography>
        </Alert>
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
              Drill Data (JSON or CSV)
            </Typography>
            <Button variant="outlined" component="label" startIcon={<UploadIcon />} fullWidth>
              {drillsJson.length > 0 ? `${drillsJson.length} drills loaded` : 'Select JSON/CSV File'}
              <input type="file" accept=".json,.csv,.txt" hidden onChange={(e) => e.target.files?.[0] && handleLoadJson(e.target.files[0])} />
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Supports JSON arrays or CSV files. Export from Excel with "Use quotes to delimit text containing commas/tabs".
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
              Drill Images Folder
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
              sx={{
                textTransform: 'none',
                justifyContent: 'flex-start',
              }}
            >
              {imageFiles.length > 0 ? `${imageFiles.length} images ready` : 'Select Images Folder'}
              <input
                type="file"
                multiple
                // @ts-expect-error - webkitdirectory is a valid non-standard attribute
                webkitdirectory=""
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleLoadImages(e.target.files)}
              />
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Select an entire folder of image files
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
              OR Upload Zip File of Images
            </Typography>
            <Button variant="outlined" component="label" startIcon={<UploadIcon />} fullWidth>
              Select Zip File
              <input type="file" accept=".zip" hidden onChange={(e) => e.target.files?.[0] && handleLoadZipFile(e.target.files[0])} />
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Upload a zip file containing all drill images
            </Typography>
          </Box>

          {compressing && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>🗜️ Compressing images...</strong>
              </Typography>
              <LinearProgress variant="determinate" value={compressionProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {Math.round(compressionProgress)}% complete
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Step 2: Target Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 2 }}>
          Step 2: Select Upload Target
        </Typography>
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Upload To</InputLabel>
            <Select value={targetType} onChange={(e) => {
              setTargetType(e.target.value as 'team' | 'club' | 'benchmark');
              setTargetId('');
            }} label="Upload To">
              <MenuItem value="team">Team</MenuItem>
              <MenuItem value="club">Club</MenuItem>
              <MenuItem value="benchmark">Benchmark (Global)</MenuItem>
            </Select>
          </FormControl>

          {targetType !== 'benchmark' && (
            <FormControl fullWidth>
              <InputLabel>Select {targetType === 'team' ? 'Team' : 'Club'}</InputLabel>
              <Select value={targetId} onChange={(e) => setTargetId(e.target.value)} label={`Select ${targetType === 'team' ? 'Team' : 'Club'}`}>
                <MenuItem value="">-- Select {targetType === 'team' ? 'Team' : 'Club'} --</MenuItem>
                {(targetType === 'team' ? teams : clubs).map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {targetType === 'team' ? `${item.name} (${(item as Team).sport || 'N/A'})` : item.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {targetType === 'benchmark' && (
            <Alert severity="info">
              <Typography variant="body2">
                <strong>⚠️ Benchmark Drills:</strong> These drills will be uploaded to the global{' '}
                <code>benchmark_drills</code> collection and will be available to all clubs and teams. No specific team
                or club selection needed.
              </Typography>
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Step 3: Upload */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
              Step 3: Upload
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ready to upload {drillsJson.length} drills with {imageFiles.length} images
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={handleUploadClick}
            disabled={uploading || drillsJson.length === 0 || (targetType !== 'benchmark' && !targetId)}
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
            sx={{
              backgroundColor: appColors.primary,
              color: appColors.primaryText,
              fontWeight: 'bold',
              '&:hover': { backgroundColor: appColors.primaryHover },
            }}
          >
            {uploading ? `Uploading... ${Math.round(progress)}%` : `Upload All (${drillsJson.length} drills)`}
          </Button>
        </Box>

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {Math.round(progress)}% complete
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Results */}
      {results && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 2 }}>
            Upload Results
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ color: appColors.success }}>
              ✅ Success: {results.success}
            </Typography>
            <Typography variant="body2" sx={{ color: appColors.error }}>
              ❌ Failed: {results.failed}
            </Typography>
            {results.errors.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                  Errors:
                </Typography>
                <Stack spacing={0.5}>
                  {results.errors.map((err, idx) => (
                    <Typography key={idx} variant="caption" sx={{ display: 'block' }}>
                      <strong>{err.drill}:</strong> {err.error}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>
      )}

      {/* Utilities */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: appColors.backgroundGrey }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <BuildIcon sx={{ mr: 1, color: appColors.info }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
            Utilities
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Safe maintenance operations for existing drill data
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#fff' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Fix YouTube URLs & Video IDs
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            • Remove "@" prefix from YouTube URLs<br />
            • Extract and add missing youtubeVideoId field<br />
            • Applies to all existing drills (benchmark, club, and team)
          </Typography>
          <Button
            variant="outlined"
            onClick={handleFixYouTubeUrlsClick}
            disabled={fixingYouTube}
            startIcon={fixingYouTube ? <CircularProgress size={20} /> : <BuildIcon />}
            sx={{
              borderColor: appColors.info,
              color: appColors.info,
            }}
          >
            {fixingYouTube ? 'Fixing...' : '🔧 Fix YouTube URLs & Video IDs'}
          </Button>

          {youtubeFixResults && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                ✅ Fix Complete
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="caption">
                  • Benchmark Drills: {youtubeFixResults.benchmark_drills.fixed} fixed out of{' '}
                  {youtubeFixResults.benchmark_drills.total}
                </Typography>
                <Typography variant="caption">
                  • Club Drills: {youtubeFixResults.club_drills.fixed} fixed out of {youtubeFixResults.club_drills.total}
                </Typography>
                <Typography variant="caption">
                  • Team Drills: {youtubeFixResults.team_drills.fixed} fixed out of {youtubeFixResults.team_drills.total}
                </Typography>
              </Stack>
            </Alert>
          )}
        </Paper>
      </Paper>

      {/* Danger Zone */}
      <Paper sx={{ p: 3, border: `2px solid ${appColors.error}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <WarningIcon sx={{ mr: 1, color: appColors.error }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.error }}>
            ⚠️ Danger Zone
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: appColors.error, mb: 3 }}>
          These actions are irreversible. Super admin email required for all actions.
        </Typography>

        <Stack spacing={2}>
          {/* Clear Benchmark Drills */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: appColors.error }}>
              Clear All Benchmark Drills
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Delete ALL benchmark drills and their images from the system
            </Typography>
            <Button
              variant="contained"
              onClick={handleClearBenchmarkClick}
              disabled={isClearingBenchmark}
              fullWidth
              sx={{
                backgroundColor: appColors.error,
                color: '#fff',
                '&:hover': { backgroundColor: '#b71c1c' },
              }}
            >
              {isClearingBenchmark ? 'Clearing...' : '⚠️⚠️ Clear All Benchmark Drills'}
            </Button>
          </Paper>

          {/* Clear Club Drills */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: appColors.error }}>
              Clear Club Drills
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Delete ALL drills and their images for a specific club
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Club</InputLabel>
              <Select value={dangerClubId} onChange={(e) => setDangerClubId(e.target.value)} label="Select Club">
                <MenuItem value="">-- Select Club --</MenuItem>
                {clubs.map((club) => (
                  <MenuItem key={club.id} value={club.id}>
                    {club.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleClearClubDrillsClick}
              disabled={!dangerClubId || isClearingClub}
              fullWidth
              sx={{
                backgroundColor: appColors.error,
                color: '#fff',
                '&:hover': { backgroundColor: '#b71c1c' },
              }}
            >
              {isClearingClub ? 'Clearing...' : '⚠️ Clear All Drills for Selected Club'}
            </Button>
          </Paper>

          {/* Clear Team Drills */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: appColors.error }}>
              Clear Team Drills
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Delete ALL drills and their images for a specific team
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Team</InputLabel>
              <Select value={dangerTeamId} onChange={(e) => setDangerTeamId(e.target.value)} label="Select Team">
                <MenuItem value="">-- Select Team --</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name} ({team.sport || 'N/A'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleClearTeamDrillsClick}
              disabled={!dangerTeamId || isClearingTeam}
              fullWidth
              sx={{
                backgroundColor: appColors.error,
                color: '#fff',
                '&:hover': { backgroundColor: '#b71c1c' },
              }}
            >
              {isClearingTeam ? 'Clearing...' : '⚠️ Clear All Drills for Selected Team'}
            </Button>
          </Paper>
        </Stack>
      </Paper>

      {/* Confirmation Dialogs */}
      {/* Upload Confirmation */}
      <ConfirmationDialog
        open={uploadDialogOpen}
        onClose={handleUploadCancel}
        onConfirm={handleUploadConfirm}
        title="Confirm Upload"
        message={
          <Typography>
            {targetType === 'benchmark' ? (
              <>
                Upload <strong>{drillsJson.length} drills</strong> to benchmark_drills collection?
                <br />
                <br />
                Benchmark drills are global and available to all users.
              </>
            ) : (
              <>
                Upload <strong>{drillsJson.length} drills</strong> to {targetType} &quot;{targetId}&quot;?
              </>
            )}
          </Typography>
        }
        confirmText="Upload"
        cancelText="Cancel"
        isLoading={uploading}
      />

      {/* Clear Benchmark - First Confirmation */}
      <ConfirmationDialog
        open={clearBenchmarkDialogOpen}
        onClose={() => setClearBenchmarkDialogOpen(false)}
        onConfirm={handleClearBenchmarkConfirm}
        title="⚠️⚠️ WARNING"
        message={
          <Typography>
            This will delete <strong>ALL benchmark drills</strong>!
            <br />
            <br />
            This is extremely destructive!
            <br />
            <br />
            Continue?
          </Typography>
        }
        confirmText="Continue"
        cancelText="Cancel"
      />

      {/* Clear Benchmark - Final Confirmation */}
      <ConfirmationDialog
        open={clearBenchmarkFinalDialogOpen}
        onClose={() => setClearBenchmarkFinalDialogOpen(false)}
        onConfirm={handleClearBenchmarkFinalConfirm}
        title="⚠️⚠️ Final Confirmation"
        message={
          <Typography>
            This cannot be undone!
            <br />
            <br />
            Are you absolutely sure?
          </Typography>
        }
        confirmText="Yes, Delete All"
        cancelText="Cancel"
        isLoading={isClearingBenchmark}
      />

      {/* Clear Club Drills Confirmation */}
      <ConfirmationDialog
        open={clearClubDialogOpen}
        onClose={() => setClearClubDialogOpen(false)}
        onConfirm={handleClearClubDrillsConfirm}
        title="⚠️ WARNING"
        message={
          <Typography>
            This will delete <strong>ALL drills</strong> for &quot;{clubs.find((c) => c.id === dangerClubId)?.name || dangerClubId}&quot;!
            <br />
            <br />
            This cannot be undone!
            <br />
            <br />
            Continue?
          </Typography>
        }
        confirmText="Delete All"
        cancelText="Cancel"
        isLoading={isClearingClub}
      />

      {/* Clear Team Drills Confirmation */}
      <ConfirmationDialog
        open={clearTeamDialogOpen}
        onClose={() => setClearTeamDialogOpen(false)}
        onConfirm={handleClearTeamDrillsConfirm}
        title="⚠️ WARNING"
        message={
          <Typography>
            This will delete <strong>ALL drills</strong> for &quot;{teams.find((t) => t.id === dangerTeamId)?.name || dangerTeamId}&quot;!
            <br />
            <br />
            This cannot be undone!
            <br />
            <br />
            Continue?
          </Typography>
        }
        confirmText="Delete All"
        cancelText="Cancel"
        isLoading={isClearingTeam}
      />

      {/* Fix YouTube URLs Confirmation */}
      <ConfirmationDialog
        open={fixYouTubeDialogOpen}
        onClose={() => setFixYouTubeDialogOpen(false)}
        onConfirm={handleFixYouTubeUrlsConfirm}
        title="🔧 Fix YouTube URLs & Video IDs"
        message={
          <Typography>
            This will scan all drills (benchmark, club, and team) and:
            <br />
            • Remove &quot;@&quot; prefix from YouTube URLs
            <br />
            • Extract and add missing youtubeVideoId field
            <br />
            <br />
            This action is safe and reversible.
            <br />
            <br />
            Continue?
          </Typography>
        }
        confirmText="Fix URLs"
        cancelText="Cancel"
        isLoading={fixingYouTube}
      />
    </Container>
  );
}

