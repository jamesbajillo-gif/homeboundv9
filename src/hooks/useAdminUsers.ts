import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminUsers, saveAdminUsers } from '@/lib/adminUtils';
import { toast } from 'sonner';

const ADMIN_USERS_QUERY_KEY = ['admin-users'];

export function useAdminUsers() {
  const queryClient = useQueryClient();

  const { data: adminUsers = [], isLoading, error } = useQuery<string[]>({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: getAdminUsers,
    staleTime: 60000, // Cache for 1 minute
  });

  const addAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const currentAdmins = await getAdminUsers();
      if (currentAdmins.includes(userId)) {
        throw new Error('User is already an admin');
      }
      const updatedAdmins = [...currentAdmins, userId];
      await saveAdminUsers(updatedAdmins);
      return updatedAdmins;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(ADMIN_USERS_QUERY_KEY, data);
      toast.success('Admin user added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add admin user');
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const currentAdmins = await getAdminUsers();
      if (!currentAdmins.includes(userId)) {
        throw new Error('User is not an admin');
      }
      // Prevent removing the hardcoded admin (000)
      if (userId === '000') {
        throw new Error('Cannot remove the default admin user (000)');
      }
      const updatedAdmins = currentAdmins.filter(id => id !== userId);
      await saveAdminUsers(updatedAdmins);
      return updatedAdmins;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(ADMIN_USERS_QUERY_KEY, data);
      toast.success('Admin user removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove admin user');
    },
  });

  const updateAdminUsersMutation = useMutation({
    mutationFn: saveAdminUsers,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      toast.success('Admin users updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update admin users');
    },
  });

  return {
    adminUsers,
    isLoading,
    error,
    addAdmin: addAdminMutation.mutate,
    removeAdmin: removeAdminMutation.mutate,
    updateAdminUsers: updateAdminUsersMutation.mutate,
    isAdding: addAdminMutation.isPending,
    isRemoving: removeAdminMutation.isPending,
    isUpdating: updateAdminUsersMutation.isPending,
  };
}

