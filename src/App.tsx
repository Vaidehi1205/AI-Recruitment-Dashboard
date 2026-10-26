import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { BriefcaseBusiness, Building2, ClipboardCheck, FileSearch, MapPin, Plus, UserCircle, Users } from 'lucide-react'
import Sidebar, { type SidebarTab } from './components/Sidebar'
import TopBar from './components/TopBar'
import NewAnalysis from './screens/NewAnalysis'
import AiScanning from './screens/AiScanning'
import Overview from './screens/Overview'
import CandidateAnalysis from './screens/CandidateAnalysis'
import ShortlistedCandidates from './screens/ShortlistedCandidates'
import EmailPage from './screens/EmailPage'
import { createAnalysis, downloadReport, type AnalysisResponse } from './utils/api'
import { convertToCandidate } from './data/candidates'
import AdminApp from '../admin_frontend/src/App.jsx'
import { useAuth } from '../admin_frontend/src/auth/AuthContext.jsx'

type Screen = 'dashboard' | 'analysis' | 'create-job' | 'scanning' | 'overview' | 'candidate' | 'shortlisted' | 'email' | 'profile'

type JobOpening = {
  id: string
  title: string
  department: string
  location: string
  type: string
  workMode: string
  experienceLevel: string
  salaryRange: string
  openings: string
  deadline: string
  priority: string
  skills: string
  description: string
  status: string
  createdAt: string
}

const initialJobs: JobOpening[] = [
  { id: 'job-1', title: 'Software Engineer', department: 'Engineering', location: 'Mumbai', type: 'Full time', workMode: 'Hybrid', experienceLevel: '2-4 years', salaryRange: '8-12 LPA', openings: '3', deadline: '2026-11-15', priority: 'High', skills: 'Python, FastAPI, SQL, Docker', description: 'Build backend services and automation for recruitment workflows.', status: 'Open', createdAt: '2026-10-09' },
  { id: 'job-2', title: 'Data Analyst', department: 'Analytics', location: 'Pune', type: 'Internship', workMode: 'On site', experienceLevel: '0-1 years', salaryRange: '20-30K / month', openings: '2', deadline: '2026-10-30', priority: 'Medium', skills: 'SQL, Excel, Power BI, Python', description: 'Support hiring analytics, dashboards, and reporting operations.', status: 'Draft', createdAt: '2026-10-09' },
]

