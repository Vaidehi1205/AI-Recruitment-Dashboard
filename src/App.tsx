import { useState } from 'react'
import Sidebar, { type SidebarTab } from './components/Sidebar'
import TopBar from './components/TopBar'
import NewAnalysis from './screens/NewAnalysis'
import AiScanning from './screens/AiScanning'
import Overview from './screens/Overview'
import CandidateAnalysis from './screens/CandidateAnalysis'
import ShortlistedCandidates from './screens/ShortlistedCandidates'
import EmailPage from './screens/EmailPage'
import { createAnalysis, pollAnalysis, downloadReport, type AnalysisResponse } from './utils/api'
import { convertToCandidate } from './data/candidates'

type Screen = 'analysis' | 'scanning' | 'overview' | 'candidate' | 'shortlisted' | 'email'

export default function App() {
  const [screen, setScreen] = useState<Screen>('analysis')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('overview')
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('')
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResponse | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

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
    setScreen('analysis')
  }

  const handleSelectCandidate = (id: string) => {
    setSelectedCandidateId(id)
    setScreen('candidate')
  }

  const handleSidebarTabChange = (tab: SidebarTab) => {
    setSidebarTab(tab)
    if (tab === 'shortlisted') {
      setScreen('shortlisted')
    } else if (tab === 'email') {
      setScreen('email')
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
      a.download = `recruitai-${currentAnalysis.id}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download report:', error)
    }
  }

  if (screen === 'analysis') {
    return <NewAnalysis onAnalyze={handleAnalyze} />
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
    <div className="flex h-screen bg-[#F7F8FA] overflow-hidden">
      <Sidebar
        activeTab={sidebarTab}
        onTabChange={handleSidebarTabChange}
        onNewAnalysis={handleNewAnalysis}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onNewAnalysis={handleNewAnalysis} onExportReport={handleExportReport} currentAnalysis={currentAnalysis} />
        <main className="flex-1 overflow-y-auto min-h-0 p-8">
          {screen === 'overview' && (
            <Overview
              activeTab={sidebarTab}
              candidates={candidates}
              onSelectCandidate={handleSelectCandidate}
              currentAnalysis={currentAnalysis}
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
        </main>
      </div>
    </div>
  )
}
