import { useState, useRef, useCallback } from 'react'

interface UploadedFile {
  name: string
  size: number
  id: string
  file: File
}

interface NewAnalysisProps {
  onAnalyze: (jobDescription: string, jobTitle: string | undefined, files: File[]) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function NewAnalysis({ onAnalyze }: NewAnalysisProps) {
  const [jdText, setJdText] = useState('')
  const [jdMode, setJdMode] = useState<'paste' | 'pdf'>('paste')
  const [jdPdfFile, setJdPdfFile] = useState<File | null>(null)
  const [isExtractingJd, setIsExtractingJd] = useState(false)
  const [jdExtractionError, setJdExtractionError] = useState<string | null>(null)
  
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [invalidFilesCount, setInvalidFilesCount] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const jdFileInputRef = useRef<HTMLInputElement>(null)
  const jdRequestCounter = useRef(0)

  const addFiles = useCallback((newFileList: FileList | null) => {
    if (!newFileList) return
    
    const incomingFiles = Array.from(newFileList)
    const validFiles = incomingFiles
      .filter(file => file.name.toLowerCase().endsWith('.pdf'))
      .filter(file => !files.some((f) => f.name === file.name))
      
    const invalidCount = incomingFiles.length - validFiles.length
    if (invalidCount > 0) {
      setInvalidFilesCount(prev => prev + invalidCount)
    }
    
    const newFiles = validFiles.map(file => ({
      name: file.name,
      size: file.size,
      id: Math.random().toString(36).slice(2),
      file,
    }))
    
    if (newFiles.length) setFiles((prev) => [...prev, ...newFiles])
  }, [files])

  const handleJdPdfSelected = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setJdExtractionError('Only PDF files are supported.')
      return
    }
    setJdPdfFile(file)
    setIsExtractingJd(true)
    setJdExtractionError(null)
    
    const reqId = ++jdRequestCounter.current
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await fetch('http://localhost:8000/api/v1/job-descriptions/extract', {
        method: 'POST',
        body: formData
      })
      
