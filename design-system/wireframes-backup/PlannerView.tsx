import React, { useState } from 'react';
import { PageHeader, Container, Card, Button, Badge, Modal, Input, Select, BottomSheet } from '../components';

// --- Session Planner View Wireframe ---
// Implements: Monthly Calendar + Imaging Window + Export CSV

interface Session {
  id: string;
  targetId: string;
  targetName: string;
  date: string;
  startTime: string;
  duration: number;        // hours
  equipmentIds: string[];
  notes?: string;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
}

interface DayInfo {
  date: Date;
  sessions: Session[];
  moonPhase: number;        // 0-1
  moonIllumination: number; // 0-1
  weatherQuality: 'good' | 'fair' | 'poor' | 'unknown';
  isToday: boolean;
  isCurrentMonth: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function getMonthData(year: number, month: number): DayInfo[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const weeks: DayInfo[][] = [];
  let currentWeek: DayInfo[] = [];
  
  // Previous month padding
  for (let i = 0; i < startDayOfWeek; i++) {
    const prevDate = new Date(year, month, -startDayOfWeek + i + 1);
    currentWeek.push({
      date: prevDate,
      sessions: [],
      moonPhase: 0,
      moonIllumination: 0,
      weatherQuality: 'unknown',
      isToday: false,
      isCurrentMonth: false,
    });
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = date.toDateString() === new Date().toDateString();
    
    currentWeek.push({
      date,
      sessions: [],
      moonPhase: Math.random(),
      moonIllumination: Math.random(),
      weatherQuality: ['good', 'fair', 'poor', 'unknown'][Math.floor(Math.random() * 4)] as any,
      isToday,
      isCurrentMonth: true,
    });
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  
  // Next month padding
  while (currentWeek.length < 7) {
    const nextDate = new Date(year, month + 1, currentWeek.length - 6);
    currentWeek.push({
      date: nextDate,
      sessions: [],
      moonPhase: 0,
      moonIllumination: 0,
      weatherQuality: 'unknown',
      isToday: false,
      isCurrentMonth: false,
    });
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);
  
  return weeks;
}

function getMoonPhaseIcon(phase: number): string {
  if (phase < 0.05 || phase > 0.95) return '🌑';
  if (phase < 0.2) return '🌒';
  if (phase < 0.3) return '🌓';
  if (phase < 0.45) return '🌔';
  if (phase < 0.55) return '🌕';
  if (phase < 0.7) return '🌖';
  if (phase < 0.8) return '🌗';
  return '🌘';
}

const WeatherDot: React.FC<{ quality: string }> = ({ quality }) => {
  const colors = {
    good: 'bg-[#10B981]',
    fair: 'bg-[#FBBF24]',
    poor: 'bg-[#EF4444]',
    unknown: 'bg-[#6b7280]',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[quality as keyof typeof colors] || colors.unknown}`} />
  );
};

// --- Session Form ---

const SessionForm: React.FC<{
  date?: Date;
  onSave: (session: Session) => void;
  onCancel: () => void;
}> = ({ date, onSave, onCancel }) => {
  const [form, setForm] = useState<Partial<Session>>({
    date: date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    startTime: '22:00',
    duration: 3,
    status: 'planned',
    equipmentIds: [],
  });

  const handleSave = () => {
    if (!form.targetId || !form.targetName) return;
    onSave({
      id: crypto.randomUUID(),
      targetId: form.targetId!,
      targetName: form.targetName!,
      date: form.date!,
      startTime: form.startTime!,
      duration: form.duration!,
      equipmentIds: form.equipmentIds!,
      notes: form.notes,
      status: form.status!,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Target *"
          value={form.targetName || ''}
          onChange={e => setForm(p => ({ ...p, targetName: e.target.value }))}
          placeholder="e.g. M42 Orion Astro"
        />
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Time"
          type="time"
          value={form.startTime}
          onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
        />
        <Input
          label="Duration (hours)"
          type="number"
          min="0.5"
          max="12"
          step="0.5"
          value={form.duration}
          onChange={e => setForm(p => ({ ...p, duration: parseFloat(e.target.value) || 3 }))}
        />
      </div>
      
      <Select
        label="Equipment"
        value={form.equipmentIds?.[0] || ''}
        onChange={e => setForm(p => ({ ...p, equipmentIds: e.target.value ? [e.target.value] : [] }))}
      >
        <option value="">Select equipment...</option>
        <option value="eq1">William Optics Z61 + ASI2600MC</option>
      </Select>
      
      <textarea
        className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-[10px] px-4 py-2.5 text-sm text-[#e8eaf6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.25)] focus:border-[#3B82F6] min-h-[80px] resize-y"
        value={form.notes || ''}
        onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
        placeholder="Notes..."
      />
      
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>Save Session</Button>
      </div>
    </div>
  );
};

// --- Main View ---

export const PlannerView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en', { month: 'long', year: 'numeric' });
  const weeks = getMonthData(year, month);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleSaveSession = (session: Session) => {
    setSessions(prev => [...prev, session]);
    setShowSessionForm(false);
  };

  const selectedDaySessions = sessions.filter(s => 
    s.date === selectedDate?.toISOString().split('T')[0]
  );

  const exportCSV = () => {
    const headers = ['Date', 'Target', 'Start Time', 'Duration (h)', 'Equipment', 'Notes', 'Status'];
    const rows = sessions.map(s => [
      s.date,
      s.targetName,
      s.startTime,
      s.duration,
      s.equipmentIds.join(', '),
      s.notes || '',
      s.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astro-sessions-${year}-${String(month + 1).padStart(2, '0')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Container>
        <PageHeader
          title="Session Planner"
          subtitle="Plan your imaging nights with weather and moon data"
          actions={
            <>
              <Button variant="secondary" onClick={exportCSV}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export CSV
              </Button>
              <Button onClick={() => setShowSessionForm(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Session
              </Button>
            </>
          }
        />

        {/* Calendar */}
        <Card>
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg hover:bg-white/5 text-[#8e9aaf] hover:text-[#e8eaf6] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <h2 className="text-xl font-semibold font-[Space_Grotesk]">{monthName}</h2>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-white/5 text-[#8e9aaf] hover:text-[#e8eaf6] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-[#6b7280] uppercase py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((day, di) => {
                  const isSelected = selectedDate?.toDateString() === day.date.toDateString();
                  const daySessions = sessions.filter(s => 
                    s.date === day.date.toISOString().split('T')[0]
                  );
                  
                  return (
                    <button
                      key={di}
                      onClick={() => setSelectedDate(day.date)}
                      className={`relative aspect-square rounded-lg p-1 text-left transition-all ${
                        day.isCurrentMonth
                          ? 'hover:bg-white/5'
                          : 'opacity-40'
                      } ${
                        day.isToday ? 'ring-1 ring-[#3B82F6]' : ''
                      } ${
                        isSelected ? 'bg-[rgba(59,130,246,0.15)]' : ''
                      }`}
                    >
                      <span className={`text-sm font-medium ${
                        day.isToday ? 'text-[#3B82F6]' : isSelected ? 'text-[#e8eaf6]' : 'text-[#8e9aaf]'
                      }`}>
                        {day.date.getDate()}
                      </span>
                      
                      {day.isCurrentMonth && (
                        <>
                          <div className="absolute bottom-1 right-1 text-[10px]">
                            {getMoonPhaseIcon(day.moonPhase)}
                          </div>
                          <div className="absolute bottom-1 left-1">
                            <WeatherDot quality={day.weatherQuality} />
                          </div>
                          {daySessions.length > 0 && (
                            <div className="absolute top-1 right-1">
                              <span className="w-1.5 h-1.5 bg-[#3b82f6] rounded-full inline-block" />
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[rgba(148,163,184,0.12)]">
            <div className="flex items-center gap-1.5">
              <WeatherDot quality="good" />
              <span className="text-xs text-[#8e9aaf]">Good</span>
            </div>
            <div className="flex items-center gap-1.5">
              <WeatherDot quality="fair" />
              <span className="text-xs text-[#8e9aaf]">Fair</span>
            </div>
            <div className="flex items-center gap-1.5">
              <WeatherDot quality="poor" />
              <span className="text-xs text-[#8e9aaf]">Poor</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="w-1.5 h-1.5 bg-[#3b82f6] rounded-full inline-block" />
              <span className="text-xs text-[#8e9aaf]">Session planned</span>
            </div>
          </div>
        </Card>

        {/* Selected Day Detail */}
        {selectedDate && (
          <Card variant="elevated" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold font-[Space_Grotesk]">
                {selectedDate.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedDate(null); setShowSessionForm(true); }}>
                + Plan Session
              </Button>
            </div>
            
            {selectedDaySessions.length === 0 ? (
              <p className="text-sm text-[#8e9aaf]">No sessions planned for this date.</p>
            ) : (
              <div className="space-y-3">
                {selectedDaySessions.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        session.status === 'completed' ? 'success' :
                        session.status === 'in-progress' ? 'warning' :
                        session.status === 'cancelled' ? 'danger' : 'primary'
                      }>
                        {session.status}
                      </Badge>
                      <span className="text-sm font-medium">{session.targetName}</span>
                      <span className="text-xs text-[#6b7280]">
                        {session.startTime} · {session.duration}h
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </Container>

      {/* Session Form */}
      {isMobile ? (
        <BottomSheet
          isOpen={showSessionForm}
          onClose={() => setShowSessionForm(false)}
          title="New Session"
        >
          <SessionForm
            date={selectedDate || undefined}
            onSave={handleSaveSession}
            onCancel={() => setShowSessionForm(false)}
          />
        </BottomSheet>
      ) : (
        <Modal
          isOpen={showSessionForm}
          onClose={() => setShowSessionForm(false)}
          title="New Session"
        >
          <SessionForm
            date={selectedDate || undefined}
            onSave={handleSaveSession}
            onCancel={() => setShowSessionForm(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default PlannerView;
