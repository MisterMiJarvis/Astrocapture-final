import React, { useState } from 'react';
import { Calendar, Clock, Moon, Sun, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card } from './Shared';

// Session Planner — Calendrier mensuel + fenêtre d'imagerie

export interface PlannedSession {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  targetName?: string;
  startTime?: string;
  endTime?: string;
  moonPhase?: number;
  weatherForecast?: string;
  notes?: string;
  status: 'planned' | 'completed' | 'cancelled';
}

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const SessionPlannerView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PlannedSession[]>([
    { id: '1', date: '2026-05-24', title: 'M42 — Nébuleuse d\'Orion', targetName: 'M42', startTime: '23:00', endTime: '03:00', status: 'planned' },
    { id: '2', date: '2026-05-26', title: 'M31 — Galaxie d\'Andromède', targetName: 'M31', startTime: '22:30', endTime: '04:00', status: 'planned' },
  ]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<PlannedSession>>({});

  const handleAddSession = () => {
    if (!formData.title || !selectedDate) return;
    const newSession: PlannedSession = {
      id: Date.now().toString(),
      date: selectedDate,
      title: formData.title,
      targetName: formData.targetName,
      startTime: formData.startTime || '22:00',
      endTime: formData.endTime || '02:00',
      status: 'planned',
      notes: formData.notes,
    };
    setSessions(prev => [...prev, newSession]);
    setShowForm(false);
    setFormData({});
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getSessionsForDate = (dateStr: string) => sessions.filter(s => s.date === dateStr);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleDeleteSession = (id: string) => {
    if (confirm('Supprimer cette session ?')) {
      setSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-[#e8eaf6] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#3b82f6]" /> Planificateur
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg bg-[#1a2238] text-[#8e9aaf] hover:text-[#e8eaf6] transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-semibold min-w-[140px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-2 rounded-lg bg-[#1a2238] text-[#8e9aaf] hover:text-[#e8eaf6] transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white rounded-lg font-medium hover:bg-[#60A5FA] transition-colors" disabled={!selectedDate}>
            <Plus className="w-4 h-4" /> Nouvelle session
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-[#8e9aaf] py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const daySessions = getSessionsForDate(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`aspect-square rounded-lg border transition-all duration-150 p-1 flex flex-col items-start gap-0.5 relative
                  ${isSelected ? 'border-[#3b82f6] bg-[rgba(59,130,246,0.1)]' : 'border-[rgba(148,163,184,0.08)] bg-[#1a2238]'}
                  ${isToday ? 'ring-1 ring-[#3b82f6]' : ''}
                  hover:border-[rgba(59,130,246,0.3)]
                `}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-[#3b82f6]' : 'text-[#e8eaf6]'}`}>
                  {day}
                </span>
                {daySessions.length > 0 && (
                  <div className="flex flex-col gap-0.5 w-full">
                    {daySessions.slice(0, 2).map(s => (
                      <div key={s.id} className="text-[8px] truncate bg-[#3b82f6]/20 text-[#60A5FA] px-1 py-0.5 rounded">
                        {s.title}
                      </div>
                    ))}
                    {daySessions.length > 2 && (
                      <span className="text-[8px] text-[#8e9aaf]">+{daySessions.length - 2}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">
              Sessions du {new Date(selectedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </h3>
            <div className="space-y-2">
              {getSessionsForDate(selectedDate).length === 0 ? (
                <p className="text-[#8e9aaf] text-sm">Aucune session planifiée</p>
              ) : (
                getSessionsForDate(selectedDate).map(s => (
                  <Card key={s.id} className="flex items-center justify-between p-4">
                    <div>
                      <h4 className="font-medium text-[#e8eaf6]">{s.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#8e9aaf]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {s.startTime} – {s.endTime}
                        </span>
                        {s.moonPhase !== undefined && (
                          <span className="flex items-center gap-1">
                            <Moon className="w-3 h-3" /> {s.moonPhase}%
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${s.status === 'planned' ? 'bg-[#3b82f6]/20 text-[#60A5FA]' : ''}
                      ${s.status === 'completed' ? 'bg-[#10B981]/20 text-[#34D399]' : ''}
                      ${s.status === 'cancelled' ? 'bg-[#EF4444]/20 text-[#EF4444]' : ''}
                    `}>
                      {s.status === 'planned' ? 'Planifiée' : s.status === 'completed' ? 'Terminée' : 'Annulée'}
                    </span>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionPlannerView;
