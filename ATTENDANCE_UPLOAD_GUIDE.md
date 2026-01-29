# Attendance Excel Upload Guide

## Overview
The Attendance History module now supports bulk importing attendance records from Excel files. This allows HR administrators to upload multiple attendance records at once.

## How to Use

### 1. **Access the Upload Feature**
   - Navigate to HR → Attendance History
   - Click the **"Upload Excel"** button in the top right corner
   - A modal will open with file upload options

### 2. **Prepare Your Excel File**
   Your Excel file MUST contain the following columns (exact names or similar):
   - **Employee ID** - Employee ID or custom ID
   - **Date** - Date of attendance (any common date format)
   - **Status** - Attendance status (present, absent, leave, holiday, weekly_off, half_day, missed_punch)
   - **Check In** - Check-in time (optional, any datetime format)
   - **Check Out** - Check-out time (optional, any datetime format)

### 3. **Valid Status Values**
   ```
   - present      (Employee was present)
   - absent       (Employee was absent)
   - leave        (Employee took leave)
   - holiday      (Public holiday)
   - weekly_off   (Weekly off day)
   - half_day     (Employee worked half day)
   - missed_punch (Employee missed punch)
   ```

### 4. **Upload Process**
   1. Click the upload area or drag and drop your Excel file
   2. The system will validate the file:
      - Check file format (.xlsx, .xls, or .csv)
      - Verify required columns exist
      - Preview first 5 records
   3. If validation passes, click **"Upload Records"**
   4. The system will process each record and display results

### 5. **Column Name Flexibility**
   The system is flexible with column names. These are all recognized:
   - Employee ID: `Employee ID`, `Employee_ID`, `EmpID`, `ID`, `Code`
   - Date: `Date`, `Attendance Date`, `Punch Date`, `Date`
   - Status: `Status`
   - Check In: `Check In`, `CheckIn`, `Punch In`, `In`, `checkin`
   - Check Out: `Check Out`, `CheckOut`, `Punch Out`, `Out`, `checkout`

### 6. **Response & Confirmation**
   After upload:
   - System shows success count
   - Any errors are listed with row numbers
   - Attendance data is automatically refreshed
   - Modal closes and data updates in real-time

## Example Excel Format

| Employee ID | Date       | Status  | Check In        | Check Out       |
|------------|-----------|---------|-----------------|-----------------|
| EMP001    | 2026-01-01| present | 09:00:00       | 18:00:00       |
| EMP002    | 2026-01-01| absent  |                |                |
| EMP003    | 2026-01-01| leave   |                |                |
| EMP004    | 2026-01-02| present | 09:15:00       | 17:45:00       |
| EMP005    | 2026-01-02| half_day| 14:00:00       | 18:00:00       |

## Error Handling

### Common Errors & Solutions

1. **"Excel file required alert"**
   - Make sure you selected a file
   - File format must be .xlsx, .xls, or .csv
   - File must not be empty

2. **"Missing required columns"**
   - Verify your file has: Employee ID, Date, Status, Check In, Check Out columns
   - Column names don't need to be exact but should include the key words

3. **"Employee not found"**
   - Employee ID in the file doesn't exist in the system
   - Check the exact Employee ID format used in your HRMS

4. **"Invalid date format"**
   - Use standard date formats: YYYY-MM-DD, MM/DD/YYYY, or other common formats
   - Excel serial dates are automatically converted

5. **"Invalid status"**
   - Use only the valid status values listed above
   - Invalid statuses default to 'present'

## Tips & Best Practices

✅ **DO:**
- Keep Employee IDs exactly as they appear in the system
- Use consistent date formats
- Validate data before uploading
- Upload in batches if you have large files (>1000 records)

❌ **DON'T:**
- Leave required columns empty
- Use custom status values
- Include duplicate rows for same date+employee
- Upload without previewing first

## Technical Details

### File Size Limit
- Maximum file size: No hard limit, but test with large files
- Recommended: Process files with 100-500 records at a time

### Processing Time
- ~1-2 seconds per 100 records
- Large files may take longer

### Data Validation
- Duplicate entries for same date+employee are updated, not duplicated
- Invalid data is skipped with error message
- Partial uploads are possible (some records succeed, some fail)

## Support

If you encounter issues:
1. Check error messages in the response
2. Verify file format and column names
3. Ensure all Employee IDs exist in the system
4. Contact IT support with sample Excel file

---
**Last Updated:** January 19, 2026
