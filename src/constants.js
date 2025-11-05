// ============================================
// 📦 CONSTANTS.JS - Configuration & Prompts
// ============================================
// Purpose: This file stores all AI prompts, metric configurations, and utility functions
// Why: Separating constants makes code maintainable and reusable across components

// Main constants object - stores all AI prompts
const constants = {
  // ==========================================
  // 🤖 RESUME ANALYZER PROMPT
  // ==========================================
  // Purpose: Instructs AI how to analyze uploaded resumes
  // Usage: Sent to AI model to get structured resume feedback
  ANALYZE_RESUME_PROMPT: `First, determine if this document is actually a resume. Look for:
  
- Professional experience, work history, or employment information
- Education background, degrees, or academic information
- Skills, qualifications, or professional competencies
- Contact information and personal details

If this is NOT a resume (e.g., invoice, receipt, contract, article, manual, etc.), respond with:

{
  "error": "This document does not appear to be a resume. Please upload a proper resume containing professional experience, education, and skills sections."
}

If this IS a resume, analyze it thoroughly and provide comprehensive feedback in this JSON format:

{
  "overallScore": "X/10",
  "strengths": [
    "strength 1",
    "strength 2",
    "strength 3"
  ],
  "improvements": [
    "improvement 1",
    "improvement 2",
    "improvement 3"
  ],
  "keywords": [
    "keyword 1",
    "keyword 2",
    "keyword 3"
  ],
  "summary": "Brief overall assessment",
  "performanceMetrics": {
    "formatting": X,
    "contentQuality": X,
    "keywordUsage": X,
    "atsCompatibility": X,
    "quantifiableAchievements": X
  },
  "actionItems": [
    "specific actionable item 1",
    "specific actionable item 2",
    "specific actionable item 3"
  ],
  "proTips": [
    "professional tip 1",
    "professional tip 2",
    "professional tip 3"
  ],
  "atsChecklist": [
    "ats requirement 1",
    "ats requirement 2",
    "ats requirement 3"
  ]
}

IMPORTANT: All scores in performanceMetrics must be numbers between 1-10 only.

Document text:
{{DOCUMENT_TEXT}}`,

  // ==========================================
  // 🎯 JOB MATCH ANALYZER PROMPT
  // ==========================================
  // Purpose: Compares resume against job description for compatibility score
  // Usage: Helps users see how well their resume matches specific job postings
  JOB_MATCH_PROMPT: `You are an expert recruiter and ATS system. Compare this resume with the job description and provide a detailed match analysis.

RESUME:
{{RESUME_TEXT}}

JOB DESCRIPTION:
{{JOB_DESCRIPTION}}

Analyze the match and respond with this EXACT JSON format:

{
  "matchPercentage": X,
  "matchLevel": "excellent|good|fair|poor",
  "executiveSummary": "A comprehensive 3-4 sentence executive summary explaining the overall match quality, key strengths of the candidate for this specific role, and main gaps that need to be addressed. Be specific and actionable.",
  "overallAssessment": "Brief 2-3 sentence summary of the match",
  "matchingSkills": [
    "skill from resume that matches job requirement 1",
    "skill from resume that matches job requirement 2",
    "skill from resume that matches job requirement 3"
  ],
  "missingSkills": [
    "required skill missing from resume 1",
    "required skill missing from resume 2",
    "required skill missing from resume 3"
  ],
  "matchingKeywords": [
    "keyword 1",
    "keyword 2",
    "keyword 3"
  ],
  "missingKeywords": [
    "important keyword missing 1",
    "important keyword missing 2",
    "important keyword missing 3"
  ],
  "experienceMatch": {
    "score": X,
    "feedback": "How well does experience match the job requirements"
  },
  "educationMatch": {
    "score": X,
    "feedback": "How well does education match the job requirements"
  },
  "recommendations": [
    "Specific action to improve match 1",
    "Specific action to improve match 2",
    "Specific action to improve match 3"
  ],
  "strengthsForThisJob": [
    "Why you're a good fit point 1",
    "Why you're a good fit point 2",
    "Why you're a good fit point 3"
  ],
  "weaknessesForThisJob": [
    "Gap or weakness 1",
    "Gap or weakness 2",
    "Gap or weakness 3"
  ],
  "detailedBreakdown": {
    "technicalSkills": X,
    "softSkills": X,
    "experience": X,
    "education": X,
    "certifications": X
  }
}

CRITICAL SCORING INSTRUCTIONS:
- matchPercentage: Rate from 0-100 (this is a percentage)
- All scores in detailedBreakdown MUST be numbers between 1-10 ONLY (NOT percentages, NOT out of 100)
- experienceMatch.score and educationMatch.score must also be 1-10

matchLevel should be:
- "excellent" if 80-100%
- "good" if 60-79%
- "fair" if 40-59%
- "poor" if 0-39%

executiveSummary should include:
- Overall match quality assessment
- Top 2-3 strongest qualifications for this role
- Top 2-3 gaps or areas of concern
- Brief recommendation on candidacy

Example detailedBreakdown (CORRECT):
{
  "technicalSkills": 7,
  "softSkills": 8,
  "experience": 6,
  "education": 9,
  "certifications": 4
}

Be honest and specific. Provide actionable feedback.`,
};

// ==========================================
// 📊 METRIC CONFIGURATION - Resume Analyzer
// ==========================================
// Purpose: Defines visual styling and metadata for each performance metric
// Why: Creates reusable configuration for rendering metric cards with consistent styling

