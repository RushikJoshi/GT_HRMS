# 🎯 Candidate Pipeline Upgrade - Quick Reference Guide

## New Components Created

### 1. StatusActionRow.jsx
**File**: `frontend/src/pages/HR/components/StatusActionRow.jsx`

**Purpose**: Renders three action buttons in the Interview tab

**Usage**:
```jsx
import StatusActionRow from './components/StatusActionRow';

<StatusActionRow
    applicant={applicant}
    activeTab={activeTab}
    onSelected={handleSelected}
    onRejected={handleRejected}
    onMoveToRound={handleMoveToRound}
    availableRounds={['HR Round', 'Tech Round', 'Final Round']}
/>
```

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `applicant` | Object | Current candidate object with interview data |
| `activeTab` | String | Current pipeline tab name |
| `onSelected` | Function | Called when "Selected" button is clicked |
| `onRejected` | Function | Called when "Rejected" button is clicked |
| `onMoveToRound` | Function | Called when a round is selected from dropdown |
| `availableRounds` | Array | List of round names to show in dropdown |

**Renders Only When**:
- `activeTab === 'Interview'` AND
- `applicant.interview?.date` exists

---

### 2. MoveToRoundDropdown.jsx
**File**: `frontend/src/pages/HR/components/MoveToRoundDropdown.jsx`

**Purpose**: Dropdown menu to select next round

**Usage**:
```jsx
import MoveToRoundDropdown from './components/MoveToRoundDropdown';

<MoveToRoundDropdown
    rounds={['HR Round', 'Tech Round', 'Final Round']}
    onSelectRound={(round) => handleMoveToRound(applicant, round)}
    onClose={() => setShowDropdown(false)}
/>
```

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `rounds` | Array | List of available round names |
| `onSelectRound` | Function | Called with selected round name |
| `onClose` | Function | Called to close the dropdown |

---

## Modified Components

### 3. InterviewInfoBlock.jsx
**File**: `frontend/src/pages/HR/components/InterviewInfoBlock.jsx`

**New Prop Added**: `showStatus`

**Before**:
```jsx
<InterviewInfoBlock interview={applicant.interview} />
```

**After** (for Shortlisted tab):
```jsx
<InterviewInfoBlock 
    interview={applicant.interview} 
    showStatus="Shortlisted"
/>
```

**Usage Pattern**:
```jsx
// In Interview tab (no status tag)
{(activeTab === 'Interview' || activeTab === 'HR Round') && (
    <InterviewInfoBlock interview={applicant.interview} />
)}

// In Shortlisted tab (with Shortlisted tag)
{showInterviewInShortlisted && (
    <InterviewInfoBlock 
        interview={applicant.interview} 
        showStatus="Shortlisted"
    />
)}
```

---

### 4. CandidateRow.jsx
**File**: `frontend/src/pages/HR/components/CandidateRow.jsx`

**New Props Added**:
```jsx
<CandidateRow
    applicant={app}
    activeTab={activeTab}
    onViewResume={openCandidateModal}
    onShortlist={(a) => handleStatusChangeRequest(a, 'Shortlisted')}
    onReject={(a) => handleStatusChangeRequest(a, 'Rejected')}
    onScheduleInterview={(a) => openScheduleModal(a)}
    
    // NEW PROPS
    onSelected={handleSelected}
    onRejected={handleRejected}
    onMoveToRound={handleMoveToRound}
    availableRounds={['HR Round', 'Tech Round', 'Final Round']}
/>
```

**Internal Logic Changes**:
```jsx
// Show interview details in Shortlisted tab if interview exists
const showInterviewInShortlisted = activeTab === 'Shortlisted' && 
                                   applicant.interview?.date;

// Renders Interview Details in Shortlisted (with tag)
{showInterviewInShortlisted && (
    <InterviewInfoBlock 
        interview={applicant.interview} 
        showStatus="Shortlisted"
    />
)}

// Renders Action Buttons in Interview tab
{activeTab === 'Interview' && (
    <StatusActionRow
        applicant={applicant}
        activeTab={activeTab}
        onSelected={onSelected}
        onRejected={onRejected}
        onMoveToRound={onMoveToRound}
        availableRounds={availableRounds}
    />
)}
```

---

### 5. Applicants.jsx
**File**: `frontend/src/pages/HR/Applicants.jsx`

**New Handler Functions Added**:

#### handleSelected(applicant)
```javascript
const handleSelected = (applicant) => {
    showConfirmToast({
        title: 'Mark as Selected',
        description: `Move ${applicant.name} to HR Round?`,
        okText: 'Yes, Select',
        cancelText: 'Cancel',
        onConfirm: async () => {
            const success = await updateStatus(applicant, 'Selected');
            if (success) {
                showToast('success', 'Selected', 
                    `${applicant.name} has been marked as Selected and moved to HR Round.`);
            }
        }
    });
};
```

#### handleRejected(applicant)
```javascript
const handleRejected = (applicant) => {
    showConfirmToast({
        title: 'Mark as Rejected',
        description: `Reject ${applicant.name}? This action cannot be undone.`,
        okText: 'Yes, Reject',
        cancelText: 'Cancel',
        onConfirm: async () => {
            const success = await updateStatus(applicant, 'Rejected');
            if (success) {
                showToast('error', 'Rejected', 
                    `${applicant.name} has been rejected and moved to Rejected tab.`);
            }
        }
    });
};
```

#### handleMoveToRound(applicant, roundName)
```javascript
const handleMoveToRound = (applicant, roundName) => {
    showConfirmToast({
        title: 'Move to Another Round',
        description: `Move ${applicant.name} to "${roundName}"?`,
        okText: 'Yes, Move',
        cancelText: 'Cancel',
        onConfirm: async () => {
            const success = await updateStatus(applicant, roundName);
            if (success) {
                showToast('success', 'Round Changed', 
                    `${applicant.name} has been moved to ${roundName}.`);
            }
        }
    });
};
```

