# SEO Settings Feature - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND APPLICATION                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   RootRouter.jsx                                 │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │  Routes:                                                 │  │  │
│  │  │  - /hrms/* → HrmsRoutes                                  │  │  │
│  │  │  - /careers/:tenantId → PublicCareerPage (NEW)          │  │  │
│  │  │  - /jobs/* → JobPortalRoutes                            │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                CareerBuilder.jsx (UPDATED)                       │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │  Left Panel          Center Panel         Right Panel      │ │  │
│  │  │  ────────────        ──────────────       ───────────      │ │  │
│  │  │  CareerLayerPanel   CareerPreview      CareerEditorPanel   │ │  │
│  │  │  (Sections list)    (Live Preview)     (Section Settings)  │ │  │
│  │  │                                       or                    │ │  │
│  │  │                                    SEOSettings (NEW)        │ │  │
│  │  │                                    (SEO Fields)             │ │  │
│  │  │                                                              │ │  │
│  │  │  Toolbar:                                                   │ │  │
│  │  │  [Back] [🔍 SEO Settings] [View Live] [Publish Live]      │ │  │
│  │  │                   ↓                                         │ │  │
│  │  │           Toggles showSEOPanel                             │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              SEOSettings.jsx (NEW COMPONENT)                    │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ Input Fields:                                              │ │  │
│  │  │  • Title (70 chars max) with counter                      │ │  │
│  │  │  • Description (160 chars max) with counter               │ │  │
│  │  │  • Keywords (tag input system)                            │ │  │
│  │  │  • Slug (validation: lowercase/numbers/hyphens)           │ │  │
│  │  │  • OG Image (file upload with preview)                   │ │  │
│  │  │                                                            │ │  │
│  │  │ Features:                                                  │ │  │
│  │  │  ✓ Real-time validation                                   │ │  │
│  │  │  ✓ Error messages                                         │ │  │
│  │  │  ✓ Live preview modal                                     │ │  │
│  │  │  ✓ Character counters                                     │ │  │
│  │  │  ✓ Save button (enabled/disabled based on validation)     │ │  │
│  │  │                                                            │ │  │
│  │  │ Events:                                                    │ │  │
│  │  │  • onSaveSEO() → handleSaveSEO() → POST /customize       │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │            PublicCareerPage.jsx (NEW COMPONENT)                 │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ Route: /careers/:tenantId                                  │ │  │
│  │  │                                                            │ │  │
│  │  │ On Load:                                                  │ │  │
│  │  │  1. Fetch from /api/public/career-customization/:id      │ │  │
│  │  │  2. Inject meta tags into document head                  │ │  │
│  │  │  3. Render CareerPreview (non-builder mode)              │ │  │
│  │  │                                                            │ │  │
│  │  │ Meta Tags Injected:                                       │ │  │
│  │  │  • <title>                                                │ │  │
│  │  │  • <meta name="description">                              │ │  │
│  │  │  • <meta name="keywords">                                 │ │  │
│  │  │  • <meta property="og:*">                                 │ │  │
│  │  │  • <link rel="canonical">                                 │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
                    API Communication (REST)
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API SERVER                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              career.controller.js (UPDATED)                     │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ Exports:                                                   │ │  │
│  │  │                                                            │ │  │
│  │  │ 1. getCustomization()                                     │ │  │
│  │  │    GET /hrms/hr/career/customize                          │ │  │
│  │  │    Returns: Draft config with seoSettings                 │ │  │
│  │  │                                                            │ │  │
│  │  │ 2. saveCustomization() [UNCHANGED]                        │ │  │
│  │  │    POST /hrms/hr/career/customize                         │ │  │
│  │  │    Saves: Full config (sections, theme, seoSettings)      │ │  │
│  │  │    To: draftCareerPage in CompanyProfile.meta             │ │  │
│  │  │                                                            │ │  │
│  │  │ 3. publishCustomization() [UPDATED]                       │ │  │
│  │  │    POST /hrms/hr/career/publish                           │ │  │
│  │  │    Input: config { sections, theme, seoSettings }         │ │  │
│  │  │    Process:                                               │ │  │
│  │  │      a. Extract seoSettings                               │ │  │
│  │  │      b. Generate metaTags object:                         │ │  │
│  │  │         - Plain text fields                               │ │  │
│  │  │         - HTML meta tag strings                           │ │  │
│  │  │      c. Store metaTags + config in DB                     │ │  │
│  │  │      d. Return response with metaTags                     │ │  │
│  │  │    Returns:                                               │ │  │
│  │  │      {                                                    │ │  │
│  │  │        success: true,                                     │ │  │
│  │  │        message: "...with SEO meta tags",                  │ │  │
│  │  │        livePage: {...},                                   │ │  │
│  │  │        metaTags: {...},                                   │ │  │
│  │  │        publishedAt: timestamp                             │ │  │
│  │  │      }                                                    │ │  │
│  │  │                                                            │ │  │
│  │  │ 4. getPublicCustomization()                               │ │  │
│  │  │    GET /api/public/career-customization/:tenantId         │ │  │
│  │  │    Returns: Full careerCustomization with metaTags        │ │  │
│  │  │                                                            │ │  │
│  │  │ Helper:                                                   │ │  │
│  │  │ • escapeHTML() - XSS protection for meta tag values       │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              public.controller.js [UNCHANGED]                   │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ getCareerCustomization()                                   │ │  │
│  │  │ GET /api/public/career-customization/:tenantId             │ │  │
│  │  │ Returns: careerCustomization with metaTags                 │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
                     Database Communication
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                          MONGODB DATABASE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CompanyProfile.meta = {                                               │
│    draftCareerPage: {                                                   │
│      sections: [...],                                                  │
│      theme: {...},                                                     │
│      seoSettings: {                        ← Saved by saveCustomize     │
│        seo_title: "...",                                               │
│        seo_description: "...",                                         │
│        seo_keywords: [...],                                            │
│        seo_slug: "...",                                                │
│        seo_og_image: "base64..."                                       │
│      },                                                                │
│      updatedAt: timestamp                                              │
│    },                                                                  │
│    careerCustomization: {                                              │
│      sections: [...],                                                  │
│      theme: {...},                                                     │
│      seoSettings: {...},                   ← Copied from draft         │
│      metaTags: {                           ← Generated by publish      │
│        title: "...",                                                   │
│        description: "...",                                             │
│        keywords: "...",                                                │
│        ogTitle: "...",                                                 │
│        ogImage: "...",                                                 │
│        canonical: "...",                                               │
│        metaTags: {                                                     │
│          title: "<title>...</title>",                                  │
│          description: "<meta...>",                                     │
│          ...all HTML meta tags...                                      │
│        }                                                               │
│      },                                                                │
│      publishedAt: timestamp,                                           │
│      isPublished: true                                                 │
│    }                                                                   │
│  }                                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Sequence

### Scenario 1: HR Editing & Saving SEO (Draft)

```
User in Career Builder
         ↓
Clicks "🔍 SEO Settings" button
         ↓
showSEOPanel = true (toggle state)
         ↓
Right panel shows SEOSettings component
         ↓
User fills in SEO fields:
  - Title: "Join Our Team" (30/70 chars)
  - Description: "Explore careers..." (45/160 chars)
  - Keywords: ["jobs", "careers"]
  - Slug: "careers"
  - OG Image: uploads image.jpg
         ↓
Client-side validation:
  ✓ Title length check
  ✓ Description length check
  ✓ Slug regex check
  ✓ Image format check
  ✓ No errors found
         ↓
Clicks "Save SEO Settings" button
         ↓
handleSaveSEO() called
         ↓
POST /hrms/hr/career/customize
  Body: {
    sections: [...existing...],
    theme: {...existing...},
    seoSettings: {
      seo_title: "Join Our Team",
      seo_description: "Explore careers...",
      seo_keywords: ["jobs", "careers"],
      seo_slug: "careers",
      seo_og_image: "base64string..."
    }
  }
         ↓
Backend: saveCustomization()
  - Saves to CompanyProfile.meta.draftCareerPage
         ↓
Frontend: Toast message
  "SEO settings saved successfully!"
         ↓
State updated: config.seoSettings = new data
         ↓
Ready to publish
```

### Scenario 2: HR Publishing with SEO

```
User in Career Builder
User clicks "Publish Live" button
         ↓
handlePublish() called
         ↓
Validation Check:
  ✓ seo_title present?
  ✓ seo_description present?
  ✓ seo_slug present?
         ↓
If validation FAILS:
  - Show warning: "SEO fields required before publishing"
  - showSEOPanel = true (auto-toggle)
  - Stop execution
         ↓
If validation PASSES:
  - Continue with publish
  - setPublishing = true (show spinner)
         ↓
POST /hrms/hr/career/publish
  Body: {
    sections: [...],
    theme: {...},
    seoSettings: {...}
  }
         ↓
Backend: publishCustomization()
  Step 1: Extract seoSettings
    seoSettings = req.body.seoSettings
         ↓
  Step 2: Generate metaTags
    metaTags = {
      title: "Join Our Team",
      description: "Explore careers...",
      keywords: "jobs, careers",
      ogTitle: "Join Our Team",
      ogImage: "base64string...",
      canonical: "https://domain.com/careers/careers",
      metaTags: {
        title: "<title>Join Our Team</title>",
        description: '<meta name="description" content="Explore careers...">',
        keywords: '<meta name="keywords" content="jobs, careers">',
        ogTitle: '<meta property="og:title" content="Join Our Team">',
        ogImage: '<meta property="og:image" content="base64string...">',
        ogType: '<meta property="og:type" content="website">',
        ogUrl: '<meta property="og:url" content="...">',
        twitterCard: '<meta name="twitter:card" content="summary_large_image">',
        canonical: '<link rel="canonical" href="...">'
      }
    }
         ↓
  Step 3: Update database
    CompanyProfile.meta.careerCustomization = {
      sections: [...],
      theme: {...},
      seoSettings: {...},
      metaTags: metaTags,
      publishedAt: timestamp,
      isPublished: true
    }
         ↓
  Step 4: Return response
    Response: {
      success: true,
      message: "Career page published successfully with SEO meta tags",
      livePage: {...},
      metaTags: metaTags,
      publishedAt: timestamp
    }
         ↓
Frontend: handlePublish()
  - setPublishing = false
  - Show success toast
  - "Career Page Published Live with SEO Meta Tags!"
```

### Scenario 3: Public Access & Meta Tag Injection

```
Job Seeker visits: https://domain.com/careers/my-company
         ↓
Route: /careers/:tenantId
Component: PublicCareerPage
         ↓
useEffect() runs on mount
         ↓
Fetch: GET /api/public/career-customization/my-company
         ↓
Backend: getCareerCustomization()
  - Resolve tenantId to company
  - Return CompanyProfile.meta.careerCustomization
         ↓
Response: {
  sections: [...],
  theme: {...},
  seoSettings: {...},
  metaTags: {
    title: "Join Our Team",
    ...all fields...,
    metaTags: {
      title: "<title>Join Our Team</title>",
      description: "<meta name=\"description\"...>",
      ...all HTML meta tags...
    }
  },
  publishedAt: timestamp,
  isPublished: true
}
         ↓
Frontend: injectMetaTags()
  Step 1: Get all tags from metaTags.metaTags
  Step 2: For each tag:
    - Create DOM element
    - Add data-seo-tag="true" attribute
    - Append to document.head
         ↓
Step 3: Remove any duplicate tags with data-seo-tag="true"
         ↓
Result: Document head now contains:
  <title>Join Our Team</title>
  <meta name="description" content="...">
  <meta property="og:title" content="...">
  <meta property="og:image" content="...">
  ...and all other meta tags...
         ↓
Frontend: renderCareerPage()
  - Render using CareerPreview component
  - Non-builder mode (no editing)
  - Display all sections, jobs, theme
         ↓
Page fully rendered with SEO
         ↓
When shared on social media:
  - Facebook crawler sees og:title, og:image, og:description
  - Shows rich preview in share dialog
  - Twitter sees twitter:card, applies styling
  - LinkedIn sees og tags, creates preview
  - WhatsApp shows title and image thumbnail
         ↓
When searched in Google:
  - Google bot sees <title> and <meta name="description">
  - Uses them in search results
  - Shows proper title and description
  - Crawls canonical link to avoid duplicates
```

---

## Component Dependency Graph

```
RootRouter.jsx
    ├── Route: /careers/:tenantId
    │   └── PublicCareerPage.jsx
    │       ├── API: GET /api/public/career-customization/:tenantId
    │       ├── Component: CareerPreview (from CareerBuilder)
    │       └── Effects:
    │           ├── Fetch data
    │           ├── Inject meta tags
    │           ├── Render preview
    │           └── Cleanup on unmount
    │
    ├── Route: /hrms/*
    │   └── HrmsRoutes
    │       └── CareerBuilder.jsx
    │           ├── State:
    │           │   ├── config (seoSettings)
    │           │   ├── showSEOPanel
    │           │   └── savingSEO
    │           │
    │           ├── Child Components:
    │           │   ├── CareerLayerPanel (left)
    │           │   ├── CareerPreview (center)
    │           │   ├── CareerEditorPanel (right, if !showSEOPanel)
    │           │   └── SEOSettings (right, if showSEOPanel) ← NEW
    │           │
    │           ├── Functions:
    │           │   ├── handleSaveSEO()
    │           │   │   └── POST /hrms/hr/career/customize
    │           │   │
    │           │   └── handlePublish()
    │           │       ├── Validate SEO fields
    │           │       └── POST /hrms/hr/career/publish
    │           │
    │           └── API Calls:
    │               ├── GET /hrms/hr/career/customize (load draft)
    │               ├── POST /hrms/hr/career/customize (save)
    │               └── POST /hrms/hr/career/publish (publish)
    │
    └── Route: /jobs/*
        └── JobPortalRoutes
            (unchanged)
```

---

## API Request/Response Flow

### Save SEO to Draft

```
REQUEST:
POST /hrms/hr/career/customize
Content-Type: application/json
Authorization: Bearer {token}

{
  "sections": [...],
  "theme": {
    "primaryColor": "#4F46E5"
  },
  "seoSettings": {
    "seo_title": "Join Our Team",
    "seo_description": "Explore exciting career opportunities...",
    "seo_keywords": ["jobs", "careers", "hiring"],
    "seo_slug": "careers",
    "seo_og_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }
}

RESPONSE (200 OK):
{
  "success": true,
  "message": "Career page customization saved",
  "config": {
    "sections": [...],
    "theme": {...},
    "seoSettings": {...}
  }
}
```

### Publish with SEO Meta Tags

```
REQUEST:
POST /hrms/hr/career/publish
Content-Type: application/json
Authorization: Bearer {token}

{
  "sections": [...],
  "theme": {...},
  "seoSettings": {...}
}

RESPONSE (200 OK):
{
  "success": true,
  "message": "Career page published successfully with SEO meta tags",
  "livePage": {
    "sections": [...],
    "theme": {...},
    "seoSettings": {...},
    "metaTags": {...},
    "publishedAt": "2024-01-15T10:30:00Z",
    "isPublished": true
  },
  "metaTags": {
    "title": "Join Our Team",
    "description": "Explore exciting career opportunities...",
    "keywords": "jobs, careers, hiring",
    "ogTitle": "Join Our Team",
    "ogImage": "data:image/jpeg;base64,/9j/...",
    "canonical": "https://domain.com/careers/careers",
    "metaTags": {
      "title": "<title>Join Our Team</title>",
      "description": "<meta name=\"description\" content=\"Explore exciting career opportunities...\">",
      "keywords": "<meta name=\"keywords\" content=\"jobs, careers, hiring\">",
      "ogTitle": "<meta property=\"og:title\" content=\"Join Our Team\">",
      "ogImage": "<meta property=\"og:image\" content=\"data:image/jpeg;base64,/9j/...\">",
      "ogType": "<meta property=\"og:type\" content=\"website\">",
      "ogUrl": "<meta property=\"og:url\" content=\"https://domain.com/careers/careers\">",
      "twitterCard": "<meta name=\"twitter:card\" content=\"summary_large_image\">",
      "canonical": "<link rel=\"canonical\" href=\"https://domain.com/careers/careers\">"
    }
  },
  "publishedAt": "2024-01-15T10:30:00Z"
}
```

### Get Public Career Page

```
REQUEST:
GET /api/public/career-customization/my-company-tenant-id

RESPONSE (200 OK):
{
  "sections": [...],
  "theme": {...},
  "seoSettings": {
    "seo_title": "Join Our Team",
    "seo_description": "Explore exciting career opportunities...",
    "seo_keywords": ["jobs", "careers", "hiring"],
    "seo_slug": "careers",
    "seo_og_image": "data:image/jpeg;base64,..."
  },
  "metaTags": {
    "title": "Join Our Team",
    "description": "Explore exciting career opportunities...",
    "keywords": "jobs, careers, hiring",
    "ogTitle": "Join Our Team",
    "ogImage": "data:image/jpeg;base64,...",
    "canonical": "https://domain.com/careers/careers",
    "metaTags": {
      "title": "<title>Join Our Team</title>",
      "description": "<meta name=\"description\" content=\"Explore exciting career opportunities...\">",
      "keywords": "<meta name=\"keywords\" content=\"jobs, careers, hiring\">",
      "ogTitle": "<meta property=\"og:title\" content=\"Join Our Team\">",
      "ogImage": "<meta property=\"og:image\" content=\"data:image/jpeg;base64,...\">",
      "ogType": "<meta property=\"og:type\" content=\"website\">",
      "ogUrl": "<meta property=\"og:url\" content=\"https://domain.com/careers/careers\">",
      "twitterCard": "<meta name=\"twitter:card\" content=\"summary_large_image\">",
      "canonical": "<link rel=\"canonical\" href=\"https://domain.com/careers/careers\">"
    }
  },
  "publishedAt": "2024-01-15T10:30:00Z",
  "isPublished": true
}
```

---

## State Management (CareerBuilder)

```
config = {
  sections: [
    {
      id: "hero-1",
      type: "hero",
      content: {...}
    },
    ...
  ],
  theme: {
    primaryColor: "#4F46E5"
  },
  seoSettings: {                    ← NEW
    seo_title: "Join Our Team",
    seo_description: "...",
    seo_keywords: ["jobs"],
    seo_slug: "careers",
    seo_og_image: "base64..."
  }
}

showSEOPanel: boolean               ← NEW
  - true: Show SEOSettings component
  - false: Show CareerEditorPanel

savingSEO: boolean                  ← NEW
  - true: Show loading spinner
  - false: Normal state
```

---

## Validation Pipeline

```
User Input → Client Validation → Save → Backend Storage → Database
                   ↓
           ┌──────────────────┐
           │ Title Length?    │
           │ Max 70 chars     │
           └────┬─────────────┘
                ├─ YES → Continue
                └─ NO  → Show error, disable save
                
           ┌──────────────────┐
           │ Description Len? │
           │ Max 160 chars    │
           └────┬─────────────┘
                ├─ YES → Continue
                └─ NO  → Show error, disable save
                
           ┌──────────────────┐
           │ Slug Format?     │
           │ ^[a-z0-9-]*$     │
           └────┬─────────────┘
                ├─ YES → Continue
                └─ NO  → Show error, disable save
                
           ┌──────────────────┐
           │ Image Format?    │
           │ jpg,png,gif,etc  │
           └────┬─────────────┘
                ├─ YES → Continue
                └─ NO  → Show error, disable upload
                
           ┌──────────────────┐
           │ All valid?       │
           └────┬─────────────┘
                ├─ YES → Enable Save button
                └─ NO  → Disable Save button
```

---

This architecture ensures:
✅ Clean separation of concerns
✅ Scalable component design
✅ Proper data flow
✅ No breaking changes
✅ Easy to maintain and extend
