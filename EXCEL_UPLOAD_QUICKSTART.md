# Excel Upload - Quick Start Guide

## 🚀 Get Started in 2 Minutes

### What This Does
Upload multiple attendance records at once from an Excel file instead of entering them manually.

---

## 📥 How to Upload

### Step 1: Open Attendance Dashboard
```
Navigate to: HR Menu → Attendance → Dashboard Tab
```

### Step 2: Click "Upload Excel"
- Button located in top-right corner
- Only visible in Dashboard view

### Step 3: Select Your File
- Choose `.xlsx` or `.xls` file
- Should have columns: Employee ID, Date, Status, Check In, Check Out

### Step 4: Review Preview
- Check first 10 rows look correct
- Verify data is properly formatted
- Click "Cancel" if anything looks wrong

### Step 5: Click "Confirm Upload"
- Shows loading spinner
- Backend processes all records
- Success/error message appears

### Step 6: Done! 
Dashboard auto-refreshes with new records

---

## 📋 Excel File Format

### Minimum Columns Required
```
Employee ID | Date | Status | Check In | Check Out
```

### Example Data
```
CYB001-IT-001 | 15-01-2026 | PRESENT | 09:00:00 | 18:00:00
CYB001-IT-001 | 16-01-2026 | ABSENT  | --       | --
CYB001-IT-002 | 15-01-2026 | PRESENT | 09:30:00 | 17:30:00
```

### Column Names (Flexible - Case Insensitive)
- **Employee ID:** `EMPLOYEE ID`, `emp_id`, `ID`, `Code`
- **Date:** `DATE`, `Attendance Date`, `Punch Date`
- **Status:** `STATUS`, `Status`
- **Check In:** `CHECK IN`, `CHECKIN`, `Check In Time`
- **Check Out:** `CHECK OUT`, `CHECKOUT`, `Check Out Time`

### Allowed Status Values
- `present` / `PRESENT`
- `absent` / `ABSENT`  
- `leave` / `LEAVE`
- `half_day` / `HALF_DAY`
- `missed_punch` / `MISSED_PUNCH`
- `holiday` / `HOLIDAY`
- `weekly_off` / `WEEKLY_OFF`

### Time Formats Accepted
1. **HH:MM:SS** (e.g., `09:30:00`) ✅
2. **Decimal** (e.g., `0.41666...`) ✅
3. **Excel Time** (automatically converted) ✅

### Date Formats Accepted
1. **DD-MM-YYYY** (e.g., `15-01-2026`) ✅
2. **YYYY-MM-DD** (e.g., `2026-01-15`) ✅
3. **Excel Date Format** (automatically converted) ✅

---

## 💡 Tips

### Tip 1: Time Conversion
If your times show as decimals like `0.041666`, they'll automatically convert to `01:00:00`.

### Tip 2: Download Template
Create your Excel file with these columns:
```
A: EMPLOYEE ID
B: EMPLOYEE NAME
C: DATE
D: STATUS
E: CHECK IN
F: CHECK OUT
G: WORKING HOURS
H: IS LATE
```

### Tip 3: Batch Upload
You can upload 1000+ records at once (recommended: 1000-5000 per file).

### Tip 4: Error Recovery
If some records fail:
- Fix errors in Excel
- Upload again
- Successfully uploaded records won't duplicate
- Failed records get reported with row numbers

---

## ❌ Common Issues & Solutions

### Issue: "Employee not found with ID: XYZ"
**Solution:** Make sure employee exists in system with exact ID

### Issue: "Invalid date format"
**Solution:** Use DD-MM-YYYY or YYYY-MM-DD format

### Issue: Times showing as decimals
**Solution:** Convert to HH:MM:SS or let system auto-convert

### Issue: File won't upload
**Solution:** 
- Use `.xlsx` format (not `.csv` or `.txt`)
- Check file size < 10MB
- Ensure column names match expected format

---

## 📊 What Gets Uploaded

Each record creates/updates:
- ✅ Employee attendance for date
- ✅ Check-in time
- ✅ Check-out time
- ✅ Status (Present/Absent/etc.)
- ✅ Working hours calculated
- ✅ Late/Early indicators

---

## ✨ Preview Modal

Before confirming upload, you see:
1. **File name:** "NewAttendance.xlsx"
2. **Total records:** "5 records found"
3. **Data table:** First 10 rows
4. **Converted data:** Times already formatted
5. **Action buttons:** Cancel or Confirm

---

## 📞 Need Help?

**Check the detailed guide:** EXCEL_UPLOAD_COMPLETE.md

**Common questions:**
- How to format my file? → See Excel File Format section
- What if some records fail? → See Error Recovery section
- Can I upload part of the file? → Yes, failed rows can be fixed and re-uploaded

---

## ✅ Success Checklist

Before uploading, ensure:
- [ ] All employee IDs exist in system
- [ ] Dates are in correct format (DD-MM-YYYY)
- [ ] Times are valid (09:00 to 18:00 range acceptable)
- [ ] Status values are from allowed list
- [ ] No duplicate entries for same date+employee
- [ ] File is `.xlsx` or `.xls` format
- [ ] File size < 10MB

---

## 🎯 Typical Workflow

```
Monday: Download previous week's attendance data
        ↓
Tuesday: Fix any corrections needed
         ↓
Wednesday: Upload corrected file to system
           ↓
Thursday: Verify all records in dashboard
          ↓
Friday: System calculates pay based on attendance
```

---

## 💾 Example Files

### Simple Upload (5 records)
```xlsx
Employee ID | Employee Name | Date | Status | Check In | Check Out
CYB001-001 | Jayesh P. | 15-01-2026 | PRESENT | 09:00:00 | 18:00:00
CYB001-002 | Harsh S. | 15-01-2026 | PRESENT | 09:30:00 | 17:30:00
CYB001-003 | Priya K. | 15-01-2026 | ABSENT | -- | --
CYB001-001 | Jayesh P. | 16-01-2026 | PRESENT | 09:00:00 | 18:00:00
CYB001-002 | Harsh S. | 16-01-2026 | LEAVE | -- | --
```

### Complex Upload (with variations)
```xlsx
emp_id | name | attendance_date | att_status | punch_in | punch_out | hours | late
CYB001-001 | Jayesh | 2026-01-15 | PRESENT | 0.041666 | 0.75 | 9 | NO
CYB001-002 | Harsh | 2026-01-15 | PRESENT | 09:30:00 | 18:00:00 | 8.5 | YES
CYB001-003 | Priya | 2026-01-15 | HALF_DAY | 14:00:00 | 18:00:00 | 4 | NO
```

Both work perfectly! Flexibility in column names and formats.

---

## 🔒 Security

- Only HR/Admin can upload
- Your data is encrypted
- Every upload is logged
- Can be audited anytime

---

## 🚀 Ready to Upload?

1. Prepare Excel file with attendance data
2. Go to: HR → Attendance → Dashboard
3. Click "Upload Excel"
4. Select your file
5. Review preview
6. Click "Confirm Upload"
7. ✅ Done!

---

**Version:** 1.0  
**Last Updated:** January 31, 2026  
**Need Help?** Check EXCEL_UPLOAD_COMPLETE.md for detailed documentation
