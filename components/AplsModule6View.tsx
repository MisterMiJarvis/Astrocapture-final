import React, { useState, useEffect } from 'react';
import ProjectDetailView from '../src/components/Module6/ProjectDetailView';
import { fetchAllProjects, fetchAplsProjectDetail } from '../src/services/module6/projectService';
import { ProjectDetail } from '../src/types/module6';

const AplsModule6View: React.FC = () => {
  const [projects, setProjects] = useState<ProjectDetail[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const allProjects = await fetchAllProjects();
        setProjects(allProjects);
        if (allProjects.length > 0) {
          setSelectedProjectId(allProjects[0].id);
          setSelectedProject(allProjects[0]);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError('Impossible de charger les projets.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleProjectSelect = async (projectId: string) => {
    setSelectedProjectId(projectId);
    try {
      const project = await fetchAplsProjectDetail(projectId);
      setSelectedProject(project);
    } catch (err) {
      console.error('Failed to load project:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-text-secondary">Chargement des projets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (projects.length === 0 || !selectedProject) {
    return (
      <div className="space-y-6 p-4">
        <div className="py-4 text-center border-b border-border">
          <h1 className="text-3xl font-display font-bold">📈 Analysis</h1>
          <p className="mt-2 text-text-secondary">Projets et sessions d'observation</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-secondary">
          <p className="text-lg">Aucun projet trouvé</p>
          <p className="text-sm mt-2">Ajoutez des cibles dans le Planner pour créer des projets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.length > 1 && (
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId || ''}
            onChange={e => handleProjectSelect(e.target.value)}
            className="px-3 py-2 rounded border border-border bg-surface text-text"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.targetName} ({p.progress}%)
              </option>
            ))}
          </select>
        </div>
      )}
      <ProjectDetailView project={selectedProject} />
    </div>
  );
};

export default AplsModule6View;