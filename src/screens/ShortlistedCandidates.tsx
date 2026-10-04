import { useState, useEffect } from 'react'
import { Download, Mail, Phone, CheckCircle, AlertCircle } from 'lucide-react'
import type { Candidate } from '../data/candidates'

interface ShortlistedCandidatesProps {
  candidates: Candidate[]
  currentAnalysisId?: string
}

export default function ShortlistedCandidates({ candidates, currentAnalysisId }: ShortlistedCandidatesProps) {
  const [shortlisted, setShortlisted] = useState<Candidate[]>([])
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set())
  const [emailSent, setEmailSent] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Filter only shortlisted candidates
    const filtered = candidates.filter(c => c.recommendation === 'Strong Match')
    setShortlisted(filtered)
  }, [candidates])

  const toggleCandidate = (id: string) => {
    const newSelected = new Set(selectedCandidates)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedCandidates(newSelected)
  }

  const toggleAll = () => {
    if (selectedCandidates.size === shortlisted.length) {
      setSelectedCandidates(new Set())
    } else {
      setSelectedCandidates(new Set(shortlisted.map(c => c.id)))
    }
  }

  const downloadExcel = async () => {
    if (!currentAnalysisId) return
    try {
      const response = await fetch(
        `/api/v1/analyses/${currentAnalysisId}/shortlisted-report.xlsx`
      )
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shortlisted-candidates-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download report:', error)
    }
  }

  const sendEmails = async () => {
    if (selectedCandidates.size === 0) {
      alert('Please select at least one candidate')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/v1/candidates/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_ids: Array.from(selectedCandidates),
          template_type: 'procedure'
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(`Emails sent successfully to ${result.sent_count} candidates`)
        // Update email status
        Array.from(selectedCandidates).forEach(id => {
          setEmailSent(prev => ({ ...prev, [id]: true }))
        })
        setSelectedCandidates(new Set())
      } else {
        alert(`Failed to send emails: ${result.message}`)
      }
    } catch (error) {
      alert('Error sending emails')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (shortlisted.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No shortlisted candidates yet</p>
          <p className="text-gray-500 text-sm mt-2">Mark candidates as shortlisted from the Overview page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shortlisted Candidates</h1>
          <p className="text-gray-600 mt-2">{shortlisted.length} candidates selected</p>
        </div>
        <button
          onClick={downloadExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          Download Excel
        </button>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            checked={selectedCandidates.size === shortlisted.length}
            onChange={toggleAll}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm text-gray-600">
            {selectedCandidates.size} of {shortlisted.length} selected
          </span>
        </div>
        <button
          onClick={sendEmails}
          disabled={selectedCandidates.size === 0 || loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          <Mail className="w-4 h-4" />
          {loading ? 'Sending...' : 'Send Email'}
        </button>
      </div>

      {/* Candidates List */}
      <div className="space-y-3">
        {shortlisted.map(candidate => (
          <div
            key={candidate.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={selectedCandidates.has(candidate.id)}
                onChange={() => toggleCandidate(candidate.id)}
                className="w-4 h-4 rounded mt-1"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{candidate.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                      {candidate.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {candidate.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{candidate.match}%</div>
                    <div className="text-xs text-gray-500">Match Score</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Experience</div>
                    <div className="font-medium text-gray-900">{candidate.experience}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Education</div>
                    <div className="font-medium text-gray-900">{candidate.education}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Skills</div>
                    <div className="font-medium text-gray-900">{candidate.skills.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Status</div>
                    <div className="flex items-center gap-1">
                      {emailSent[candidate.id] ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      )}
                      <span className="text-sm font-medium">
                        {emailSent[candidate.id] ? 'Contacted' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-gray-500 mb-1">Top Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {candidate.skills.slice(0, 5).map(skill => (
                      <span
                        key={skill}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                    {candidate.skills.length > 5 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{candidate.skills.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
