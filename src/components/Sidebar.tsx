export type SidebarTab = 'overview' | 'candidates' | 'job-analysis' | 'skills' | 'analytics' | 'shortlisted' | 'email'

interface SidebarProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  onNewAnalysis: () => void
}

import React from 'react'

const NAV_ITEMS: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: 'candidates',
    label: 'Candidates',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="2.5" fill="currentColor" opacity="0.9" />
        <path d="M1 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <circle cx="12.5" cy="5.5" r="1.8" fill="currentColor" opacity="0.5" />
        <path d="M11 13c0-1.9 1.12-3.53 2.74-4.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: 'job-analysis',
    label: 'Job Analysis',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'skills',
    label: 'Skills',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L9.73 6.27L14 7.27L11 10.14L11.76 14.27L8 12.27L4.24 14.27L5 10.14L2 7.27L6.27 6.27L8 2Z" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 12L5.5 7.5L8.5 9.5L12 4.5L14 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="5.5" cy="7.5" r="1.5" fill="currentColor" opacity="0.7" />
        <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" opacity="0.7" />
        <circle cx="12" cy="4.5" r="1.5" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
  {
    id: 'shortlisted',
    label: 'Shortlisted',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M13.78 4.22a.75.75 0 010 1.06l-7 7a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 011.06-1.06L6 10.44l6.72-6.72a.75.75 0 011.06 0z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'email',
    label: 'Email',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M1 3.75l7 5.5 7-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
]

export default function Sidebar({ activeTab, onTabChange, onNewAnalysis }: SidebarProps) {
  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col bg-white border-r border-[#E5E7EB] h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#635BFF]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="3" fill="white" opacity="0.95" />
              <path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.22 3.22l1.41 1.41M9.37 9.37l1.41 1.41M10.78 3.22l-1.41 1.41M4.63 9.37l-1.41 1.41" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
          <div>
            <div className="text-[12px] font-700 text-[#111827] leading-tight">HireSense AI</div>
            <div className="text-[10px] text-[#9CA3AF] font-400">Intelligent Hiring</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-600 text-[#9CA3AF] uppercase tracking-wider px-2 mb-2">
          Dashboard
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-500 transition-all duration-150 ${
                isActive
                  ? 'bg-[#EEF0FF] text-[#635BFF]'
                  : 'text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#111827]'
              }`}
            >
              <span className={isActive ? 'text-[#635BFF]' : 'text-[#9CA3AF]'}>{item.icon}</span>
              {item.label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#635BFF]" />
              )}
            </button>
          )
        })}
      </nav>

      {/* New Analysis CTA */}
      <div className="px-3 py-4 border-t border-[#E5E7EB]">
        <button
          onClick={onNewAnalysis}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-600 text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] bg-[#635BFF]"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1.5v10M1.5 6.5h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Analysis
        </button>
        <div className="mt-3 flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[11px] font-600 text-[#374151]">
            JS
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-500 text-[#111827] truncate">Jamie Scott</div>
            <div className="text-[11px] text-[#9CA3AF] truncate">Senior Recruiter</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
