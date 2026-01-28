import { ServicesManager } from './ServicesManager';
import { WorkScheduleManager } from './WorkScheduleManager';
import { Settings } from 'lucide-react';

export function OrganizationSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Organización</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Configura los servicios que ofreces y tus horarios de trabajo.
      </p>
      
      <ServicesManager />
      <WorkScheduleManager />
    </div>
  );
}
