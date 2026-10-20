/**
 * SectionBoundary — keeps one dashboard section's failure from blanking the page.
 * Shows a small notice in place of the section instead.
 */

import React from 'react'
import { AlertTriangle } from 'lucide-react'

export default class SectionBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(`${this.props.name || 'Dashboard section'} failed:`, error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{this.props.name || 'This section'} couldn't load</p>
          <p className="text-xs text-gray-500 mt-0.5 break-words">{String(this.state.error?.message || this.state.error)}</p>
          <button onClick={() => this.setState({ error: null })} className="mt-2 text-xs font-medium text-blue-600 hover:underline">
            Try again
          </button>
        </div>
      </div>
    )
  }
}
