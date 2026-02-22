'use client';

import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Paper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayCircle as PlayCircleIcon,
  YouTube as YouTubeIcon,
} from '@mui/icons-material';
import { appColors } from '@/theme';

interface FAQItem {
  question: string;
  answer: string;
  videoUrl?: string;
}

const usingTheAppFAQs: FAQItem[] = [
  {
    question: 'How do I use this app?',
    answer: 'Watch the demo for a full walkthrough of Benchmark Coach and all its features.',
    videoUrl: 'https://youtu.be/Ab5RaLQy-ok',
  },
  {
    question: 'How do I build a training session plan?',
    answer: 'Use the Session Builder tab to create training sessions. Add drills, set durations, and collaborate with other coaches.',
    videoUrl: 'https://youtu.be/30vivbYlCdQ',
  },
  {
    question: 'How do I upload drills?',
    answer: 'Go to the Drills tab and tap the + button. You can add images, videos, YouTube links, or use the drawing tool. Organise your drills into folders for easy access.',
    videoUrl: 'https://youtu.be/4JYemogWH9c',
  },
  {
    question: 'How do I message other coaches?',
    answer: 'Use the Chat tab to message other coaches within your club. You can start individual or group conversations with any coaches in your teams.',
  },
  {
    question: 'How do I switch teams?',
    answer: 'Go to the Dashboard tab and tap on a different team card to switch between teams. Your current team is highlighted at the top.',
  },
];

const accountAdminFAQs: FAQItem[] = [
  {
    question: 'What are the roles and how do I change them?',
    answer: `Roles determine what users can do:
• Club Admin – Manages the club via admin portal only. Can view and access all teams in the club.
• Club Admin Coach – Full admin access plus mobile app access. Can view and access all teams in the club.
• Coach – Can create sessions, drills, and message other coaches.
• View Only – Read-only access to team content.

Roles can be changed by a Club Admin in the admin portal.`,
  },
  {
    question: 'What devices is the app available on?',
    answer: 'Benchmark Coach is available on iPhone, iPad, and Android devices. A web app for desktop is coming soon.',
  },
  {
    question: 'How do I upgrade, change, or cancel my subscription?',
    answer: 'Contact info@benchmarksports.co.uk',
  },
  {
    question: 'How do I invite team members?',
    answer: "To invite new team members, your Club Admin must use the admin portal at admin.benchmarksports.co.uk. Teams and users can be managed from this portal. Existing members can be quickly added to teams using the 'Manage Teams' option in the side menu bar in the mobile app.",
  },
  {
    question: 'How do I use the admin portal?',
    answer: 'The admin portal at admin.benchmarksports.co.uk is where Club Admins manage teams, users, billing, and club settings.',
    videoUrl: 'https://youtu.be/_KmSZP3KkiQ',
  },
  {
    question: 'How do new users sign up?',
    answer: 'New users receive an invitation email with a unique code. They download the app, tap Sign Up, enter the code, and create their account.',
    videoUrl: 'https://youtu.be/W06_wL-wE6s',
  },
  {
    question: 'How do I report a bug/problem in the app?',
    answer: 'Take screenshots and screen recordings of the issue, then email them with a description to info@benchmarksports.co.uk',
  },
];

function FAQAccordion({ item, expanded, onChange }: { item: FAQItem; expanded: boolean; onChange: () => void }) {
  return (
    <Accordion
      expanded={expanded}
      onChange={onChange}
      sx={{
        backgroundColor: '#f5f5f5',
        boxShadow: 'none',
        '&:before': { display: 'none' },
        borderRadius: '8px !important',
        mb: 1.5,
        '&.Mui-expanded': {
          margin: 0,
          mb: 1.5,
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          '& .MuiAccordionSummary-content': {
            alignItems: 'center',
            gap: 1,
          },
        }}
      >
        {item.videoUrl && (
          <PlayCircleIcon
            sx={{
              color: '#D4E33B',
              fontSize: 24,
              flexShrink: 0,
            }}
          />
        )}
        <Typography sx={{ fontWeight: 500, color: appColors.textPrimary }}>
          {item.question}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Typography
          sx={{
            color: appColors.textSecondary,
            whiteSpace: 'pre-line',
            mb: item.videoUrl ? 2 : 0,
          }}
        >
          {item.answer}
        </Typography>
        {item.videoUrl && (
          <Button
            variant="contained"
            startIcon={<YouTubeIcon />}
            onClick={() => window.open(item.videoUrl, '_blank', 'noopener,noreferrer')}
            sx={{
              backgroundColor: '#FF0000',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#CC0000',
              },
            }}
          >
            Watch Video
          </Button>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export default function FAQPage() {
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);

  const handleChange = (panel: string) => {
    setExpandedPanel(expandedPanel === panel ? null : panel);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Frequently Asked Questions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find answers to common questions about using Benchmark Coach
        </Typography>
      </Box>

      {/* Using the App Section */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, backgroundColor: '#ffffff', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 2 }}>
          Using the App
        </Typography>
        {usingTheAppFAQs.map((item, index) => (
          <FAQAccordion
            key={`app-${index}`}
            item={item}
            expanded={expandedPanel === `app-${index}`}
            onChange={() => handleChange(`app-${index}`)}
          />
        ))}
      </Paper>

      {/* Account & Admin Section */}
      <Paper elevation={0} sx={{ p: 3, backgroundColor: '#ffffff', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 2 }}>
          Account & Admin
        </Typography>
        {accountAdminFAQs.map((item, index) => (
          <FAQAccordion
            key={`admin-${index}`}
            item={item}
            expanded={expandedPanel === `admin-${index}`}
            onChange={() => handleChange(`admin-${index}`)}
          />
        ))}
      </Paper>
    </Container>
  );
}
