import React, { useState, useEffect } from 'react';
import { createRoute, Link, useNavigate } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { TraineesAPI, WorkersAPI, AbsencesAPI, CalendarAPI } from '../lib/api';
import { useConfigStore } from '../stores/configStore';
import { useStaffStore } from '../stores/staffStore';
import { useTraineeStore } from '../stores/traineeStore';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ABSENCE_TYPES, ABSENCE_TYPE_LABELS, SUBSTITUTE_TYPE_LABELS } from '../lib/constants';
import { ArrowLeft, Plus, Trash2, AlertTriangle, Power, PowerOff, Calendar, GraduationCap, Clock, ClipboardCheck } from 'lucide-react';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trainees/$traineeId',
  component: TraineeDetailPage,
});

function TraineeDetailPage() {
  const { t } = useTranslation();
  const { traineeId } = Route.useParams();
  const { areas, profiles, holidays, shifts, fetchData } = useConfigStore();
  const { toggleWorkerActive, updateWorker } = useStaffStore();
  const { trainees, fetchTrainees, createTrainee, updateTrainee } = useTraineeStore();
  const navigate = useNavigate();

  const [worker, setWorker] = useState(null);
  const [absenceGroups, setAbsenceGroups] = useState({ active: [], future: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  // Absence modal
  const [isAbsenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState(null);
  const [absenceForm, setAbsenceForm] = useState({ type: ABSENCE_TYPES[0], dateStart: '', dateEnd: '', note: '' });
  const [absenceError, setAbsenceError] = useState('');

  // Options
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Trainee Modal
  const [isTraineeModalOpen, setTraineeModalOpen] = useState(false);
  const [traineeForm, setTraineeForm] = useState({ targetProfileId: '', startDate: '', endDate: '', notes: '' });

  // Analytics & Hire Modal
  const [isHireConfirmOpen, setHireConfirmOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({ loaded: false, loading: false, shifts: [] });

  const loadData = async () => {
    setLoading(true);
    await fetchData();
    const [w, abs] = await Promise.all([
      WorkersAPI.getById(Number(traineeId)),
      AbsencesAPI.getByWorker(Number(traineeId)),
      fetchTrainees()
    ]);
    setWorker(w);
    setAbsenceGroups(abs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [traineeId]);

  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsData.loaded && !analyticsData.loading && worker) {
      const fetchAnalytics = async () => {
        setAnalyticsData(prev => ({ ...prev, loading: true }));
        try {
          const start = worker.practicumStartDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
          const end = worker.practicumEndDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
          const matrix = await CalendarAPI.getMatrix(start, end);
          const shifts = matrix.filter(s => s.allocatedWorkerId === worker.id);
          setAnalyticsData({ loaded: true, loading: false, shifts });
        } catch (err) {
          console.error("Failed to fetch analytics:", err);
          setAnalyticsData({ loaded: true, loading: false, shifts: [] });
        }
      };
      fetchAnalytics();
    }
  }, [activeTab, analyticsData.loaded, analyticsData.loading, worker]);


  const getProfile = (id) => profiles.find(p => p.id === id);
  const getArea = (areaId) => areas.find(a => a.id === areaId);

  const handleAddAbsence = async (e) => {
    e.preventDefault();
    setAbsenceError('');
    try {
      await AbsencesAPI.create({ ...absenceForm, workerId: Number(traineeId) });
      setAbsenceModalOpen(false);
      setAbsenceForm({ type: ABSENCE_TYPES[0], dateStart: '', dateEnd: '', note: '' });
      const abs = await AbsencesAPI.getByWorker(Number(traineeId));
      setAbsenceGroups(abs);
    } catch (err) {
      setAbsenceError(err.response?.data?.error || t('absence.error_save') || 'Error al guardar la ausencia.');
    }
  };

  const handleDeleteAbsence = async () => {
    await AbsencesAPI.delete(absenceToDelete.id);
    setAbsenceToDelete(null);
    loadData();
    useStaffStore.getState().fetchWorkers();
    useStaffStore.getState().fetchGlobalAbsences();
  };

  const handleDeleteStudent = async () => {
    setIsDeleting(true);
    try {
      await WorkersAPI.delete(worker.id);
      useStaffStore.getState().fetchWorkers();
      navigate({ to: '/trainees' });
    } catch (e) {
      console.error("Error deleting student:", e);
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleAddTraineeRecord = async (e) => {
    e.preventDefault();
    await createTrainee({
      workerId: Number(traineeId),
      ...traineeForm,
      targetProfileId: parseInt(traineeForm.targetProfileId, 10)
    });
    setTraineeModalOpen(false);
    setTraineeForm({ targetProfileId: '', startDate: '', endDate: '', notes: '' });
  };

  const handleUpdateTraineeStatus = async (opId, newStatus) => {
    await updateTrainee(opId, { status: newStatus });
  };

  const handleHire = async () => {
    await updateWorker(worker.id, { category: 'SUPLENTE' });
    window.location.href = `/staff/${worker.id}`;
  };

  const workerTrainees = trainees.filter(t => t.workerId === Number(traineeId));
  
  // Calculate trainee general status based on periods
  let generalStatus = 'PENDING';
  let badgeColor = 'bg-gray-100 text-gray-600';
  let badgeLabel = t('students.badge_pending');
  
  if (workerTrainees.some(t => t.status === 'ACTIVE')) {
    generalStatus = 'ACTIVE';
    badgeColor = 'bg-green-100 text-green-700 border-green-200';
    badgeLabel = t('students.badge_active');
  } else if (workerTrainees.some(t => t.status === 'PAUSED')) {
    generalStatus = 'PAUSED';
    badgeColor = 'bg-orange-100 text-orange-700 border-orange-200';
    badgeLabel = t('students.badge_paused');
  } else if (workerTrainees.length > 0 && workerTrainees.every(t => t.status === 'COMPLETED')) {
    generalStatus = 'COMPLETED';
    badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
    badgeLabel = t('students.badge_completed');
  }

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
      daysLeftStr = diffDays === 1 ? t('absences.tomorrow') : t('absences.in_days', { count: diffDays });
    } else if (absence.dateEnd >= now) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(absence.dateEnd);
      target.setHours(0, 0, 0, 0);
      const diffTime = target - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysLeftColor = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
      if (diffDays === 0) daysLeftStr = t('absences.ends_today');
      else if (diffDays === 1) daysLeftStr = t('absences.ends_tomorrow');
      else daysLeftStr = t('absences.days_left', { count: diffDays });
    }

    return (
      <div className={`flex items-center justify-between p-3 border rounded-md bg-background shadow-sm ${absence.dateEnd < now ? 'opacity-70 grayscale-[0.5]' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5"><Calendar size={16} className="text-muted-foreground" /></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase bg-muted px-2 py-0.5 rounded">
                {t('absence_type.' + absence.type)}
              </span>
              {daysLeftStr && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${daysLeftColor}`}>
                  {daysLeftStr}
                </span>
              )}
            </div>
            <p className="text-sm font-medium mt-1">{absence.dateStart} {t('students.absence_to')} {absence.dateEnd}</p>
            {absence.note && <p className="text-xs text-muted-foreground mt-1 bg-muted/30 p-1.5 rounded-sm italic">{absence.note}</p>}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0"
          onClick={() => setAbsenceToDelete(absence)}><Trash2 size={15} /></Button>
      </div>
    );
  };

  const calculateEffectiveDays = (start, end) => {
    if (!start || !end || new Date(start) > new Date(end)) return 0;
    const s = new Date(start);
    const e = new Date(end);
    let days = 0;
    const cur = new Date(s);
    while (cur <= e) {
      if (cur.getDay() !== 0 && cur.getDay() !== 6) days++;
      cur.setDate(cur.getDate() + 1);
    }
    const holidayDays = holidays.filter(h => {
      const hDate = new Date(h.date);
      return h.date >= start && h.date <= end && hDate.getDay() !== 0 && hDate.getDay() !== 6;
    }).length;
    return Math.max(0, days - holidayDays);
  };

  const getShiftHours = (shiftId) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return 0;
    const [h1, m1] = shift.startTime.split(':').map(Number);
    const [h2, m2] = shift.endTime.split(':').map(Number);
    let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
    if (diff < 0) diff += 24; // Cross midnight
    return diff;
  };

  const getDailyHours = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(`1970-01-01T${start}:00`);
    const e = new Date(`1970-01-01T${end}:00`);
    if (isNaN(s) || isNaN(e)) return 0;
    let diff = (e - s) / 3600000;
    if (diff < 0) diff += 24;
    return diff;
  };

  const selectClassName = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-[!optional]:text-muted-foreground outline-none";

  if (loading) return <div className="p-8 text-muted-foreground">{t('students.detail_loading')}</div>;
  if (!worker) return <div className="p-8 text-destructive">{t('students.detail_not_found')}</div>;

  const totalAbsences = absenceGroups.active.length + absenceGroups.future.length + absenceGroups.past.length;

  const tabs = [
    { id: 'info', label: t('students.tab_info') },
    { id: 'absences', label: t('students.tab_absences', { count: totalAbsences }) },
    { id: 'analytics', label: t('students.tab_analytics') }
  ];

  return (
    <div className="flex-1 w-full p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-1" onClick={() => {
          if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
            window.history.back();
          } else {
            window.location.href = '/trainees';
          }
        }}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{worker.name}</h1>
            <span className={`text-[11px] font-bold uppercase px-2.5 py-1 border rounded-md ${badgeColor}`}>
              {badgeLabel}
            </span>
            {!worker.isActive && <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-muted text-red-500">{t('students.badge_deactivated')}</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium flex gap-4">
            <span className="flex items-center gap-1"><GraduationCap size={14}/> {t('substitute_type.' + worker.substituteType)}</span>
            {worker.shiftId && (
              <span className="flex items-center gap-1">
                <Clock size={14}/> 
                {t('students.assigned_shift', { name: shifts.find(s => s.id === worker.shiftId)?.name || t('students.shift_unknown') })} 
              </span>
            )}
            {worker.trainingStartTime && worker.trainingEndTime && <span className="flex items-center gap-1"><Calendar size={14}/> {worker.trainingStartTime} - {worker.trainingEndTime} ({t('students.daily_h', { hours: getDailyHours(worker.trainingStartTime, worker.trainingEndTime) })})</span>}
            {worker.requiredHours && <span className="flex items-center gap-1"><ClipboardCheck size={14}/> {t('students.global_hours', { hours: worker.requiredHours, start: worker.practicumStartDate, end: worker.practicumEndDate })}</span>}
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => toggleWorkerActive(worker.id).then(() => loadData())} className="gap-1.5 justify-start">
            {worker.isActive ? <><PowerOff size={14} className="text-destructive"/> {t('students.btn_deactivate')}</> : <><Power size={14} className="text-primary"/> {t('students.btn_activate')}</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(true)} className="gap-1.5 justify-start text-destructive hover:bg-destructive hover:text-white shadow-sm border-destructive/20">
            <Trash2 size={14}/> {t('students.btn_delete_perm')}
          </Button>
          {(generalStatus === 'COMPLETED' || (generalStatus === 'PENDING' && workerTrainees.length > 0)) && (
            <Button size="sm" onClick={() => setHireConfirmOpen(true)} className="gap-1.5 justify-start bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <GraduationCap size={14} /> {t('students.btn_hire')}
            </Button>
          )}
        </div>
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
          
          <div className="grid md:grid-cols-[1fr,300px] gap-8">
            <div className="space-y-6">
              {/* TRAINEE BLOCK */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold tracking-tight">{t('students.training_section')}</h3>
                  {worker.isActive && (
                    <Button size="sm" variant="outline" onClick={() => setTraineeModalOpen(true)} className="gap-2">
                      <Plus size={16} /> {t('students.start_period')}
                    </Button>
                  )}
                </div>
                
                {workerTrainees.length > 0 ? (
                  <div className="grid gap-3">
                    {workerTrainees.map(period => {
                      const targetProfile = getProfile(period.targetProfileId);
                      const targetArea = targetProfile ? getArea(targetProfile.areaId) : null;
                      return (
                        <div key={period.id} className="border rounded-lg p-4 bg-card shadow-sm flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${period.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : period.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                {period.status === 'ACTIVE' ? t('students.btn_resume') : period.status === 'COMPLETED' ? t('students.btn_complete') : t('students.btn_pause')}
                              </span>
                              <span className="text-sm font-semibold flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: targetArea?.color }} />
                                {targetArea?.name} / {targetProfile?.name}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('students.period_from_to', { start: new Date(period.startDate).toLocaleDateString(), end: new Date(period.endDate).toLocaleDateString() })}
                            </p>
                            {period.notes && <p className="text-xs bg-muted/40 p-2 mt-2 rounded border">{period.notes}</p>}
                          </div>
                          <div className="flex flex-col gap-2">
                            {period.status === 'ACTIVE' && <Button size="sm" variant="outline" onClick={() => handleUpdateTraineeStatus(period.id, 'PAUSED')} className="h-7 text-xs">{t('students.btn_pause')}</Button>}
                            {period.status === 'PAUSED' && <Button size="sm" variant="default" onClick={() => handleUpdateTraineeStatus(period.id, 'ACTIVE')} className="h-7 text-xs">{t('students.btn_resume')}</Button>}
                            {period.status !== 'COMPLETED' && <Button size="sm" variant="secondary" onClick={() => handleUpdateTraineeStatus(period.id, 'COMPLETED')} className="h-7 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100">{t('students.btn_complete')}</Button>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-24 flex flex-col items-center justify-center border border-dashed rounded-lg text-sm text-muted-foreground bg-muted/10">
                    <p>{t('students.no_periods')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* General Info Sidebar */}
            <div className="space-y-6">
              {(worker.tutorName || worker.tutorContact) && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('students.tutor_sidebar')}</h3>
                  <div className="bg-muted/10 border rounded-lg p-3 text-sm flex flex-col gap-1">
                    {worker.tutorName && <div className="font-semibold">{worker.tutorName}</div>}
                    {worker.tutorContact && <div className="text-muted-foreground">{worker.tutorContact}</div>}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('students.notes_sidebar')}</h3>
                {worker.notes ? (
                  <p className="text-sm bg-muted/30 border rounded-lg p-3 whitespace-pre-wrap leading-relaxed">{worker.notes}</p>
                ) : (
                  <span className="text-sm text-muted-foreground italic">{t('students.no_notes')}</span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('students.profiles_sidebar')}</h3>
                </div>
                {worker.practicumStartDate && worker.practicumEndDate && worker.capabilities?.length > 0 && (
                  <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground">
                    <p className="font-semibold text-primary mb-2 flex items-center gap-2"><Calendar size={16}/> {t('students.rotation_suggested')}</p>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground mb-3">
                        {t('students.rotation_total', { hours: worker.requiredHours, daily: getDailyHours(worker.trainingStartTime, worker.trainingEndTime) })}<br/>
                        {t('students.rotation_working_days', { days: calculateEffectiveDays(worker.practicumStartDate, worker.practicumEndDate) })}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-background border rounded-md p-2 flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-bold text-primary">{Math.ceil(calculateEffectiveDays(worker.practicumStartDate, worker.practicumEndDate) / worker.capabilities.length)}</span>
                          <span className="text-xs text-muted-foreground uppercase font-semibold">{t('students.rotation_days_per_profile')}</span>
                        </div>
                        <div className="bg-background border rounded-md p-2 flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-bold text-primary">{worker.capabilities.length}</span>
                          <span className="text-xs text-muted-foreground uppercase font-semibold">{t('students.rotation_total_rotations')}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 italic leading-relaxed">
                        {t('students.rotation_hint', { count: worker.capabilities.length })}
                      </p>
                    </div>
                  </div>
                )}
                {worker.capabilities?.length > 0 ? (
                  <div className="space-y-3">
                    {areas.map(area => {
                      const capProfiles = profiles.filter(p => p.areaId === area.id && worker.capabilities.includes(p.id));
                      if (capProfiles.length === 0) return null;
                      return (
                        <div key={area.id} className="border rounded-lg overflow-hidden shadow-sm">
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
                            <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: area.color }} />
                            <span className="text-xs font-semibold">{area.name}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 p-2">
                            {capProfiles.map(p => (
                              <span key={p.id} className="text-[11px] font-medium bg-background border px-2 py-0.5 rounded-md text-muted-foreground">{p.name}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 flex items-center justify-center border border-dashed rounded-lg text-xs text-muted-foreground text-center">
                    {t('students.no_profiles_assigned')}
                  </div>
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
            <h3 className="text-lg font-semibold tracking-tight">{t('students.absences_section')}</h3>
            <Button onClick={() => setAbsenceModalOpen(true)} className="gap-2"><Plus size={16} /> {t('students.add_absence')}</Button>
          </div>

          <div className="grid gap-6">
            {['active', 'future', 'past'].map(group => {
              const labelMap = { active: t('students.absence_active'), future: t('students.absence_future'), past: t('students.absence_past') };
              const colorMap = { active: 'text-red-600 dark:text-red-400', future: 'text-blue-600 dark:text-blue-400', past: 'text-muted-foreground' };
              const items = absenceGroups[group] || [];
              
              if (items.length === 0 && group === 'past') return null;

              return (
                <div key={group}>
                  <h4 className={`text-sm font-semibold mb-3 ${colorMap[group]}`}>{labelMap[group]}</h4>
                  {items.length === 0 ? (
                    <div className="p-4 text-center border border-dashed rounded-lg text-sm text-muted-foreground">
                      {t('students.absence_empty')}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-xl p-5 text-center bg-card shadow-sm flex flex-col items-center justify-center">
              <p className="text-4xl font-bold tracking-tighter text-red-500">{totalAbsences}</p>
              <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wide">{t('students.analytics_absences')}</p>
            </div>
            {analyticsData.loading ? (
              <div className="border rounded-xl p-5 text-center bg-card shadow-sm col-span-2 flex flex-col items-center justify-center text-muted-foreground text-sm">{t('students.analytics_scanning')}</div>
            ) : (
              <>
                <div className="border rounded-xl p-5 text-center bg-card shadow-sm flex flex-col items-center justify-center">
                  <p className="text-4xl font-bold tracking-tighter text-primary">
                    {analyticsData.shifts.reduce((acc, shift) => acc + getShiftHours(shift.shiftId), 0).toFixed(1)}h
                  </p>
                  <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wide">{t('students.analytics_hours')}</p>
                </div>
                <div className="border rounded-xl p-5 text-center bg-card shadow-sm flex flex-col items-center justify-center">
                  <p className="text-4xl font-bold tracking-tighter text-blue-600">
                    {worker.requiredHours ? ((analyticsData.shifts.reduce((acc, shift) => acc + getShiftHours(shift.shiftId), 0) / worker.requiredHours) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wide">{t('students.analytics_progress')}</p>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/10">
            <Calendar className="text-muted-foreground/50 mb-3" size={32} />
            <h3 className="font-semibold text-lg">{t('students.analytics_title')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">{t('students.analytics_body')}</p>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={isAbsenceModalOpen} onClose={() => { setAbsenceModalOpen(false); setAbsenceError(''); }} title={t('students.modal_absence_title')} className="max-w-md">
        <form onSubmit={handleAddAbsence} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('students.modal_reason')}</label>
            <select className={selectClassName} value={absenceForm.type} onChange={e => setAbsenceForm({ ...absenceForm, type: e.target.value })}>
              {ABSENCE_TYPES.map(typeKey => <option key={typeKey} value={typeKey}>{t('absence_type.' + typeKey)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('students.modal_from')}</label>
              <Input required type="date" value={absenceForm.dateStart} onChange={e => setAbsenceForm({ ...absenceForm, dateStart: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('students.modal_until')}</label>
              <Input required type="date" min={absenceForm.dateStart} value={absenceForm.dateEnd} onChange={e => setAbsenceForm({ ...absenceForm, dateEnd: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex justify-between">
              {t('students.modal_notes')}
              <span className="text-xs text-muted-foreground font-normal">{t('students.modal_optional')}</span>
            </label>
            <textarea className="flex w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              value={absenceForm.note} onChange={e => setAbsenceForm({ ...absenceForm, note: e.target.value })} placeholder="..." />
          </div>
          
          {absenceError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-md border border-red-200 dark:border-red-800/50 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{absenceError}</span>
            </div>
          )}
          
          <div className="pt-2 flex justify-end gap-2 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => { setAbsenceModalOpen(false); setAbsenceError(''); }}>{t('students.modal_cancel')}</Button>
            <Button type="submit">{t('students.modal_save_absence')}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!absenceToDelete} onClose={() => setAbsenceToDelete(null)} title={t('students.modal_delete_absence_title')}>
        <div className="space-y-4">
          <p className="text-sm">{t('students.modal_delete_absence_body', { type: absenceToDelete?.type && t('absence_type.' + absenceToDelete.type), start: absenceToDelete?.dateStart, end: absenceToDelete?.dateEnd })}</p>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setAbsenceToDelete(null)}>{t('students.modal_keep')}</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0" onClick={handleDeleteAbsence}>{t('students.modal_delete_perm')}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Student Modal */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => !isDeleting && setDeleteConfirmOpen(false)} title={t('students.modal_delete_student_title')}>
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            {t('students.modal_delete_student_body', { name: worker.name })}
          </p>
          <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg border">
            {t('students.modal_delete_student_warning')}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>{t('students.modal_cancel')}</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0" onClick={handleDeleteStudent} disabled={isDeleting}>
              {isDeleting ? t('students.modal_deleting') : t('students.modal_delete_confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isTraineeModalOpen} onClose={() => setTraineeModalOpen(false)} title={t('students.modal_period_title')} className="max-w-md">
        <form onSubmit={handleAddTraineeRecord} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('students.modal_profile_label')}</label>
            <select className={selectClassName} required value={traineeForm.targetProfileId} onChange={e => setTraineeForm({...traineeForm, targetProfileId: e.target.value})}>
              <option value="" disabled>{t('students.modal_select_profile')}</option>
              {profiles.filter(p => p.isActive && worker.capabilities.includes(p.id)).map(p => (
                <option key={p.id} value={p.id}>{getArea(p.areaId)?.name} / {p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('students.modal_from')}</label>
              <Input required type="date" value={traineeForm.startDate} onChange={e => setTraineeForm({...traineeForm, startDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('students.modal_until')}</label>
              <Input required type="date" min={traineeForm.startDate} value={traineeForm.endDate} onChange={e => setTraineeForm({...traineeForm, endDate: e.target.value})} />
            </div>
          </div>
          
          {traineeForm.startDate && traineeForm.endDate && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm flex items-start gap-3">
              <Clock size={18} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-primary">{t('students.modal_period_hint_title')}</p>
                <div className="text-muted-foreground mt-1 space-y-1 text-xs">
                  <p>{t('students.modal_working_days', { days: calculateEffectiveDays(traineeForm.startDate, traineeForm.endDate) })}</p>
                  <p>{t('students.modal_rate', { hours: getDailyHours(worker.trainingStartTime, worker.trainingEndTime) })}</p>
                  <p className="text-foreground pt-1 border-t border-primary/10 mt-1">{t('students.modal_will_accumulate', { hours: ((calculateEffectiveDays(traineeForm.startDate, traineeForm.endDate) * getDailyHours(worker.trainingStartTime, worker.trainingEndTime))).toFixed(1) })}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('students.modal_notes_tutor')}</label>
            <Input value={traineeForm.notes} onChange={e => setTraineeForm({...traineeForm, notes: e.target.value})} placeholder="..." />
          </div>
          <div className="pt-2 flex justify-end gap-2 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => setTraineeModalOpen(false)}>{t('students.modal_cancel')}</Button>
            <Button type="submit">{t('students.modal_save_period')}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isHireConfirmOpen} onClose={() => setHireConfirmOpen(false)} title={t('students.modal_hire_title')}>
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            {t('students.modal_hire_body', { name: worker.name })}
          </p>
          <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg border">
            {t('students.modal_hire_warning')}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setHireConfirmOpen(false)}>{t('students.modal_cancel')}</Button>
            <Button className="bg-indigo-600 text-white hover:bg-indigo-700 border-0 shadow-sm" onClick={handleHire}>
              {t('students.modal_hire_confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
