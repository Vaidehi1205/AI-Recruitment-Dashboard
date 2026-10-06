import { useState } from 'react'

interface TopBarProps {
  onNewAnalysis: () => void
  onExportReport?: () => void
  currentAnalysis?: any
}

export default function TopBar({ onNewAnalysis, onExportReport, currentAnalysis }: TopBarProps) {
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  const handleExport = async () => {
    if (!onExportReport) return
    setIsExporting(true)
    await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate export time
    onExportReport()
    setIsExporting(false)
    setExportSuccess(true)
    setTimeout(() => {
      setExportSuccess(false)
      setShowExportDialog(false)
    }, 2000)
  }

  return (
    <>
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 bg-white border-b border-[#E5E7EB]">
        <div>
          <span className="text-[13px] font-500 text-[#6B7280]">
            Analysis ·{' '}
            <span className="text-[#111827] font-600">{currentAnalysis?.job_title || 'Job Position'}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Export Report button */}
          {onExportReport && (
            <button
              onClick={() => setShowExportDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-600 text-[#635BFF] border border-[#635BFF] hover:bg-[#EEF0FF] transition-all duration-200 hover-scale"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 8v2a1 1 0 001 1h6a1 1 0 001-1V8M6 1v7M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export Report
            </button>
          )}

          {/* Notification bell */}
          <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#111827] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6v2.5L2 10.5v.5h12v-.5L12.5 8.5V6C12.5 3.515 10.485 1.5 8 1.5Z"
                stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round"
              />
              <path d="M6.5 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#635BFF]" />
          </button>

          {/* Settings */}
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#111827] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 10a2 2 0 100-4 2 2 0 000 4Z"
                stroke="currentColor" strokeWidth="1.4" fill="none"
              />
              <path
                d="M13.2 9.7a5.3 5.3 0 00.1-1.7 5.3 5.3 0 00-.1-1.7l1.7-1.4c.2-.1.2-.4.1-.6l-1.6-2.8c-.1-.2-.4-.3-.6-.2l-2 .8a5.4 5.4 0 00-1.5-.9l-.3-2.1C9 .9 8.8.7 8.5.7h-3.2c-.3 0-.5.2-.5.5l-.3 2.1c-.5.2-1 .5-1.5.9L.9 3.4c-.3-.1-.6 0-.7.2L.6 6.3c-.1.2 0 .5.1.6l1.7 1.4a5.3 5.3 0 000 3.4l-1.7 1.4c-.2.1-.2.4-.1.6l1.6 2.8c.1.2.4.3.6.2l2-.8c.5.3 1 .6 1.5.9l.3 2.1c0 .3.2.5.5.5h3.2c.3 0 .5-.2.5-.5l.3-2.1c.5-.2 1-.5 1.5-.9l2 .8c.3.1.6 0 .7-.2l1.6-2.8c.1-.2 0-.5-.1-.6l-1.8-1.4z"
                stroke="currentColor" strokeWidth="1.2" fill="none"
              />
            </svg>
          </button>

          <div className="w-px h-5 bg-[#E5E7EB]" />

          {/* New Analysis button */}
          <button
            onClick={onNewAnalysis}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-600 text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] bg-[#635BFF]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New Analysis
          </button>
        </div>
      </header>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 w-96 animate-fade-in-scale">
            <h3 className="text-[16px] font-700 text-[#111827] mb-4">Export Report</h3>
            
            {exportSuccess ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-[14px] font-600 text-[#111827] mb-1">Recruitment report generated successfully</p>
                <p className="text-[12px] text-[#9CA3AF]">hiresense-ai-report.xlsx</p>
              </div>
            ) : (
              <>
                <p className="text-[13px] text-[#6B7280] mb-4">Select export format for recruitment analysis report</p>
                
                <div className="space-y-2 mb-6">
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F7F8FA] transition-all duration-200 text-left disabled:opacity-50 hover-scale"
                  >
                    <div className="w-8 h-8 rounded bg-[#10B981] flex items-center justify-center text-white">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v9M4 6l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-600 text-[#111827]">Excel (.xlsx)</div>
                      <div className="text-[11px] text-[#9CA3AF]">Full analysis with multiple sheets</div>
                    </div>
                    {isExporting && (
                      <div className="w-4 h-4 border-2 border-[#635BFF] border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowExportDialog(false)}
                    disabled={isExporting}
                    className="flex-1 py-2 rounded-lg text-[13px] font-600 text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F7F8FA] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
