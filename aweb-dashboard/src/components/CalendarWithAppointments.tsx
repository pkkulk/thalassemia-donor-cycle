'use client';

import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface CalendarWithAppointmentsProps {
  appointmentDates: string[];
  initialDate: string; // New prop to receive a static date
}

export default function CalendarWithAppointments({
  appointmentDates,
  initialDate,
}: CalendarWithAppointmentsProps) {
  const [value, setValue] = useState<Value>(new Date(initialDate)); // Use the static date

  const datesWithAppointments = new Set(
    appointmentDates.map((d) => new Date(d).toDateString())
  );

  const tileContent = ({
    date,
    view,
  }: {
    date: Date;
    view: string;
  }) => {
    if (view === 'month' && datesWithAppointments.has(date.toDateString())) {
      return (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></div>
      );
    }
  };

  return (
    <div className="relative">
      <style jsx global>{`
        /* --- General Calendar Styles --- */
        .react-calendar {
          width: 100%;
          border: none !important;
          background: white !important;
          border-radius: 1rem;
          font-family: inherit;
        }

        /* --- Navigation Bar Styles --- */
        .react-calendar__navigation {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 1rem;
        }
        .react-calendar__navigation__label {
          font-size: 1.25rem;
          font-weight: 700;
          color: #374151; /* Tailwind gray-800 */
          pointer-events: none;
        }
        .react-calendar__navigation button {
          background: none !important;
          border: none !important;
          font-size: 1.5rem;
          font-weight: 300;
          color: #6b7280; /* Tailwind gray-500 */
          cursor: pointer;
          transition: color 0.2s;
          padding: 0.5rem;
          border-radius: 9999px;
        }
        .react-calendar__navigation button:hover {
          background-color: #f3f4f6; /* Tailwind gray-100 */
          color: #1f2937;
        }
        .react-calendar__navigation button:disabled {
          background: none !important;
        }
        
        /* --- Weekday Header Styles --- */
        .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-weight: 600;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none; /* Remove underline */
          color: #6b7280; /* Tailwind gray-500 */
        }

        /* --- Date Tiles (Days) Styles --- */
        .react-calendar__tile {
          background: none !important;
          border: none !important;
          padding: 0.75em 0.5em;
          text-align: center;
          position: relative;
          transition: all 0.2s ease-in-out;
          border-radius: 0.5rem;
        }
        .react-calendar__tile:hover:enabled {
          background-color: #f3f4f6;
        }
        .react-calendar__tile abbr {
          color: #1f2937; /* Tailwind gray-900 for all dates */
          position: relative;
          z-index: 1;
        }
        
        /* Disabled dates (from prev/next month) */
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #d1d5db; /* Tailwind gray-300 for a disabled look */
        }

        /* --- Active/Selected Date Styles --- */
        .react-calendar__tile--active {
          background: #4f46e5 !important; /* Tailwind indigo-600 */
          color: white !important;
        }
        .react-calendar__tile--active abbr {
          color: white !important;
        }

        /* --- "Today" Date Styles --- */
        .react-calendar__tile--now {
          background: #e5e7eb !important; /* Tailwind gray-200 */
        }
      `}</style>

      <Calendar
        onChange={setValue}
        value={value}
        tileContent={tileContent}
        className="w-full !border-none !rounded-xl !shadow-none p-2 sm:p-4"
      />
    </div>
  );
}
