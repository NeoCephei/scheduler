import React, { useState, useEffect } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { useStaffStore } from '../stores/staffStore';
import { AbsencesAPI } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ABSENCE_TYPES, ABSENCE_TYPE_LABELS } from '../lib/constants';
import { Calendar, User, Search, RefreshCw, Plus, AlertTriangle, ArrowRight } from 'lucide-react';
import { CalendarAPI } from '../lib/api';
import { useNavigate } from '@tanstack/react-router';
import AssignmentModal from '../components/calendar/AssignmentModal';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/absences',
  component: GlobalAbsencesPage,
});

function GlobalAbsencesPage() {
  const { absences, workersMap, absencesLoading, fetchGlobalAbsences, refreshGlobalAbsences } = useStaffStore();
  
  useEffect(() => { 
    fetchGlobalAbsences();
  }, [fetchGlobalAbsences]);

  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState('ALL');

  // Absence Modal
  const [isAbsenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({ workerId: '', type: ABSENCE_TYPES[0], dateStart: '', dateEnd: '', note: '' });
  const [absenceError, setAbsenceError] = useState('');
  const [impactData, setImpactData] = useState(null);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);
  const navigate = useNavigate();

  // Management Modal from cards
  const [impactModalAbsence, setImpactModalAbsence] = useState(null);
  const [impactModalData, setImpactModalData] = useState(null);
  const [isImpactLoading, setIsImpactLoading] = useState(false);
  const [selectedCellForAssignment, setSelectedCellForAssignment] = useState(null);

  const loadImpactData = async (absence) => {
    setIsImpactLoading(true);
    const worker = workersMap[absence.workerId];
    if (worker) {
      try {
        const matrix = await CalendarAPI.getMatrix(absence.dateStart, absence.dateEnd);
        if (worker.category === 'FIJO' && worker.fixedProfileId) {
          const profileId = worker.fixedProfileId;
          const affected = matrix.filter(cell => cell.profileId === profileId);
          setImpactModalData(affected.sort((a,b) => a.date.localeCompare(b.date)));
        } else {
          setImpactModalData([]); // Supplements
        }
      } catch(e) { console.error(e); setImpactModalData([]); }
    }
    setIsImpactLoading(false);
  };

  const handleCheckImpact = async (e) => {
    e.preventDefault();
    setAbsenceError('');
    try {
      if (!absenceForm.workerId) {
        setAbsenceError('Selecciona un trabajador.');
        return;
      }
      setIsCheckingImpact(true);
      const matrix = await CalendarAPI.getMatrix(absenceForm.dateStart, absenceForm.dateEnd);
      const affected = matrix.filter(cell => cell.allocatedWorkerId === Number(absenceForm.workerId));
      setIsCheckingImpact(false);

      if (affected.length > 0) {
        setImpactData(affected);
        // Do not save yet, wait for user confirmation
      } else {
        await executeSave();
      }
    } catch (err) {
      setIsCheckingImpact(false);
      setAbsenceError(err.response?.data?.error || err.message || 'Error al comprobar impacto.');
    }
  };

  const executeSave = async () => {
    try {
      await AbsencesAPI.create({ 
        ...absenceForm, 
        workerId: Number(absenceForm.workerId)
      });
      setAbsenceModalOpen(false);
      setAbsenceForm({ workerId: '', type: ABSENCE_TYPES[0], dateStart: '', dateEnd: '', note: '' });
      setImpactData(null);
      refreshGlobalAbsences();
    } catch (err) {
      setAbsenceError(err.response?.data?.error || 'Error al guardar la ausencia.');
    }
  };

  // Get local 'YYYY-MM-DD' taking timezone into account
  const nowObj = new Date();
  const now = new Date(nowObj.getTime() - (nowObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  const filteredAbsences = absences
    .filter(a => {
      // 1. Filter by unexisting worker (could happen if worker was hard deleted, though we use soft delete)
      const w = workersMap[a.workerId];
      if (!w) return false;
      
      // 2. Filter by search name
      if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false;
      
      // 3. Filter by Time Time
      if (timeFilter === 'ACTIVE') return a.dateStart <= now && a.dateEnd >= now;
      if (timeFilter === 'FUTURE') return a.dateStart > now;
      if (timeFilter === 'PAST') return a.dateEnd < now;
      return true;
    })
    // Sort logic: active first, then future, then past.
    .sort((a, b) => {
      // Descending by start date
      return new Date(b.dateStart) - new Date(a.dateStart);
    });

  const getSubLabel = (a) => {
    if (a.dateStart > now) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(a.dateStart);
      target.setHours(0, 0, 0, 0);
      const diffTime = target - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { text: diffDays === 1 ? 'Mañana' : `En ${diffDays} días`, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' };
    }
    if (a.dateStart <= now && a.dateEnd >= now) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(a.dateEnd);
      target.setHours(0, 0, 0, 0);
      const diffTime = target - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let text = `Quedan ${diffDays} días`;
      if (diffDays === 0) text = 'Termina hoy';
      if (diffDays === 1) text = 'Termina mañana';
      return { text, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' };
    }
    return null;
  };

  // Group absences
  const groupedAbsences = { ACTIVE: [], FUTURE: [], PAST: [] };
  filteredAbsences.forEach(a => {
    if (a.dateEnd < now) groupedAbsences.PAST.push(a);
    else if (a.dateStart > now) groupedAbsences.FUTURE.push(a);
    else groupedAbsences.ACTIVE.push(a);
  });

  const timeGroupLabels = {
    ACTIVE: { title: 'En Curso', color: 'text-red-600 dark:text-red-400', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    FUTURE: { title: 'Próximas', color: 'text-blue-600 dark:text-blue-400', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    PAST: { title: 'Histórico Pasado', color: 'text-muted-foreground', badgeClass: 'bg-muted text-muted-foreground' }
  };

  const groupAbsencesByWorker = (absencesArray) => {
    const map = {};
    absencesArray.forEach(a => {
      if (!map[a.workerId]) map[a.workerId] = { worker: workersMap[a.workerId], items: [] };
      map[a.workerId].items.push(a);
    });
    // Return sorted array by worker name, and inside items sorted by dateStart asc
    return Object.values(map)
      .sort((a,b) => a.worker.name.localeCompare(b.worker.name))
      .map(wg => {
        wg.items.sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));
        return wg;
      });
  };

  if (absencesLoading && absences.length === 0) return <div className="p-8 text-muted-foreground flex items-center gap-2"><RefreshCw className="animate-spin" size={16} /> Cargando panel global...</div>;

  return (
    <div className="flex-1 w-full p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registro Global de Ausencias</h1>
          <p className="text-sm text-muted-foreground mt-1">Supervisión centralizada de permisos y vacaciones de toda la plantilla.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={() => setAbsenceModalOpen(true)} className="gap-2 shrink-0">
            <Plus size={16} /> Añadir Ausencia
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap bg-muted/20 p-4 rounded-xl border items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            placeholder="Buscar por nombre de trabajador..." 
            className="pl-9 bg-background" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex gap-1.5 p-1 bg-muted/50 rounded-lg">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'ACTIVE', label: 'En curso' },
            { id: 'FUTURE', label: 'Próximas' },
            { id: 'PAST', label: 'Histórico' }
          ].map(f => (
            <Button 
              key={f.id} 
              variant={timeFilter === f.id ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setTimeFilter(f.id)}
              className={timeFilter === f.id ? 'shadow-sm' : ''}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {filteredAbsences.length === 0 ? (
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm p-12 text-center flex flex-col items-center">
            <Calendar size={48} className="text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Sin coincidencias</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">No se han encontrado ausencias que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          ['ACTIVE', 'FUTURE', 'PAST'].map(groupKey => {
            const timeAbsences = groupedAbsences[groupKey];
            if (timeAbsences.length === 0) return null;
            
            const workerGroups = groupAbsencesByWorker(timeAbsences);
            const tg = timeGroupLabels[groupKey];

            return (
              <div key={groupKey} className="space-y-3">
                <h2 className={`font-semibold text-lg flex items-center gap-2 ${tg.color}`}>
                  {tg.title}
                  <span className="text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {timeAbsences.length} ausencias
                  </span>
                </h2>
                
                <div className="bg-card border rounded-xl overflow-hidden shadow-sm divide-y">
                  {workerGroups.map(wg => (
                    <div key={wg.worker.id} className="flex flex-col md:flex-row border-b last:border-0 hover:bg-muted/5 transition-colors">
                      {/* Worker Info Column */}
                      <div className="p-4 md:w-1/3 flex items-start gap-4 md:border-r border-border/50 bg-muted/10 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User size={18} className="text-primary" />
                        </div>
                        <div className="flex-1">
                          <Link to="/staff/$workerId" params={{ workerId: String(wg.worker.id) }} className="font-semibold text-[15px] hover:underline block">
                            {wg.worker.name}
                          </Link>
                          <span className={`mt-1 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${tg.badgeClass}`}>
                            {tg.title}
                          </span>
                          <div className="mt-4">
                            <Link to="/staff/$workerId" params={{ workerId: String(wg.worker.id) }}>
                              <Button variant="outline" size="sm" className="w-full h-8 text-xs">Ver Ficha</Button>
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Absences Rows */}
                      <div className="flex-1 divide-y">
                        {wg.items.map(absence => {
                          const subLabel = getSubLabel(absence);
                          return (
                            <div key={absence.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="text-sm font-medium flex items-center gap-2">
                                  <span>{absence.dateStart} al {absence.dateEnd}</span>
                                  {subLabel && (
                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${subLabel.color}`}>
                                      {subLabel.text}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm mt-1 text-muted-foreground">
                                  {ABSENCE_TYPE_LABELS[absence.type] || absence.type}
                                </div>
                                {absence.note && (
                                  <div className="mt-2 text-xs italic text-muted-foreground bg-muted p-2 rounded max-w-sm" title={absence.note}>
                                    {absence.note}
                                  </div>
                                )}
                              </div>
                              
                              {wg.worker.category === 'FIJO' && groupKey !== 'PAST' && (
                                <Button variant="secondary" size="sm" className="shrink-0" onClick={() => { setImpactModalAbsence(absence); loadImpactData(absence); }}>
                                  Gestionar Suplencias
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal isOpen={isAbsenceModalOpen} onClose={() => { setAbsenceModalOpen(false); setAbsenceError(''); setImpactData(null); }} title={impactData ? "Impacto en el Calendario" : "Registrar Ausencia Global"}>
        {!impactData ? (
        <form onSubmit={handleCheckImpact} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Trabajador Afectado</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
              value={absenceForm.workerId} 
              onChange={e => setAbsenceForm({ ...absenceForm, workerId: e.target.value })}
              required
            >
              <option value="" disabled>Selecciona un trabajador...</option>
              {Object.values(workersMap)
                .sort((a,b) => a.name.localeCompare(b.name))
                .map(w => <option key={w.id} value={w.id}>{w.name}</option>)
              }
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
              value={absenceForm.type} 
              onChange={e => setAbsenceForm({ ...absenceForm, type: e.target.value })}
            >
              {ABSENCE_TYPES.map(t => <option key={t} value={t}>{ABSENCE_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Desde</label>
              <Input required type="date" value={absenceForm.dateStart} onChange={e => setAbsenceForm({ ...absenceForm, dateStart: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hasta (Incluido)</label>
              <Input required type="date" min={absenceForm.dateStart} value={absenceForm.dateEnd} onChange={e => setAbsenceForm({ ...absenceForm, dateEnd: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex justify-between">
              Notas adicionales
              <span className="text-xs text-muted-foreground font-normal">Opcional</span>
            </label>
            <textarea className="flex w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              value={absenceForm.note} onChange={e => setAbsenceForm({ ...absenceForm, note: e.target.value })} placeholder="Ej: Certificado entregado al departamento de RRHH..." />
          </div>
          
          {absenceError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-md border border-red-200 dark:border-red-800/50 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{absenceError}</span>
            </div>
          )}
          
          <div className="pt-2 flex justify-end gap-2 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => { setAbsenceModalOpen(false); setAbsenceError(''); }}>Cancelar</Button>
            <Button type="submit" disabled={isCheckingImpact}>
              {isCheckingImpact ? 'Comprobando...' : 'Guardar Ausencia'}
            </Button>
          </div>
        </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-4 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Esta ausencia dejará {impactData.length} turnos al descubierto.</p>
                <p className="text-sm opacity-90 mt-1">Antes de guardar, puedes revisar los turnos afectados. Te recomendamos ir al calendario para asignar suplentes.</p>
              </div>
            </div>

            <div className="max-h-[200px] overflow-y-auto border rounded-md divide-y">
              {impactData.map((cell, idx) => (
                <div key={idx} className="p-3 bg-card flex justify-between items-center text-sm">
                  <div>
                    <span className="font-semibold block">{cell.date}</span>
                    <span className="text-muted-foreground">{cell.profileName} ({cell.timeSlot.startTime} - {cell.timeSlot.endTime})</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-between gap-2 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setImpactData(null)}>Atrás</Button>
              <div className="flex gap-2">
                <Button type="button" onClick={async () => {
                  await executeSave();
                }}>
                  Guardar de todos modos
                </Button>
                <Button type="button" onClick={async () => {
                  await executeSave();
                  navigate({ to: '/calendar' });
                }} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Guardar e ir al Calendario <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* View/Manage Impact Modal */}
      <Modal isOpen={!!impactModalAbsence} onClose={() => { setImpactModalAbsence(null); refreshGlobalAbsences(); }} title="Gestión de Suplencias">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Revisando los turnos afectados por esta ausencia. Puedes hacer click en asignar para cubrir un turno que haya quedado descubierto.
          </p>
          
          {isImpactLoading ? (
            <div className="p-8 text-center text-muted-foreground flex justify-center"><RefreshCw className="animate-spin" size={20} /></div>
          ) : impactModalData?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              Este trabajador no genera turnos descubiertos automáticos (probablemente es suplente).
            </div>
          ) : (
            <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
              {impactModalData?.map((cell, idx) => {
                const isUncovered = cell.status === 'UNCOVERED';
                const isPast = cell.date < now;
                
                return (
                  <div key={idx} className={`p-3 flex justify-between items-center text-sm ${isUncovered ? 'bg-red-50 dark:bg-red-950/20' : 'bg-card'} ${isPast ? 'opacity-60 grayscale' : ''}`}>
                    <div>
                      <span className="font-semibold block">{new Date(cell.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="text-muted-foreground text-xs">{cell.profileName} ({cell.timeSlot.startTime} - {cell.timeSlot.endTime})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${isUncovered ? 'text-red-500' : 'text-foreground'}`}>
                        {isUncovered ? 'Descubierto' : cell.allocatedWorkerName}
                      </span>
                      {isPast ? (
                        <Button size="sm" variant="ghost" disabled>Pasado</Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant={isUncovered ? 'default' : 'outline'}
                          onClick={() => setSelectedCellForAssignment({ 
                            profile: { profileId: cell.profileId, profileName: cell.profileName },
                            date: cell.date,
                            cellData: cell
                          })}
                        >
                          {isUncovered ? 'Asignar' : 'Modificar'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-4 mt-2 border-t">
            <Button onClick={() => setImpactModalAbsence(null)}>Cerrar</Button>
          </div>
        </div>
      </Modal>

      {selectedCellForAssignment && (
        <AssignmentModal 
          isOpen={true} 
          onClose={() => { 
            setSelectedCellForAssignment(null); 
            if (impactModalAbsence) loadImpactData(impactModalAbsence); 
          }} 
          cellInfo={selectedCellForAssignment} 
        />
      )}

    </div>
  );
}
