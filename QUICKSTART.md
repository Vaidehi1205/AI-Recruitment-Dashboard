# Quick Start Guide - New Features

## 🚀 Getting Started

### 1. Update Environment Configuration

Add to your `.env` file in the backend directory:

```env
# Email Configuration (Gmail Example)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDER_EMAIL=your-email@gmail.com
SENDER_NAME=HireSense AI
```

**Gmail Setup:**
1. Go to https://myaccount.google.com/apppasswords
2. Select Mail and Windows Computer
3. Copy the 16-character password
4. Paste into SMTP_PASSWORD

### 2. Restart Backend

The backend will automatically:
- Migrate database with new columns
- Initialize email service
- Create new endpoints

### 3. Access New Features

**In the UI sidebar, you'll now see:**
- ✅ Shortlisted (new page)
- 📧 Email (new page)

---

## 📋 Workflow: Shortlist and Contact Top Candidates

### Step 1: Run Analysis
1. Upload job description and resumes
2. Wait for analysis to complete
3. View candidates in Overview

### Step 2: Identify Top Candidates
- Candidates marked "Strong Match" are auto-suggested
- All candidates ranked by overall score
- See skills, experience, and match breakdown

### Step 3: Go to Shortlisted Page
- Click "Shortlisted" in sidebar
- Select candidates to contact
- Add internal notes if needed

### Step 4: Send Outreach Email
- Click "Send Email" button
- Choose template (Schedule Call, Rejection, or Custom)
- Select recipients
- Send to multiple candidates at once

### Step 4b (Alternative): Use Email Page
- Click "Email" in sidebar
- Compose or select template
- Enter recipient emails
- Preview before sending

### Step 5: Track Communication
- See "Email Sent" status in shortlisted list
- Mark calls as scheduled
- Add follow-up notes

### Step 6: Export Results
- Click "Download Excel"
- Get spreadsheet with all shortlisted candidates
- Share with hiring team

---

## 🎯 Key Features at a Glance

| Feature | Location | What it Does |
|---------|----------|-------------|
| **Shortlist** | Candidate detail | Mark as Strong Match |
| **View Shortlisted** | Sidebar > Shortlisted | See all selected candidates |
| **Send Email** | Shortlisted page or Email page | Bulk email with templates |
| **Filter** | Shortlisted page | Filter by score, skills, status |
| **Excel Export** | Shortlisted page | Download shortlisted candidates |
| **Schedule Call** | Shortlisted page | Track call scheduling |
| **Email Templates** | Email page | Procedure, Rejection, Custom |

---

## 📊 Data Fields Tracked

For each candidate, the system now tracks:
- ✅ Shortlist status (is_shortlisted)
- 📧 Email sent? (email_sent + timestamp)
- 📞 Call scheduled? (call_scheduled + timestamp)
- 📝 Internal notes (notes field)

---

## 🔍 Filtering Examples

### Filter by Score Range
- Set min: 80, max: 100
- See only top candidates

### Filter by Recommendation
- Show only "Strong Match"
- Perfect for focused outreach

### Filter by Skills
- Search for candidates with specific skills
- Example: "Python, AWS, Docker"

### Combine Filters
- Score 80+ AND "Strong Match" AND has "Python"
- Highly targeted candidate lists

---

## 📧 Email Template Examples

### Template 1: Schedule Call (Procedure)
```
Dear [CANDIDATE_NAME],

Thank you for your interest! We're impressed with your profile.

We'd like to schedule a call to discuss the opportunity further.

A team member will be in touch shortly with available times.

Best regards,
Recruitment Team
```

### Template 2: Rejection
```
Dear [CANDIDATE_NAME],

Thank you for applying! We appreciate your interest.

We've decided to move forward with other candidates whose 
background more closely matches our needs.

We encourage you to apply for future positions.

Best regards,
Recruitment Team
```

### Template 3: Custom
Write your own message for any scenario!

---

## 💡 Pro Tips

### Tip 1: Batch Operations
- Select multiple candidates at once
- Send the same email to all
- Save time on bulk outreach

### Tip 2: Use Notes
- Add internal notes like "Schedule for 2PM"
- Or "Interested in other role"
- Keep track of conversations

