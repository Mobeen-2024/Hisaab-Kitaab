import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  parseISO
} from 'date-fns';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateObj: string) => void;
  className?: string;
}

export default function DatePicker({ value, onChange, className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM-DD to a local Date object safely, defaulting to today
  // so we don't mess up timezones.
  const parsedDate = value ? parseISO(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(parsedDate);

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDateSelect = (day: Date) => {
    // Format safely to YYYY-MM-DD using local time
    // format(day, 'yyyy-MM-dd')
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-transparent text-sm font-medium text-white hover:text-blue-400 focus:outline-none transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
      >
        <span className="tabular-nums">{format(parsedDate, 'dd MMM yyyy')}</span>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-full left-0 mb-2 z-50 p-4 bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 w-[280px]"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="font-bold text-white text-sm">
                {format(currentMonth, 'MMMM yyyy')}
              </div>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Days row */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const isSelected = isSameDay(day, parsedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={`
                      h-8 w-full rounded-lg text-xs font-medium flex items-center justify-center transition-all
                      ${!isCurrentMonth ? 'text-slate-600' : 'text-slate-300 hover:bg-white/10'}
                      ${isSelected ? '!bg-blue-600 !text-white shadow-md shadow-blue-500/20 font-bold scale-105' : ''}
                      ${isToday && !isSelected ? 'border border-blue-500/30 text-blue-400' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
