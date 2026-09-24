import type { GitLabCollectedProject, GitLabProject } from '../../../../types/reputation/gitlab.js';

const mergeGitLabProjects = (
  ownedProjects: GitLabProject[],
  contributedProjects: GitLabProject[],
): GitLabCollectedProject[] => {
  const projects = new Map<number, GitLabCollectedProject>();

  for (const project of ownedProjects) {
    projects.set(project.id, { project, owned: true, contributed: false });
  }

  for (const project of contributedProjects) {
    const existingProject = projects.get(project.id);

    if (existingProject) {
      existingProject.contributed = true;
      continue;
    }

    projects.set(project.id, { project, owned: false, contributed: true });
  }

  return [...projects.values()];
};

export { mergeGitLabProjects };
