import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SERVICES } from '@/lib/constants';

// For now, services are stored in constants
// This hook provides a pattern for future database migration
export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration?: number; // in minutes
  active?: boolean;
}

// Local storage key for custom services
const STORAGE_KEY = 'viaggiostyle_services';

function getStoredServices(): Service[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading services from localStorage', e);
  }
  // Default to constants if nothing stored
  return SERVICES.map(s => ({
    ...s,
    duration: 40,
    active: true,
  }));
}

function saveServices(services: Service[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      return getStoredServices();
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (service: Omit<Service, 'id'>) => {
      const services = getStoredServices();
      const newService: Service = {
        ...service,
        id: `service-${Date.now()}`,
      };
      services.push(newService);
      saveServices(services);
      return newService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (service: Service) => {
      const services = getStoredServices();
      const index = services.findIndex(s => s.id === service.id);
      if (index === -1) throw new Error('Service not found');
      services[index] = service;
      saveServices(services);
      return service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const services = getStoredServices();
      const filtered = services.filter(s => s.id !== id);
      saveServices(filtered);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}
