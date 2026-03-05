import React, { useEffect, useState, useMemo } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Route as rootRoute } from './__root';
import { useStaffStore } from '../stores/staffStore';
import { useConfigStore } from '../stores/configStore';
import { useTraineeStore } from '../stores/traineeStore';
import { CalendarAPI } from '../lib/api';
import { ABSENCE_TYPES } from '../lib/constants';
import { Users, UserCheck, GraduationCap, CalendarOff, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Index,
});

function Index() {
  const { t } = useTranslation();
  
  const { workers, absences, fetchWorkers, fetchGlobalAbsences } = useStaffStore();
  const { areas, profiles, shifts, fetchData: fetchConfigData } = useConfigStore();
  const { trainees, fetchTrainees } = useTraineeStore();

  const [calendarMatrix, setCalendarMatrix] = useState([]);
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);
  
  // UI States
  const [groupByShift, setGroupByShift] = useState(false); // For formation block

  // Initial load
  useEffect(() => {
    fetchWorkers();
    fetchConfigData();
    fetchTrainees();
    fetchGlobalAbsences();
  }, [fetchWorkers, fetchConfigData, fetchTrainees, fetchGlobalAbsences]);

  // Load calendar matrix for absence coverage
  useEffect(() => {
    const loadMatrix = async () => {
      setIsMatrixLoading(true);
      try {
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + 60); // Check up to 60 days ahead
        
        const startStr = today.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        const matrix = await CalendarAPI.getMatrix(startStr, endStr);
        setCalendarMatrix(matrix);
      } catch (e) {
        console.error("Failed to load calendar matrix for dashboard", e);
      }
      setIsMatrixLoading(false);
    };
    loadMatrix();
  }, []);

  // UseMemos for Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

  // Helper to check if someone is absent today
  const isAbsentToday = (workerId) => {
    return absences.some(a => 
      a.workerId === workerId && 
      todayStr >= a.dateStart && 
      todayStr <= a.dateEnd
    );
  };

  // Block 1: Staff Counters
  const staffStats = useMemo(() => {
    const fijos = workers.filter(w => w.category === 'FIJO' && w.isActive && !w.isDeleted);
    const suplentes = workers.filter(w => w.category === 'SUPLENTE' && w.isActive && !w.isDeleted);
    const estudiantes = workers.filter(w => w.category === 'ESTUDIANTE' && w.isActive && !w.isDeleted);

    return {
      fijosTotal: fijos.length,
      fijosActivos: fijos.filter(w => !isAbsentToday(w.id)).length,
      suplentesTotal: suplentes.length,
      suplentesActivos: suplentes.filter(w => !isAbsentToday(w.id)).length,
      estudiantesTotal: estudiantes.length,
      estudiantesActivos: estudiantes.filter(w => !isAbsentToday(w.id)).length,
    };
  }, [workers, absences, todayStr]);

  // Block 2: Absences & Vacations
  const absenceStats = useMemo(() => {
    const todayAbsences = absences.filter(a => todayStr >= a.dateStart && todayStr <= a.dateEnd);
    const futureAbsences = absences.filter(a => a.dateStart > todayStr && a.dateStart <= nextWeekStr);

    let uncoveredCount = 0;
    
    // Calculate uncovered valid absences
    // Only care about absences that haven't fully passed yet
    const activeAbsences = absences.filter(a => a.dateEnd >= todayStr);
    
    for (const abs of activeAbsences) {
      if (!calendarMatrix || calendarMatrix.length === 0) break;
      const worker = workers.find(w => w.id === abs.workerId);
      if (!worker || worker.category !== 'FIJO' || !worker.fixedProfileId) continue;
      
      const checkStart = abs.dateStart < todayStr ? todayStr : abs.dateStart;
      const checkEnd = abs.dateEnd;
      
      // Look in matrix for this period and profile
      const relevantCells = calendarMatrix.filter(c => 
        c.profileId === worker.fixedProfileId &&
        c.date >= checkStart && c.date <= checkEnd
      );
      
      // If any of these cells are UNCOVERED, it means the absence is uncovered
      const hasUncovered = relevantCells.some(c => c.status === 'UNCOVERED');
      if (hasUncovered) {
        uncoveredCount++;
      }
    }

    return {
      medicalToday: todayAbsences.filter(a => a.type !== 'VACACIONES').length,
      vacationToday: todayAbsences.filter(a => a.type === 'VACACIONES').length,
      medicalFuture: futureAbsences.filter(a => a.type !== 'VACACIONES').length,
      vacationFuture: futureAbsences.filter(a => a.type === 'VACACIONES').length,
      uncoveredCount
    };
  }, [absences, calendarMatrix, workers, todayStr, nextWeekStr]);

  // Block 3: Formation by Profile
  const formationStats = useMemo(() => {
    // Map profiles
    return profiles.filter(p => p.isActive).map(profile => {
      const fixed = workers.filter(w => w.category === 'FIJO' && w.isActive && w.fixedProfileId === profile.id && !w.isDeleted).length;
      
      // To find valid capabilities, we need workerCapabilities which might not be mapped in frontend right now.
      // Wait, workerCapabilities array is fetched with workers! Let's assume workers have .capabilities = [ids]
      // Because staffStore fetches WorkersAPI which includes capabilities.
      // Wait, does WorkersAPI return capabilities as an array? Yes, backend includes `capabilities: wc.map(c=>c.profileId)`
      const suplentes = workers.filter(w => w.category === 'SUPLENTE' && w.isActive && !w.isDeleted && w.capabilities?.includes(profile.id)).length;
      
      // Active trainees today
      const traineersActive = trainees.filter(t => 
        t.targetProfileId === profile.id && 
        t.status === 'ACTIVE' && 
        !t.isDeleted &&
        t.endDate >= todayStr
      ).length;

      return {
        ...profile,
        fixedCount: fixed,
        suplentesCount: suplentes,
        traineesCount: traineersActive,
        isDanger: fixed <= profile.minBackupWorkers
      };
    });
  }, [profiles, workers, trainees, todayStr]);

  // Grouping for Formation Form
  const groupedFormation = useMemo(() => {
    // We return an array of { groupName, subGroups: [{ subGroupName, profiles: [] }] }
    const result = [];
    
    if (groupByShift) {
      // Group: Shift, SubGroup: Area
      shifts.forEach(shift => {
        const shiftProfs = formationStats.filter(p => p.shiftId === shift.id);
        if (shiftProfs.length === 0) return;
        
        const subGroupsMap = {};
        areas.forEach(a => subGroupsMap[a.id] = { name: a.name, profiles: [] });
        
        shiftProfs.forEach(p => {
          if (subGroupsMap[p.areaId]) subGroupsMap[p.areaId].profiles.push(p);
        });

        const activeSubGroups = Object.values(subGroupsMap).filter(sg => sg.profiles.length > 0);
        result.push({ groupName: shift.name, subGroups: activeSubGroups });
      });
    } else {
      // Group: Area, SubGroup: Shift
      areas.forEach(area => {
        const areaProfs = formationStats.filter(p => p.areaId === area.id);
        if (areaProfs.length === 0) return;
        
        const subGroupsMap = {};
        shifts.forEach(s => subGroupsMap[s.id] = { name: s.name, profiles: [] });
        // Handle profiles without shift
        subGroupsMap['none'] = { name: 'Sin Turno', profiles: [] };
        
        areaProfs.forEach(p => {
          const key = p.shiftId || 'none';
          if (subGroupsMap[key]) subGroupsMap[key].profiles.push(p);
        });

        const activeSubGroups = Object.values(subGroupsMap).filter(sg => sg.profiles.length > 0);
        result.push({ groupName: area.name, subGroups: activeSubGroups });
      });
    }
    return result;
  }, [formationStats, areas, shifts, groupByShift]);

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">{t('dashboard.welcome', 'Panel de Control')}</h2>
        <p className="text-muted-foreground mt-1">{t('dashboard.description', 'Resumen general del estado del personal y cobertura técnica.')}</p>
      </div>

      {/* Uncovered Warning Bar */}
      {absenceStats.uncoveredCount > 0 && (
        <div className="bg-destructive/15 border-l-4 border-destructive p-4 rounded-r-md flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <h4 className="font-semibold text-destructive">¡Alerta de Cobertura!</h4>
              <p className="text-sm text-destructive/90">
                Tienes <strong>{absenceStats.uncoveredCount}</strong> ausencias sin cubrir totalmente en el calendario.
              </p>
            </div>
          </div>
          <Link to="/absences" className="flex items-center text-sm font-medium text-destructive hover:underline">
            Gestionar ausencias <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Block 1: Personal */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Personal
          </h3>
          <div className="grid grid-cols-3 gap-4">
            
            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <div className="text-sm font-medium text-muted-foreground mb-1">Fijos</div>
              <div className="text-3xl font-bold text-foreground">{staffStats.fijosActivos} <span className="text-lg text-muted-foreground font-normal">/ {staffStats.fijosTotal}</span></div>
              <p className="text-xs text-muted-foreground mt-1">Activos hoy</p>
            </div>

            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <div className="text-sm font-medium text-muted-foreground mb-1">Suplentes</div>
              <div className="text-3xl font-bold text-foreground">{staffStats.suplentesActivos} <span className="text-lg text-muted-foreground font-normal">/ {staffStats.suplentesTotal}</span></div>
              <p className="text-xs text-muted-foreground mt-1">Disponibles hoy</p>
            </div>

            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <div className="text-sm font-medium text-muted-foreground mb-1">Estudiantes</div>
              <div className="text-3xl font-bold text-foreground">{staffStats.estudiantesActivos} <span className="text-lg text-muted-foreground font-normal">/ {staffStats.estudiantesTotal}</span></div>
              <p className="text-xs text-muted-foreground mt-1">En el centro hoy</p>
            </div>

          </div>
        </section>

        {/* Block 2: Absences */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-amber-500" /> Bajas y Vacaciones
          </h3>
          <div className="grid grid-cols-2 gap-4">
            
            <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="text-sm font-medium text-muted-foreground mb-2">Ausentes Hoy</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Bajas Médicas:</span>
                  <span className="font-semibold">{absenceStats.medicalToday}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Vacaciones:</span>
                  <span className="font-semibold">{absenceStats.vacationToday}</span>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="text-sm font-medium text-muted-foreground mb-2">Próximos 7 Días</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Bajas Médicas:</span>
                  <span className="font-semibold">{absenceStats.medicalFuture}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Vacaciones:</span>
                  <span className="font-semibold">{absenceStats.vacationFuture}</span>
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* Block 3: Formation */}
      <section className="pt-4 border-t space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" /> Estado de Formación Técnica por Perfil
          </h3>
          <div className="flex items-center space-x-2 text-sm">
            <span className={!groupByShift ? "font-semibold text-primary" : "text-muted-foreground"}>Área</span>
            <button 
              onClick={() => setGroupByShift(!groupByShift)}
              className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span className="sr-only">Cambiar agrupación</span>
              <span aria-hidden="true" className={`pointer-events-none absolute mx-auto h-4 w-8 rounded-full transition-colors duration-200 ease-in-out ${groupByShift ? 'bg-primary' : 'bg-primary'}`} />
              <span aria-hidden="true" className={`pointer-events-none absolute left-0 inline-block h-5 w-5 transform rounded-full border border-gray-200 bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${groupByShift ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className={groupByShift ? "font-semibold text-primary" : "text-muted-foreground"}>Turno</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groupedFormation.map((group) => (
            <div key={group.groupName} className="bg-card/50 border rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-muted px-4 py-2 border-b font-semibold text-sm text-foreground">
                {group.groupName}
              </div>
              <div className="flex-1 p-0">
                {group.subGroups.map((subg, idx) => (
                  <div key={subg.name} className={`${idx !== 0 ? 'border-t' : ''} p-3 space-y-3`}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {subg.name}
                    </div>
                    {subg.profiles.map(profile => (
                      <div key={profile.id} className="text-sm space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium flex items-center gap-1">
                            {profile.name}
                            {profile.isDanger && (
                              <ShieldAlert className="h-4 w-4 text-destructive shrink-0" title="¡Peligro! Personal fijo <= Mínimo requerido" />
                            )}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1 mt-1 bg-background border border-border/50 rounded px-2 py-1.5 divide-x">
                            <div className="text-center" title="Personal Fijo Cubriéndolo">
                                <span className={`block text-xs font-semibold ${profile.isDanger ? 'text-destructive' : 'text-foreground'}`}>{profile.fixedCount}</span>
                                <span className="block text-[10px] text-muted-foreground uppercase">Fijos</span>
                            </div>
                            <div className="text-center" title="Suplentes que lo dominan">
                                <span className="block text-xs font-semibold text-foreground">{profile.suplentesCount}</span>
                                <span className="block text-[10px] text-muted-foreground uppercase">Supl</span>
                            </div>
                            <div className="text-center" title="Estudiantes o Fijos formándose ahora mismo">
                                <span className="block text-xs font-semibold text-blue-600">{profile.traineesCount}</span>
                                <span className="block text-[10px] text-muted-foreground uppercase">Form</span>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