      if (reqId !== jdRequestCounter.current) return
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setJdExtractionError(data.detail || 'Unable to read the PDF.')
        setIsExtractingJd(false)
        return
      }
      
      const data = await res.json()
      setJdText(data.text)
      setIsExtractingJd(false)
    } catch (err) {
      if (reqId !== jdRequestCounter.current) return
      setJdExtractionError('Network error occurred during extraction.')
      setIsExtractingJd(false)
    }
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files)
  }, [addFiles])

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id)
      if (next.length === 0) setInvalidFilesCount(0)
      return next
    })
  }

  const clearJd = () => {
    setJdText('')
    if (jdMode === 'pdf') {
      setJdPdfFile(null)
      setJdExtractionError(null)
      jdRequestCounter.current++
    }
  }

  const canAnalyze = jdText.trim().length > 20 && files.length > 0 && !isExtractingJd

  const handleAnalyze = () => {
    if (!canAnalyze) return
    
    const jobTitle = jdText.split('\n')[0].trim() || undefined
    const resumeFiles = files.map(f => f.file)
    onAnalyze(jdText, jobTitle, resumeFiles)
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* Header bar */}
      <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-8 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #635BFF 0%, #8B84FF 100%)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="3" fill="white" opacity="0.9" />
              <path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.22 3.22l1.41 1.41M9.37 9.37l1.41 1.41M10.78 3.22l-1.41 1.41M4.63 9.37l-1.41 1.41" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
            </svg>
          </div>
          <span className="text-[13px] font-700 text-[#111827]">HireSense AI</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6v2.5L2 10.5v.5h12v-.5L12.5 8.5V6C12.5 3.515 10.485 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
              <path d="M6.5 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </svg>
          </button>
          <div className="w-7 h-7 rounded-full bg-[#EEF0FF] flex items-center justify-center text-[11px] font-700 text-[#635BFF]">
            JS
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-start px-6 py-10 max-w-6xl mx-auto w-full">
        {/* Hero text */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-[#EEF0FF] text-[#635BFF] text-[12px] font-600 px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#635BFF] animate-blink" />
            AI-Powered Analysis
          </div>
          <h1 className="text-[30px] font-800 text-[#111827] tracking-tight leading-tight mb-2">
            HireSense AI
          </h1>
          <p className="text-[15px] text-[#6B7280] font-400">
            Analyze and rank candidates using AI-powered resume matching.
          </p>
        </div>

        {/* Two column cards */}
        <div className="w-full grid grid-cols-2 gap-5 mb-6 h-[340px]" style={{ animationDelay: '0.1s' }}>
          {/* Job Description Card */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden flex flex-col h-full" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#EEF0FF] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="#635BFF" strokeWidth="1.2" fill="none" />
                    <path d="M3 4h6M3 6h6M3 8h4" stroke="#635BFF" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-[13px] font-700 text-[#111827]">Job Description</span>
              </div>
              <div className="flex p-0.5 bg-[#F3F4F6] rounded-md">
                <button 
                  onClick={() => setJdMode('paste')} 
                  className={`px-3 py-1 text-[11px] font-600 rounded-sm transition-colors ${jdMode === 'paste' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}`}
                >
                  Paste JD
                </button>
                <button 
                  onClick={() => setJdMode('pdf')} 
                  className={`px-3 py-1 text-[11px] font-600 rounded-sm transition-colors ${jdMode === 'pdf' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}`}
                >
                  Upload PDF
                </button>
              </div>
            </div>

            {jdMode === 'paste' ? (
              <div className="p-5 flex-1 flex flex-col min-h-0">
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste your job description here... Include role title, responsibilities, requirements, and desired skills."
                  className="w-full flex-1 text-[13px] text-[#111827] placeholder-[#9CA3AF] bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg px-3.5 py-3 resize-none focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#EEF0FF] transition-all duration-150 leading-relaxed font-400 min-h-0 overflow-y-auto"
                />

                {jdText.length > 0 && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-[#9CA3AF]">{jdText.length} characters</span>
                    <button
                      onClick={clearJd}
                      className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <input type="file" className="hidden" ref={jdFileInputRef} accept="application/pdf" onChange={(e) => { if (e.target.files?.[0]) handleJdPdfSelected(e.target.files[0]); e.target.value = '' }} />
                
                {!jdPdfFile ? (
                  <div 
                    className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-lg bg-[#F9FAFB] m-5 cursor-pointer hover:bg-[#F3F4F6] transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) handleJdPdfSelected(e.dataTransfer.files[0]) }}
                    onClick={() => jdFileInputRef.current?.click()}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#EEF0FF] flex items-center justify-center text-[#635BFF] mb-3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    </div>
                    <h4 className="text-[13px] font-600 text-[#111827] mb-1">Upload JD PDF</h4>
                    <p className="text-[12px] text-[#6B7280] text-center px-4">Drop PDF here or click to browse<br/>PDF files · 1 file only</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 p-5">
                    <div className="flex items-center gap-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 mb-4 flex-shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <div className="flex flex-col flex-1 min-w-0">
                         <span className="text-[13px] font-600 text-[#111827] truncate">{jdPdfFile.name}</span>
                         <span className="text-[11px] text-[#6B7280]">{formatBytes(jdPdfFile.size)}</span>
                      </div>
                      <div className="flex items-center gap-3 border-l border-[#E5E7EB] pl-3">
                        <button className="text-[12px] font-600 text-[#635BFF] hover:text-[#4F46E5] transition-colors" onClick={() => jdFileInputRef.current?.click()}>Replace</button>
                        <button className="text-[12px] font-600 text-[#EF4444] hover:text-[#DC2626] transition-colors" onClick={clearJd}>Remove</button>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                       {isExtractingJd ? (
                          <div className="flex-1 flex flex-col items-center justify-center bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                             <svg className="animate-spin w-6 h-6 text-[#635BFF] mb-3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"/></svg>
                             <span className="text-[13px] font-500 text-[#111827]">Reading job description...</span>
                          </div>
                       ) : jdExtractionError ? (
                          <div className="flex-1 flex flex-col items-center justify-center bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-center px-4">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" className="mb-3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                             <span className="text-[13px] font-500 text-[#991B1B]">{jdExtractionError}</span>
                          </div>
                       ) : (
                          <div className="flex-1 flex flex-col min-h-0 animate-fade-in-up">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-[12px] font-600 text-[#10B981] flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Job description extracted</span>
                            </div>
                            <textarea
                              value={jdText}
                              onChange={(e) => setJdText(e.target.value)}
                              className="w-full flex-1 text-[13px] text-[#111827] bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg px-3.5 py-3 resize-none focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#EEF0FF] transition-all duration-150 leading-relaxed font-400 min-h-0 overflow-y-auto"
                            />
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[11px] text-[#9CA3AF]">{jdText.length} characters</span>
                            </div>
                          </div>
                       )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resume Upload Card */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden flex flex-col h-full" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#EEF0FF] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 10V3a1 1 0 011-1h4.586a1 1 0 01.707.293L9.707 3.707A1 1 0 0110 4.414V10a1 1 0 01-1 1H3a1 1 0 01-1-1z" stroke="#635BFF" strokeWidth="1.2" fill="none" />
                    <path d="M7 2v2.5H9.5" stroke="#635BFF" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-[13px] font-700 text-[#111827]">Resume Upload</span>
              </div>
              {files.length > 0 && (
                <span className="text-[11px] font-600 text-[#635BFF] bg-[#EEF0FF] px-2 py-0.5 rounded-full">
                  {files.length} files
                </span>
              )}
            </div>

            <div className="p-5 flex flex-col flex-1 min-h-0">
              {/* Drop zone */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 py-4 flex-shrink-0 ${
                  isDragging
                    ? 'border-[#635BFF] bg-[#F7F8FF] scale-[1.01]'
                    : 'border-[#D1D5DB] hover:border-[#635BFF] hover:bg-[#F7F8FF]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors ${isDragging ? 'bg-[#EEF0FF]' : 'bg-[#F3F4F6]'}`}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 3v10M7 6l3-3 3 3" stroke={isDragging ? '#635BFF' : '#9CA3AF'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 16h12" stroke={isDragging ? '#635BFF' : '#9CA3AF'} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <span className={`text-[13px] font-600 transition-colors ${isDragging ? 'text-[#635BFF]' : 'text-[#374151]'}`}>
                  {isDragging ? 'Release to upload' : 'Drop resumes here'}
                </span>
                <span className="text-[12px] text-[#9CA3AF] mt-0.5">or click to browse</span>
                <span className="text-[11px] text-[#C4C9D4] mt-1">PDF files · Multiple files supported</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-3 flex-1 overflow-y-auto space-y-1.5 min-h-0">
                  {files.map((file, idx) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#F7F8FA] border border-[#F3F4F6] group hover:border-[#E5E7EB] transition-colors"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="w-7 h-7 rounded-md bg-[#EEF0FF] flex items-center justify-center flex-shrink-0">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <path d="M2.5 11.5V2.5a1 1 0 011-1h4.17a1 1 0 01.71.29l1.83 1.83a1 1 0 01.29.71v7.17a1 1 0 01-1 1h-6a1 1 0 01-1-1z" stroke="#635BFF" strokeWidth="1.1" fill="none" />
                          <path d="M7.5 1.5v2.5H10" stroke="#635BFF" strokeWidth="1.1" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-500 text-[#111827] truncate">{file.name}</div>
                        <div className="text-[11px] text-[#9CA3AF]">{formatBytes(file.size)}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          <span className="text-[11px] text-[#10B981] font-500">Ready</span>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="w-5 h-5 rounded flex items-center justify-center text-[#C4C9D4] hover:text-[#EF4444] hover:bg-[#FEF2F2] opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resume Insights */}
        {files.length > 0 && (
          <div className="w-full bg-white rounded-xl border border-[#E5E7EB] p-5 mb-8 animate-fade-in-up" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 className="text-[14px] font-700 text-[#111827] mb-4">Resume Insights</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#F7F8FA] p-3 rounded-lg border border-[#E5E7EB]">
                  <div className="text-[11px] font-600 text-[#6B7280] uppercase tracking-wider mb-1">Total Resumes</div>
                  <div className="text-[18px] font-700 text-[#111827]">{files.length}</div>
                </div>
                <div className="bg-[#F7F8FA] p-3 rounded-lg border border-[#E5E7EB]">
                  <div className="text-[11px] font-600 text-[#6B7280] uppercase tracking-wider mb-1">Total File Size</div>
                  <div className="text-[18px] font-700 text-[#111827]">{formatBytes(files.reduce((acc, f) => acc + f.size, 0))}</div>
                </div>
                <div className="bg-[#F7F8FA] p-3 rounded-lg border border-[#E5E7EB]">
                  <div className="text-[11px] font-600 text-[#6B7280] uppercase tracking-wider mb-1">PDF Files</div>
                  <div className="text-[18px] font-700 text-[#111827]">{files.filter(f => f.name.toLowerCase().endsWith('.pdf')).length}</div>
                </div>
              </div>
              <div>
                <h4 className="text-[12px] font-600 text-[#6B7280] uppercase tracking-wider mb-3">Upload Status</h4>
                <div className="flex items-center gap-6 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#D1FAE5] flex items-center justify-center text-[#10B981]">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-[13px] font-600 text-[#111827]">{files.length} Ready</span>
                  </div>
                  {invalidFilesCount > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#EF4444]">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <span className="text-[13px] font-600 text-[#6B7280]">{invalidFilesCount} Failed</span>
                    </div>
                  )}
                </div>
                <div className="text-[12px] text-[#6B7280]">
                  {invalidFilesCount > 0 
                    ? `${files.length} resumes ready · ${invalidFilesCount} failed validation`
                    : 'All uploaded resumes are ready for analysis.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`flex items-center gap-2.5 px-8 py-3.5 rounded-lg text-[15px] font-700 text-white transition-all duration-200 hover-lift ${
              canAnalyze
                ? 'hover:opacity-90 hover:shadow-lg active:scale-[0.98] cursor-pointer'
                : 'opacity-40 cursor-not-allowed'
            }`}
            style={canAnalyze ? { background: 'linear-gradient(135deg, #635BFF 0%, #8B84FF 100%)', boxShadow: '0 4px 14px rgba(99,91,255,0.35)' } : { background: '#9CA3AF' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L8.5 5.5L12.5 7L8.5 8.5L7 12.5L5.5 8.5L1.5 7L5.5 5.5L7 1.5Z" fill="white" />
            </svg>
            Analyze Candidates
          </button>
          <div className="flex items-center gap-2 text-[12px] text-[#9CA3AF]">
            <span className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="4" stroke="#9CA3AF" strokeWidth="1" fill="none" />
                <path d="M5 3v3M5 7.5v.5" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round" />
              </svg>
              Semantic matching
            </span>
            <span className="w-1 h-1 rounded-full bg-[#D1D5DB]" />
            <span>Skill analysis</span>
            <span className="w-1 h-1 rounded-full bg-[#D1D5DB]" />
            <span>Candidate ranking</span>
          </div>
        </div>
      </main>
    </div>
  )
}
