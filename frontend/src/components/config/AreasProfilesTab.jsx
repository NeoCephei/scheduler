import React, { useState } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Edit2, Trash2, Plus, ShieldAlert, ChevronDown, ChevronRight, Power, PowerOff } from 'lucide-react';

const DAYS = [
  { id: 1, name: 'Lunes', short: 'L' },
  { id: 2, name: 'Martes', short: 'M' },
  { id: 3, name: 'Miércoles', short: 'X' },
  { id: 4, name: 'Jueves', short: 'J' },
  { id: 5, name: 'Viernes', short: 'V' },
  { id: 6, name: 'Sábado', short: 'S' },
  { id: 7, name: 'Domingo', short: 'D' },
  { id: 8, name: 'Festivo', short: 'F' }
];

export default function AreasProfilesTab() {
  const { areas, profiles, shifts, addArea, updateArea, deleteArea, addProfile, updateProfile, deleteProfile } = useConfigStore();
  
  // Accordion State
  const [expandedAreas, setExpandedAreas] = useState({});
  const [expandedShifts, setExpandedShifts] = useState({});
  const [groupByShift, setGroupByShift] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState(null);
  const [profileToDelete, setProfileToDelete] = useState(null);

  const toggleArea = (areaId) => {
    setExpandedAreas(prev => ({ ...prev, [areaId]: !prev[areaId] }));
  };
  const toggleShift = (shiftId) => {
    setExpandedShifts(prev => ({ ...prev, [shiftId]: !prev[shiftId] }));
  };

  // --- AREA MODAL ---
  const [isAreaModalOpen, setAreaModalOpen] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [areaFormData, setAreaFormData] = useState({ name: '', color: '#3b82f6' });

  const openNewArea = () => {
    setAreaFormData({ name: '', color: '#3b82f6' });
    setEditingAreaId(null);
    setAreaModalOpen(true);
  };
  const openEditArea = (area) => {
    setAreaFormData({ name: area.name, color: area.color });
    setEditingAreaId(area.id);
    setAreaModalOpen(true);
  };
  const submitArea = async (e) => {
    e.preventDefault();
    if (editingAreaId) await updateArea(editingAreaId, areaFormData);
    else await addArea(areaFormData);
    setAreaModalOpen(false);
  };

  // --- PROFILE MODAL ---
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [profileFormData, setProfileFormData] = useState({ 
    name: '', areaId: '', isActive: true, shiftId: '', minBackupWorkers: 0, timeSlots: [] 
  });

  const openNewProfile = (areaId) => {
    setProfileFormData({ 
      name: '', areaId, isActive: true, 
      shiftId: shifts[0]?.id || '',  // Shift is required! Set first as default
      minBackupWorkers: 0, timeSlots: [] 
    });
    setEditingProfileId(null);
    setProfileModalOpen(true);
  };
  
  const openEditProfile = (profile) => {
    setProfileFormData({ 
      name: profile.name, areaId: profile.areaId, isActive: profile.isActive, 
      shiftId: profile.shiftId || (shifts[0]?.id || ''), 
      minBackupWorkers: profile.minBackupWorkers, timeSlots: profile.timeSlots || [] 
    });
    setEditingProfileId(profile.id);
    setProfileModalOpen(true);
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    if (!profileFormData.shiftId) {
      alert("El Turno (Plantilla) es obligatorio para un Perfil.");
      return;
    }
    const payload = {
      ...profileFormData,
      areaId: Number(profileFormData.areaId),
      shiftId: Number(profileFormData.shiftId),
      minBackupWorkers: Number(profileFormData.minBackupWorkers)
    };

    if (editingProfileId) await updateProfile(editingProfileId, payload);
    else {
      await addProfile(payload);
      // Ensure the area gets expanded automatically
      setExpandedAreas(prev => ({ ...prev, [payload.areaId]: true }));
    }
    setProfileModalOpen(false);
  };

  const handleToggleSlot = (dayId) => {
    const exists = profileFormData.timeSlots.find(s => s.dayOfWeek === dayId);
    if (exists) {
      setProfileFormData({
        ...profileFormData,
        timeSlots: profileFormData.timeSlots.filter(s => s.dayOfWeek !== dayId)
      });
    } else {
      let defStart = '08:00';
      let defEnd = '15:00';
      if (profileFormData.shiftId) {
        const s = shifts.find(sh => sh.id === Number(profileFormData.shiftId));
        if (s) { defStart = s.startTime; defEnd = s.endTime; }
      }
      setProfileFormData({
        ...profileFormData,
        timeSlots: [...profileFormData.timeSlots, { dayOfWeek: dayId, startTime: defStart, endTime: defEnd }]
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-xl font-semibold">Áreas y Perfiles</h2>
          <p className="text-sm text-muted-foreground mt-1">Gestiona las zonas del hospital y sus respectivas "sillas".</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted/50 p-1 rounded-lg">
            <Button type="button" variant={!groupByShift ? "secondary" : "ghost"} size="sm" onClick={() => setGroupByShift(false)} className="h-8 px-3 text-xs">Por Áreas</Button>
            <Button type="button" variant={groupByShift ? "secondary" : "ghost"} size="sm" onClick={() => setGroupByShift(true)} className="h-8 px-3 text-xs">Por Turnos</Button>
          </div>
          <Button onClick={openNewArea} className="gap-2 shrink-0 h-9"><Plus size={16}/> Nueva Área</Button>
        </div>
      </div>

      <div className="space-y-4">
        {!groupByShift ? (
          // --- RENDER BY AREA (Default) ---
          areas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
              No hay áreas creadas. Empieza creando tu primera área (Ej. Urgencias).
            </div>
          ) : areas.map(area => {
            const areaProfiles = profiles.filter(p => p.areaId === area.id);
            const isExpanded = expandedAreas[area.id];

            return (
              <div key={area.id} className="border rounded-lg bg-card overflow-hidden shadow-sm">
                {/* Accordion Header */}
                <div className="flex items-center justify-between p-4 bg-background hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleArea(area.id)}>
                    {isExpanded ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground"/>}
                    <div className="w-5 h-5 rounded" style={{ backgroundColor: area.color }} />
                    <span className="font-semibold text-lg">{area.name}</span>
                    <span className="text-muted-foreground text-sm">({areaProfiles.length} perfil{areaProfiles.length === 1 ? '' : 'es'})</span>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0 px-2">
                    <Button variant="ghost" size="icon" title="Añadir Perfil" onClick={(e) => { e.stopPropagation(); openNewProfile(area.id); }}><Plus size={16}/></Button>
                    <Button variant="ghost" size="icon" title="Editar Área" onClick={(e) => { e.stopPropagation(); openEditArea(area); }}><Edit2 size={16}/></Button>
                    <Button variant="ghost" size="icon" title="Eliminar Área" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setAreaToDelete(area); }}><Trash2 size={16}/></Button>
                  </div>
                </div>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="p-4 bg-muted/10 border-t space-y-4">
                    {areaProfiles.length === 0 ? (
                      <div className="text-sm text-muted-foreground px-4 py-2 italic font-light">Sin perfiles en esta área.</div>
                    ) : (
                      [...shifts, { id: 'none', name: 'Sin Turno Asignado' }].map(shift => {
                        const shiftProfiles = areaProfiles.filter(p => shift.id === 'none' ? !p.shiftId : p.shiftId === shift.id);
                        if (shiftProfiles.length === 0) return null;

                        return (
                          <div key={shift.id} className="border rounded-md overflow-hidden bg-background">
                            <div className="bg-muted/30 px-3 py-2 flex items-center gap-2 border-b">
                              <span className="font-semibold text-sm text-primary">{shift.name}</span>
                            </div>
                            <div className="p-2 space-y-2">
                              {shiftProfiles.map(profile => (
                                <div key={profile.id} className={`flex items-center bg-background border rounded-md p-2 transition-opacity shadow-sm ${!profile.isActive ? 'opacity-50' : ''}`}>
                                  <div className="flex-1 min-w-0 pl-2">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium text-sm leading-none truncate">{profile.name}</h4>
                                      {!profile.isActive && <span className="bg-muted text-foreground text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold shrink-0">Inactivo</span>}
                                    </div>
                                    <div className="flex gap-1 flex-wrap mt-1.5">
                                      {DAYS.map(d => {
                                        const slot = profile.timeSlots?.find(s => s.dayOfWeek === d.id);
                                        if(!slot) return null;
                                        return (
                                          <div key={d.id} className="text-[9px] border border-primary/30 bg-primary/5 px-1 py-0.5 rounded flex items-center gap-1 font-medium text-foreground">
                                            <span>{d.short}</span><span className="opacity-75">{slot.startTime}</span>
                                          </div>
                                        );
                                      })}
                                      {profile.minBackupWorkers > 0 && (
                                        <div className="text-[9px] border border-orange-200/50 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-900/20 px-1 py-0.5 rounded flex items-center gap-1 font-medium text-orange-600 dark:text-orange-400">
                                          <ShieldAlert size={10}/> {profile.minBackupWorkers} min
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 ml-4 border-l pl-2 shrink-0">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateProfile(profile.id, { ...profile, isActive: !profile.isActive })}>
                                      {profile.isActive ? <PowerOff size={14} className="text-muted-foreground"/> : <Power size={14} className="text-primary"/>}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditProfile(profile)}><Edit2 size={14}/></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setProfileToDelete(profile)}><Trash2 size={14}/></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // --- RENDER BY SHIFT ---
          [...shifts, { id: 'none', name: 'Sin Turno Asignado' }].map(shift => {
            const shiftProfiles = profiles.filter(p => shift.id === 'none' ? !p.shiftId : p.shiftId === shift.id);
            if (shiftProfiles.length === 0) return null;

            const isExpanded = expandedShifts[shift.id];

            return (
              <div key={shift.id} className="border border-primary/20 rounded-lg bg-card overflow-hidden shadow-sm">
                {/* Accordion header for Shift */}
                <div className="flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => toggleShift(shift.id)}>
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={18} className="text-primary"/> : <ChevronRight size={18} className="text-primary"/>}
                    <span className="font-semibold text-lg text-primary">{shift.name}</span>
                    <span className="text-muted-foreground text-sm">({shiftProfiles.length} perfil{shiftProfiles.length === 1 ? '' : 'es'})</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 space-y-4 bg-muted/10 border-t border-primary/10">
                    {areas.map(area => {
                      const areaProfiles = shiftProfiles.filter(p => p.areaId === area.id);
                      if (areaProfiles.length === 0) return null;

                      return (
                        <div key={area.id} className="border rounded-md overflow-hidden bg-background">
                          <div className="bg-muted/30 px-3 py-1 flex items-center justify-between border-b">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: area.color }} />
                              <span className="font-semibold text-sm">{area.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 px-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Añadir Perfil a esta Área" onClick={(e) => { e.stopPropagation(); openNewProfile(area.id); }}><Plus size={14}/></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar Área" onClick={(e) => { e.stopPropagation(); openEditArea(area); }}><Edit2 size={14}/></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" title="Eliminar Área" onClick={(e) => { e.stopPropagation(); setAreaToDelete(area); }}><Trash2 size={14}/></Button>
                            </div>
                          </div>
                          <div className="p-2 space-y-2">
                            {areaProfiles.map(profile => (
                              <div key={profile.id} className={`flex items-center bg-background border rounded-md p-2 transition-opacity shadow-sm ${!profile.isActive ? 'opacity-50' : ''}`}>
                                <div className="flex-1 min-w-0 pl-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm leading-none truncate">{profile.name}</h4>
                                    {!profile.isActive && <span className="bg-muted text-foreground text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold shrink-0">Inactivo</span>}
                                  </div>
                                  <div className="flex gap-1 flex-wrap mt-1.5">
                                    {DAYS.map(d => {
                                      const slot = profile.timeSlots?.find(s => s.dayOfWeek === d.id);
                                      if(!slot) return null;
                                      return (
                                        <div key={d.id} className="text-[9px] border border-primary/30 bg-primary/5 px-1 py-0.5 rounded flex items-center gap-1 font-medium text-foreground">
                                          <span>{d.short}</span><span className="opacity-75">{slot.startTime}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 ml-4 border-l pl-2 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateProfile(profile.id, { ...profile, isActive: !profile.isActive })}>
                                    {profile.isActive ? <PowerOff size={14} className="text-muted-foreground"/> : <Power size={14} className="text-primary"/>}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditProfile(profile)}><Edit2 size={14}/></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setProfileToDelete(profile)}><Trash2 size={14}/></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* --- AREA MODAL --- */}
      <Modal isOpen={isAreaModalOpen} onClose={() => setAreaModalOpen(false)} title={editingAreaId ? 'Editar Área' : 'Nueva Área'}>
        <form onSubmit={submitArea} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre del Área</label>
            <Input required value={areaFormData.name} onChange={e => setAreaFormData({...areaFormData, name: e.target.value})} placeholder="Ej. Urgencias" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Color Identificativo</label>
            <div className="flex gap-2 items-center">
              <Input type="color" className="w-16 p-1 h-10 cursor-pointer" value={areaFormData.color} onChange={e => setAreaFormData({...areaFormData, color: e.target.value})} />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAreaModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* --- PROFILE MODAL --- */}
      <Modal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} title={editingProfileId ? 'Editar Perfil' : 'Nuevo Perfil'} className="max-w-2xl">
        <form onSubmit={submitProfile} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de la Silla</label>
              <Input required value={profileFormData.name} onChange={e => setProfileFormData({...profileFormData, name: e.target.value})} placeholder="Ej. Urgencias Mañana 1" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Área</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required value={profileFormData.areaId} onChange={e => setProfileFormData({...profileFormData, areaId: e.target.value})}
              >
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Turno de Referencia</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required value={profileFormData.shiftId} onChange={e => setProfileFormData({...profileFormData, shiftId: e.target.value})}
              >
                <option value="" disabled>Selecciona un turno base...</option>
                {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1"><ShieldAlert size={14} className="text-orange-500"/> Suplentes / Backups Mínimos</label>
              <Input type="number" min="0" value={profileFormData.minBackupWorkers} onChange={e => setProfileFormData({...profileFormData, minBackupWorkers: e.target.value})} />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-sm font-medium">Horarios de Trabajo (TimeSlots)</label>
            <p className="text-xs text-muted-foreground -mt-2">Marca los días que trabaja este perfil. Modifica las horas si el horario varía un día del otro.</p>
            <div className="grid gap-2 border rounded-lg p-2 bg-muted/30">
              {DAYS.map(day => {
                const slot = profileFormData.timeSlots.find(s => s.dayOfWeek === day.id);
                return (
                  <div key={day.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded transition-colors">
                    <label className="flex items-center gap-2 w-32 cursor-pointer font-medium text-sm">
                      <input 
                        type="checkbox" 
                        checked={!!slot}
                        onChange={() => handleToggleSlot(day.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      {day.name}
                    </label>
                    
                    {slot && (
                      <div className="flex gap-2 items-center flex-1 animate-in slide-in-from-left-2">
                        <Input type="time" className="h-8 w-max" value={slot.startTime} onChange={(e) => {
                          const val = e.target.value;
                          setProfileFormData(prev => ({
                            ...prev, 
                            timeSlots: prev.timeSlots.map(s => s.dayOfWeek === day.id ? { ...s, startTime: val } : s)
                          }))
                        }} />
                        <span className="text-muted-foreground">-</span>
                        <Input type="time" className="h-8 w-max" value={slot.endTime} onChange={(e) => {
                          const val = e.target.value;
                          setProfileFormData(prev => ({
                            ...prev, 
                            timeSlots: prev.timeSlots.map(s => s.dayOfWeek === day.id ? { ...s, endTime: val } : s)
                          }))
                        }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t">
            <Button type="button" variant="outline" onClick={() => setProfileModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar Perfil</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Area Modal */}
      <Modal isOpen={!!areaToDelete} onClose={() => setAreaToDelete(null)} title="Eliminar Área">
        <div className="space-y-4">
          <p className="text-sm">¿Estás seguro de que deseas eliminar permanentemente el área <strong>{areaToDelete?.name}</strong>? Todo el contenido será borrado irreversiblemente.</p>
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setAreaToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0" onClick={async () => {
              await deleteArea(areaToDelete.id);
              setAreaToDelete(null);
            }}>Eliminar</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Profile Modal */}
      <Modal isOpen={!!profileToDelete} onClose={() => setProfileToDelete(null)} title="Eliminar Perfil">
        <div className="space-y-4">
          <p className="text-sm">¿Estás seguro de que deseas eliminar permanentemente el perfil <strong>{profileToDelete?.name}</strong>? Este borrado es definitivo y eliminará el perfil de los trabajadores vinculados.</p>
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setProfileToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0" onClick={async () => {
              await deleteProfile(profileToDelete.id);
              setProfileToDelete(null);
            }}>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