### Tip 3: Export for Meeting
- Export to Excel before interviews
- Print or share with panel
- Have all candidate info in one place

### Tip 4: Template Variables
- Use [CANDIDATE_NAME] placeholder
- Automatically replaced with actual name
- Create personal touch at scale

### Tip 5: Two-Stage Outreach
1. First email: "Schedule Call" template to shortlisted
2. Follow-up: Use "Custom" template after calls

---

## ⚠️ Common Issues & Solutions

### **Issue: Email not sending**
**Solution:** 
- Check SMTP credentials in .env
- Verify Gmail 2FA and app password
- Check internet connection

### **Issue: Shortlisted page is empty**
**Solution:**
- Go back to Overview
- Ensure candidates are "Strong Match"
- Or manually mark as shortlisted

### **Issue: Excel export fails**
**Solution:**
- Make sure you have shortlisted candidates
- Check disk space
- Try again with fewer candidates

### **Issue: Can't see new sidebar items**
**Solution:**
- Restart React dev server
- Clear browser cache (Ctrl+Shift+Delete)
- Check sidebar scrolls (might be off-screen)

---

## 🔐 Security Reminders

✅ **DO:**
- Store credentials in `.env` file
- Use app-specific passwords for Gmail
- Never commit `.env` to git

❌ **DON'T:**
- Share SMTP passwords
- Store credentials in code
- Use main Gmail password
- Enable less secure apps

---

## 📞 API Reference (For Developers)

### Shortlisting
```bash
# Mark candidate as shortlisted
POST /api/v1/candidates/{id}/shortlist
Body: { "is_shortlisted": true, "notes": "..." }

# Get shortlisted candidates
GET /api/v1/analyses/{analysis_id}/shortlisted

# Get strong matches
GET /api/v1/candidates/strong-matches?analysis_id={id}
```

### Filtering
```bash
# Filter with criteria
POST /api/v1/analyses/{analysis_id}/filtered-candidates
Body: {
  "min_score": 80,
  "max_score": 100,
  "recommendation": "Strong Match",
  "skills_filter": ["Python", "AWS"]
}
```

### Email
```bash
# Send emails
POST /api/v1/candidates/send-email
Body: {
  "recipient_ids": ["id1", "id2"],
  "template_type": "procedure"
}
```

### Scheduling
```bash
# Schedule call
POST /api/v1/candidates/{id}/schedule-call
Body: {
  "scheduled_at": "2024-10-15T14:00:00",
  "notes": "Phone call about role"
}
```

### Reports
```bash
# Download shortlisted report
GET /api/v1/analyses/{analysis_id}/shortlisted-report.xlsx
```

---

## 🎓 Video Walkthrough (Pseudo-Instructions)

1. **Start Analysis**
   - Upload job description
   - Upload 5-10 resumes
   - Click Analyze
   - Wait for processing

2. **Review Results**
   - Go to Overview
   - Sort by score
   - Review "Strong Match" candidates
   - Check their skills vs job requirements

3. **Shortlist Top Candidates**
   - Click each candidate
   - Check "Shortlisted" if Strong Match
   - Add internal notes
   - Back to Overview

4. **Send Emails**
   - Go to Shortlisted page
   - Select all you want to contact
   - Click "Send Email"
   - Choose "Schedule Call" template
   - Click Send

5. **Track Results**
   - See email sent status
   - Mark calls as scheduled
   - Add follow-up notes
   - Download Excel before meetings

---

## 📈 Metrics to Track

After using the new features, monitor:

1. **Response Rate**: % of candidates who respond to emails
2. **Shortlist Conversion**: % of strong matches that get interviews
3. **Email Performance**: Which templates get best response
4. **Time Saved**: Compare vs manual email sending
5. **Hiring Funnel**: Track candidates through each stage

---

## 🎉 You're All Set!

All features are ready to use. Start with:
1. ✅ Review a completed analysis
2. ✅ Go to Shortlisted page
3. ✅ Send your first email to a candidate
4. ✅ Download the Excel report

**Questions or issues?** Check FEATURES_IMPLEMENTATION.md for detailed documentation.
