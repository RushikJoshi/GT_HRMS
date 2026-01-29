# Dynamic Pipeline System - Implementation Guide

## 🚀 Overview

This document explains how to integrate the new Dynamic Pipeline System into your existing Applicants.jsx page.

## 📦 New Files Created

1. **PipelineStatusManager.js** - State management & transitions
2. **DynamicPipelineEngine.jsx** - Main orchestrator component
3. **RoundContainer.jsx** - Display candidates in each round
4. **ActionButtons.jsx** - Context-aware actions per round
5. **InterviewScheduleModal.jsx** - Schedule interviews
6. **DynamicCandidateCard.jsx** - Individual candidate display

## 🔧 Integration Steps

### Step 1: Update Applicants.jsx Imports

```jsx
import DynamicPipelineEngine from './components/DynamicPipelineEngine';
import {
  initializeCandidateInPipeline,
  getAllRoundsForRequirement
} from '../utils/PipelineStatusManager';
```

### Step 2: Initialize Applicants with Pipeline Data

When fetching applicants, ensure they have pipeline metadata:

```jsx
const initializeApplicantsInPipeline = (applicants, requirement) => {
  return applicants.map(app => {
    // If already has currentRound, use it
    if (app.currentRound) return app;
    
    // Otherwise initialize in 'Applied' round
    return initializeCandidateInPipeline(app, 'Applied');
  });
};
```

### Step 3: Replace Tab-based View with Dynamic Pipeline

**Before (Old Code):**
```jsx
{activeTab === 'Applied' && <CandidateList />}
{activeTab === 'Shortlisted' && <CandidateList />}
{activeTab === 'Interview' && <CandidateList />}
```

**After (New Code):**
```jsx
<DynamicPipelineEngine
  requirement={selectedRequirement}
  applicants={initializeApplicantsInPipeline(getFilteredApplicants(), selectedRequirement)}
  onUpdateApplicant={handleUpdateApplicant}
  onViewResume={openCandidateModal}
  currentTab={activeTab}
/>
```

### Step 4: Implement Update Handler

```jsx
const handleUpdateApplicant = (updatedApplicant) => {
  // Update applicant in state
  const updated = applicants.map(app =>
    app._id === updatedApplicant._id ? updatedApplicant : app
  );
  setApplicants(updated);
  
  // Optionally sync to backend
  updateApplicantStatus(updatedApplicant);
};
```

## 📊 Data Structure

Each applicant now has this structure:

```javascript
{
  _id: "...",
  name: "John Doe",
  email: "john@example.com",
  resume: "...",
  
  // NEW PIPELINE FIELDS
  currentRound: "Interview",           // Current round name
  isRejected: false,                    // Rejected status
  isFinalized: false,                   // Finalized status
  
  // Interview tracking
  interview: {
    date: "2026-01-25",
    time: "10:00",
    location: "Zoom",
    interviewerName: "Jane Smith",
    notes: "..."
  },
  
  interviewHistory: [
    { date, time, location, round: "Shortlisted", ... }
  ],
  
  // Round progression
  roundHistory: [
    { round: "Applied", enteredAt: Date, actions: [] },
    { round: "Shortlisted", enteredAt: Date, actions: [] },
    { round: "Interview", enteredAt: Date, actions: [] }
  ],
  
  // Custom rounds per candidate
  customRounds: ["Technical Round 2", "Final Discussion"]
}
```

## 🎯 Key Features

### 1. Independent Candidate Movement
- Each candidate moves through rounds independently
- No global pipeline changes
- Candidate-specific custom rounds

### 2. Context-Aware Actions
Each round shows different actions:

- **Applied**: Shortlist | Reject
- **Shortlisted**: Schedule Interview | Reject
- **Interview**: Proceed | Reject | Add Other Round
- **HR Round**: Finalize | Reject | Add Other Round
- **Finalized**: (No actions)

### 3. Dynamic Rounds
- Rounds appear only if candidates are in them
- Custom rounds per candidate
- Support for unlimited rounds

### 4. Interview Tracking
- Interview history carried forward
- Details shown in subsequent rounds
- Multiple interviews per candidate

## 🔄 Workflow Example

```
1. Candidate applies
   └─ Appears in "Applied" round
   
2. HR clicks "Shortlist"
   └─ Moves to "Shortlisted" round
   └─ "Schedule Interview" button shows
   
3. HR schedules interview
   └─ Moves to "Interview" round
   └─ Interview details displayed
   
4. HR clicks "Proceed to Next Round"
   └─ Shows modal:
      - Move to next round
      - Finalize selection
   
5. HR chooses "Finalize"
   └─ Moves to "Finalized" round
   └─ No more actions available
```

## 🛠️ Customization

### Add Custom Round Logic

```jsx
// In ActionButtons.jsx, update getRoundActions()
const getRoundActions = (roundName, applicant) => {
  const actions = {
    'Applied': ['Shortlist', 'Reject'],
    'Shortlisted': ['ScheduleInterview', 'Reject'],
    'MyCustomRound': ['Approve', 'Reject', 'AddOtherRound'], // NEW
    // ... other rounds
  };
  return actions[roundName] || [];
};
```

### Change Round Colors

```jsx
// In RoundContainer.jsx, update getRoundColor()
const getRoundColor = (round) => {
  const colorMap = {
    'MyCustomRound': {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      badge: 'bg-purple-100 text-purple-700'
    },
    // ... other rounds
  };
  return colorMap[round] || { ... };
};
```

## 🚀 Best Practices

1. **Always initialize applicants** before rendering:
   ```jsx
   const initializedApps = applicants.map(app =>
     app.currentRound ? app : initializeCandidateInPipeline(app)
   );
   ```

2. **Handle interview details carefully**:
   ```jsx
   const lastInterview = getLastInterviewDetails(applicant);
   ```

3. **Update backend after each action**:
   ```jsx
   const handleUpdateApplicant = async (updated) => {
     setApplicants(prev => [...]);
     await api.put(`/applicants/${updated._id}`, updated);
   };
   ```

4. **Show appropriate feedback**:
   - Use notifications for each action
   - Show loading states during updates
   - Handle errors gracefully

## ⚠️ Important Notes

- **No DB schema changes required** - Use existing fields
- **currentRound** is a derived state - can be stored or computed
- **All state is frontend** until you sync to backend
- **Custom rounds** are candidate-specific metadata
- **Interview data** is preserved through round transitions

## 📞 Support

For questions or issues:
1. Check the component prop definitions
2. Review PipelineStatusManager.js utility functions
3. Check Applicants.jsx for integration example
4. Verify data structure matches expected format

---

**Last Updated**: January 22, 2026
**System**: Dynamic Round-Based Recruitment Pipeline
