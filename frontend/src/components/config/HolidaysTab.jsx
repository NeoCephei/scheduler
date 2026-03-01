import { useState } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card, CardContent } from '../ui/Card';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

export default function HolidaysTab() {
  const { holidays, addHoliday, updateHoliday, deleteHoliday } = useConfigStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  
  const [date, setDate] = useState('');
  const [name, setName] = useState('');

  const [holidayToDelete, setHolidayToDelete] = useState(null);

  const openNewModal = () => {
    setEditingHoliday(null);
    setDate('');
    setName('');
    setIsModalOpen(true);
  };

  const openEditModal = (holiday) => {
    setEditingHoliday(holiday);
    setDate(holiday.date);
    setName(holiday.name);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!date || !name) return;
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, { date, name });
      } else {
        await addHoliday({ date, name });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving holiday:", error);
    }
  };

  const handleDelete = async () => {
    if (holidayToDelete) {
      try {
        await deleteHoliday(holidayToDelete.id);
        setHolidayToDelete(null);
      } catch (error) {
        console.error("Error deleting holiday:", error);
      }
    }
  };

  // 1. Sort holidays by date ascending
  const sortedHolidays = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date));

  // 2. Group by Year
  const groupedHolidays = sortedHolidays.reduce((acc, holiday) => {
    const year = holiday.date.split('-')[0];
    if (!acc[year]) acc[year] = [];
    acc[year].push(holiday);
    return acc;
  }, {});

  // Sort years descending (newest first) or ascending. Let's do ascending so current year is first.
  const sortedYears = Object.keys(groupedHolidays).sort();

  const getDaysLeft = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Pasado';
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    return `En ${diffDays} días`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-background p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Festivos</h2>
          <p className="text-sm text-muted-foreground">Gestiona los días festivos globales que alteran el horario de los perfiles.</p>
        </div>
        <Button onClick={openNewModal}><Plus className="w-4 h-4 mr-2" /> Añadir Festivo</Button>
      </div>

      <div className="space-y-8">
        {sortedHolidays.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            No hay ningún festivo configurado.
          </div>
        ) : (
          sortedYears.map(year => (
            <div key={year} className="space-y-4">
              <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                Año {year}
                <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {groupedHolidays[year].length} festivos
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedHolidays[year].map(holiday => {
                  const daysLeft = getDaysLeft(holiday.date);
                  const isPast = daysLeft === 'Pasado';
                  
                  return (
                    <Card key={holiday.id} className={`overflow-hidden ${isPast ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                      <CardContent className="p-4 flex flex-col justify-between h-full bg-card hover:bg-muted/10 transition-colors">
                        <div>
                          <div className="flex justify-between items-start">
                            <div className="font-semibold text-lg">{holiday.name}</div>
                            {!isPast && (
                              <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full whitespace-nowrap">
                                {daysLeft}
                              </span>
                            )}
                            {isPast && (
                              <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full whitespace-nowrap">
                                Pasado
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground text-sm font-medium mt-1">
                            {new Date(holiday.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditModal(holiday)}>
                            <Edit2 className="w-4 h-4 mr-1" /> Editar
                          </Button>
                          <Button variant="outline" className="text-destructive hover:bg-destructive/10" size="sm" onClick={() => setHolidayToDelete(holiday)}>
                            <Trash2 className="w-4 h-4 mr-1" /> Borrar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg w-full max-w-sm z-50 border">
            <Dialog.Title className="text-lg font-semibold border-b pb-3 mb-4">
              {editingHoliday ? 'Editar Festivo' : 'Añadir Nuevo Festivo'}
            </Dialog.Title>
            <Dialog.Description className="sr-only">Rellena los detalles del festivo aquí.</Dialog.Description>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="h-date">Fecha</Label>
                <Input id="h-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="h-name">Motivo / Nombre</Label>
                <Input id="h-name" placeholder="Ej: Navidad, San Juan..." value={name} onChange={e => setName(e.target.value)} />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={!date || !name}>Guardar</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={!!holidayToDelete} onOpenChange={(open) => !open && setHolidayToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg w-full max-w-sm z-50 border border-destructive">
            <Dialog.Title className="text-xl font-semibold mb-2 text-foreground">Eliminar Festivo</Dialog.Title>
            <Dialog.Description className="mb-4 text-muted-foreground">
              ¿Estás seguro de que deseas eliminar el festivo "{holidayToDelete?.name}"? Esta acción recalculará los calendarios que usen esta fecha.
            </Dialog.Description>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setHolidayToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete}>Sí, eliminar festivo</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
