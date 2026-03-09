import { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '../ui/Button';
import { useCalendarStore } from '../../stores/calendarStore';
import { useStaffStore } from '../../stores/staffStore';
import { useConfigStore } from '../../stores/configStore';
import { useTranslation } from 'react-i18next';
import { X, UserCheck, AlertTriangle, UserX, Loader2 } from 'lucide-react';
import { AbsencesAPI } from '../../lib/api';
import { useEffect } from 'react';

export default function AssignmentModal({ isOpen, onClose, cellInfo }) {
  const { t, i18n } = useTranslation();
  const { updateCellOverride, deleteOverride, currentDate, matrixData } = useCalendarStore();
  const { workers } = useStaffStore();
  const { profiles } = useConfigStore();
  
  const [loading, setLoading] = useState(false);
  const [activeAbsences, setActiveAbsences] = useState([]);
  const [conflictCandidate, setConflictCandidate] = useState(null);
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [rangeEndDate, setRangeEndDate] = useState(cellInfo?.date || '');
  const [absenceEndLimit, setAbsenceEndLimit] = useState(null);

  // Fetch active absences for the current cell date from the global staff store to avoid double fetching
  const { absences: globalAbsences } = useStaffStore();
  
  useEffect(() => {
    if (!cellInfo?.date || !globalAbsences) return;
    
    // 1. Filter active absences for today (for recommendations)
    const activeToday = globalAbsences.filter(a => a.dateStart <= cellInfo.date && a.dateEnd >= cellInfo.date);
    setActiveAbsences(activeToday);
    setRangeEndDate(cellInfo.date);

    // 2. Identify if this profile's fixed worker is absent today
    const fixedWorker = workers.find(w => w.fixedProfileId === cellInfo.profile.profileId);
    if (fixedWorker) {
      const absence = activeToday.find(a => a.workerId === fixedWorker.id);
      if (absence) {
        setAbsenceEndLimit(absence.dateEnd);
      } else {
        setAbsenceEndLimit(null);
      }
    } else {
      setAbsenceEndLimit(null);
    }
  }, [cellInfo?.date, globalAbsences, workers, cellInfo?.profile?.profileId]);

  // Derived data
  const profileDetails = profiles.find(p => p.id === cellInfo?.profile?.profileId);
  const cellData = cellInfo?.cellData;
  const targetDate = cellInfo?.date;

  const handleOverride = async (candidate) => {
    // Check if forcing UNCOVERED
    if (!candidate) {
      setLoading(true);
      await updateCellOverride(cellInfo.profile.profileId, targetDate, null, isRangeMode ? rangeEndDate : null);
      setLoading(false);
      onClose();
      return;
    }

    // 1. Conflict detection (Proactive)
    if (isRangeMode) {
      const start = new Date(targetDate);
      const end = new Date(rangeEndDate);
      const conflicts = [];
      
      let current = new Date(start);
      while (current <= end) {
        const dStr = current.toISOString().split('T')[0];
        const dayCells = matrixData.filter(c => c.date === dStr);
        const match = dayCells.find(c => c.allocatedWorkerId === candidate.id && c.profileId !== cellInfo.profile.profileId);
        if (match) {
          conflicts.push({ date: dStr, profileName: match.profileName });
        }
        current.setDate(current.getDate() + 1);
      }

      if (conflicts.length > 0) {
        setConflictCandidate({
            ...candidate,
            isRangeConflict: true,
            conflictCount: conflicts.length,
            // Just for the UI label
            assignedElsewhere: conflicts[0].profileName + (conflicts.length > 1 ? ` (+ ${conflicts.length - 1} más)` : '')
        });
        return;
      }
    } else if (candidate.assignedElsewhere) {
      setConflictCandidate(candidate);
      return;
    }

    await executeOverride(candidate);
  };

  const executeOverride = async (candidate) => {
    setLoading(true);
    if (!isRangeMode && candidate.assignedElsewhereProfileId) {
      // For single day, we maintain the behavior of clearing specifically the other slot
      // although backend now handles it globally by workerId + date.
      await updateCellOverride(candidate.assignedElsewhereProfileId, targetDate, null);
    }
    // Backend now handles range conflicts by workerId internally
    await updateCellOverride(cellInfo.profile.profileId, targetDate, candidate.id, isRangeMode ? rangeEndDate : null);
    setLoading(false);
    onClose();
  };

  const handleRevert = async () => {
    if (!cellData.overrideId) return;
    
    // Find who the theoretical Fijo is for this profile
    const fijoHere = workers.find(w => w.fixedProfileId === cellInfo.profile.profileId);
    
    if (fijoHere) {
      // Check if this Fijo worker is currently occupied in a DIFFERENT profile today
      const sameDayCells = matrixData.filter(c => c.date === targetDate);
      const workingCell = sameDayCells.find(c => c.allocatedWorkerId === fijoHere.id && c.profileId !== cellInfo.profile.profileId);
      
      if (workingCell) {
        // The Fijo is occupied! Trigger the conflict modal specifically for reverting
        setConflictCandidate({
          ...fijoHere,
          isRevertScenario: true,
          assignedElsewhere: workingCell.profileName,
          assignedElsewhereProfileId: workingCell.profileId
        });
        return;
      }
    }

    executeRevert();
  };

  const executeRevert = async () => {
    setLoading(true);
    await deleteOverride(cellData.overrideId);
    setLoading(false);
    onClose();
  };

  // Recommendations Engine
  const candidates = useMemo(() => {
    if (!profileDetails || !targetDate) return [];

    const result = [];
    const cellProfileId = profileDetails.id;

    for (const worker of workers) {
      if (!worker.isActive || worker.isDeleted) continue;
      
      // Estudiantes ONLY practice, they can't cover a shift organically
      if (worker.category === 'ESTUDIANTE') continue;

      // 1. Check Capabilities (Is Fijo here OR has Capability)
      const isFijoHere = worker.fixedProfileId === cellProfileId;
      // capabilities is an array of integers (profileIds)
      const hasCapability = worker.capabilities?.some(c => c === cellProfileId);

      if (!isFijoHere && !hasCapability) continue;

      // 2. Check Absences
      const hasAbsence = activeAbsences.some(a => a.workerId === worker.id);
      if (hasAbsence) continue; // Hidden entirely if has absence today

      // 3. Check if they are already assigned today in another profile
      const sameDayCells = matrixData.filter(c => c.date === targetDate);
      const workingCell = sameDayCells.find(c => c.allocatedWorkerId === worker.id && c.profileId !== cellProfileId);
      
      let typeLabel = t('calendar.type_substitute');
      if (isFijoHere) typeLabel = t('calendar.type_fixed_here');
      else if (worker.category === 'FIJO') typeLabel = t('calendar.type_fixed_other');

      result.push({
        ...worker,
        typeLabel,
        isFijoHere,
        assignedElsewhere: workingCell ? workingCell.profileName : null,
        assignedElsewhereProfileId: workingCell ? workingCell.profileId : null
      });
    }

    // Sort: Fijo here first, then Suplentes, then other Fijos
    result.sort((a, b) => {
      if (a.isFijoHere) return -1;
      if (b.isFijoHere) return 1;
      if (a.category === 'SUPLENTE' && b.category !== 'SUPLENTE') return -1;
      if (a.category !== 'SUPLENTE' && b.category === 'SUPLENTE') return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [profileDetails, targetDate, workers, activeAbsences]);

  if (!cellInfo) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background shadow-2xl z-50 flex flex-col border-l slide-in-from-right">
          
          <div className="flex justify-between items-center p-4 border-b bg-muted/20">
            <div>
              <Dialog.Title className="text-lg font-bold">{t('calendar.modal_title')}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mt-0.5 font-medium">
                {new Date(targetDate).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long'})}
              </Dialog.Description>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X size={20}/></Button>
          </div>

          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {cellData?.status === 'UNCOVERED' ? <AlertTriangle size={20}/> : <UserCheck size={20}/>}
              </div>
              <div>
                <h4 className="font-semibold text-lg leading-tight">{cellInfo.profile.profileName}</h4>
                <p className="text-sm font-medium text-muted-foreground">{cellData?.timeSlot.startTime} - {cellData?.timeSlot.endTime}</p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-muted/40 border text-sm">
              <div className="flex justify-between items-center">
                <span>{t('calendar.current_status')}</span>
                {cellData?.status === 'UNCOVERED' ? (
                  <span className="text-red-500 font-bold tracking-wide uppercase">{t('calendar.uncovered')}</span>
                ) : (
                  <span className="font-semibold">{cellData?.allocatedWorkerName}</span>
                )}
              </div>
              {cellData?.isOverride && (
                <div className="mt-2 text-blue-600 dark:text-blue-400 font-medium text-xs flex justify-between items-center border-t pt-2">
                  {t('calendar.assigned_manually')}
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleRevert} disabled={loading}>
                    <UserX size={12} className="mr-1"/> {t('calendar.revert')}
                  </Button>
                </div>
              )}
            </div>

            {/* Range Mode Toggle */}
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-muted/30 transition-colors">
                <input 
                  type="checkbox" 
                  checked={isRangeMode} 
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsRangeMode(checked);
                    if (checked && absenceEndLimit) {
                      setRangeEndDate(absenceEndLimit);
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-semibold">{t('calendar.assign_range')}</span>
              </label>

              {isRangeMode && (
                <div className="space-y-2 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-primary uppercase tracking-tight">{t('calendar.range_end')}</label>
                    {absenceEndLimit && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                        {t('calendar.range_limit_hint', { date: new Date(absenceEndLimit).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short'}) })}
                      </span>
                    )}
                  </div>
                  <input 
                    type="date" 
                    min={targetDate}
                    max={absenceEndLimit || undefined}
                    value={rangeEndDate}
                    onChange={(e) => setRangeEndDate(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-[10px] text-amber-600 font-medium leading-tight">
                    <AlertTriangle size={10} className="inline mr-1 mb-0.5" />
                    {t('calendar.range_warning')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <h5 className="font-semibold text-sm text-muted-foreground px-1 uppercase tracking-wider">{t('calendar.candidates')}</h5>
            
            {candidates.length === 0 ? (
              <div className="text-center p-6 bg-muted/20 rounded-lg border border-dashed text-muted-foreground text-sm">
                {t('calendar.no_candidates')}
              </div>
            ) : (
              candidates.map(candidate => (
                <div key={candidate.id} className="flex justify-between items-center p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-foreground flex items-center gap-2">
                       {candidate.name}
                       {candidate.assignedElsewhere && <span title={`Ya asignado en: ${candidate.assignedElsewhere}`}><AlertTriangle size={14} className="text-amber-500" /></span>}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                      {candidate.typeLabel}
                      {candidate.assignedElsewhere && <span className="text-amber-600 dark:text-amber-400 font-bold ml-1"> ({t('calendar.busy_label')})</span>}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    disabled={loading || candidate.id === cellData?.allocatedWorkerId}
                    variant={candidate.id === cellData?.allocatedWorkerId ? "secondary" : candidate.assignedElsewhere ? "outline" : "default"}
                    onClick={() => handleOverride(candidate)}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : candidate.id === cellData?.allocatedWorkerId ? t('calendar.assigned_label') : t('calendar.assign_label')}
                  </Button>
                </div>
              ))
            )}

            {cellData?.status !== 'UNCOVERED' && !cellData?.isOverride && (
              <div className="mt-auto pt-6">
                <Button variant="destructive" className="w-full" onClick={() => handleOverride(null)} disabled={loading}>
                  <AlertTriangle size={16} className="mr-2"/> {t('calendar.force_uncovered')}
                </Button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Conflict Confirmation Modal */}
      <Dialog.Root open={!!conflictCandidate} onOpenChange={(o) => !o && setConflictCandidate(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-xl w-full max-w-sm z-[60] border border-amber-500/50">
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <AlertTriangle className="w-6 h-6" />
              <Dialog.Title className="text-lg font-semibold text-foreground">{t('calendar.conflict_title')}</Dialog.Title>
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{conflictCandidate?.name}</strong> {t('calendar.conflict_body', { name: '' })}
              </p>
              <div className="p-3 bg-muted/40 rounded border font-medium text-sm">
                "{conflictCandidate?.assignedElsewhere}"
              </div>
              <p className="text-sm text-muted-foreground">
                {conflictCandidate?.isRangeConflict 
                  ? t('calendar.conflict_range_msg')
                  : conflictCandidate?.isRevertScenario 
                    ? t('calendar.conflict_revert_msg')
                    : t('calendar.conflict_move_msg')
                }
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConflictCandidate(null)} disabled={loading}>
                {t('calendar.conflict_cancel')}
              </Button>
              <Button 
                onClick={async () => {
                  if (conflictCandidate?.isRevertScenario) {
                    // 1. Force old profile where he is occupied to UNCOVERED
                    await updateCellOverride(conflictCandidate.assignedElsewhereProfileId, targetDate, null);
                    // 2. Revert this cell
                    await executeRevert();
                  } else {
                    await executeOverride(conflictCandidate);
                  }
                  setConflictCandidate(null);
                }}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {loading ? t('calendar.processing') : conflictCandidate?.isRevertScenario ? t('calendar.conflict_revert_confirm') : t('calendar.conflict_move_confirm')}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </Dialog.Root>
  );
}
