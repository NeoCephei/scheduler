import React, { useState, useEffect } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { useStaffStore } from '../stores/staffStore';
import { AbsencesAPI } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ABSENCE_TYPES, ABSENCE_TYPE_LABELS } from '../lib/constants';
import { Calendar, User, Search, RefreshCw, Plus, AlertTriangle } from 'lucide-react';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/absences',
  component: GlobalAbsencesPage,
});

function GlobalAbsencesPage() {
  const { absences, workersMap, absencesLoading, fetchGlobalAbsences, refreshGlobalAbsences } = useStaffStore();
  
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState('ALL');

  // Absence Modal
  const [isAbsenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({ workerId: '', type: ABSENCE_TYPES[0], dateStart: '', dateEnd: '', note: '' });
  const [absenceError, setAbsenceError] = useState('');

  const handleAddAbsence = async (e) => {
    e.preventDefault();
    setAbsenceError('');
    try {
      if (!absenceForm.workerId) {
        setAbsenceError('Selecciona un trabajador.');
        return;
      }
      await AbsencesAPI.create({ 
        ...absenceForm, 
        workerId: Number(absenceForm.workerId)
      });
      setAbsenceModalOpen(false);
      setAbsenceForm({ workerId: '', type: ABSENCE_TYPES[0], dateStart: '', dateEnd: '', note: '' });
      refreshGlobalAbsences();
    } catch (err) {
      setAbsenceError(err.response?.data?.error || 'Error al guardar la ausencia.');
    }
  };

  useEffect(() => { 
    fetchGlobalAbsences();
  }, [fetchGlobalAbsences]);

  const now = new Date().toISOString().split('T')[0];

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

  const getStatusLabel = (a) => {
    if (a.dateEnd < now) return { label: 'Pasada', color: 'bg-muted text-muted-foreground' };
    if (a.dateStart > now) return { label: 'Próxima', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    return { label: 'En curso', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
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
          <Button variant="outline" size="icon" onClick={refreshGlobalAbsences} className="shrink-0" title="Recargar panel">
            <RefreshCw size={14} />
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

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {filteredAbsences.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Calendar size={48} className="text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Sin coincidencias</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">No se han encontrado ausencias que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredAbsences.map(absence => {
              const worker = workersMap[absence.workerId];
              const status = getStatusLabel(absence);
              
              return (
                <div key={absence.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User size={18} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to="/staff/$workerId" params={{ workerId: String(worker.id) }} className="font-semibold hover:underline">
                          {worker.name}
                        </Link>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="text-sm mt-1 text-muted-foreground flex items-center gap-3">
                        <span className="font-medium text-foreground/80">{ABSENCE_TYPE_LABELS[absence.type] || absence.type}</span>
                        <span>•</span>
                        <span>{absence.dateStart} al {absence.dateEnd}</span>
                      </div>
                    </div>
                  </div>
                  
                  {absence.note && (
                    <div className="hidden sm:block text-xs italic text-muted-foreground bg-muted/40 p-2 rounded max-w-[250px] truncate" title={absence.note}>
                      {absence.note}
                    </div>
                  )}

                  <div className="shrink-0 pl-4 border-l">
                    <Link to="/staff/$workerId" params={{ workerId: String(worker.id) }}>
                      <Button variant="ghost" size="sm">Ver Ficha</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={isAbsenceModalOpen} onClose={() => { setAbsenceModalOpen(false); setAbsenceError(''); }} title="Registrar Ausencia Global">
        <form onSubmit={handleAddAbsence} className="space-y-4">
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
            <Button type="submit">Guardar Ausencia</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
