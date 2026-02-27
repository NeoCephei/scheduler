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

  const toggleArea = (areaId) => {
    setExpandedAreas(prev => ({ ...prev, [areaId]: !prev[areaId] }));
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Áreas y Perfiles</h2>
          <p className="text-sm text-muted-foreground">Gestiona las zonas del hospital y sus respectivas "sillas".</p>
        </div>
        <Button onClick={openNewArea} className="gap-2"><Plus size={16}/> Nueva Área</Button>
      </div>

      <div className="space-y-4">
        {areas.length === 0 ? (
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
                <div 
                  className="flex items-center gap-3 cursor-pointer flex-1"
                  onClick={() => toggleArea(area.id)}
                >
                  {isExpanded ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground"/>}
                  <div className="w-5 h-5 rounded" style={{ backgroundColor: area.color }} />
                  <span className="font-semibold text-lg">{area.name}</span>
                  <span className="text-muted-foreground text-sm">({areaProfiles.length} perfil{areaProfiles.length === 1 ? '' : 'es'})</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditArea(area)}><Edit2 size={16}/></Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={async () => {
                    if (confirm(`¿Borrar el área ${area.name}? (Borrado lógico)`)) await deleteArea(area.id);
                  }}><Trash2 size={16}/></Button>
                </div>
              </div>

              {/* Accordion Body */}
              {isExpanded && (
                <div className="p-4 pt-1 bg-muted/10 border-t space-y-2">
                  {areaProfiles.length === 0 ? (
                    <div className="text-sm text-muted-foreground px-4 py-2 italic font-light">Sin perfiles en esta área.</div>
                  ) : areaProfiles.map(profile => {
                    // Profile Item
                    const summary = profile.timeSlots && profile.timeSlots.length > 0 
                      ? `${profile.timeSlots[0].startTime} — ${profile.timeSlots[0].endTime}`
                      : 'Sin horario';

                    return (
                      <div key={profile.id} className={`flex items-center bg-background border rounded-md p-3 mx-2 transition-opacity shadow-sm ${!profile.isActive ? 'opacity-50' : ''}`}>
                        <div className="w-1 h-8 rounded-full mr-3" style={{ backgroundColor: area.color }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-[15px] leading-none">{profile.name}</h4>
                            {!profile.isActive && <span className="bg-muted text-foreground text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold">Inactivo</span>}
                          </div>
                          <div className="flex flex-col mt-2">
                            <div className="flex gap-1 flex-wrap">
                              {DAYS.map(d => {
                                const slot = profile.timeSlots?.find(s => s.dayOfWeek === d.id);
                                return (
                                  <div key={d.id} className={`text-xs border px-2 py-1 rounded w-max flex items-center gap-1 ${slot ? 'border-primary/30 bg-primary/5 text-foreground' : 'border-dashed text-muted-foreground opacity-50'}`}>
                                    <span className="font-medium">{d.short}</span>
                                    {slot && <span className="text-[10px] opacity-75">{slot.startTime}</span>}
                                  </div>
                                )
                              })}
                            </div>
                            {profile.minBackupWorkers > 0 && (
                              <div className="text-xs mt-2 flex items-center gap-1 text-orange-500 font-medium">
                                <ShieldAlert size={12}/> {profile.minBackupWorkers} backups min.
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4 border-l pl-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title={profile.isActive ? "Desactivar perfil" : "Reactivar perfil"}
                            onClick={() => updateProfile(profile.id, { ...profile, isActive: !profile.isActive })}
                          >
                            {profile.isActive ? <PowerOff size={16} className="text-muted-foreground"/> : <Power size={16} className="text-primary"/>}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditProfile(profile)}><Edit2 size={16}/></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={async () => {
                            if (confirm(`¿Borrar el perfil ${profile.name}? (Borrado lógico, desaparecerá de la lista)`)) await deleteProfile(profile.id);
                          }}><Trash2 size={16}/></Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="mx-2 mt-2">
                    <Button variant="ghost" className="w-full border border-dashed text-muted-foreground hover:bg-muted" onClick={() => openNewProfile(area.id)}>
                      <Plus size={16} className="mr-2"/> Añadir perfil a {area.name}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
    </div>
  );
}
