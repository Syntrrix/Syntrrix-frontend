import apiClient from './client';

export const fetchTeamMembers = async () => {
  const { data } = await apiClient.get('seller/team-members/');
  return data;
};

export const createTeamMember = async (payload) => {
  const { data } = await apiClient.post('seller/team-members/', payload);
  return data;
};

export const updateTeamMember = async (teamMemberId, payload) => {
  const { data } = await apiClient.patch(`seller/team-members/?team_member_id=${teamMemberId}`, payload);
  return data;
};

export const fetchTeamManagers = async () => {
  const { data } = await apiClient.get('seller/team-managers/');
  return data;
};

export const fetchTeamMemberContext = async () => {
  const { data } = await apiClient.get('team/member-context/');
  return data;
};
