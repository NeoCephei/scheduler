import React, { useState, useEffect } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { WorkersAPI, AbsencesAPI } from '../lib/api';
import { useConfigStore } from '../stores/configStore';
import { useStaffStore } from '../stores/staffStore';
import { useTraineeStore } from '../stores/traineeStore';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ABSENCE_TYPES, ABSENCE_TYPE_LABELS, SUBSTITUTE_TYPE_LABELS } from '../lib/constants';
import { ArrowLeft, Plus, Trash2, AlertTriangle, Power, PowerOff, Calendar } from 'lucide-react';
import WorkerAnalytics from '../components/staff/WorkerAnalytics';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff/$workerId',
  component: WorkerDetailPage,
});

function WorkerDetailPage() {
  const { t } = useTranslation();
  const { workerId } = Route.useParams();
  const { areas, profiles, fetchData } = useConfigStore();
  const { toggleWorkerActive, updateWorker } = useStaffStore();
  const { trainees, fetchTrainees, createTrainee, updateTrainee } = useTraineeStore();

  const [worker, setWorker] = useState(null);
  const [absenceGroups, setAbsenceGroups] = useState({ active: [], future: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  // Absence modal
  const [isAbsenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState(null);
  const [absenceForm, setAbsenceForm] = useState({ type: ABSENCE_TYPES[0], dateStart: '', dateEnd: '', note: '' });
  const [absenceError, setAbsenceError] = useState('');

  // Trainee Modal
  const [isTraineeModalOpen, setTraineeModalOpen] = useState(false);
  const [traineeForm, setTraineeForm] = useState({ targetProfileId: '', startDate: '', endDate: '', notes: '' });

  // Capabilities Modal
  const [isCapsModalOpen, setCapsModalOpen] = useState(false);
  const [capsForm, setCapsForm] = useState([]);

  const loadData = async () => {
    setLoading(true);
    await fetchData();
    const [w, abs] = await Promise.all([
      WorkersAPI.getById(Number(workerId)),
      AbsencesAPI.getByWorker(Number(workerId)),
      fetchTrainees()
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
      setAbsenceError(err.response?.data?.error || t('workers.error_save_absence'));
    }
  };

  const handleDeleteAbsence = async () => {
    await AbsencesAPI.delete(absenceToDelete.id);
    setAbsenceToDelete(null);
    const abs = await AbsencesAPI.getByWorker(Number(workerId));
    setAbsenceGroups(abs);
  };

  const handleAddTraineeRecord = async (e) => {
    e.preventDefault();
    await createTrainee({
      workerId: Number(workerId),
      ...traineeForm,
      targetProfileId: parseInt(traineeForm.targetProfileId, 10)
    });
    setTraineeModalOpen(false);
    setTraineeForm({ targetProfileId: '', startDate: '', endDate: '', notes: '' });
  };

  const handleUpdateTraineeStatus = async (traineeId, newStatus) => {
    await updateTrainee(traineeId, { status: newStatus });
  };

  const workerTrainees = trainees.filter(t => t.workerId === Number(workerId));

  const handleOpenCapsModal = () => {
    setCapsForm(worker?.capabilities || []);
    setCapsModalOpen(true);
  };

  const toggleCapability = (profileId) => {
    setCapsForm(prev => prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]);
  };

  const toggleArea = (areaId) => {
    const areaProfileIds = profiles.filter(p => p.areaId === areaId).map(p => p.id);
    const allSelected = areaProfileIds.every(id => capsForm.includes(id));
    if (allSelected) {
      setCapsForm(prev => prev.filter(id => !areaProfileIds.includes(id)));
    } else {
      setCapsForm(prev => [...new Set([...prev, ...areaProfileIds])]);
    }
  };

  const handleSaveCaps = async (e) => {
    e.preventDefault();
    await updateWorker(worker.id, { ...worker, capabilities: capsForm });
    setWorker({ ...worker, capabilities: capsForm });
    setCapsModalOpen(false);
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
      daysLeftStr = diffDays === 1 ? t('workers.absence_tomorrow') : t('workers.absence_in_days', { count: diffDays });
    } else if (absence.dateEnd >= now) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(absence.dateEnd);
      target.setHours(0, 0, 0, 0);
      const diffTime = target - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysLeftColor = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
      if (diffDays === 0) daysLeftStr = t('workers.absence_ends_today');
      else if (diffDays === 1) daysLeftStr = t('workers.absence_ends_tomorrow');
      else daysLeftStr = t('workers.absence_days_left', { count: diffDays });
    }

    return (
      <div className={`flex items-center justify-between p-3 border rounded-md bg-background shadow-sm ${absence.dateEnd < now ? 'opacity-70 grayscale-[0.5]' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5"><Calendar size={16} className="text-muted-foreground" /></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase bg-muted px-2 py-0.5 rounded">
                {t(`absence_type.${absence.type}`)}
              </span>
              {daysLeftStr && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${daysLeftColor}`}>
                  {daysLeftStr}
                </span>
              )}
            </div>
            <p className="text-sm font-medium mt-1">{absence.dateStart} {t('workers.absence_to')} {absence.dateEnd}</p>
            {absence.note && <p className="text-xs text-muted-foreground mt-1 bg-muted/30 p-1.5 rounded-sm italic">{absence.note}</p>}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0"
          onClick={() => setAbsenceToDelete(absence)}><Trash2 size={15} /></Button>
      </div>
    );
  };

  const selectClassName = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (loading) return <div className="p-8 text-muted-foreground">{t('workers.detail_loading')}</div>;
  if (!worker) return <div className="p-8 text-destructive">{t('workers.detail_not_found')}</div>;

  const fixedProfile = worker.fixedProfileId ? getProfile(worker.fixedProfileId) : null;
  const fixedArea = fixedProfile ? getArea(fixedProfile?.areaId) : null;
  const hasNoCaps = worker.category === 'SUPLENTE' && (!worker.capabilities || worker.capabilities.length === 0);
  const totalAbsences = absenceGroups.active.length + absenceGroups.future.length + absenceGroups.past.length;

  const tabs = [
    { id: 'info', label: t('workers.tab_info') },
    { id: 'absences', label: t('workers.tab_absences', { count: totalAbsences }) },
    { id: 'analytics', label: t('workers.tab_analytics') }
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
              {t(`workers.cat_${worker.category.toLowerCase()}`)}
            </span>
            {!worker.isActive && <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-muted text-red-500">{t('workers.badge_deactivated')}</span>}
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
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">{t(`substitute_type.${worker.substituteType}`)}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => toggleWorkerActive(worker.id).then(() => loadData())} className="gap-1.5 shrink-0">
          {worker.isActive ? <><PowerOff size={14} className="text-destructive"/> {t('workers.btn_deactivate')}</> : <><Power size={14} className="text-primary"/> {t('workers.btn_activate')}</>}
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
              <p>{t('workers.no_caps_warning')}</p>
            </div>
          )}

          {/* TRAINEE BLOCK */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold tracking-tight">{t('workers.training_section')}</h3>
              <Button size="sm" variant="outline" onClick={() => setTraineeModalOpen(true)} className="gap-2">
                <Plus size={16} /> {t('workers.add_training')}
              </Button>
            </div>
            
            {workerTrainees.length > 0 ? (
              <div className="grid gap-3">
                {workerTrainees.map(tr => {
                  const targetProfile = getProfile(tr.targetProfileId);
                  const targetArea = targetProfile ? getArea(targetProfile.areaId) : null;
                  return (
                    <div key={tr.id} className="border rounded-lg p-4 bg-card shadow-sm flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${tr.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : tr.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {tr.status === 'ACTIVE' ? t('workers.status_active') : tr.status === 'COMPLETED' ? t('workers.status_completed') : t('workers.status_paused')}
                          </span>
                          <span className="text-sm font-semibold flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: targetArea?.color }} />
                            {targetArea?.name} / {targetProfile?.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('workers.from_to', { start: new Date(tr.startDate).toLocaleDateString(), end: new Date(tr.endDate).toLocaleDateString() })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {tr.status === 'ACTIVE' && <Button size="sm" variant="outline" onClick={() => handleUpdateTraineeStatus(tr.id, 'PAUSED')} className="h-7 text-xs">{t('workers.btn_pause')}</Button>}
                        {tr.status === 'PAUSED' && <Button size="sm" variant="default" onClick={() => handleUpdateTraineeStatus(tr.id, 'ACTIVE')} className="h-7 text-xs">{t('workers.btn_resume')}</Button>}
                        {tr.status !== 'COMPLETED' && <Button size="sm" variant="secondary" onClick={() => handleUpdateTraineeStatus(tr.id, 'COMPLETED')} className="h-7 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100">{t('workers.btn_complete')}</Button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center border border-dashed rounded-lg text-sm text-muted-foreground bg-muted/10">
                {t('workers.no_training')}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-[1fr,300px] gap-8">
            {/* Capabilities */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold tracking-tight">{t('workers.caps_section')}</h3>
                <Button size="sm" variant="outline" onClick={handleOpenCapsModal} className="h-8 gap-2">
                  <Plus size={14} /> {t('workers.modal_save_caps').replace('Guardar', t('config.edit')).replace('Save', t('config.edit'))}
                </Button>
              </div>
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
                  {t('workers.no_caps')}
                </div>
              )}
            </div>

            {/* General Info Sidebar */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('workers.notes_section')}</h3>
                {worker.notes ? (
                  <p className="text-sm bg-muted/30 border rounded-lg p-3 whitespace-pre-wrap leading-relaxed">{worker.notes}</p>
                ) : (
                  <span className="text-sm text-muted-foreground italic">{t('workers.no_notes')}</span>
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
            <h3 className="text-lg font-semibold tracking-tight">{t('workers.absences_section')}</h3>
            <Button onClick={() => setAbsenceModalOpen(true)} className="gap-2"><Plus size={16} /> {t('workers.add_absence')}</Button>
          </div>

          <div className="grid gap-6">
            {['active', 'future', 'past'].map(group => {
              const labelMap = { active: t('workers.absence_active'), future: t('workers.absence_future'), past: t('workers.absence_past') };
              const colorMap = { active: 'text-red-600 dark:text-red-400', future: 'text-blue-600 dark:text-blue-400', past: 'text-muted-foreground' };
              const items = absenceGroups[group] || [];
              
              if (items.length === 0 && group === 'past') return null; // Hide empty past section

              return (
                <div key={group}>
                  <h4 className={`text-sm font-semibold mb-3 ${colorMap[group]}`}>{labelMap[group]}</h4>
                  {items.length === 0 ? (
                    <div className="p-4 text-center border border-dashed rounded-lg text-sm text-muted-foreground">
                      {t('workers.absence_empty')}
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
        <WorkerAnalytics worker={worker} absences={absenceGroups} />
      )}

      {/* Modals */}
      <Modal isOpen={isAbsenceModalOpen} onClose={() => { setAbsenceModalOpen(false); setAbsenceError(''); }} title={t('workers.modal_add_absence')} className="max-w-md">
        <form onSubmit={handleAddAbsence} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('workers.modal_reason')}</label>
            <select className={selectClassName} value={absenceForm.type} onChange={e => setAbsenceForm({ ...absenceForm, type: e.target.value })}>
              {ABSENCE_TYPES.map(st => <option key={st} value={st}>{t(`absence_type.${st}`)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('workers.modal_from')}</label>
              <Input required type="date" value={absenceForm.dateStart} onChange={e => setAbsenceForm({ ...absenceForm, dateStart: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('workers.modal_until')}</label>
              <Input required type="date" min={absenceForm.dateStart} value={absenceForm.dateEnd} onChange={e => setAbsenceForm({ ...absenceForm, dateEnd: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex justify-between">
              {t('workers.modal_notes')}
              <span className="text-xs text-muted-foreground font-normal">{t('workers.modal_optional')}</span>
            </label>
            <textarea className="flex w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              value={absenceForm.note} onChange={e => setAbsenceForm({ ...absenceForm, note: e.target.value })} placeholder={t('workers.modal_notes_placeholder')} />
          </div>
          
          {absenceError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-md border border-red-200 dark:border-red-800/50 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{absenceError}</span>
            </div>
          )}
          
          <div className="pt-2 flex justify-end gap-2 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => { setAbsenceModalOpen(false); setAbsenceError(''); }}>{t('workers.cancel')}</Button>
            <Button type="submit">{t('workers.modal_save_absence')}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!absenceToDelete} onClose={() => setAbsenceToDelete(null)} title={t('workers.modal_delete_absence')}>
        <div className="space-y-4">
          <p className="text-sm">{t('workers.modal_delete_absence_body', { type: absenceToDelete?.type && t(`absence_type.${absenceToDelete.type}`), start: absenceToDelete?.dateStart, end: absenceToDelete?.dateEnd })}</p>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setAbsenceToDelete(null)}>{t('workers.modal_keep')}</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0" onClick={handleDeleteAbsence}>{t('workers.modal_delete_permanently')}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isTraineeModalOpen} onClose={() => setTraineeModalOpen(false)} title={t('workers.modal_training_title')} className="max-w-md">
        <form onSubmit={handleAddTraineeRecord} className="space-y-4">
          {worker.category !== 'ESTUDIANTE' && (
            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-primary/20">
              {t('workers.modal_training_info')}
            </p>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('workers.modal_profile_to_learn')}</label>
            <select className={selectClassName} required value={traineeForm.targetProfileId} onChange={e => setTraineeForm({...traineeForm, targetProfileId: e.target.value})}>
              <option value="" disabled>{t('workers.modal_select_profile')}</option>
              {profiles.filter(p => {
                if (!p.isActive) return false;
                if (worker.category === 'ESTUDIANTE') return worker.capabilities?.includes(p.id);
                return !worker.capabilities?.includes(p.id) && worker.fixedProfileId !== p.id;
              }).map(p => (
                <option key={p.id} value={p.id}>{getArea(p.areaId)?.name} / {p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('workers.modal_from')}</label>
              <Input required type="date" value={traineeForm.startDate} onChange={e => setTraineeForm({...traineeForm, startDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('workers.modal_until_short')}</label>
              <Input required type="date" min={traineeForm.startDate} value={traineeForm.endDate} onChange={e => setTraineeForm({...traineeForm, endDate: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('workers.modal_notes_label')}</label>
            <Input value={traineeForm.notes} onChange={e => setTraineeForm({...traineeForm, notes: e.target.value})} placeholder={t('workers.field_tutor_placeholder')} />
          </div>
          <div className="pt-2 flex justify-end gap-2 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => setTraineeModalOpen(false)}>{t('workers.cancel')}</Button>
            <Button type="submit">{t('workers.modal_start_training')}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCapsModalOpen} onClose={() => setCapsModalOpen(false)} title={t('workers.modal_caps_title')} className="max-w-md">
        <form onSubmit={handleSaveCaps} className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t('workers.modal_caps_info')}
          </p>
          <div className="border rounded-lg divide-y max-h-72 overflow-y-auto bg-muted/20">
            {areas.map(area => {
              const areaProfiles = profiles.filter(p => p.areaId === area.id && p.id !== worker.fixedProfileId);
              if (areaProfiles.length === 0) return null;
              const allSelected = areaProfiles.every(p => capsForm.includes(p.id));
              const someSelected = areaProfiles.some(p => capsForm.includes(p.id));
              return (
                <div key={area.id}>
                  <label className="flex items-center gap-3 px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={() => toggleArea(area.id)} className="w-4 h-4" />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: area.color }} />
                    <span className="font-semibold text-sm">{area.name}</span>
                  </label>
                  {areaProfiles.map(p => (
                    <label key={p.id} className="flex items-center gap-3 px-3 py-2 pl-10 cursor-pointer hover:bg-muted/30 transition-colors">
                      <input type="checkbox" checked={capsForm.includes(p.id)} onChange={() => toggleCapability(p.id)} className="w-4 h-4" />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="pt-2 flex justify-end gap-2 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => setCapsModalOpen(false)}>{t('workers.cancel')}</Button>
            <Button type="submit">{t('workers.modal_save_caps')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
