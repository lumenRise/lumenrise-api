import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GitLabProject } from '../../src/types/reputation/gitlab.js';
import {
  buildGitLabMetrics,
  collectOwnedGitLabProjects,
  mergeGitLabProjects,
} from '../../src/services/reputation/gitlabData.js';

vi.mock('../../src/env.js', () => ({
  default: { GITLAB_BASE_URL: 'https://gitlab.example.com' },
}));

const createProject = (id: number): GitLabProject => ({
  id,
  name: `project-${id}`,
  name_with_namespace: `Developer / project-${id}`,
  path_with_namespace: `developer/project-${id}`,
  description: null,
  web_url: `https://gitlab.example.com/developer/project-${id}`,
  visibility: 'public',
  archived: false,
  star_count: id,
  forks_count: id,
  open_issues_count: id,
  topics: [],
  created_at: '2020-01-01T00:00:00.000Z',
  last_activity_at: '2026-09-23T00:00:00.000Z',
  namespace: {
    id: 1,
    name: 'Developer',
    path: 'developer',
    kind: 'user',
    full_path: 'developer',
  },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GitLab data collection', () => {
  it('follows GitLab pagination links until the final project page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([createProject(1)]), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            Link: '<https://gitlab.example.com/api/v4/users/42/projects?cursor=next>; rel="next"',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([createProject(2)]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const projects = await collectOwnedGitLabProjects(42, 'access-token');
    const firstRequestUrl = new URL(fetchMock.mock.calls[0]?.[0]);

    expect(projects.map((project) => project.id)).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(firstRequestUrl.searchParams.get('pagination')).toBe('keyset');
    expect(firstRequestUrl.searchParams.get('per_page')).toBe('100');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('cursor=next');
  });

  it('merges owned and contributed projects without losing either relationship', () => {
    const projects = mergeGitLabProjects(
      [createProject(1), createProject(2)],
      [createProject(2), createProject(3)],
    );

    expect(projects).toHaveLength(3);
    expect(projects.find((item) => item.project.id === 1)).toMatchObject({
      owned: true,
      contributed: false,
    });
    expect(projects.find((item) => item.project.id === 2)).toMatchObject({
      owned: true,
      contributed: true,
    });
    expect(projects.find((item) => item.project.id === 3)).toMatchObject({
      owned: false,
      contributed: true,
    });
  });

  it('builds metrics from every collected project and event', () => {
    const projects = mergeGitLabProjects([createProject(1)], [createProject(2)]);
    const metrics = buildGitLabMetrics(
      {
        id: 42,
        username: 'developer',
        name: 'Developer',
        web_url: 'https://gitlab.example.com/developer',
        avatar_url: null,
        created_at: '2020-01-01T00:00:00.000Z',
        followers: 5,
        following: 3,
      },
      projects,
      [
        {
          id: 1,
          project_id: 1,
          action_name: 'pushed to',
          target_id: null,
          target_iid: null,
          target_type: null,
          target_title: null,
          author_id: 42,
          created_at: '2026-09-23T00:00:00.000Z',
          push_data: {
            commit_count: 4,
            action: 'pushed',
            ref_type: 'branch',
            commit_from: null,
            commit_to: 'sha',
            ref: 'main',
            commit_title: 'Commit',
          },
        },
      ],
      {
        groups_count: 2,
        projects_count: 8,
        issues_count: 7,
        merge_requests_count: 6,
      },
      new Date('2026-09-23T00:00:00.000Z'),
    );

    expect(metrics.collectedProjectCount).toBe(2);
    expect(metrics.projectStars).toBe(3);
    expect(metrics.pushEventCount).toBe(1);
    expect(metrics.pushedCommitCount).toBe(4);
    expect(metrics.reportedMergeRequestCount).toBe(6);
  });
});
