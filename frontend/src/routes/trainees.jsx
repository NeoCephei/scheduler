import { createRoute, Link } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { useState, useEffect } from 'react';
import { useTraineeStore } from '../stores/traineeStore';
import { useStaffStore } from '../stores/staffStore';
import { useConfigStore } from '../stores/configStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Plus, Search, ChevronRight, GraduationCap } from 'lucide-react';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trainees',
  component: TraineesPage,
});

function TraineesPage() {
  const { workers, fetchWorkers, addWorker } = useStaffStore();
  const { trainees, fetchTrainees } = useTraineeStore(); // Trainees are operations here
  const { areas, profiles, shifts, fetchData } = useConfigStore();
  
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ACTIVE, ALL, COMPLETED

  useEffect(() => {
    fetchWorkers();
    fetchTrainees();
    fetchData();
  }, [fetchWorkers, fetchTrainees, fetchData]);

  // Students are workers with category ESTUDIANTE
  const students = workers.filter(w => w.category === 'ESTUDIANTE');

  const getStudentStatus = (student) => {
    // Determine overall status based on global dates
    const now = new Date().toISOString().split('T')[0];
    if (student.practicumEndDate && student.practicumEndDate < now) return 'COMPLETED';
    if (student.practicumStartDate && student.practicumStartDate <= now) return 'ACTIVE';
    return 'PENDING';
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(search.toLowerCase());
    const status = getStudentStatus(student);
    // Let's adapt the filter mapping: Pendiente counts as active visually? Let's treat PENDING as ACTIVE or separate
    const matchesStatus = statusFilter === 'ALL' || status === statusFilter || (statusFilter === 'ACTIVE' && status === 'PENDING');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 w-full">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Estudiantes</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestión de practicantes. Registra los perfiles a autorizar y planifica sus periodos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus size={16} /> Añadir Estudiante
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-sm w-full relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar estudiantes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('ACTIVE')}>Activos / Pendientes</Button>
          <Button variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('COMPLETED')}>Finalizados</Button>
          <Button variant={statusFilter === 'ALL' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('ALL')}>Todos</Button>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="py-20 text-center border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">No se encontraron estudiantes externos.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map(student => {
            const status = getStudentStatus(student);
            const capProfiles = profiles.filter(p => student.capabilities?.includes(p.id));

            return (
              <div key={student.id} className="border rounded-xl p-5 shadow-sm bg-card hover:border-primary/50 transition-colors flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 border rounded-md bg-muted/30">
                      <GraduationCap size={20} className="text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg leading-tight">{student.name}</h3>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{student.substituteType}</p>
                    </div>
                  </div>
                  {status === 'ACTIVE' ? (
                    <Badge variant="outline" className="border-green-500 text-green-600 bg-green-500/10 hover:bg-green-500/20">En curso</Badge>
                  ) : status === 'COMPLETED' ? (
                    <Badge variant="outline" className="text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 border-blue-200">Completado</Badge>
                  ) : status === 'PAUSED' ? (
                    <Badge variant="outline" className="text-orange-600 bg-orange-500/10 border-orange-200">Pausado</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground bg-muted/30">Pendiente de iniciar</Badge>
                  )}
                </div>

                <div className="space-y-3 mt-2 text-sm flex-1">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Perfiles a Aprender</span>
                    {capProfiles.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {capProfiles.map(p => (
                          <span key={p.id} className="text-[11px] bg-secondary/50 border px-2 py-0.5 rounded text-foreground/80">{p.name}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Ningún perfil asignado</span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1.5 mt-2">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Restricciones</span>
                    <span className="text-xs font-medium text-foreground">{student.requiredHours}h mínimo global</span>
                  </div>
                </div>

                <div className="flex justify-end items-end mt-4 pt-4 border-t">
                  <Link to={`/trainees/${student.id}`} className="inline-flex items-center justify-center gap-1.5 w-full bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 rounded-lg py-2 text-sm font-semibold transition-colors">
                    Ficha y Actividad <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <NewStudentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreate={async (data) => {
            await addWorker(data);
            setIsModalOpen(false);
          }}
          profiles={profiles}
          areas={areas}
          shifts={shifts}
          holidays={useConfigStore.getState().holidays}
        />
      )}
    </div>
  );
}

function NewStudentModal({ isOpen, onClose, onCreate, profiles, areas, shifts, holidays = [] }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    requiredHours: 350,
    shiftId: '',
    trainingStartTime: '09:00',
    trainingEndTime: '14:00',
    practicumStartDate: '',
    practicumEndDate: '',
    tutorName: '',
    tutorContact: '',
    notes: '',
    selectedProfiles: []
  });

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const toggleProfile = (id) => {
    setFormData(prev => ({
      ...prev,
      selectedProfiles: prev.selectedProfiles.includes(id)
        ? prev.selectedProfiles.filter(pId => pId !== id)
        : [...prev.selectedProfiles, id]
    }));
  };

  const toggleArea = (areaId) => {
    const areaProfileIds = profiles.filter(p => p.areaId === areaId).map(p => p.id);
    const allSelected = areaProfileIds.every(id => formData.selectedProfiles.includes(id));
    if (allSelected) {
      setFormData(prev => ({ ...prev, selectedProfiles: prev.selectedProfiles.filter(id => !areaProfileIds.includes(id)) }));
    } else {
      const newCaps = [...new Set([...formData.selectedProfiles, ...areaProfileIds])];
      setFormData(prev => ({ ...prev, selectedProfiles: newCaps }));
    }
  };

  const getDailyHours = () => {
    if (!formData.trainingStartTime || !formData.trainingEndTime) return 0;
    const start = new Date(`1970-01-01T${formData.trainingStartTime}:00`);
    const end = new Date(`1970-01-01T${formData.trainingEndTime}:00`);
    if (isNaN(start) || isNaN(end)) return 0;
    let diff = (end - start) / 3600000;
    if (diff < 0) diff += 24; // Crosses midnight
    return diff;
  };

  const calculateSuggestedEndDate = () => {
    const { practicumStartDate, requiredHours } = formData;
    const dailyHours = getDailyHours();
    if (!practicumStartDate || !requiredHours || dailyHours <= 0) return '';
    
    let remainingHours = Number(requiredHours);
    let cur = new Date(practicumStartDate);
    let daysAdded = 0;
    
    while (remainingHours > 0 && daysAdded < 1000) { // Safety limit
      if (cur.getDay() !== 0 && cur.getDay() !== 6) {
        const dateStr = cur.toISOString().split('T')[0];
        const isHoliday = holidays.some(h => h.date === dateStr);
        if (!isHoliday) {
          remainingHours -= dailyHours;
        }
      }
      if (remainingHours > 0) {
        cur.setDate(cur.getDate() + 1);
        daysAdded++;
      }
    }
    return cur.toISOString().split('T')[0];
  };

  const handleAutoCalcEndDate = () => {
    const suggested = calculateSuggestedEndDate();
    if (suggested) {
      setFormData(prev => ({ ...prev, practicumEndDate: suggested }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    onCreate({
      name: formData.name,
      category: 'ESTUDIANTE',
      substituteType: formData.grade, // Map grade to substituteType
      requiredHours: parseInt(formData.requiredHours, 10) || 0,
      shiftId: formData.shiftId ? parseInt(formData.shiftId, 10) : null,
      trainingStartTime: formData.trainingStartTime,
      trainingEndTime: formData.trainingEndTime,
      practicumStartDate: formData.practicumStartDate,
      practicumEndDate: formData.practicumEndDate,
      tutorName: formData.tutorName,
      tutorContact: formData.tutorContact,
      notes: formData.notes,
      capabilities: formData.selectedProfiles // These are the profiles they are authorized to learn
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dar de Alta Estudiante" className="max-w-[550px]">
      
      {/* Step Progress Indicator */}
      <div className="flex items-center justify-between mb-6 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-muted -z-10" />
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex flex-col items-center gap-1 bg-background px-2 ${step >= s ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step >= s ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-muted'}`}>
              {s}
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider">
              {s === 1 ? 'Datos' : s === 2 ? 'Horarios' : 'Perfiles'}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre Completo <span className="text-red-500">*</span></label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Ana García" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Grado / Escuela</label>
                <Input value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} placeholder="Ej. Grado Auxiliar" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Turno Asignado <span className="text-red-500">*</span></label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-[!optional]:text-muted-foreground outline-none"
                  required
                  value={formData.shiftId}
                  onChange={e => setFormData({...formData, shiftId: e.target.value})}
                >
                  <option value="" disabled>Seleccionar Turno...</option>
                  {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">El turno que tendrá en el calendario.</p>
              </div>
            </div>

            <div className="bg-muted/10 p-4 rounded-lg border space-y-4">
              <h4 className="text-sm font-semibold border-b pb-2">Contacto Responsable (Tutor)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre del Tutor</label>
                  <Input value={formData.tutorName} onChange={e => setFormData({...formData, tutorName: e.target.value})} placeholder="Ej. Dr. Martínez" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contacto (Email / Tlf)</label>
                  <Input value={formData.tutorContact} onChange={e => setFormData({...formData, tutorContact: e.target.value})} placeholder="Ej. tutor@hospital.com" />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex justify-between">Anotaciones Adicionales</label>
              <textarea className="flex w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-[!optional]:text-muted-foreground outline-none resize-none"
                value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 space-y-5">
              <h4 className="text-sm font-semibold text-primary mb-2">Planificación Global de Horas</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Horas Objetivos Global <span className="text-red-500">*</span></label>
                  <Input required type="number" min="1" value={formData.requiredHours} onChange={e => setFormData({...formData, requiredHours: e.target.value})} placeholder="Ej. 350" />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="text-sm font-medium bg-background w-full h-10 px-3 flex items-center justify-center rounded-md border border-dashed text-muted-foreground whitespace-nowrap">
                    Hace <strong>{getDailyHours().toFixed(2)}h</strong> / día
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hora Inicio (Prácticas) <span className="text-red-500">*</span></label>
                  <Input required type="time" value={formData.trainingStartTime} onChange={e => setFormData({...formData, trainingStartTime: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hora Fin (Prácticas) <span className="text-red-500">*</span></label>
                  <Input required type="time" value={formData.trainingEndTime} onChange={e => setFormData({...formData, trainingEndTime: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/10">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de Inicio <span className="text-red-500">*</span></label>
                  <Input required type="date" value={formData.practicumStartDate} onChange={e => setFormData({...formData, practicumStartDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex justify-between items-center">
                    <span>Fecha Fin <span className="text-red-500">*</span></span>
                    {formData.practicumStartDate && formData.requiredHours && getDailyHours() > 0 && (
                      <button type="button" onClick={handleAutoCalcEndDate} className="text-xs font-bold text-primary hover:underline bg-background px-2 py-0.5 rounded shadow-sm border border-primary/20" tabIndex="-1">
                        + Calcular Auto
                      </button>
                    )}
                  </label>
                  <Input required type="date" min={formData.practicumStartDate} value={formData.practicumEndDate} onChange={e => setFormData({...formData, practicumEndDate: e.target.value})} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider block">Perfiles que deberá aprender</label>
              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto bg-muted/10 custom-scrollbar shadow-inner">
                {areas.map(area => {
                  const areaProfiles = profiles.filter(p => p.areaId === area.id);
                  if (areaProfiles.length === 0) return null;
                  const allSelected = areaProfiles.every(p => formData.selectedProfiles.includes(p.id));
                  const someSelected = areaProfiles.some(p => formData.selectedProfiles.includes(p.id));
                  return (
                    <div key={area.id} className="bg-background">
                      <label className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors border-b">
                        <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                          onChange={() => toggleArea(area.id)} className="w-4 h-4 rounded border-primary/20 accent-primary" />
                        <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: area.color }} />
                        <span className="font-semibold text-[13px]">{area.name}</span>
                      </label>
                      <div className="grid grid-cols-2 p-1">
                        {areaProfiles.map(p => (
                          <label key={p.id} className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors rounded-md m-1 ${formData.selectedProfiles.includes(p.id) ? 'bg-primary/5 text-primary border border-primary/10' : 'hover:bg-muted/50 border border-transparent'}`}>
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-primary/20 accent-primary"
                              checked={formData.selectedProfiles.includes(p.id)}
                              onChange={() => toggleProfile(p.id)}
                            />
                            <span className="text-[13px] font-medium select-none truncate">{p.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Selecciona las áreas y perfiles en los que el estudiante de prácticas tiene autorización legal / seguro médico para estar durante este ciclo formativo.
              </p>
              {formData.selectedProfiles.length === 0 && <span className="text-xs text-destructive font-semibold">Debes seleccionar al menos un perfil.</span>}
            </div>
          </div>
        )}

        <div className="pt-6 mt-6 flex justify-between gap-3 border-t">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={prevStep} className="w-24">Atrás</Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onClose} className="w-24 text-muted-foreground">Cancelar</Button>
          )}
          
          {step < 3 ? (
            <Button type="button" onClick={() => {
              if (step === 1 && (!formData.name || !formData.shiftId)) return;
              if (step === 2 && (!formData.requiredHours || !formData.trainingStartTime || !formData.trainingEndTime || !formData.practicumStartDate || !formData.practicumEndDate)) return;
              nextStep();
            }} className="w-32">Siguiente</Button>
          ) : (
            <Button type="submit" disabled={formData.selectedProfiles.length === 0} className="w-32">Dar de Alta</Button>
          )}
        </div>
      </form>
    </Modal>
  );
}

