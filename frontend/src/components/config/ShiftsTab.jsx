import React, { useState } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Edit2, Trash2, Plus, Clock } from 'lucide-react';

export default function ShiftsTab() {
  const { shifts, addShift, updateShift, deleteShift } = useConfigStore();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', startTime: '08:00', endTime: '15:00' });

  const handleOpenNew = () => {
    setFormData({ name: '', startTime: '08:00', endTime: '15:00' });
    setEditingId(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (shift) => {
    setFormData({ name: shift.name, startTime: shift.startTime, endTime: shift.endTime });
    setEditingId(shift.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updateShift(editingId, formData);
    } else {
      await addShift(formData);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Turnos (Atajos)</h2>
          <p className="text-sm text-muted-foreground">Define plantillas de horarios para rellenar perfiles rápido.</p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2"><Plus size={16}/> Nuevo Turno</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shifts.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed rounded-lg">
            No hay turnos configurados. Crea "Mañana" o "Tarde" como plantillas.
          </div>
        ) : shifts.map(shift => (
          <div key={shift.id} className="border rounded-lg p-5 bg-card hover:border-primary/50 transition-colors flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{shift.name}</h3>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(shift)}><Edit2 size={14}/></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteShift(shift.id)}><Trash2 size={14}/></Button>
                </div>
              </div>
              <div className="flex items-center text-sm text-muted-foreground gap-2 bg-muted/50 w-max px-2 py-1 rounded">
                <Clock size={14} />
                <span>{shift.startTime} - {shift.endTime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editingId ? 'Editar Turno' : 'Nuevo Turno'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre (Atajo)</label>
            <Input 
              required 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ej. Mañana"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Hora Inicio</label>
              <Input 
                required 
                type="time" 
                value={formData.startTime}
                onChange={e => setFormData({...formData, startTime: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hora Fin</label>
              <Input 
                required 
                type="time" 
                value={formData.endTime}
                onChange={e => setFormData({...formData, endTime: e.target.value})}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Los turnos solo sirven como atajos visuales o plantillas predeterminadas al crear perfiles.
          </p>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