export const METRIC_CONFIG = [
  {
    key: "formatting", // Unique identifier for this metric
    label: "Formatting", // Display name shown to users
    defaultValue: 7, // Fallback score if AI doesn't return one
    colorClass: "from-emerald-400 to-emerald-500", // Tailwind gradient colors
    shadowClass: "group-hover/item:shadow-emerald-500/30", // Hover glow effect
    icon: "🎨", // Emoji icon for visual identification
  },
  {
    key: "contentQuality",
    label: "Content Quality",
    defaultValue: 6,
    colorClass: "from-blue-400 to-blue-500",
    shadowClass: "group-hover/item:shadow-blue-500/30",
    icon: "📝",
  },
  {
    key: "atsCompatibility",
    label: "ATS Compatibility",
    defaultValue: 6,
    colorClass: "from-violet-400 to-violet-500",
    shadowClass: "group-hover/item:shadow-violet-500/30",
    icon: "🤖",
  },
  {
    key: "keywordUsage",
    label: "Keyword Usage",
    defaultValue: 5,
    colorClass: "from-purple-400 to-purple-500",
    shadowClass: "group-hover/item:shadow-purple-500/30",
    icon: "🔍",
  },
  {
    key: "quantifiableAchievements",
    label: "Quantified Results",
    defaultValue: 4,
    colorClass: "from-orange-400 to-orange-500",
    shadowClass: "group-hover/item:shadow-orange-500/30",
    icon: "📊",
  },
];

// ==========================================
// 🎯 JOB MATCH METRICS CONFIGURATION
// ==========================================
// Purpose: Defines metrics for job description matching analysis
// Why: Provides structured data for rendering job match breakdown scores

export const JOB_MATCH_METRICS = [
  {
    key: "technicalSkills", // Identifier for technical skills metric
    label: "Technical Skills", // User-facing label
    defaultValue: 5, // Default score if none provided
    colorClass: "from-blue-400 to-blue-500", // Gradient styling
    icon: "💻", // Visual icon
  },
  {
    key: "softSkills",
    label: "Soft Skills",
    defaultValue: 5,
    colorClass: "from-green-400 to-green-500",
    icon: "🤝",
  },
  {
    key: "experience",
    label: "Experience Level",
    defaultValue: 5,
    colorClass: "from-purple-400 to-purple-500",
    icon: "📈",
  },
  {
    key: "education",
    label: "Education",
    defaultValue: 5,
    colorClass: "from-yellow-400 to-yellow-500",
    icon: "🎓",
  },
  {
    key: "certifications",
    label: "Certifications",
    defaultValue: 5,
    colorClass: "from-pink-400 to-pink-500",
    icon: "🏆",
  },
];

// ==========================================
// ✅ PRESENCE CHECKLIST BUILDER FUNCTION
// ==========================================
// Purpose: Analyzes resume text to check for essential sections
// Why: Provides quick visual feedback on what's missing from the resume
// Input: text (string) - the extracted resume text
// Output: Array of objects with label and present (boolean) properties

export const buildPresenceChecklist = (text) => {
  // Convert text to lowercase for case-insensitive matching
  // Uses fallback empty string if text is null/undefined
  const hay = (text || "").toLowerCase();

  // Return array of checklist items with regex pattern matching
  return [
    {
      label: "Standard Section Headings",
      // Tests if resume contains common section headers
      present:
        /experience|education|skills|summary|objective|work history|professional experience|employment/.test(
          hay
        ),
    },
    {
      label: "Contact Information",
      // Checks for email, phone, social links, or domain extensions
      present: /email|phone|linkedin|github|portfolio|@|\.com|\.net|\.org/.test(
        hay
      ),
    },
    {
      label: "Keywords & Skills",
      // Searches for technical skills and technology-related terms
      present:
        /skills|technologies|tech skills|competencies|programming|software|tools|javascript|python|java|react|node|sql|html|css|aws|docker|kubernetes|agile|scrum|git|api|database|framework|library|language|technology|stack/.test(
          hay
        ),
    },
    {
      label: "Quantified Achievements",
      // Looks for numbers with units (%, dollars, team size, etc.)
      // This indicates measurable accomplishments
      present:
        /\d+%|\d+ percent|\d+ people|\d+ team|\d+ project|\d+ year|\d+ month|\d+ dollar|\$\d+|\d+ users|\d+ customers|\d+ revenue|\d+ growth|\d+ improvement|\d+ reduction|\d+ increase|\d+ decrease/.test(
          hay
        ),
    },
    {
      label: "Action Verbs",
      // Checks for strong action verbs that demonstrate impact
      present:
        /developed|created|implemented|managed|led|designed|built|improved|increased|decreased|achieved|delivered|launched|optimized|streamlined|enhanced/.test(
          hay
        ),
    },
    {
      label: "Professional Experience",
      // Verifies work history section exists
      present:
        /experience|employment|work history|professional experience|job|position|role|career|responsibilities|duties|tasks|projects|achievements/.test(
          hay
        ),
    },
    {
      label: "Education Section",
      // Confirms educational background is present
      present:
        /education|bachelor|master|phd|university|degree|college|school|academic|certification|certificate|diploma/.test(
          hay
        ),
    },
  ];
};

// Export constants object as default export
// This allows: import constants from './constants.js'
export default constants;
