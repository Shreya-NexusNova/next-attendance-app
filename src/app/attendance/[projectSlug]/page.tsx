'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Contractor {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface AttendanceRecord {
  id: number;
  contractor_id: number;
  project_id: number;
  date: string;
  status: 'present' | 'absent';
  overtime_hours: number;
  work_time: string | null;
  overtime_start_time?: string;
  overtime_end_time?: string;
}

interface AttendanceData {
  contractor: Contractor;
  attendance: AttendanceRecord | null;
}

interface Project {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: string;
}

export default function AttendancePage({ params }: { params: Promise<{ projectSlug: string }> }) {
  const [project, setProject] = useState<Project | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddContractor, setShowAddContractor] = useState(false);
  const [showEditContractor, setShowEditContractor] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [newContractor, setNewContractor] = useState({ name: '', email: '', phone: '' });
  const [editContractor, setEditContractor] = useState({ name: '', email: '', phone: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [projectSlug, setProjectSlug] = useState<string>('');
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [overtimeTimes, setOvertimeTimes] = useState({ startTime: '', endTime: '' });
  const [isSavingOvertime, setIsSavingOvertime] = useState(false);
  const [showDeleteContractorModal, setShowDeleteContractorModal] = useState(false);
  const [contractorToDelete, setContractorToDelete] = useState<Contractor | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  // Resolve params
  useEffect(() => {
    params.then((resolvedParams) => {
      setProjectSlug(resolvedParams.projectSlug);
    });
  }, [params]);

  useEffect(() => {
    fetchProject();
  }, [projectSlug]);

  useEffect(() => {
    if (project) {
      fetchContractors();
    }
  }, [project]);

  useEffect(() => {
    if (contractors.length > 0) {
      fetchAttendance();
    }
  }, [contractors, selectedDate]);

  const fetchProject = async () => {
    if (!projectSlug) return; // Don't fetch if slug is not available yet
    
    try {
      console.log('Fetching project with slug:', projectSlug);
      const response = await fetch(`/api/projects/slug/${projectSlug}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Project fetched successfully:', data.project);
        setProject(data.project);
      } else {
        console.error('Failed to fetch project:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchContractors = async () => {
    if (!project) return;
    
    try {
      console.log('Fetching contractors for project:', project.id);
      const response = await fetch(`/api/projects/${project.id}/contractors`);
      if (response.ok) {
        const data = await response.json();
        console.log('Contractors fetched successfully:', data.contractors);
        setContractors(data.contractors);
      }
    } catch (error) {
      console.error('Error fetching contractors:', error);
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!project) return;
    
    try {
      const response = await fetch(`/api/attendance?projectId=${project.id}&date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setAttendanceData(data.attendance);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const handleAttendanceChange = (contractorId: number, status: 'present' | 'absent') => {
    setAttendanceData(prev => 
      prev.map(item => {
        if (item.contractor.id === contractorId) {
          return {
            ...item,
            attendance: {
              ...item.attendance,
              contractor_id: contractorId,
              project_id: project?.id || 0,
              date: selectedDate,
              status: status,
              overtime_hours: item.attendance?.overtime_hours || 0,
              work_time: item.attendance?.work_time || null,
              id: item.attendance?.id || 0
            }
          };
        }
        return item;
      })
    );
  };

  const handleWorkTimeChange = (contractorId: number, workTime: string) => {
    setAttendanceData(prev => 
      prev.map(item => {
        if (item.contractor.id === contractorId) {
          return {
            ...item,
            attendance: {
              ...item.attendance,
              contractor_id: contractorId,
              project_id: project?.id || 0,
              date: selectedDate,
              status: item.attendance?.status || 'present',
              overtime_hours: item.attendance?.overtime_hours || 0,
              work_time: workTime,
              id: item.attendance?.id || 0
            }
          };
        }
        return item;
      })
    );
  };

  const saveAttendance = async () => {
    if (!project) return;
    
    setIsSaving(true);
    try {
      const attendanceRecords = attendanceData.map(item => ({
        contractorId: item.contractor.id,
        status: item.attendance?.status || 'absent',
        overtimeHours: item.attendance?.overtime_hours || 0,
        workTime: item.attendance?.work_time || null
      }));

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          date: selectedDate,
          attendanceRecords
        }),
      });

      if (response.ok) {
        setSuccessMessage('Attendance saved successfully!');
        setShowSuccessModal(true);
        fetchAttendance();
      } else {
        setSuccessMessage('Error saving attendance');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      setSuccessMessage('Error saving attendance');
      setShowSuccessModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  const addContractor = async (e: React.FormEvent) => {
    if (!project) return;
    
    e.preventDefault();
    try {
      const response = await fetch(`/api/projects/${project.id}/contractors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContractor),
      });

      if (response.ok) {
        setNewContractor({ name: '', email: '', phone: '' });
        setShowAddContractor(false);
        fetchContractors();
      }
    } catch (error) {
      console.error('Error adding contractor:', error);
    }
  };

  const handleEditContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContractor) return;

    try {
      const response = await fetch(`/api/contractors/${editingContractor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editContractor),
      });

      if (response.ok) {
        setEditContractor({ name: '', email: '', phone: '' });
        setShowEditContractor(false);
        setEditingContractor(null);
        fetchContractors();
      }
    } catch (error) {
      console.error('Error updating contractor:', error);
    }
  };

  const handleDeleteContractor = async (contractorId: number) => {
    const contractor = contractors.find(c => c.id === contractorId);
    if (contractor) {
      setContractorToDelete(contractor);
      setShowDeleteContractorModal(true);
    }
  };

  const confirmDeleteContractor = async () => {
    if (!contractorToDelete) return;

    try {
      const response = await fetch(`/api/contractors/${contractorToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteContractorModal(false);
        setContractorToDelete(null);
        setSuccessMessage('Contractor deleted successfully!');
        setShowSuccessModal(true);
        fetchContractors();
      } else {
        setShowDeleteContractorModal(false);
        setContractorToDelete(null);
        setSuccessMessage('Error deleting contractor');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error deleting contractor:', error);
      setShowDeleteContractorModal(false);
      setContractorToDelete(null);
      setSuccessMessage('Error deleting contractor');
      setShowSuccessModal(true);
    }
  };

  const openEditContractorModal = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setEditContractor({
      name: contractor.name,
      email: contractor.email,
      phone: contractor.phone
    });
    setShowEditContractor(true);
  };

  const exportAttendance = async () => {
    if (!project) return;
    
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/export/attendance?projectId=${project.id}&startDate=${selectedDate}&endDate=${selectedDate}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project?.name.replace(/[^a-z0-9]/gi, '_')}_attendance_${selectedDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setSuccessMessage('Error exporting attendance');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error exporting attendance:', error);
      setSuccessMessage('Error exporting attendance');
      setShowSuccessModal(true);
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const openOvertimeModal = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    // Get existing overtime times if available
    const attendanceRecord = attendanceData.find(item => item.contractor.id === contractor.id)?.attendance;
    setOvertimeTimes({
      startTime: attendanceRecord?.overtime_start_time || '',
      endTime: attendanceRecord?.overtime_end_time || ''
    });
    setShowOvertimeModal(true);
  };

  const saveOvertime = async () => {
    if (!selectedContractor || !project || !overtimeTimes.startTime || !overtimeTimes.endTime) {
      alert('Please select both start and end times');
      return;
    }

    setIsSavingOvertime(true);
    try {
      const response = await fetch('/api/attendance/overtime', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId: selectedContractor.id,
          projectId: project.id,
          date: selectedDate,
          startTime: overtimeTimes.startTime,
          endTime: overtimeTimes.endTime
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Overtime saved successfully! Total: ${data.overtimeHours} hours`);
        setShowOvertimeModal(false);
        fetchAttendance(); // Refresh attendance data
      } else {
        alert('Error saving overtime');
      }
    } catch (error) {
      console.error('Error saving overtime:', error);
      alert('Error saving overtime');
    } finally {
      setIsSavingOvertime(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50" style={{ boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-center py-4 sm:py-5 space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-5">
              <Link
                href="/dashboard"
                className="px-3 py-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium text-white transition-all duration-300 hover:transform hover:-translate-y-1"
                style={{ background: '#6c757d' }}
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 text-center sm:text-left">
                {project?.name || 'Loading...'}
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-5">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-1 sm:px-3 sm:py-2 border-2 border-gray-200 rounded-md text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <button
                onClick={() => router.push('/api/auth/logout')}
                className="px-3 py-2 sm:px-4 rounded-md text-white font-semibold transition-all duration-300 hover:transform hover:-translate-y-1 text-xs sm:text-sm"
                style={{ 
                  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                  boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="">
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mb-6 sm:mb-8">
            <button
              onClick={() => setShowAddContractor(true)}
              className="px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-white font-semibold transition-all duration-300 hover:transform hover:-translate-y-1 text-sm sm:text-base"
              style={{ 
                background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)',
                boxShadow: '0 6px 20px rgba(0, 86, 179, 0.3)'
              }}
            >
              <span className="hidden sm:inline">Add Contractor</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button
              onClick={exportAttendance}
              disabled={isExporting}
              className="px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-white font-semibold transition-all duration-300 hover:transform hover:-translate-y-1 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)',
                boxShadow: '0 6px 20px rgba(0, 86, 179, 0.3)'
              }}
            >
              {isExporting ? 'Exporting...' : (
                <>
                  <span className="hidden sm:inline">Export to Excel</span>
                  <span className="sm:hidden">Export</span>
                </>
              )}
            </button>
            <button
              onClick={saveAttendance}
              disabled={isSaving}
              className="px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-white font-semibold transition-all duration-300 hover:transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              style={{ 
                background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)',
                boxShadow: '0 6px 20px rgba(0, 86, 179, 0.3)'
              }}
            >
              {isSaving ? 'Saving...' : (
                <>
                  <span className="hidden sm:inline">Save Attendance</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </button>
          </div>
          </div>

          {contractors.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No contractors yet</h3>
              <p className="text-gray-500 mb-8">Add contractors to start managing attendance.</p>
              <button
                onClick={() => setShowAddContractor(true)}
                className="px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 hover:transform hover:-translate-y-1"
                style={{ 
                  background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)',
                  boxShadow: '0 6px 20px rgba(0, 86, 179, 0.3)'
                }}
              >
                Add Contractor
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl" style={{ boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
              <div className="sticky top-0 z-10 px-3 sm:px-6 py-3 sm:py-4 text-white text-xs sm:text-sm font-semibold uppercase tracking-wide" style={{ background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)' }}>
                <div className="grid grid-cols-6 gap-2 sm:gap-4 min-w-[700px]">
                  <div>CONTRACTOR NAME</div>
                  <div className="text-center">PRESENT</div>
                  <div className="text-center">ABSENT</div>
                  <div className="text-center">OVERTIME HOURS</div>
                  <div className="text-right">TOTAL OVERTIME HOURS WORKED</div>
                  <div className="text-center">ACTIONS</div>
                </div>
              </div>
              <div className="overflow-x-auto">
              <ul className="divide-y divide-gray-100">
                {attendanceData.map((item) => (
                  <li key={item.contractor.id} className="px-3 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors duration-200">
                    <div className="grid grid-cols-6 gap-2 sm:gap-4 items-center min-w-[700px]">
                      <div className="font-semibold text-gray-800 text-sm sm:text-base lg:text-lg">
                        {item.contractor.name}
                      </div>
                      
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleAttendanceChange(item.contractor.id, 'present')}
                          className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 hover:scale-105 ${
                            item.attendance?.status === 'present' 
                              ? 'bg-green-500 border-green-500 text-white shadow-lg' 
                              : 'bg-white border-gray-300 text-gray-400 hover:border-green-500'
                          }`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleAttendanceChange(item.contractor.id, 'absent')}
                          className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 hover:scale-105 ${
                            item.attendance?.status === 'absent' 
                              ? 'bg-red-500 border-red-500 text-white shadow-lg' 
                              : 'bg-white border-gray-300 text-gray-400 hover:border-red-500'
                          }`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="text-center">
                        <button
                          onClick={() => openOvertimeModal(item.contractor)}
                          className="px-2 py-1 sm:px-3 sm:py-2 lg:px-4 lg:py-2 rounded-lg text-white font-semibold text-xs sm:text-sm transition-all duration-300 hover:transform hover:-translate-y-1"
                          style={{ 
                            background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)',
                            boxShadow: '0 4px 15px rgba(0, 86, 179, 0.3)'
                          }}
                        >
                          <span className="hidden sm:inline">Select Work Time</span>
                          <span className="sm:hidden">Time</span>
                        </button>
                      </div>
                      
                      <div className="text-right">
                        <span className="inline-block px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800">
                          {item.attendance?.overtime_hours || 0} hours
                        </span>
                      </div>
                      
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditContractorModal(item.contractor);
                          }}
                          className="p-2 rounded-lg text-green-600 hover:bg-green-100 transition-colors"
                          title="Edit contractor"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContractor(item.contractor.id);
                          }}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                          title="Delete contractor"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              </div>
            </div>
          )}
      </main>

      {/* Add Contractor Modal */}
      {showAddContractor && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Contractor</h3>
            <form onSubmit={addContractor}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newContractor.name}
                  onChange={(e) => setNewContractor({ ...newContractor, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newContractor.email}
                  onChange={(e) => setNewContractor({ ...newContractor, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newContractor.phone}
                  onChange={(e) => setNewContractor({ ...newContractor, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddContractor(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)' }}
                >
                  Add Contractor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Overtime Modal */}
      {showOvertimeModal && selectedContractor && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Select Work Time for {selectedContractor.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time:
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={overtimeTimes.startTime}
                    onChange={(e) => setOvertimeTimes(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="--:--"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time:
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={overtimeTimes.endTime}
                    onChange={(e) => setOvertimeTimes(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="--:--"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowOvertimeModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveOvertime}
                disabled={isSavingOvertime}
                className="px-4 py-2 rounded-md text-white font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)' }}
              >
                {isSavingOvertime ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contractor Modal */}
      {showEditContractor && editingContractor && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Contractor</h3>
            <form onSubmit={handleEditContractor}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={editContractor.name}
                  onChange={(e) => setEditContractor({ ...editContractor, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editContractor.email}
                  onChange={(e) => setEditContractor({ ...editContractor, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editContractor.phone}
                  onChange={(e) => setEditContractor({ ...editContractor, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditContractor(false);
                    setEditingContractor(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}
                >
                  Update Contractor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Contractor Confirmation Modal */}
      {showDeleteContractorModal && contractorToDelete && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Contractor</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete <strong>{contractorToDelete.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteContractorModal(false);
                    setContractorToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteContractor}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="text-center">
              <div className="flex-shrink-0 w-10 h-10 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {successMessage.includes('Error') ? 'Error' : 'Success'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">{successMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

