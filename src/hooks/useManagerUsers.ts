import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getManagerUsers, saveManagerUsers } from '@/lib/managerUtils';
import { toast } from 'sonner';

const MANAGER_USERS_QUERY_KEY = ['manager-users'];

export function useManagerUsers() {
  const queryClient = useQueryClient();

  const { data: managerUsers = [], isLoading, error } = useQuery<string[]>({
    queryKey: MANAGER_USERS_QUERY_KEY,
    queryFn: getManagerUsers,
    staleTime: 60000, // Cache for 1 minute
  });

  const addManagerMutation = useMutation({
    mutationFn: async (userId: string) => {
      const currentManagers = await getManagerUsers();
      if (currentManagers.includes(userId)) {
        throw new Error('User is already a manager');
      }
      const updatedManagers = [...currentManagers, userId];
      await saveManagerUsers(updatedManagers);
      return updatedManagers;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(MANAGER_USERS_QUERY_KEY, data);
      toast.success('Manager user added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add manager user');
    },
  });

  const removeManagerMutation = useMutation({
    mutationFn: async (userId: string) => {
      const currentManagers = await getManagerUsers();
      if (!currentManagers.includes(userId)) {
        throw new Error('User is not a manager');
      }
      const updatedManagers = currentManagers.filter(id => id !== userId);
      await saveManagerUsers(updatedManagers);
      return updatedManagers;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(MANAGER_USERS_QUERY_KEY, data);
      toast.success('Manager user removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove manager user');
    },
  });

  const updateManagerUsersMutation = useMutation({
    mutationFn: saveManagerUsers,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MANAGER_USERS_QUERY_KEY });
      toast.success('Manager users updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update manager users');
    },
  });

  return {
    managerUsers,
    isLoading,
    error,
    addManager: addManagerMutation.mutate,
    removeManager: removeManagerMutation.mutate,
    updateManagerUsers: updateManagerUsersMutation.mutate,
    isAdding: addManagerMutation.isPending,
    isRemoving: removeManagerMutation.isPending,
    isUpdating: updateManagerUsersMutation.isPending,
  };
}

