import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { useEffect } from 'react';
import { useCalendarStore } from '../stores/calendarStore';
import { useConfigStore } from '../stores/configStore';
import { useStaffStore } from '../stores/staffStore';

import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Download } from 'lucide-react';
import CalendarGrid from '../components/calendar/CalendarGrid';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar',
  component: CalendarPage,
});

function CalendarPage() {
  const { 
    viewMode, groupMode, currentDate, 
    setViewMode, setGroupMode, goNext, goPrev, goToday, 
    fetchMatrix, getStartEndDates, loading 
  } = useCalendarStore();
  
  // We need metadata like Areas, Shifts, Workers, and Absences for the Grid/Modal
  const { fetchData: fetchConfig } = useConfigStore();
  const { fetchWorkers, fetchGlobalAbsences } = useStaffStore();

  useEffect(() => {
    fetchConfig();
    fetchWorkers();
    fetchGlobalAbsences();
    fetchMatrix();
  }, [fetchConfig, fetchWorkers, fetchGlobalAbsences, fetchMatrix]);

  const { startStr, endStr } = getStartEndDates();

  const handleExport = () => {
    console.log("Exportando a Excel... (Placeholder Fase 4)");
  };

  return (
    <div className="p-4 md:p-8 w-full h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] flex flex-col gap-4 overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background p-4 rounded-lg border shadow-sm shrink-0">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Calendario
          </h2>
          <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
            <span className="font-semibold text-foreground">
              {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDate).toUpperCase()}
            </span>
            {viewMode === 'week' && (
              <span>({startStr} al {endStr})</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Navigation */}
          <div className="flex bg-muted rounded-md p-0.5">
            <Button variant="ghost" size="sm" onClick={goPrev}><ChevronLeft size={18} /></Button>
            <Button variant="ghost" size="sm" onClick={goToday} className="font-medium">Hoy</Button>
            <Button variant="ghost" size="sm" onClick={goNext}><ChevronRight size={18} /></Button>
          </div>

          <div className="w-px h-8 bg-border mx-1"></div>

          {/* Filters */}
          <div className="flex bg-muted rounded-md p-0.5" title="Agrupación">
            <Button 
              variant={groupMode === 'shift' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setGroupMode('shift')}
            >
              Por Turno
            </Button>
            <Button 
              variant={groupMode === 'area' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setGroupMode('area')}
            >
              Por Área
            </Button>
          </div>

          <div className="flex bg-muted rounded-md p-0.5" title="Vista">
            <Button 
              variant={viewMode === 'week' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('week')}
            >
              Semana
            </Button>
            <Button 
              variant={viewMode === 'month' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('month')}
            >
              Mes
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExport} className="ml-auto">
            <Download size={16} className="mr-2" /> Exportar
          </Button>
        </div>
      </div>

      {/* Grid Container */}
      <Card className="flex-1 min-h-0 override-card-overflow flex flex-col border shadow-sm overflow-hidden">
        <CardContent className="p-0 flex-1 overflow-auto bg-muted/20 relative">
          <CalendarGrid />
        </CardContent>
      </Card>
    </div>
  );
}
