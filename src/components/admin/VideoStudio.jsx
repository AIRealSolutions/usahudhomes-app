import React, { useState } from 'react'
import { Film, Zap, Library, Clapperboard } from 'lucide-react'
import VideoTemplateBuilder from './VideoTemplateBuilder'
import VideoBulkGenerator from './VideoBulkGenerator'
import VideoLibrary from './VideoLibrary'

const TABS = [
  {
    id: 'builder',
    label: 'Template Builder',
    icon: Clapperboard,
    desc: 'Design & save video layout templates',
    component: VideoTemplateBuilder,
  },
  {
    id: 'generator',
    label: 'Bulk Generator',
    icon: Zap,
    desc: 'Select properties & queue AI video generation',
    component: VideoBulkGenerator,
  },
  {
    id: 'library',
    label: 'Video Library',
    icon: Library,
    desc: 'Download, add AI metadata & upload to YouTube',
    component: VideoLibrary,
  },
]

export default function VideoStudio() {
  const [activeTab, setActiveTab] = useState('builder')
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component

  return (
    <div className="space-y-4">
      {/* Studio header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">HUD Video Studio</h1>
            <p className="text-xs text-blue-200">
              Build templates → Select properties → Bulk-generate Reels/Shorts → Upload to YouTube
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Active sub-component */}
      <div className="bg-gray-50 rounded-xl p-4 min-h-96">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  )
}
