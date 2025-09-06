'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Project {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: string;
  contractor_count: number;
  created_at: string;
}

interface User {
  id: number;
  email: string;
  role: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [editProject, setEditProject] = useState({ name: '', description: '', status: 'ongoing' });
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchUser();
    fetchProjects();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/login');
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });

      if (response.ok) {
        setNewProject({ name: '', description: '' });
        setShowAddProject(false);
        fetchProjects();
      }
    } catch (error) {
      console.error('Error adding project:', error);
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    
    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProject),
      });

      if (response.ok) {
        setEditProject({ name: '', description: '', status: 'ongoing' });
        setShowEditProject(false);
        setEditingProject(null);
        fetchProjects();
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setProjectToDelete(project);
      setShowDeleteProjectModal(true);
    }
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteProjectModal(false);
        setProjectToDelete(null);
        setSuccessMessage('Project deleted successfully!');
        setShowSuccessModal(true);
        fetchProjects();
      } else {
        setShowDeleteProjectModal(false);
        setProjectToDelete(null);
        setSuccessMessage('Error deleting project');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setShowDeleteProjectModal(false);
      setProjectToDelete(null);
      setSuccessMessage('Error deleting project');
      setShowSuccessModal(true);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setEditProject({
      name: project.name,
      description: project.description,
      status: project.status
    });
    setShowEditProject(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProjectIcon = (index: number) => {
    const icons = [
      '/window.svg', // Window icon
      '/file.svg', // File icon
      '/globe.svg', // Globe icon
      '/vercel.svg', // Vercel icon
      '/next.svg', // Next.js icon
      '/window.svg', // Window icon (fallback)
    ];
    return icons[index % icons.length];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
      {/* Header */}
      <header className="relative z-10" style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid rgba(0, 86, 179, 0.1)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-center py-5 space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3 lg:space-x-5">
              <img 
                src="/background-image.webp" 
                alt="Nexus Nova Logo" 
                className="h-16 sm:h-20 lg:h-24 w-auto object-contain"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 lg:space-x-5">
              <button
                onClick={() => setShowAddProject(true)}
                className="px-4 py-2 sm:px-5 sm:py-3 rounded-lg text-white font-semibold flex items-center space-x-2 transition-all duration-300 hover:transform hover:-translate-y-1 text-sm sm:text-base"
                style={{ 
                  background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)',
                  boxShadow: '0 4px 15px rgba(0, 86, 179, 0.3)'
                }}
              >
                <span className="hidden sm:inline">Add Project</span>
                <span className="sm:hidden">Add</span>
              </button>
              <div className="flex items-center space-x-2 sm:space-x-3 bg-white bg-opacity-80 px-3 py-2 sm:px-4 rounded-lg backdrop-blur-sm border border-blue-100">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-sm sm:text-lg" style={{ background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)' }}>
                  👤
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs sm:text-sm font-bold text-gray-800">{user?.email}</p>
                  <p className="text-xs text-gray-500 font-medium capitalize">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 sm:px-5 sm:py-3 rounded-lg text-white font-semibold flex items-center space-x-2 transition-all duration-300 hover:transform hover:-translate-y-1 text-sm sm:text-base"
                style={{ 
                  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                  boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)'
                }}
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {projects.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No projects yet</h3>
                <p className="text-gray-500 mb-8">Get started by creating your first project.</p>
                <button
                  onClick={() => setShowAddProject(true)}
                  className="px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 hover:transform hover:-translate-y-1"
                  style={{ 
                    background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)',
                    boxShadow: '0 6px 20px rgba(0, 86, 179, 0.3)'
                  }}
                >
                  Create Project
                </button>
              </div>
            ) : (
              projects.map((project, index) => (
                <div 
                  key={project.id} 
                  className="bg-white bg-opacity-90 backdrop-blur-sm border-2 border-blue-100 rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-10 cursor-pointer transition-all duration-400 hover:transform hover:-translate-y-2 hover:scale-105 relative overflow-hidden group"
                  style={{ boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)' }}
                >
                  {/* Top border effect */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-blue-800 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400"></div>
                  
                  {/* Background overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-lg sm:text-xl lg:text-2xl" style={{ background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)' }}>
                        {index === 0 ? '🏥' : index === 1 ? '🏢' : '💻'}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2 leading-tight">{project.name}</h3>
                        <span className="inline-block px-3 py-1 sm:px-4 rounded-full text-xs font-bold text-white uppercase tracking-wide" style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">{project.description || 'No description'}</p>
                    
                   
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-center text-xs sm:text-sm text-gray-500">
                        <span className="mr-2">👥</span>
                        <span className="font-semibold">{project.contractor_count} Contractors</span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/attendance/${project.slug}`}
                          className="flex-1 px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-white font-semibold text-xs sm:text-sm transition-all duration-300 hover:transform hover:-translate-y-1 flex items-center justify-center"
                          style={{ 
                            background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)',
                            boxShadow: '0 6px 20px rgba(0, 86, 179, 0.3)'
                          }}
                        >
                          <span className="hidden sm:inline">Manage Attendance</span>
                          <span className="sm:hidden">Manage</span>
                        </Link>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(project);
                            }}
                            className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-white font-semibold text-xs sm:text-sm transition-all duration-300 hover:transform hover:-translate-y-1"
                            style={{ 
                              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                              boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
                            }}
                          >
                            <span className="hidden sm:inline">✏️</span>
                            <span className="sm:hidden">✏️</span>
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-white font-semibold text-xs sm:text-sm transition-all duration-300 hover:transform hover:-translate-y-1"
                            style={{ 
                              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                              boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)'
                            }}
                          >
                            <span className="hidden sm:inline">🗑️</span>
                            <span className="sm:hidden">🗑️</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
      </main>

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Project</h3>
            <form onSubmit={handleAddProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddProject(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg, #0b529e 0%, #043366 100%)' }}
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProject && editingProject && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Project</h3>
            <form onSubmit={handleEditProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editProject.name}
                  onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editProject.description}
                  onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={editProject.status}
                  onChange={(e) => setEditProject({ ...editProject, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProject(false);
                    setEditingProject(null);
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
                  Update Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {showDeleteProjectModal && projectToDelete && (
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Project</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete <strong>{projectToDelete.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteProjectModal(false);
                    setProjectToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProject}
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
