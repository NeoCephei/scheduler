import { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '../ui/Button';
import { useCalendarStore } from '../../stores/calendarStore';
import { useStaffStore } from '../../stores/staffStore';
import { useConfigStore } from '../../stores/configStore';
import { X, UserCheck, AlertTriangle, UserX, Loader2 } from 'lucide-react';
import { AbsencesAPI } from '../../lib/api';
import { useEffect } from 'react';

export default function AssignmentModal({ isOpen, onClose, cellInfo }) {
  const { updateCellOverride, deleteOverride, currentDate, matrixData } = useCalendarStore();
  const { workers } = useStaffStore();
  const { profiles } = useConfigStore();
  
  const [loading, setLoading] = useState(false);
  const [activeAbsences, setActiveAbsences] = useState([]);
  const [conflictCandidate, setConflictCandidate] = useState(null);

  // Fetch active absences for the current cell date from the global staff store to avoid double fetching
  const { absences: globalAbsences } = useStaffStore();
  
  useEffect(() => {
    if (!cellInfo?.date || !globalAbsences) return;
    const activeToday = globalAbsences.filter(a => a.dateStart <= cellInfo.date && a.dateEnd >= cellInfo.date);
    setActiveAbsences(activeToday);
  }, [cellInfo?.date, globalAbsences]);

  // Derived data
  const profileDetails = profiles.find(p => p.id === cellInfo?.profile?.profileId);
  const cellData = cellInfo?.cellData;
  const targetDate = cellInfo?.date;

  const handleOverride = async (candidate) => {
    // Check if forcing UNCOVERED
    if (!candidate) {
      setLoading(true);
      await updateCellOverride(cellInfo.profile.profileId, targetDate, null);
      setLoading(false);
      onClose();
      return;
    }

    if (candidate.assignedElsewhere) {
      setConflictCandidate(candidate);
      return;
    }

    await executeOverride(candidate);
  };

  const executeOverride = async (candidate) => {
    setLoading(true);
    if (candidate.assignedElsewhereProfileId) {
      await updateCellOverride(candidate.assignedElsewhereProfileId, targetDate, null);
    }
    await updateCellOverride(cellInfo.profile.profileId, targetDate, candidate.id);
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
      
      let typeLabel = "Suplente Válido";
      if (isFijoHere) typeLabel = "Fijo del Perfil";
      else if (worker.category === 'FIJO') typeLabel = "Fijo de Otro Perfil";

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
              <Dialog.Title className="text-lg font-bold">Gestión de Turno</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mt-0.5 font-medium">
                {new Date(targetDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long'})}
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
                <span>Estado Actual:</span>
                {cellData?.status === 'UNCOVERED' ? (
                  <span className="text-red-500 font-bold tracking-wide uppercase">Descubierto</span>
                ) : (
                  <span className="font-semibold">{cellData?.allocatedWorkerName}</span>
                )}
              </div>
              {cellData?.isOverride && (
                <div className="mt-2 text-blue-600 dark:text-blue-400 font-medium text-xs flex justify-between items-center border-t pt-2">
                  Asignado manualmente (Override)
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleRevert} disabled={loading}>
                    <UserX size={12} className="mr-1"/> Revertir a base
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <h5 className="font-semibold text-sm text-muted-foreground px-1 uppercase tracking-wider">Candidatos Disponibles</h5>
            
            {candidates.length === 0 ? (
              <div className="text-center p-6 bg-muted/20 rounded-lg border border-dashed text-muted-foreground text-sm">
                No hay trabajadores disponibles con capacidad para este puesto hoy.
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
                      {candidate.assignedElsewhere && <span className="text-amber-600 dark:text-amber-400 font-bold ml-1"> (Ocupado)</span>}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    disabled={loading || candidate.id === cellData?.allocatedWorkerId}
                    variant={candidate.id === cellData?.allocatedWorkerId ? "secondary" : candidate.assignedElsewhere ? "outline" : "default"}
                    onClick={() => handleOverride(candidate)}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : candidate.id === cellData?.allocatedWorkerId ? 'Asignado' : 'Asignar'}
                  </Button>
                </div>
              ))
            )}

            {cellData?.status !== 'UNCOVERED' && !cellData?.isOverride && (
              <div className="mt-auto pt-6">
                <Button variant="destructive" className="w-full" onClick={() => handleOverride(null)} disabled={loading}>
                  <AlertTriangle size={16} className="mr-2"/> Forzar Descubierto (Vaciar Silla)
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
              <Dialog.Title className="text-lg font-semibold text-foreground">Conflicto de Asignación</Dialog.Title>
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{conflictCandidate?.name}</strong> ya está asignado hoy en el perfil:
              </p>
              <div className="p-3 bg-muted/40 rounded border font-medium text-sm">
                "{conflictCandidate?.assignedElsewhere}"
              </div>
              <p className="text-sm text-muted-foreground">
                {conflictCandidate?.isRevertScenario 
                  ? "Al revertir, este trabajador volverá a su puesto base, dejándolo descubierto del perfil actual donde está cubriendo."
                  : "Si lo mueves a este nuevo turno, se eliminará de su puesto actual dejándolo al descubierto."
                }
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConflictCandidate(null)} disabled={loading}>
                Cancelar
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
                {loading ? 'Procesando...' : conflictCandidate?.isRevertScenario ? 'Continuar y Vaciar el Otro Perfil' : 'Sí, Mover Trabajador'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </Dialog.Root>
  );
}
