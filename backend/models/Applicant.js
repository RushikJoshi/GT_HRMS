const mongoose = require('mongoose');

const ApplicantSchema = new mongoose.Schema({
  requirementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Link to created employee
  isOnboarded: { type: Boolean, default: false }, // Track if onboarding is complete

  // Personal Details
  salutation: { type: String, trim: true }, // e.g., Mr., Ms.
  name: { type: String, trim: true, required: true },
  fatherName: { type: String, trim: true },
  email: { type: String, trim: true, required: true, lowercase: true },
  mobile: { type: String, trim: true, required: true },
  emergencyContact: { type: String, trim: true },
  dob: { type: Date },
  workLocation: { type: String, trim: true },
  address: { type: String, trim: true },

  // Professional Details
  department: { type: String, trim: true },
  location: { type: String, trim: true },
  intro: { type: String, trim: true },
  experience: { type: String, trim: true },
  relevantExperience: { type: String, trim: true },
  currentCompany: { type: String, trim: true },
  currentDesignation: { type: String, trim: true },
  currentlyWorking: { type: Boolean, default: false },
  noticePeriod: { type: Boolean, default: false },
  currentCTC: { type: String, trim: true },
  takeHome: { type: String, trim: true },
  expectedCTC: { type: String, trim: true },
  isFlexible: { type: Boolean, default: false },
  hasOtherOffer: { type: Boolean, default: false },
  relocate: { type: Boolean, default: false },
  reasonForChange: { type: String, trim: true },
  linkedin: { type: String, trim: true },

  resume: { type: String, trim: true },

  // AI Parsing Fields
  rawOCRText: { type: String }, // Raw text from Tesseract
  aiParsedData: { type: Object }, // JSON from AI (Education, Exp, etc.)
  matchPercentage: { type: Number, default: 0 },
  parsedSkills: [{ type: String }],
  parsingStatus: { type: String, enum: ['Pending', 'Processing', 'Completed', 'Failed'], default: 'Pending' },

  status: { type: String, default: 'Applied' },
  timeline: [
    {
      status: String,
      message: String,
      updatedBy: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],

  offerLetterPath: { type: String },
  offerRefCode: { type: String },
  joiningLetterPath: { type: String },
  joiningDate: { type: Date },

  interview: {
    date: { type: Date },
    time: { type: String },
    mode: { type: String, enum: ['Online', 'Offline'] },
    location: { type: String },
    interviewerName: { type: String },
    notes: { type: String },
    stage: { type: String },
    completed: { type: Boolean, default: false }
  },

  // New Snapshot-based Payroll Reference
  salaryTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryTemplate' },
  salarySnapshot: {
    basicMonthly: Number,
    hraMonthly: Number,
    grossA: Number,
    gratuity: Number,
    grossB: Number,
    employerContributions: Number,
    ctcMonthly: Number,
    ctcYearly: Number,
    takeHomeMonthly: Number,
    breakdown: Object,
    generatedAt: Date
  },
  salaryAssigned: { type: Boolean, default: false },
  salaryLocked: { type: Boolean, default: false },
  salarySnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeSalarySnapshot', default: null },

  customDocuments: [{
    name: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number },
    fileType: { type: String },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verifiedBy: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String }
  }],

  reviews: [{
    stage: { type: String },
    rating: { type: Number, min: 0, max: 5 },
    feedback: { type: String, trim: true },
    scorecard: { type: Object },
    interviewerName: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],

  // ═══════════════════════════════════════════════════════════════════
  // PROFESSIONAL REFERENCES
  // ═══════════════════════════════════════════════════════════════════
  references: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    designation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    relationship: {
      type: String,
      required: true,
      enum: [
        'Reporting Manager',
        'Team Lead',
        'HR Manager',
        'Senior Colleague',
        'Mentor',
        'Professor',
        'Client',
        'Other'
      ]
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9+\-\s()]{10,15}$/
    },
    yearsKnown: {
      type: String,
      enum: ['< 1 year', '1-2 years', '2-5 years', '5+ years', null],
      default: null
    },
    consentToContact: {
      type: Boolean,
      default: true
    },
    // HR Verification Fields
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Contacted', 'Verified', 'Failed'],
      default: 'Pending'
    },
    verificationNotes: {
      type: String,
      trim: true
    },
    verifiedBy: {
      type: String,
      trim: true
    },
    verifiedAt: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Fresher exemption fields
  isFresher: {
    type: Boolean,
    default: false
  },
  noReferenceReason: {
    type: String,
    enum: ['Fresher - No Work Experience', 'References disabled', 'Other', null],
    default: null
  },

  customData: { type: mongoose.Schema.Types.Mixed },

  salaryHistory: [{
    version: Number,
    effectiveFrom: Date,
    totalCTC: Number,
    grossA: Number,
    grossB: Number,
    grossC: Number,
    components: [Object],
    incrementType: String,
    reason: String,
    notes: String,
    status: String,
    isActive: Boolean,
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

});

ApplicantSchema.index({ requirementId: 1, status: 1 });
ApplicantSchema.index({ email: 1 });

module.exports = ApplicantSchema;