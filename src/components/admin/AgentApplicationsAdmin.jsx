import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { CheckCircle, XCircle, Eye, Clock, Mail, Phone, Building, MapPin, Star, FileText, AlertCircle } from 'lucide-react'
import { agentApplicationService } from '../../services/agentApplicationService'
import { useAuth } from '../../contexts/AuthContext'
import { US_STATES } from '../../data/referralAgreementTemplate'

const AgentApplicationsAdmin = () => {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    setLoading(true)
    const result = await agentApplicationService.getPendingApplications()
    if (result.success) {
      setApplications(result.data)
    }
    setLoading(false)
  }

  const handleViewDetails = (application) => {
    setSelectedApplication(application)
    setShowDetailModal(true)
  }

  const handleApprove = async (application) => {
    if (!confirm(`Are you sure you want to approve ${application.first_name} ${application.last_name}?`)) {
      return
    }

    setProcessing(true)
    const result = await agentApplicationService.approveApplication(application.id, user.id)
    
    if (result.success) {
      alert('Application approved successfully! The agent will receive an email with login credentials.')
      loadApplications()
      setShowDetailModal(false)
    } else {
      alert('Error approving application: ' + result.error)
    }
    setProcessing(false)
  }

  const handleReject = (application) => {
    setSelectedApplication(application)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setProcessing(true)
    const result = await agentApplicationService.rejectApplication(
      selectedApplication.id,
      user.id,
      rejectionReason
    )

    if (result.success) {
      alert('Application rejected. The applicant will be notified via email.')
      loadApplications()
      setShowRejectModal(false)
      setShowDetailModal(false)
    } else {
      alert('Error rejecting application: ' + result.error)
    }
    setProcessing(false)
  }

  const getStateName = (code) => {
    const state = US_STATES.find(s => s.code === code)
    return state ? state.name : code
  }

  const getStatusBadge = (application) => {
    if (application.status === 'pending') {
      return <Badge variant="warning" className="bg-yellow-100 text-yellow-800">Pending Verification</Badge>
    } else if (application.status === 'under_review') {
      return <Badge variant="info" className="bg-blue-100 text-blue-800">Under Review</Badge>
    } else if (application.status === 'approved') {
      return <Badge variant="success" className="bg-green-100 text-green-800">Approved</Badge>
    } else if (application.status === 'rejected') {
      return <Badge variant="destructive" className="bg-red-100 text-red-800">Rejected</Badge>
    }
    return <Badge>{application.status}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Applications</h2>
          <p className="text-gray-600">Review and approve new agent applications</p>
        </div>
        <Button onClick={loadApplications} variant="outline">
          <Clock className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{applications.filter(a => a.status === 'pending').length}</div>
            <p className="text-sm text-gray-600">Pending Verification</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{applications.filter(a => a.status === 'under_review').length}</div>
            <p className="text-sm text-gray-600">Under Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{applications.length}</div>
            <p className="text-sm text-gray-600">Total Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Applications</h3>
            <p className="text-gray-600">All applications have been reviewed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {application.first_name} {application.last_name}
                      </h3>
                      {getStatusBadge(application)}
                      {application.email_verified && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Email Verified
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        {application.email}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        {application.phone}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building className="w-4 h-4" />
                        License: {application.license_number} ({application.license_state})
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {application.states_covered?.length || 0} states covered
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-500">
                      Applied: {new Date(application.created_at).toLocaleDateString()} at {new Date(application.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(application)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    {application.email_verified && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(application)}
                          disabled={processing}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(application)}
                          disabled={processing}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedApplication && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>
                Review complete application for {selectedApplication.first_name} {selectedApplication.last_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Name</div>
                    <div className="font-medium">{selectedApplication.first_name} {selectedApplication.last_name}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Email</div>
                    <div className="font-medium">{selectedApplication.email}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Phone</div>
                    <div className="font-medium">{selectedApplication.phone}</div>
                  </div>
                  {selectedApplication.company && (
                    <div>
                      <div className="text-gray-600">Company</div>
                      <div className="font-medium">{selectedApplication.company}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* License Info */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  License Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">License Number</div>
                    <div className="font-medium">{selectedApplication.license_number}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">License State</div>
                    <div className="font-medium">{getStateName(selectedApplication.license_state)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Years of Experience</div>
                    <div className="font-medium">{selectedApplication.years_experience} years</div>
                  </div>
                </div>
              </div>

              {/* Territory */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Operating Territory ({selectedApplication.states_covered?.length || 0} states)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedApplication.states_covered?.map(code => (
                    <Badge key={code} variant="secondary">{code}</Badge>
                  ))}
                </div>
              </div>

              {/* Specialties */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Specialties
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedApplication.specialties?.map(specialty => (
                    <Badge key={specialty} variant="outline">{specialty}</Badge>
                  ))}
                </div>
              </div>

              {/* Bio */}
              {selectedApplication.bio && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Professional Bio</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApplication.bio}</p>
                </div>
              )}

              {/* Referral Agreement */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Referral Agreement</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Referral Fee</div>
                    <div className="font-medium text-lg">{selectedApplication.referral_fee_percentage}%</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Terms Agreed</div>
                    <div className="font-medium">
                      {selectedApplication.agreed_to_terms ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-red-600">No</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Verification Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Email Verified</span>
                    {selectedApplication.email_verified ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="bg-yellow-100 text-yellow-800">
                        Pending
                      </Badge>
                    )}
                  </div>
                  {selectedApplication.email_verified_at && (
                    <div className="text-gray-600 text-xs">
                      Verified on: {new Date(selectedApplication.email_verified_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
              {selectedApplication.email_verified && selectedApplication.status === 'under_review' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedApplication)}
                    disabled={processing}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(selectedApplication)}
                    disabled={processing}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Application
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this application. The applicant will receive this in an email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                This action cannot be undone. The applicant will be notified via email.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <Textarea
                placeholder="e.g., License could not be verified, Insufficient experience, etc."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AgentApplicationsAdmin
