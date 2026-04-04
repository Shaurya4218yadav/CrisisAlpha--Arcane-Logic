import { create } from 'zustand';

export interface Vehicle {
  id: string;
  type: 'sea' | 'air' | 'road' | 'rail' | 'pipeline';
  lat: number;
  lng: number;
  routeId: string;
  heading: number;
}

interface FleetState {
  vehicles: Vehicle[];
  searchedVehicle: Vehicle | null;
  setVehicles: (vehicles: Vehicle[]) => void;
  searchVehicle: (id: string, type: string) => void;
  clearSearch: () => void;
}

export const useFleetStore = create<FleetState>((set, get) => ({
  vehicles: [],
  searchedVehicle: null,
  
  setVehicles: (vehicles) => {
    set({ vehicles });
    // Update active search tracking
    const { searchedVehicle } = get();
    if (searchedVehicle) {
       const updated = vehicles.find(v => v.id === searchedVehicle.id);
       if (updated) {
           set({ searchedVehicle: updated });
       }
    }
  },

  searchVehicle: (id, type) => {
      const { vehicles } = get();
      const match = vehicles.find(v => v.id.toLowerCase() === id.toLowerCase() && v.type === type);
      if (match) {
          set({ searchedVehicle: match });
      } else {
          set({ searchedVehicle: null });
      }
  },

  clearSearch: () => set({ searchedVehicle: null })
}));
