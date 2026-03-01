import React, { useState, useEffect } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { WorkersAPI, AbsencesAPI } from '../lib/api';
import { useConfigStore } from '../stores/configStore';
import { useStaffStore } from '../stores/staffStore';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ABSENCE_TYPES, ABSENCE_TYPE_LABELS, SUBSTITUTE_TYPE_LABELS } from '../lib/constants';
import { ArrowLeft, Plus, Trash2, AlertTriangle, Power, PowerOff, Calendar } from 'lucide-react';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff/$workerId',
  component: WorkerDetailPage,
});

function WorkerDetailPage() {
  const { workerId } = Route.useParams();
  const { areas, profiles, fetchData } = useConfigStore();
  const { toggleWorkerActive } = useStaffStore();

  const [worker, setWorker] = useState(null);
  const [absenceGroups, setAbsenceGroups] = useState({ active: [], future: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  // Absence modal
  const [isAbsenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState(null);
  const [absenceForm, setAbsenceForm] = useState({ type: ABSENCE_TYPES[0], dateStart: '', dateEnd: '', note: '' });
  const [absenceError, setAbsenceError] = useState('');

  const loadData = async () => {
    setLoading(true);
    await fetchData();
    const [w, abs] = await Promise.all([
      WorkersAPI.getById(Number(workerId)),
      AbsencesAPI.getByWorker(Number(workerId))
    ]);
    setWorker(w);
    setAbsenceGroups(abs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [workerId]);

  const getProfile = (id) => profiles.find(p => p.id === id);
  const getArea = (areaId) => areas.find(a => a.id === areaId);

  const handleAddAbsence = async (e) => {
    e.preventDefault();
    setAbsenceError('');
    try {
      await AbsencesAPI.create({ ...absenceForm, workerId: Number(workerId) });
      setAbsenceModalOpen(false);
      setAbsenceForm({ type: ABSENCE_TYPES[0], dateStart: '', dateEnd: '', note: '' });
      const abs = await AbsencesAPI.getByWorker(Number(workerId));
      setAbsenceGroups(abs);
    } catch (err) {
      setAbsenceError(err.response?.data?.error || 'Error al guardar la ausencia.');
    }
  };

  const handleDeleteAbsence = async () => {
    await AbsencesAPI.delete(absenceToDelete.id);
    setAbsenceToDelete(null);
    const abs = await AbsencesAPI.getByWorker(Number(workerId));
    setAbsenceGroups(abs);
  };

  const AbsenceCard = ({ absence }) => {
    const nowObj = new Date();
    const now = new Date(nowObj.getTime() - (nowObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    let daysLeftStr = null;
    let daysLeftColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (absence.dateStart > now) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(absence.dateStart);
      target.setHours(0, 0, 0, 0);
      const diffTime = target - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysLeftStr = diffDays === 1 ? 'Mañana' : `En ${diffDays} días`;
    } else if (absence.dateEnd >= now) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(absence.dateEnd);
      target.setHours(0, 0, 0, 0);
      const diffTime = target - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysLeftColor = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
      if (diffDays === 0) daysLeftStr = "Termina hoy";
      else if (diffDays === 1) daysLeftStr = "Termina mañana";
      else daysLeftStr = `Quedan ${diffDays} días`;
    }

    return (
      <div className={`flex items-center justify-between p-3 border rounded-md bg-background shadow-sm ${absence.dateEnd < now ? 'opacity-70 grayscale-[0.5]' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5"><Calendar size={16} className="text-muted-foreground" /></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase bg-muted px-2 py-0.5 rounded">
                {ABSENCE_TYPE_LABELS[absence.type] || absence.type}
              </span>
              {daysLeftStr && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${daysLeftColor}`}>
                  {daysLeftStr}
                </span>
              )}
            </div>
            <p className="text-sm font-medium mt-1">{absence.dateStart} al {absence.dateEnd}</p>
            {absence.note && <p className="text-xs text-muted-foreground mt-1 bg-muted/30 p-1.5 rounded-sm italic">{absence.note}</p>}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0"
          onClick={() => setAbsenceToDelete(absence)}><Trash2 size={15} /></Button>
      </div>
    );
  };

  const selectClassName = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (loading) return <div className="p-8 text-muted-foreground">Cargando ficha...</div>;
  if (!worker) return <div className="p-8 text-destructive">Trabajador no encontrado.</div>;

  const fixedProfile = worker.fixedProfileId ? getProfile(worker.fixedProfileId) : null;
  const fixedArea = fixedProfile ? getArea(fixedProfile?.areaId) : null;
  const hasNoCaps = worker.category === 'SUPLENTE' && (!worker.capabilities || worker.capabilities.length === 0);
  const totalAbsences = absenceGroups.active.length + absenceGroups.future.length + absenceGroups.past.length;

  const tabs = [
    { id: 'info', label: 'Información y Capacidades' },
    { id: 'absences', label: `Ausencias (${totalAbsences})` },
    { id: 'analytics', label: 'Analíticas' }
  ];

  return (
    <div className="flex-1 w-full p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-1" onClick={() => {
          if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
            window.history.back();
          } else {
            window.location.href = '/staff';
          }
        }}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{worker.name}</h1>
            <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${worker.category === 'FIJO' ? 'bg-primary/10 text-primary' : 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30'}`}>
              {worker.category}
            </span>
            {!worker.isActive && <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-muted text-red-500">Desactivado</span>}
          </div>
          {fixedProfile && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fixedArea?.color }} />
              <span className="font-medium text-foreground/80">{fixedArea?.name}</span>
              <span className="opacity-50">/</span>
              {fixedProfile.name}
            </p>
          )}
          {worker.category === 'SUPLENTE' && (
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">{SUBSTITUTE_TYPE_LABELS[worker.substituteType] || worker.substituteType}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => toggleWorkerActive(worker.id).then(() => loadData())} className="gap-1.5 shrink-0">
          {worker.isActive ? <><PowerOff size={14} className="text-destructive"/> Desactivar</> : <><Power size={14} className="text-primary"/> Activar</>}
        </Button>
      </div>

      {/* Tabs Menu */}
      <div className="flex space-x-1 border-b">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Info */}
      {activeTab === 'info' && (
        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {hasNoCaps && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 text-sm">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" /> 
              <p>Este trabajador de tipo Suplente no tiene capacidades definidas. <strong>No recibirá sugerencias</strong> del motor de auto-asignación hasta que se le asigne al menos un perfil.</p>
            </div>
          )}

          <div className="grid md:grid-cols-[1fr,300px] gap-8">
            {/* Capabilities */}
            <div>
              <h3 className="text-lg font-semibold tracking-tight mb-4">Capacidades Extra</h3>
              {worker.capabilities?.length > 0 ? (
                <div className="space-y-3">
                  {areas.map(area => {
                    const capProfiles = profiles.filter(p => p.areaId === area.id && worker.capabilities.includes(p.id));
                    if (capProfiles.length === 0) return null;
                    return (
                      <div key={area.id} className="border rounded-lg overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b">
                          <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: area.color }} />
                          <span className="text-sm font-semibold">{area.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 p-3">
                          {capProfiles.map(p => (
                            <span key={p.id} className="text-xs bg-background border px-2.5 py-1 rounded-md text-muted-foreground">{p.name}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center border border-dashed rounded-lg text-sm text-muted-foreground">
                  El trabajador no tiene capacidades extra.
                </div>
              )}
            </div>

            {/* General Info Sidebar */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Anotaciones</h3>
                {worker.notes ? (
                  <p className="text-sm bg-muted/30 border rounded-lg p-3 whitespace-pre-wrap leading-relaxed">{worker.notes}</p>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Sin anotaciones.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Absences */}
      {activeTab === 'absences' && (
        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex justify-between items-end">
            <h3 className="text-lg font-semibold tracking-tight">Registro de Ausencias</h3>
            <Button onClick={() => setAbsenceModalOpen(true)} className="gap-2"><Plus size={16} /> Añadir Ausencia</Button>
          </div>

          <div className="grid gap-6">
            {['active', 'future', 'past'].map(group => {
              const labelMap = { active: 'En curso (Activas)', future: 'Próximas (Futuras)', past: 'Historial (Pasadas)' };
              const colorMap = { active: 'text-red-600 dark:text-red-400', future: 'text-blue-600 dark:text-blue-400', past: 'text-muted-foreground' };
              const items = absenceGroups[group] || [];
              
              if (items.length === 0 && group === 'past') return null; // Hide empty past section

              return (
                <div key={group}>
                  <h4 className={`text-sm font-semibold mb-3 ${colorMap[group]}`}>{labelMap[group]}</h4>
                  {items.length === 0 ? (
                    <div className="p-4 text-center border border-dashed rounded-lg text-sm text-muted-foreground">
                      No hay ausencias en este bloque.
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {items.map(a => <AbsenceCard key={a.id} absence={a} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content: Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-xl p-5 text-center bg-card shadow-sm">
              <p className="text-4xl font-bold tracking-tighter">{totalAbsences}</p>
              <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wide">Ausencias Registradas</p>
            </div>
            <div className="border rounded-xl p-5 text-center bg-card shadow-sm">
              <p className="text-4xl font-bold tracking-tighter">{worker.capabilities?.length || 0}</p>
              <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wide">Sillas extra capaces</p>
            </div>
            <div className="border rounded-xl p-5 text-center bg-muted/40 shadow-sm opacity-50">
              <p className="text-4xl font-bold tracking-tighter">—</p>
              <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wide">Turnos Asignados</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/10">
            <AlertTriangle className="text-muted-foreground/50 mb-3" size={32} />
            <h3 className="font-semibold text-lg">Analíticas Avanzadas</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">El conteo de cargas y heatmaps de turnos cubiertos estará disponible al completarse la Fase 5 (Dashboard & Reportes).</p>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={isAbsenceModalOpen} onClose={() => { setAbsenceModalOpen(false); setAbsenceError(''); }} title="Registrar Ausencia" className="max-w-md">
        <form onSubmit={handleAddAbsence} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo</label>
            <select className={selectClassName} value={absenceForm.type} onChange={e => setAbsenceForm({ ...absenceForm, type: e.target.value })}>
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

      <Modal isOpen={!!absenceToDelete} onClose={() => setAbsenceToDelete(null)} title="Eliminar Ausencia">
        <div className="space-y-4">
          <p className="text-sm">¿Deseas eliminar del registro esta ausencia (<strong>{absenceToDelete?.type && ABSENCE_TYPE_LABELS[absenceToDelete.type]}</strong>) que abarca del <strong>{absenceToDelete?.dateStart}</strong> al <strong>{absenceToDelete?.dateEnd}</strong>?</p>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setAbsenceToDelete(null)}>Conservar</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0" onClick={handleDeleteAbsence}>Eliminar permanentemente</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