function RecruiterDashboardApp() {
  const { user, logout } = useAuth()
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('dashboard')
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('')
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResponse | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>(initialJobs)

  const selectedCandidate = currentAnalysis?.candidates.find((c) => c.id === selectedCandidateId)
  const rawReqs = currentAnalysis?.requirements
  const jobRequirements: { required: string[]; preferred: string[] } = Array.isArray(rawReqs)
    ? { required: rawReqs, preferred: [] }
    : rawReqs || { required: [], preferred: [] }
  const candidates = currentAnalysis?.candidates.map(c => convertToCandidate(c, currentAnalysis.id, jobRequirements)) || []

  const handleAnalyze = async (jobDescription: string, jobTitle: string | undefined, files: File[]) => {
    try {
      setAnalysisError(null)
      setUploadedFiles(files)
      const analysis = await createAnalysis({
        job_description: jobDescription,
        job_title: jobTitle,
        resumes: files,
      })
      setCurrentAnalysis(analysis)
      setScreen('scanning')
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Failed to start analysis')
    }
  }

  const handleScanComplete = (completedAnalysis: AnalysisResponse) => {
    setCurrentAnalysis(completedAnalysis)
    setScreen('overview')
  }

  const handleNewAnalysis = () => {
    setCurrentAnalysis(null)
    setAnalysisError(null)
    setSelectedCandidateId('')
    setSidebarTab('analysis')
    setScreen('analysis')
  }

  const handleCreateJob = () => {
    setSidebarTab('jobs')
    setScreen('create-job')
  }

  const handleSaveJob = (job: Omit<JobOpening, 'id' | 'createdAt' | 'status'>) => {
    setJobOpenings((items) => [
      {
        ...job,
        id: `job-${Date.now()}`,
        status: 'Open',
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...items,
    ])
    setSidebarTab('dashboard')
    setScreen('dashboard')
  }

  const handleSelectCandidate = (id: string) => {
    setSelectedCandidateId(id)
    setScreen('candidate')
  }

  const handleSidebarTabChange = (tab: SidebarTab) => {
    setSidebarTab(tab)
    if (tab === 'dashboard') {
      setScreen('dashboard')
    } else if (tab === 'analysis') {
      setScreen('analysis')
    } else if (tab === 'jobs') {
      setScreen('create-job')
    } else if (tab === 'shortlisted') {
      setScreen('shortlisted')
    } else if (tab === 'email') {
      setScreen('email')
    } else if (tab === 'profile') {
      setScreen('profile')
    } else {
      setScreen('overview')
    }
  }

  const handleBack = () => setScreen('overview')

  const handleExportReport = async () => {
    if (!currentAnalysis) return
    try {
      const blob = await downloadReport(currentAnalysis.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hiresense-ai-${currentAnalysis.id}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download report:', error)
    }
  }

  if (screen === 'scanning') {
    return (
      <AiScanning
        analysisId={currentAnalysis?.id || ''}
        uploadedFiles={uploadedFiles}
        onComplete={handleScanComplete}
        onError={(error) => {
          setAnalysisError(error)
          setScreen('analysis')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        activeTab={sidebarTab}
        onTabChange={handleSidebarTabChange}
        onNewAnalysis={handleNewAnalysis}
        onCreateJob={handleCreateJob}
        onLogout={logout}
        userName={user?.full_name}
      />
      <div className="min-h-screen pl-72">
        <TopBar
          title={
            screen === 'dashboard'
              ? 'Recruiter dashboard'
              : screen === 'analysis'
                ? 'Resume analysis'
                : screen === 'create-job'
                  ? 'Create job opening'
                  : screen === 'profile'
                    ? 'Profile'
                    : 'Candidate workspace'
          }
          onNewAnalysis={handleNewAnalysis}
          onCreateJob={handleCreateJob}
          onLogout={logout}
        />
        <main className="mx-auto max-w-[1600px] p-8">
          {screen === 'dashboard' && (
            <RecruiterHome
              jobs={jobOpenings}
              candidateCount={candidates.length}
              shortlistedCount={candidates.filter((candidate) => candidate.status === 'Shortlisted').length}
              hasAnalysis={Boolean(currentAnalysis)}
              onNewAnalysis={handleNewAnalysis}
              onCreateJob={handleCreateJob}
              onViewCandidates={() => {
                setSidebarTab('candidates')
                setScreen('overview')
              }}
            />
          )}
          {screen === 'analysis' && (
            <div className="panel overflow-hidden p-6">
              <NewAnalysis onAnalyze={handleAnalyze} />
              {analysisError && <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{analysisError}</p>}
            </div>
          )}
          {screen === 'create-job' && (
            <CreateJobOpening jobs={jobOpenings} onSave={handleSaveJob} onStartAnalysis={handleNewAnalysis} />
          )}
          {screen === 'overview' && (
            <Overview
              activeTab={sidebarTab}
              candidates={candidates}
              onSelectCandidate={handleSelectCandidate}
              currentAnalysis={currentAnalysis}
              onExportReport={handleExportReport}
            />
          )}
          {screen === 'candidate' && selectedCandidate && currentAnalysis && (
            <CandidateAnalysis
              candidate={convertToCandidate(selectedCandidate, currentAnalysis.id, jobRequirements)}
              onBack={handleBack}
            />
          )}
          {screen === 'shortlisted' && (
            <ShortlistedCandidates
              candidates={candidates}
              currentAnalysisId={currentAnalysis?.id}
            />
          )}
          {screen === 'email' && (
            <EmailPage />
          )}
          {screen === 'profile' && (
            <ProfilePage user={user} jobs={jobOpenings} candidateCount={candidates.length} shortlistedCount={candidates.filter((candidate) => candidate.status === 'Shortlisted').length} />
          )}
        </main>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, detail }: { icon: any; label: string; value: string | number; detail: string }) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  )
}

function RecruiterHome({ jobs, candidateCount, shortlistedCount, hasAnalysis, onNewAnalysis, onCreateJob, onViewCandidates }: {
  jobs: JobOpening[]
  candidateCount: number
  shortlistedCount: number
  hasAnalysis: boolean
  onNewAnalysis: () => void
  onCreateJob: () => void
  onViewCandidates: () => void
}) {
  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">Recruiter workspace</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h2>
          <p className="mt-1.5 text-sm text-slate-500">Manage job openings, start AI resume analysis, and track shortlisted candidates.</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCreateJob} className="btn-secondary"><Plus className="size-4" />Create job opening</button>
          <button type="button" onClick={onNewAnalysis} className="btn-primary"><FileSearch className="size-4" />Start analysis</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={BriefcaseBusiness} label="Open jobs" value={jobs.filter((job) => job.status === 'Open').length} detail={`${jobs.length} total job records`} />
        <StatCard icon={FileSearch} label="Analysis" value={hasAnalysis ? 'Ready' : 'Not started'} detail="Resume analysis is available from this dashboard" />
        <StatCard icon={Users} label="Candidates" value={candidateCount} detail="From the latest analysis batch" />
        <StatCard icon={ClipboardCheck} label="Shortlisted" value={shortlistedCount} detail="Candidates marked for next steps" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h3 className="font-semibold text-ink">Job openings</h3>
              <p className="mt-1 text-sm text-slate-500">Create an opening before running analysis for the role.</p>
            </div>
            <button type="button" onClick={onCreateJob} className="btn-secondary"><Plus className="size-4" />New job</button>
          </div>
          <div className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <div key={job.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold text-ink">{job.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{job.department} · {job.location} · {job.type} · {job.workMode}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{job.experienceLevel}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{job.salaryRange || 'Salary not set'}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{job.openings} openings</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Apply by {job.deadline || 'TBD'}</span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{job.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <h3 className="font-semibold text-ink">Next actions</h3>
          <div className="mt-4 grid gap-3">
            <button type="button" onClick={onNewAnalysis} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50">
              <span><span className="block font-semibold text-ink">Run resume analysis</span><span className="mt-1 block text-sm text-slate-500">Upload a JD and candidate resumes.</span></span>
              <FileSearch className="size-5 text-brand-600" />
            </button>
            <button type="button" onClick={onViewCandidates} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50">
              <span><span className="block font-semibold text-ink">Review candidates</span><span className="mt-1 block text-sm text-slate-500">Open rankings from latest analysis.</span></span>
              <Users className="size-5 text-brand-600" />
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function CreateJobOpening({ jobs, onSave, onStartAnalysis }: { jobs: JobOpening[]; onSave: (job: Omit<JobOpening, 'id' | 'createdAt' | 'status'>) => void; onStartAnalysis: () => void }) {
  const [form, setForm] = useState({
    title: '',
    department: '',
    location: '',
    type: 'Full time',
    workMode: 'Hybrid',
    experienceLevel: '',
    salaryRange: '',
    openings: '1',
    deadline: '',
    priority: 'Medium',
    skills: '',
    description: '',
  })
  const canSave = form.title.trim() && form.department.trim() && form.location.trim()

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form
        className="panel p-6"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSave) return
          onSave({
            title: form.title.trim(),
            department: form.department.trim(),
            location: form.location.trim(),
            type: form.type,
            workMode: form.workMode,
            experienceLevel: form.experienceLevel.trim() || 'Not specified',
            salaryRange: form.salaryRange.trim(),
            openings: form.openings.trim() || '1',
            deadline: form.deadline,
            priority: form.priority,
            skills: form.skills.trim(),
            description: form.description.trim(),
          })
        }}
      >
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">Job opening</p>
        <h2 className="text-xl font-semibold text-ink">Create job opening</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Job title</span><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Software Engineer" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Department</span><input className="input" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} placeholder="Engineering" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Location</span><input className="input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Mumbai" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Employment type</span><select className="input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Full time</option><option>Internship</option><option>Contract</option><option>Part time</option></select></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Work mode</span><select className="input" value={form.workMode} onChange={(event) => setForm({ ...form, workMode: event.target.value })}><option>Hybrid</option><option>On site</option><option>Remote</option></select></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Experience level</span><input className="input" value={form.experienceLevel} onChange={(event) => setForm({ ...form, experienceLevel: event.target.value })} placeholder="2-4 years" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Salary range</span><input className="input" value={form.salaryRange} onChange={(event) => setForm({ ...form, salaryRange: event.target.value })} placeholder="8-12 LPA" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Openings</span><input className="input" type="number" min="1" value={form.openings} onChange={(event) => setForm({ ...form, openings: event.target.value })} /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Application deadline</span><input className="input" type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Priority</span><select className="input" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></label>
          <label className="block md:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Required skills</span><input className="input" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="Python, React, SQL" /></label>
          <label className="block md:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Role description</span><textarea className="input min-h-28 resize-none" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Responsibilities, team context, and must-have requirements." /></label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onStartAnalysis} className="btn-secondary"><FileSearch className="size-4" />Go to analysis</button>
          <button type="submit" disabled={!canSave} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"><Plus className="size-4" />Create opening</button>
        </div>
      </form>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h3 className="font-semibold text-ink">Current openings</h3>
          <p className="mt-1 text-sm text-slate-500">Recently created recruiter job records.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <div key={job.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{job.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{job.department} · {job.location} · {job.type} · {job.workMode}</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <span>Experience: {job.experienceLevel}</span>
                    <span>Salary: {job.salaryRange || 'Not set'}</span>
                    <span>Openings: {job.openings}</span>
                    <span>Deadline: {job.deadline || 'TBD'}</span>
                  </div>
                  {job.skills && <p className="mt-3 text-sm text-slate-500">Skills: {job.skills}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{job.status}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{job.priority}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ProfilePage({ user, jobs, candidateCount, shortlistedCount }: { user: any; jobs: JobOpening[]; candidateCount: number; shortlistedCount: number }) {
  const initials = (user?.full_name || 'Recruiter')
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="panel p-6">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-2xl bg-brand-500 text-xl font-bold text-white">{initials}</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">Recruiter profile</p>
            <h2 className="mt-1 truncate text-2xl font-semibold text-ink">{user?.full_name || 'Recruiter'}</h2>
            <p className="mt-1 text-sm text-slate-500">{user?.email || 'No email available'}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          <ProfileRow icon={Building2} label="Company" value={user?.company_name || 'Not configured'} />
          <ProfileRow icon={UserCircle} label="Designation" value={user?.designation || 'Recruiter'} />
          <ProfileRow icon={MapPin} label="Location" value={user?.company_address || 'Not configured'} />
        </div>
      </section>

      <section className="panel p-6">
        <h3 className="font-semibold text-ink">Workspace summary</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <StatCard icon={BriefcaseBusiness} label="Jobs managed" value={jobs.length} detail={`${jobs.filter((job) => job.status === 'Open').length} open roles`} />
          <StatCard icon={Users} label="Candidates" value={candidateCount} detail="Latest analysis batch" />
          <StatCard icon={ClipboardCheck} label="Shortlisted" value={shortlistedCount} detail="Ready for outreach" />
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 p-5">
          <h4 className="font-semibold text-ink">Account details</h4>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <div><span className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Module</span>{user?.module || 'recruiter'}</div>
            <div><span className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Role</span>{user?.role || 'recruiter'}</div>
            <div><span className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Phone</span>{user?.phone || 'Not added'}</div>
            <div><span className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Status</span>{user?.is_approved ? 'Approved' : 'Pending approval'}</div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ProfileRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
      <div className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="size-5" /></div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<RecruiterDashboardApp />} />
      <Route path="/*" element={<AdminApp />} />
    </Routes>
  )
}
