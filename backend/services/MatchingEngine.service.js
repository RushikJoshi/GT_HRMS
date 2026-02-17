const stringSimilarity = require('string-similarity');

class MatchingEngineService {
    /**
     * Calculate candidate match score against job requirement
     * @param {Object} job - Requirement object with matchingConfig and skills
     * @param {Object} candidateData - Parsed AI data from resume
     */
    async calculateMatchScore(job, candidateData) {
        if (!job || !candidateData) return { score: 0, breakdown: {} };

        const config = job.matchingConfig || {
            skillWeight: 40,
            experienceWeight: 20,
            educationWeight: 10,
            similarityWeight: 20,
            preferredBonus: 10
        };

        let score = 0;
        const breakdown = {
            skills: 0,
            experience: 0,
            similarity: 0,
            education: 0,
            preferred: 0
        };

        const matchedSkills = [];
        const missingSkills = [];

        // 1. Skill Matching (Weighted 40%)
        if (job.requiredSkills && job.requiredSkills.length > 0) {
            const candidateSkills = (candidateData.skills || []).map(s => s.toLowerCase());
            let matchedWeight = 0;
            let totalWeight = 0;

            job.requiredSkills.forEach(skill => {
                totalWeight += skill.weight;
                const normalizedSkill = skill.name.toLowerCase();

                // Direct match or partial string match
                const isMatched = candidateSkills.some(cs => cs.includes(normalizedSkill) || normalizedSkill.includes(cs));

                if (isMatched) {
                    matchedWeight += skill.weight;
                    matchedSkills.push(skill.name);
                } else {
                    missingSkills.push(skill.name);
                }
            });

            breakdown.skills = totalWeight > 0 ? (matchedWeight / totalWeight) * config.skillWeight : 0;
            score += breakdown.skills;
        }

        // 2. Experience Matching (20%)
        const jobMinExp = job.jobDetails?.experienceMin || 0;
        const candidateExpStr = String(candidateData.totalExperience || '0');
        const candidateExp = parseFloat(candidateExpStr.replace(/[^0-9.]/g, '')) || 0;

        if (candidateExp >= jobMinExp) {
            breakdown.experience = config.experienceWeight;
        } else if (candidateExp > 0) {
            breakdown.experience = (candidateExp / jobMinExp) * config.experienceWeight;
        }
        score += breakdown.experience;

        // 3. Semantic Similarity (20%)
        const jobOverview = job.jobDescription?.roleOverview || "";
        const candidateSummary = candidateData.summary || "";
        if (jobOverview && candidateSummary) {
            const similarity = stringSimilarity.compareTwoStrings(jobOverview.toLowerCase(), candidateSummary.toLowerCase());
            breakdown.similarity = similarity * config.similarityWeight;
            score += breakdown.similarity;
        }

        // 4. Education (10%)
        const requiredEducation = (job.jobDescription?.education || "").toLowerCase();
        const candidateEducation = (candidateData.education || []).map(e => String(e.degree || e).toLowerCase()).join(' ');

        if (!requiredEducation || candidateEducation.includes(requiredEducation)) {
            breakdown.education = config.educationWeight;
        }
        score += breakdown.education;

        // 5. Preferred Bonus (10%)
        if (job.preferredSkills && job.preferredSkills.length > 0) {
            const candidateSkills = (candidateData.skills || []).map(s => s.toLowerCase());
            let prefMatchCount = 0;
            job.preferredSkills.forEach(ps => {
                if (candidateSkills.some(cs => cs.includes(ps.name.toLowerCase()))) {
                    prefMatchCount++;
                }
            });
            breakdown.preferred = (prefMatchCount / job.preferredSkills.length) * config.preferredBonus;
            score += breakdown.preferred;
        }

        return {
            totalScore: Math.round(score),
            breakdown,
            matchedSkills,
            missingSkills
        };
    }
}

module.exports = new MatchingEngineService();