**Modified CandidateRow Call**:
```jsx
<CandidateRow
    key={app._id || index}
    applicant={app}
    activeTab={activeTab}
    onViewResume={openCandidateModal}
    onShortlist={(a) => handleStatusChangeRequest(a, 'Shortlisted')}
    onReject={(a) => handleStatusChangeRequest(a, 'Rejected')}
    onScheduleInterview={(a) => openScheduleModal(a)}
    onNextStage={(a) => handleNextStage(a)}
    onAddRound={(a) => handleAddInterviewRound(a)}
    // NEW PROPS
    onSelected={handleSelected}
    onRejected={handleRejected}
    onMoveToRound={handleMoveToRound}
    availableRounds={['HR Round', 'Tech Round', 'Final Round']}
/>
```

---

## Component Render Order in CandidateRow

```
1. Candidate Profile Row
   ↓
2. Target Role & Application ID
   ↓
3. Pipeline Status Chip
   ↓
4. Resume View Button
   ↓
5. [PART 1] Interview Details in Shortlisted (if interview exists)
   OR
   Schedule Interview Button (if no interview in Shortlisted)
   ↓
6. [PART 1] Interview Details in Interview/HR Round tabs
   ↓
7. [PART 2] Status Action Row (Interview tab ONLY)
   - SELECTED button
   - REJECTED button
   - MOVE TO ROUND dropdown
   ↓
8. Action Row (Existing - Status footer)
```

---

## Button Styling Classes

### SELECTED Button (Green/Emerald)
```jsx
className="flex items-center justify-center gap-2 py-3 px-4 
           bg-emerald-600 text-white rounded-xl text-[10px] 
           font-black uppercase tracking-widest 
           hover:bg-emerald-700 hover:shadow-lg shadow-emerald-200 
           transition-all active:scale-95 border border-emerald-600"
```

### REJECTED Button (Red/Rose)
```jsx
className="flex items-center justify-center gap-2 py-3 px-4 
           bg-rose-600 text-white rounded-xl text-[10px] 
           font-black uppercase tracking-widest 
           hover:bg-rose-700 hover:shadow-lg shadow-rose-200 
           transition-all active:scale-95 border border-rose-600"
```

### MOVE TO ROUND Button (Blue/Indigo)
```jsx
className="w-full flex items-center justify-center gap-2 py-3 px-4 
           bg-indigo-600 text-white rounded-xl text-[10px] 
           font-black uppercase tracking-widest 
           hover:bg-indigo-700 hover:shadow-lg shadow-indigo-200 
           transition-all active:scale-95 border border-indigo-600"
```

---

## Status Mapping for Colors

After status update, candidate shows:

| Status | Color | Tab Location |
|--------|-------|--------------|
| Selected | Emerald (Green) | HR Round |
| Rejected | Rose (Red) | Rejected |
| HR Round | Indigo (Blue) | HR Round |
| Tech Round | Purple | Tech Round |
| Final Round | Purple | Final Round |
| Interview | Purple | Interview |
| Shortlisted | Amber (Yellow tag) | Shortlisted |

---

## Test Cases

### Scenario 1: Interview Scheduled in Shortlisted Tab
1. Navigate to SHORTLISTED tab
2. Find candidate with interview data
3. ✅ Should see interview details card with "Shortlisted" tag
4. ✅ Should NOT see "Schedule Interview" button

### Scenario 2: Interview Actions
1. Navigate to INTERVIEW tab
2. See candidate with scheduled interview
3. ✅ Action buttons appear below interview details
4. Click SELECTED → Moves to HR Round with green badge
5. Click REJECTED → Moves to Rejected tab with red badge
6. Click MOVE TO ROUND → Dropdown shows available rounds

### Scenario 3: Status Updates
1. Click SELECTED on a candidate
2. Confirm in dialog
3. ✅ Page refreshes automatically
4. ✅ Candidate moves to HR Round tab
5. ✅ Status shows "Selected — Processed on {date}"
6. ✅ Green badge visible

---

## Available Rounds Configuration

Default rounds in dropdown:
```javascript
availableRounds={['HR Round', 'Tech Round', 'Final Round']}
```

To customize, modify in Applicants.jsx:
```jsx
<CandidateRow
    // ...
    availableRounds={['HR Round', 'Tech Round', 'Final Round', 'Custom Round']}
/>
```

---

## Dependencies

All components use existing imports:
- `react` - React hooks (useState)
- `lucide-react` - Icons (CheckCircle, XCircle, ChevronDown, ChevronRight)
- `dayjs` - Date formatting (for interview dates)

No additional npm packages required!

---

## Error Handling

All handlers include:
- ✅ Confirmation dialogs before status change
- ✅ Error toast messages if API fails
- ✅ Success toast messages after update
- ✅ Automatic page reload via `loadApplicants()`
- ✅ Return value (`success`) to confirm execution

---

## Performance Considerations

1. **Conditional Rendering**: Components only render when needed
   - StatusActionRow only in Interview tab
   - Interview details conditionally shown

2. **No Additional API Calls**: Uses existing `updateStatus()` function

3. **Minimal Re-renders**: Uses existing React state management

4. **Smooth Animations**: CSS animations, no performance impact

---

## Browser Compatibility

✅ Chrome/Edge (Latest)
✅ Firefox (Latest)
✅ Safari (Latest)
✅ Mobile Browsers (iOS Safari, Chrome Mobile)

---

**Version**: 1.0  
**Status**: Production Ready  
**Last Updated**: January 22, 2026
