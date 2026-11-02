import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Generate all 365 readings
const biblicalReadings: Record<string, string> = {};
const books = [
  { name: "Génesis", chapters: 50 }, { name: "Éxodo", chapters: 40 },
  { name: "Levítico", chapters: 27 }, { name: "Números", chapters: 36 },
  { name: "Deuteronomio", chapters: 34 }, { name: "Josué", chapters: 24 },
  { name: "Jueces", chapters: 21 }, { name: "Rut", chapters: 4 },
  { name: "1 Samuel", chapters: 31 }, { name: "2 Samuel", chapters: 24 },
  { name: "1 Reyes", chapters: 22 }, { name: "2 Reyes", chapters: 25 },
  { name: "1 Crónicas", chapters: 29 }, { name: "2 Crónicas", chapters: 36 },
];

let chapterIndex = 0;
let bookIndex = 0;
for (let m = 0; m < 12; m++) {
  for (let d = 1; d <= daysInMonth[m]; d++) {
    if (bookIndex < books.length) {
      biblicalReadings[`${m}-${d}`] = `${books[bookIndex].name} ${chapterIndex + 1}`;
      chapterIndex++;
      if (chapterIndex >= books[bookIndex].chapters) {
        chapterIndex = 0;
        bookIndex++;
      }
    } else {
      biblicalReadings[`${m}-${d}`] = `Salmos ${d}`;
    }
  }
}

const AnoBiblico = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [completedDays, setCompletedDays] = useState<Set<string>>(() => {
    const set = new Set<string>();
    // Demo: first 15 days of January completed
    for (let i = 1; i <= 15; i++) set.add(`0-${i}`);
    return set;
  });

  const days = daysInMonth[currentMonth];
  // Get the day of week for the 1st of the month (2026)
  const firstDayOfWeek = new Date(2026, currentMonth, 1).getDay();

  const completedCount = useMemo(() => {
    let count = 0;
    completedDays.forEach((key) => {
      const m = parseInt(key.split("-")[0]);
      if (m === currentMonth) count++;
    });
    return count;
  }, [completedDays, currentMonth]);

  const totalCompleted = completedDays.size;
  const monthProgress = (completedCount / days) * 100;
  const yearProgress = (totalCompleted / 365) * 100;

  const selectDay = (day: number) => {
    setSelectedDay(day);
  };

  const markAsRead = (day: number) => {
    const key = `${currentMonth}-${day}`;
    setCompletedDays((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const markAsPending = (day: number) => {
    const key = `${currentMonth}-${day}`;
    setCompletedDays((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const selectedReading = selectedDay ? biblicalReadings[`${currentMonth}-${selectedDay}`] : null;
  const isSelectedCompleted = selectedDay ? completedDays.has(`${currentMonth}-${selectedDay}`) : false;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Año Bíblico" subtitle="Lectura diaria" />

      <div className="container py-6 space-y-5">
        {/* Progress Cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <h3 className="font-semibold text-foreground text-xs">Mes</h3>
            </div>
            <p className="text-xl font-bold text-foreground">{completedCount}/{days}</p>
            <Progress value={monthProgress} className="h-2 mt-2" />
            <p className="text-muted-foreground text-[10px] mt-1">{monthProgress.toFixed(0)}%</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-success" />
              <h3 className="font-semibold text-foreground text-xs">Año</h3>
            </div>
            <p className="text-xl font-bold text-foreground">{yearProgress.toFixed(1)}%</p>
            <Progress value={yearProgress} className="h-2 mt-2" />
            <p className="text-muted-foreground text-[10px] mt-1">{totalCompleted}/365</p>
          </motion.div>
        </div>

        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-3xl overflow-hidden shadow-xl border border-border/40 bg-card"
        >
          {/* Header */}
          <div className="gradient-calendar-header px-5 py-4 flex items-center justify-between">
            <button
              onClick={() => { setCurrentMonth((p) => Math.max(0, p - 1)); setSelectedDay(null); }}
              disabled={currentMonth === 0}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-white text-lg tracking-wide">{months[currentMonth]} 2026</h3>
            <button
              onClick={() => { setCurrentMonth((p) => Math.min(11, p + 1)); setSelectedDay(null); }}
              disabled={currentMonth === 11}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {weekDays.map((wd, i) => (
                <div
                  key={wd}
                  className={`text-center text-xs font-semibold py-1 ${
                    i === 0 ? "calendar-day-sunday" : i === 6 ? "calendar-day-saturday" : "text-muted-foreground"
                  }`}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Day Grid */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square rounded-xl calendar-day-tile opacity-40 flex items-center justify-center">
                  <span className="calendar-day-outside text-sm font-semibold">·</span>
                </div>
              ))}
              {Array.from({ length: days }, (_, i) => {
                const day = i + 1;
                const key = `${currentMonth}-${day}`;
                const completed = completedDays.has(key);
                const isSelected = selectedDay === day;
                const isToday = new Date().getMonth() === currentMonth && new Date().getDate() === day;
                const dayOfWeek = (firstDayOfWeek + i) % 7;
                const colorClass = dayOfWeek === 0
                  ? "calendar-day-sunday"
                  : dayOfWeek === 6
                    ? "calendar-day-saturday"
                    : "text-foreground";

                return (
                  <button
                    key={day}
                    onClick={() => selectDay(day)}
                    className={`
                      relative aspect-square rounded-xl flex items-center justify-center text-base font-bold transition-all
                      calendar-day-tile hover:scale-105
                      ${isSelected ? "calendar-day-selected" : completed ? "calendar-day-completed" : colorClass}
                      ${isToday && !isSelected ? "ring-2 ring-secondary/60" : ""}
                    `}
                  >
                    {day}
                    {completed && !isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-secondary flex items-center justify-center shadow-md">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Reading Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-2xl p-4 flex items-center gap-3 transition-colors ${
            isSelectedCompleted
              ? "bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/30"
              : "glass-card"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isSelectedCompleted ? "bg-[hsl(var(--success))]/20" : "bg-primary/10"
          }`}>
            <BookOpen className={`w-5 h-5 ${isSelectedCompleted ? "text-[hsl(var(--success))]" : "text-primary"}`} />
          </div>
          <div className="flex-1 min-w-0">
            {selectedDay ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {months[currentMonth]} {selectedDay}
                </p>
                <p className="font-semibold text-foreground text-sm truncate">
                  {selectedReading}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Selecciona un día para ver la lectura</p>
            )}
          </div>
          {selectedDay && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  isSelectedCompleted
                    ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {isSelectedCompleted ? "Leído" : "Pendiente"}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[120px]">
                <DropdownMenuItem
                  onClick={() => markAsPending(selectedDay)}
                  className={`text-xs ${!isSelectedCompleted ? "font-semibold" : ""}`}
                >
                  Pendiente
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => markAsRead(selectedDay)}
                  className={`text-xs ${isSelectedCompleted ? "font-semibold text-[hsl(var(--success))]" : ""}`}
                >
                  Leído
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AnoBiblico;
