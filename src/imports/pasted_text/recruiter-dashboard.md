Create a polished, production-quality desktop web application called:

"HireSense AI"

This is a focused AI recruitment dashboard for recruiters. It allows a recruiter to:

1. Enter or upload a Job Description.
2. Upload multiple PDF resumes simultaneously.
3. Start an AI-powered candidate analysis.
4. Show a sophisticated resume scanning and AI processing experience.
5. Display a complete recruitment intelligence dashboard after analysis.
6. View ranked candidates and detailed AI-based candidate analysis.

IMPORTANT PRODUCT SCOPE:

This is NOT a complete enterprise ATS or HR management system.

Do NOT add:
- email campaigns
- candidate messaging
- recruiter/TPO verification
- knowledge graphs
- AI recruiter chatbot
- GitHub analysis
- duplicate resume detection
- workforce management
- interview scheduling
- payroll
- complex HR features
- cloud infrastructure controls

The core product workflow is:

Job Description + Multiple Resumes
→ Resume Processing
→ NLP Analysis
→ Semantic Matching
→ Skill Analysis
→ Candidate Ranking
→ Recruitment Dashboard
→ Individual Candidate Analysis

DESIGN DIRECTION:

Create a premium, modern enterprise SaaS interface inspired by high-end recruitment and analytics products.

The interface should feel:
- professional
- robust
- intelligent
- trustworthy
- sophisticated
- clean
- data-driven
- production-ready

Avoid:
- generic AI landing pages
- excessive gradients
- neon colors
- cyberpunk styling
- excessive glassmorphism
- excessive rounded elements
- cartoon illustrations
- unnecessary decorative elements

VISUAL SYSTEM:

Use a light neutral foundation.

Background:
#F7F8FA

Cards:
#FFFFFF

Primary text:
#111827

Secondary text:
#6B7280

Borders:
#E5E7EB

Primary accent:
#635BFF

Use the indigo accent for:
- primary buttons
- selected navigation
- AI indicators
- important data highlights

Use semantic colors only where appropriate:
- green for strong matches/success
- amber for moderate matches/warnings
- red for weak matches/missing requirements

Use subtle indigo/blue gradients only for selected AI-focused elements.

TYPOGRAPHY:

Use Inter or a similar modern sans-serif.

Use strong typographic hierarchy:
- page titles: 28–32px
- section titles: 18–20px
- KPI values: 28–36px
- body: 14–15px
- metadata: 12–13px

LAYOUT:

Use a desktop-first responsive layout.

Use:
- clean spacing
- consistent 8px spacing system
- subtle 1px borders
- restrained shadows
- medium-radius cards
- strong alignment
- generous whitespace

Create a persistent left sidebar for the results dashboard with:

- Overview
- Candidates
- Job Analysis
- Skills
- Analytics

At the top right:
- notification icon
- settings/profile
- "New Analysis" primary button

SCREENS:

Create these four major screens:

SCREEN 1 — NEW ANALYSIS

Create a welcoming analysis setup screen.

Header:
"HireSense AI"

Subtitle:
"Analyze and rank candidates using AI-powered resume matching."

Create a large Job Description card.

Allow two input modes:
- Paste Job Description
- Upload Job Description PDF

Provide a large text area for pasted content.

Create a separate Resume Upload card.

Allow multiple PDF resumes to be uploaded simultaneously using drag and drop.

The upload area should clearly communicate:
"Drop resumes here"
"or click to browse"
"PDF files • Multiple files supported"

After files are uploaded, show a clean list of uploaded resumes with:
- filename
- file size
- upload status
- remove button

Show a prominent primary CTA:

"✦ Analyze Candidates"

Below the button:
"Semantic matching • Skill analysis • Candidate ranking"

Make this screen visually spacious and premium.

SCREEN 2 — AI ANALYSIS / SCANNING

After clicking "Analyze Candidates", transition to a dedicated AI processing screen.

Do NOT show a generic loading spinner.

Create an impressive but restrained AI analysis animation.

Central visual:
A sophisticated AI processing node surrounded by subtle animated particles or connection lines.

Show resumes flowing conceptually toward the AI engine and results flowing outward.

Display live processing stages:

✓ Job description analyzed
✓ Resume text extracted
◉ Identifying candidate skills
○ Calculating semantic similarity
○ Ranking candidates
○ Generating recruitment insights

Show progress:

"Processing 37 of 50 resumes"

Use smooth animated progress.

The active processing step should have a subtle indigo pulse/glow.

Use Framer Motion-style transitions.

Animation should feel sophisticated and professional, not futuristic or sci-fi.

When processing finishes:
show a brief "Analysis Complete" state and transition to the results dashboard.

SCREEN 3 — RECRUITMENT OVERVIEW

Create a high-quality recruiter analytics dashboard.

Top heading:
"Recruitment Overview"

Subtitle:
"AI analysis results for Senior Machine Learning Engineer"

First row:
Four KPI cards:

Total Candidates
42

Shortlisted
12

Average Match
84%

Skills Identified
18

Second row:

LEFT:
"Match Score Distribution"

Create a clean bar chart showing:
90–100%
80–89%
70–79%
60–69%
Below 60%

RIGHT:
"Top Candidates"

Show 5 candidates with:
- avatar
- candidate name
- job title
- match score
- match status

Example:
Rahul Sharma — 94% — Strong Match
Priya Patel — 91% — Strong Match
Aman Kumar — 88% — Good Match
Sneha Joshi — 84% — Good Match
Rohan Mehta — 81% — Good Match

Third row:
Create a large "Candidate Ranking" table.

Columns:
Rank
Candidate
Match Score
Skills
Experience
Recommendation

Use realistic example data.

Make the candidate ranking table the most important data component on the page.

Also include a smaller "Skill Analysis" card showing:
- top required skills
- candidate coverage
- missing skill frequency

SCREEN 4 — CANDIDATE ANALYSIS

When a candidate is clicked, open a detailed candidate analysis page.

Header:
Candidate name
Job title

Show a large circular or semi-circular Match Score:
94%
"Excellent Match"

Create sections:

MATCHING SKILLS

Python
Machine Learning
SQL
TensorFlow
Docker

MISSING SKILLS

Kubernetes
AWS

MATCH BREAKDOWN

Semantic Match
94%

Skill Match
90%

Experience Match
86%

Create horizontal progress indicators.

Then create an "AI Insight" card.

Example:

"Candidate demonstrates strong alignment with the technical requirements, particularly Python, Machine Learning and SQL. The primary gap is cloud infrastructure experience."

Also show:
- education
- experience
- projects
- extracted candidate information

INTERACTIONS:

The prototype should feel like a real application.

Implement:
- navigation between dashboard sections
- New Analysis button
- JD input mode toggle
- resume drag-and-drop state
- uploaded file list
- Analyze Candidates button
- scanning screen transition
- animated processing stages
- dashboard reveal animation
- candidate table interactions
- candidate detail navigation
- hover states
- button states
- subtle chart animations
- match score count-up animation

RESPONSIVE DESIGN:

Prioritize desktop screens around 1440px width.

Also make the layout reasonably responsive for 1280px and tablet widths.

DESIGN QUALITY:

The final result should resemble a premium enterprise SaaS product rather than a college project.

Prioritize:
- visual hierarchy
- information density without clutter
- whitespace
- typography
- alignment
- consistent components
- restrained color usage
- polished micro-interactions

Do not create unnecessary pages or features.