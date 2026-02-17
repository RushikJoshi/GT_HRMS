# ATS System Architecture Flow

```mermaid
graph TD
    User[Candidate] -->|Uploads Resume| API[API Endpoint: /apply]
    API -->|File Stream| Controller[Applicant Controller]
    
    subgraph "Resume Parsing Service"
        Controller -->|PDF/DOCX| Parser[ResumeParserService]
        Parser -->|Extract Text| OCR[PDF-Parse / Mammoth / Tesseract]
        Parser -->|Raw Text| AI[AI Extractor / Regular Expressions]
        AI -->|Structured JSON| Controller
    end
    
    subgraph "Matching Engine (Weighted)"
        Controller -->|Candidate Data + Job Data| Engine[MatchingEngineService]
        Engine -->|Analysis| SkillMatcher[Skill Match (40%)]
        Engine -->|Analysis| ExpMatcher[Experience Match (20%)]
        Engine -->|Analysis| SemanticMatcher[Semantic NLP Match (20%)]
        Engine -->|Analysis| EduMatcher[Education Match (10%)]
        Engine -->|Analysis| BonusMatcher[Preferred Bonus (10%)]
        
        SkillMatcher --> Score[Final Weighted Score]
        ExpMatcher --> Score
        SemanticMatcher --> Score
        EduMatcher --> Score
        BonusMatcher --> Score
    end
    
    Score -->|Match Result Object| DB[(MongoDB)]
    DB -->|Applicant Record| UI[Frontend: HR Dashboard]
    UI -->|Tooltip Display| HR[HR Manager]
```

## Data Flow
1. **Input**: Candidate uploads resume (PDF/DOCX).
2. **Extraction**: System identifies file type and uses `pdf-parse` or `mammoth` (for DOCX) to get raw text.
3. **Structuring**: AI (Gemini) or robust Regex extractors convert text to JSON (Skills, Experience, etc.).
4. **Matching**:
   - **Skills**: Jaro-Winkler fuzzy matching against Job Requirement skills.
   - **Experience**: Normalized time calculation vs Minimum requirement.
   - **Semantic**: TF-IDF/Cosine Similarity between Job Description and Resume Text.
5. **Storage**: Complete `matchResult` stored in `Applicant` document.
6. **Visualization**: React frontend displays detailed breakdown (Skills, Missing, Semantic Score).
