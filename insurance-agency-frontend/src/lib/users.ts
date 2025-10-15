// lib/users.ts
import api from './api';
import { User, Agency, Role, PaginatedUsers } from './../types';

export const usersApi = {
  // Users - Added pagination
  getUsers: (params?: { branch?: string; page?: number; page_size?: number }): Promise<PaginatedUsers> => 
    api.get('/accounts/users/', { params }).then(res => res.data),

  getUserById: (id: string): Promise<User> => 
    api.get(`/accounts/users/${id}/`).then(res => res.data),

  createUser: (userData: any): Promise<User> => 
    api.post('/accounts/users/', userData).then(res => res.data),

  updateUser: (userId: string, userData: Partial<any>): Promise<User> => 
    api.patch(`/accounts/users/${userId}/`, userData).then(res => res.data),

  // Agency
  getMyAgency: (): Promise<Agency> => 
    api.get('/accounts/agencies/').then(res => 
      Array.isArray(res.data.results) ? res.data.results[0] : res.data
    ),

  // Roles
  getRoles: (): Promise<{ results: Role[] }> => 
    api.get('/accounts/roles/').then(res => res.data),
};