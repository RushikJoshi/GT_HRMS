const natural = require('natural');
const stopword = require('stopword');
const { JaroWinklerDistance } = natural;

/**
 * PRODUCTION-READY MATCHING ENGINE service
 * 
 * Implements weighted scoring:
 * 1. Skill Match → 40% (Required)
 * 2. Experience Match → 20%
 * 3. Responsibility Match (Semantic) → 20%
 * 4. Education Match → 10%
 * 5. Preferred Skills Bonus → 10%
 */
class MatchingEngineService {

    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.tfidf = new natural.TfIdf();

        // Common Synonyms Map for Tech/HR
        this.synonyms = {
            'js': 'javascript',
            'reactjs': 'react',
            'node': 'nodejs',
            'node.js': 'nodejs',
            'c++': 'cpp',
            'dot net': '.net',
            'golang': 'go',
            'aws': 'amazon web services',
            'ml': 'machine learning',
            'ai': 'artificial intelligence',
            'hr': 'human resources',
            'hrm': 'human resource management',
            'be': 'backend',
            'fe': 'frontend',
            'qa': 'quality assurance'
        };
    }

    /**
     * Normalize text for comparison
     */
    normalize(text) {
        if (!text) return '';
        let clean = text.toString().toLowerCase().trim();
        // Replace synonyms
        Object.keys(this.synonyms).forEach(key => {
            // Escape special regex characters like + or .
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedKey}\\b`, 'g');
            clean = clean.replace(regex, this.synonyms[key]);
        });
        return clean;
    }

    /**
     * Calculate comprehensive match score
     * @param {Object} resumeData - Structured data from parser (skills, experience, education, rawText)
     * @param {Object} job - Requirement document (requiredSkills, preferredSkills, minExperience, etc.)
     */
    calculateMatch(resumeData, job) {
        console.log(`[MatchingEngine] Calculating score for Job: ${job?.jobTitle || 'Unknown'}`);
        console.log(`[MatchingEngine] Input Resume Data:`, JSON.stringify({
            name: resumeData?.fullName,
            skillsCount: resumeData?.skills?.length || 0,
            exp: resumeData?.totalExperience,
            hasRawText: !!resumeData?.rawText
        }));

        if (!resumeData || (!resumeData.skills && !resumeData.rawText)) {
            console.error("[MatchingEngine] CRITICAL: Received empty or invalid resume data for matching.");
        }

        const results = {
            matchPercentage: 0,
            matchedSkills: [],
            missingSkills: [],
            experienceScore: 0,
            responsibilitySimilarity: 0,
            educationMatch: false,
            preferredSkillBonus: 0,
            finalScoreBreakdown: {},
            recommendation: "Low Fit"
        };

        // 1. SKILL MATCH (40%) - Required Skills
        const skillRes = this.calculateSkillMatch(resumeData.skills || [], job.requiredSkills || []);
        results.matchedSkills = skillRes.matched;
        results.missingSkills = skillRes.missing;
        const skillScoreWeighted = skillRes.percentage * 0.40;

        // 2. EXPERIENCE MATCH (20%)
        const expRes = this.calculateExperienceScore(resumeData.totalExperience, job.minExperienceMonths || 0);
        results.experienceScore = expRes.score;
        const expScoreWeighted = expRes.score * 0.20;

        // 3. RESPONSIBILITY MATCH (20%) - Semantic Similarity
        // Compare Job Responsibilities + Description vs Resume Raw Text
        const jobText = (job.responsibilities || []).join(' ') + ' ' + (job.description || '');
        const resumeText = resumeData.rawText || (resumeData.experienceSummary || '') + ' ' + (resumeData.skills || []).join(' ');

        const semanticScore = this.calculateSemanticSimilarity(jobText, resumeText);
        results.responsibilitySimilarity = semanticScore;
        const semanticScoreWeighted = semanticScore * 0.20;

        // 4. EDUCATION MATCH (10%)
        const eduRes = this.calculateEducationMatch(resumeData.education || [], job.qualifications || []);
        results.educationMatch = eduRes.isMatch;
        const eduScoreWeighted = eduRes.score * 0.10;

        // 5. PREFERRED SKILLS BONUS (10%)
        const prefRes = this.calculateSkillMatch(resumeData.skills || [], job.preferredSkills || []);
        results.preferredSkillBonus = prefRes.percentage;
        const prefScoreWeighted = prefRes.percentage * 0.10;

        // FINAL SCORE
        const finalScore = Math.round(
            skillScoreWeighted +
            expScoreWeighted +
            semanticScoreWeighted +
            eduScoreWeighted +
            prefScoreWeighted
        );

        results.matchPercentage = finalScore;
        results.totalScore = finalScore; // For schema alignment
        results.educationScore = eduRes.score; // Raw education score

        results.finalScoreBreakdown = {
            skillMatch: Math.round(skillScoreWeighted),
            experienceMatch: Math.round(expScoreWeighted),
            responsibilityMatch: Math.round(semanticScoreWeighted),
            educationMatch: Math.round(eduScoreWeighted),
            preferredBonus: Math.round(prefScoreWeighted)
        };

        // Recommendation
        if (finalScore >= 80) results.recommendation = "Strong Fit";
        else if (finalScore >= 50) results.recommendation = "Moderate Fit";
        else results.recommendation = "Low Fit";

        return results;
    }

    /**
     * fuzzy skill matching with Jaro-Winkler
     */
    calculateSkillMatch(candidateSkills, jobSkills) {
        if (!jobSkills || jobSkills.length === 0) return { percentage: 100, matched: [], missing: [] };
        if (!candidateSkills || candidateSkills.length === 0) return { percentage: 0, matched: [], missing: jobSkills };

        const matched = [];
        const missing = [];
        const cSkillsNorm = candidateSkills.map(s => this.normalize(s));

        jobSkills.forEach(req => {
            const reqNorm = this.normalize(req);
            // Check for exact or fuzzy match
            const bestMatch = cSkillsNorm.find(cs => {
                if (cs.includes(reqNorm) || reqNorm.includes(cs)) return true; // Substring
                return JaroWinklerDistance(cs, reqNorm) > 0.85; // Fuzzy
            });

            if (bestMatch) {
                matched.push(req);
            } else {
                missing.push(req);
            }
        });

        const percentage = Math.round((matched.length / jobSkills.length) * 100);
        return { percentage, matched, missing };
    }

    /**
     * Experience Score (Linear scaling)
     */
    calculateExperienceScore(candidateExpStr, minMonthsRequired) {
        if (!minMonthsRequired || minMonthsRequired === 0) return { score: 100 };

        // Parse months from string (e.g. "5 years", "2.5 years", "3 years 2 months")
        let candidateMonths = 0;

        // Try regex
        if (candidateExpStr && typeof candidateExpStr === 'string') {
            const yearsMatch = candidateExpStr.match(/(\d+(\.\d+)?)\s*y/i);
            const monthsMatch = candidateExpStr.match(/(\d+)\s*m/i);

            if (yearsMatch) candidateMonths += parseFloat(yearsMatch[1]) * 12;
            if (monthsMatch) candidateMonths += parseInt(monthsMatch[1]);
        } else if (typeof candidateExpStr === 'number') {
            // Assume input is years if small, months if large
            if (candidateExpStr < 50) {
                candidateMonths = candidateExpStr * 12;
            } else {
                candidateMonths = candidateExpStr;
            }
        }

        if (!candidateMonths || isNaN(candidateMonths) || candidateMonths === 0) return { score: 0 };

        if (candidateMonths >= minMonthsRequired) return { score: 100 };

        // Proportional score
        return { score: Math.round((candidateMonths / minMonthsRequired) * 100) };
    }

    /**
     * Semantic Similarity using TF-IDF and Cosine Similarity
     */
    calculateSemanticSimilarity(jobText, resumeText) {
        if (!jobText || !resumeText) return 0;

        const tfidf = new natural.TfIdf();

        // 1. Clean and Tokenize
        const cleanJob = this.preprocessText(jobText);
        const cleanResume = this.preprocessText(resumeText);

        tfidf.addDocument(cleanJob);
        tfidf.addDocument(cleanResume);

        // Get vector terms
        const terms = {};
        tfidf.listTerms(0 /* job */).forEach(item => terms[item.term] = { doc0: item.tfidf, doc1: 0 });
        tfidf.listTerms(1 /* resume */).forEach(item => {
            if (!terms[item.term]) terms[item.term] = { doc0: 0, doc1: item.tfidf };
            else terms[item.term].doc1 = item.tfidf;
        });

        // Cosine Similarity
        let dotProduct = 0;
        let mag0 = 0;
        let mag1 = 0;

        Object.values(terms).forEach(val => {
            dotProduct += val.doc0 * val.doc1;
            mag0 += val.doc0 ** 2;
            mag1 += val.doc1 ** 2;
        });

        mag0 = Math.sqrt(mag0);
        mag1 = Math.sqrt(mag1);

        if (mag0 === 0 || mag1 === 0) return 0;

        const similarity = (dotProduct / (mag0 * mag1)) * 100;

        // Normalize: valid similar documents usually score 0.1-0.4 in raw TF-IDF cosine without embeddings
        // We boost the score to make it user-friendly (0-100)
        // A raw score of 0.2 is actually quite good for bag-of-words
        let boosted = similarity * 2.5;
        if (boosted > 100) boosted = 100;

        return Math.round(boosted);
    }

    preprocessText(text) {
        // Tokenize, lowercase, remove stopwords
        const tokens = this.tokenizer.tokenize(text.toLowerCase());
        const filtered = stopword.removeStopwords(tokens);
        return filtered.join(' ');
    }

    /**
     * Simple Keyphrase Check for Education
     */
    calculateEducationMatch(candidateEdu, requiredEdu) {
        // candidateEdu is array of objects or strings
        // requiredEdu is array of strings (e.g. "B.Tech", "MBA")

        if (!requiredEdu || requiredEdu.length === 0) return { isMatch: true, score: 100 };
        if (!candidateEdu || candidateEdu.length === 0) return { isMatch: false, score: 0 };

        const eduString = JSON.stringify(candidateEdu).toLowerCase();

        let matches = 0;
        requiredEdu.forEach(req => {
            if (eduString.includes(req.toLowerCase())) matches++;
        });

        const score = Math.round((matches / requiredEdu.length) * 100);
        return { isMatch: score > 0, score };
    }
}

module.exports = new MatchingEngineService();
