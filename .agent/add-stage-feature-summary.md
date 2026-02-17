# Add Stage to Recruitment Pipeline - Feature Summary

## Overview
Implemented a feature that allows HR users to dynamically add new stages to the recruitment pipeline from the UI without affecting existing candidate data or progress.

## Implementation Details

### Backend Changes

#### 1. Controller Function (`requirement.controller.js`)
- **Function**: `addStageToWorkflow`
- **Route**: `POST /api/requirements/:jobId/add-stage`
- **Logic**:
  - Validates stage name input
  - Checks if stage already exists
  - Inserts new stage **before "Finalized"** to maintain logical order
  - If no "Finalized" stage exists, appends at the end
  - Saves updated workflow to database
  - Returns updated workflow array

#### 2. Route Registration (`requirement.routes.js`)
- Added route: `router.post('/:jobId/add-stage', reqCtrl.addStageToWorkflow)`
- Protected by authentication and HR role middleware

### Frontend Changes

#### 1. State Management (`Applicants.jsx`)
Added three new state variables:
```javascript
const [showAddStageModal, setShowAddStageModal] = useState(false);
const [newStageNameInput, setNewStageNameInput] = useState('');
const [isAddingStage, setIsAddingStage] = useState(false);
```

#### 2. Handler Function
- **Function**: `handleAddStageToWorkflow`
- **Functionality**:
  - Validates input
  - Calls backend API
  - Refreshes requirements list
  - Updates current selection
  - Shows success/error toast notifications
  - Resets modal state

#### 3. UI Components

##### Add Stage Button
- Located on the **right side** of workflow tabs
- Only visible when a job is selected
- Modern design with dashed border and hover effects
- Icon: Plus icon from Lucide React

##### Add Stage Modal
- **Features**:
  - Clean, modern design with gradient header
  - Input field with Enter key support
  - Info box explaining the behavior
  - Loading state with spinner
  - Validation (disabled when empty or loading)
  
- **User Experience**:
  - Auto-focus on input field
  - Enter key to submit
  - Clear error messages
  - Success confirmation

## Key Features

### ✅ Data Safety
- **No data loss**: Existing candidates remain in their current stages
- **No reordering**: Existing stages maintain their order
- **Append only**: New stage is added before "Finalized" or at the end

### ✅ User Experience
- **Visual feedback**: Loading states, success/error toasts
- **Validation**: Prevents duplicate stages and empty names
- **Keyboard support**: Enter key to submit
- **Responsive**: Works on all screen sizes

### ✅ Business Logic
- Stage is inserted before "Finalized" to maintain workflow logic
- Candidates can be manually moved to the new stage
- New applicants will see the updated workflow

## Usage Flow

1. **HR selects a job** from the dropdown
2. **Workflow tabs appear** showing current pipeline stages
3. **HR clicks "+ Add Stage"** button on the right
4. **Modal opens** with input field
5. **HR enters stage name** (e.g., "Manager Approval")
6. **HR clicks "Add Stage"** or presses Enter
7. **Backend validates and saves** the new stage
8. **UI refreshes** showing the new stage in the pipeline
9. **HR can now move candidates** to this new stage

## Example Workflow Transformation

**Before:**
```
Applied → Shortlisted → Interview → HR Round → Finalized
```

**After adding "Manager Approval":**
```
Applied → Shortlisted → Interview → HR Round → Manager Approval → Finalized
```

## API Endpoint

### POST `/api/requirements/:jobId/add-stage`

**Request Body:**
```json
{
  "stageName": "Manager Approval"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Stage added successfully",
  "workflow": ["Applied", "Shortlisted", "Interview", "HR Round", "Manager Approval", "Finalized"]
}
```

**Error Responses:**
- `400`: Stage name is required
- `400`: Stage already exists in workflow
- `404`: Job not found
- `500`: Server error

## Testing Checklist

- [ ] Add stage with valid name
- [ ] Try to add duplicate stage (should fail)
- [ ] Try to add empty stage (should fail)
- [ ] Verify stage appears in correct position
- [ ] Verify existing candidates are unaffected
- [ ] Verify new stage appears in dropdown for moving candidates
- [ ] Test on different screen sizes
- [ ] Test keyboard navigation (Enter key)
- [ ] Test loading states
- [ ] Test error handling

## Files Modified

### Backend
1. `c:\HRMS\backend\controllers\requirement.controller.js` - Added `addStageToWorkflow` function
2. `c:\HRMS\backend\routes\requirement.routes.js` - Added route registration

### Frontend
1. `c:\HRMS\frontend\src\pages\HR\Applicants.jsx` - Added UI, state, and handler logic

## Dependencies
- No new dependencies required
- Uses existing UI components (Modal from Ant Design)
- Uses existing icons (Lucide React)
- Uses existing API utilities

## Future Enhancements (Optional)
- Drag-and-drop to reorder stages
- Delete custom stages
- Edit stage names
- Stage templates
- Stage-specific configurations (e.g., required documents, approvers)
