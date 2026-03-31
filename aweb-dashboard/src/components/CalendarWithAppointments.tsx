"use client";

import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface CalendarWithAppointmentsProps {
  appointmentDates: string[];
  dateStatus?: Record<string, "unassigned" | "partial" | "assigned">;
  initialDate: string;
  onDateClick: (date: string) => void;
}

// *** IMPORTANT: Standardized Date Formatting Helper ***
// This function will ensure we always get a YYYY-MM-DD string
// based on the *local* day, not potentially shifting due to UTC.
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CalendarWithAppointments({
  appointmentDates,
  dateStatus = {},
  initialDate,
  onDateClick,
}: CalendarWithAppointmentsProps) {
  const [value, setValue] = useState<Value>(new Date(initialDate));

  // Create a Set of normalized local date strings from appointmentDates
  const datesWithAppointments = new Set(
    appointmentDates.map((dateStr) => getLocalDateString(new Date(dateStr))),
  );

  const handleDateClick = (date: Date) => {
    setValue(date);
    const clickedDateLocalISO = getLocalDateString(date);

    if (datesWithAppointments.has(clickedDateLocalISO)) {
      onDateClick(clickedDateLocalISO);
    }
  };

  const tileContent = () => null; // Status is now handled via CSS classes

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

        html.dark .react-calendar {
          background: #111827 !important;
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
        html.dark .react-calendar__navigation__label {
          color: #e2e8f0;
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
        html.dark .react-calendar__navigation button {
          color: #94a3b8;
        }
        .react-calendar__navigation button:hover {
          background-color: #f3f4f6; /* Tailwind gray-100 */
          color: #1f2937;
        }
        html.dark .react-calendar__navigation button:hover {
          background-color: #1f2937;
          color: #e2e8f0;
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
        html.dark .react-calendar__month-view__weekdays {
          color: #94a3b8;
        }
        .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none; /* Remove underline */
          color: #6b7280; /* Tailwind gray-500 */
        }
        html.dark .react-calendar__month-view__weekdays__weekday abbr {
          color: #94a3b8;
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
          cursor: pointer; /* Default cursor for all enabled tiles */
        }
        .react-calendar__tile:hover:enabled {
          background-color: #f3f4f6;
        }
        html.dark .react-calendar__tile:hover:enabled {
          background-color: #1f2937;
        }
        .react-calendar__tile abbr {
          color: #1f2937; /* Tailwind gray-900 for ALL dates by default */
          position: relative;
          z-index: 1;
        }
        html.dark .react-calendar__tile abbr {
          color: #e2e8f0;
        }

        /* Disabled dates (from prev/next month) */
        .react-calendar__month-view__days__day--neighboringMonth
          .react-calendar__tile__abbr {
          color: #d1d5db; /* Tailwind gray-300 for a disabled look */
        }
        /* Fix for neighboring month tiles to not show red dot on click */
        .react-calendar__month-view__days__day--neighboringMonth
          .react-calendar__tile__content {
          pointer-events: none; /* Make content unclickable for neighboring months */
        }

        /* --- Active/Selected Date Styles (for non-booked dates) --- */
        .react-calendar__tile--active:not([class*="booked-day"]) {
          background: #a5b4fc !important; /* Lighter indigo */
          color: #1f2937 !important;
        }
        .react-calendar__tile--active:not([class*="booked-day"]) abbr {
          color: #1f2937 !important;
        }

        /* --- "Today" Date Styles --- */
        .react-calendar__tile--now {
          background: #e5e7eb !important; /* Tailwind gray-200 */
        }
        html.dark .react-calendar__tile--now {
          background: #334155 !important;
        }

        /* Status-specific styling for booked days */
        .booked-day-unassigned {
          background: #dc2626 !important; /* Much darker red */
          color: white !important;
          font-weight: 600;
        }
        .booked-day-unassigned abbr {
          color: white !important;
        }
        .booked-day-unassigned:hover:enabled {
          background: #b91c1c !important; /* Even darker red on hover */
        }
        .booked-day-unassigned.react-calendar__tile--active {
          background: #be123c !important; /* Solid darker red when selected */
          color: white !important;
        }
        .booked-day-unassigned.react-calendar__tile--active abbr {
          color: white !important;
        }

        .booked-day-partial {
          background: #d97706 !important; /* Much darker orange */
          color: white !important;
          font-weight: 600;
        }
        .booked-day-partial abbr {
          color: white !important;
        }
        .booked-day-partial:hover:enabled {
          background: #92400e !important; /* Even darker orange on hover */
        }
        .booked-day-partial.react-calendar__tile--active {
          background: #c2410c !important; /* Solid darker orange when selected */
          color: white !important;
        }
        .booked-day-partial.react-calendar__tile--active abbr {
          color: white !important;
        }

        .booked-day-assigned {
          background: #16a34a !important; /* Much darker green */
          color: white !important;
          font-weight: 600;
        }
        .booked-day-assigned abbr {
          color: white !important;
        }
        .booked-day-assigned:hover:enabled {
          background: #15803d !important; /* Even darker green on hover */
        }
        .booked-day-assigned.react-calendar__tile--active {
          background: #15803d !important; /* Solid darker green when selected */
          color: white !important;
        }
        .booked-day-assigned.react-calendar__tile--active abbr {
          color: white !important;
        }
      `}</style>

      <Calendar
        onClickDay={handleDateClick}
        onChange={setValue}
        value={value}
        tileContent={tileContent}
        tileClassName={({ date, view }) => {
          if (
            view === "month" &&
            datesWithAppointments.has(getLocalDateString(date))
          ) {
            const dateStr = getLocalDateString(date);
            const status = dateStatus[dateStr] || "unassigned";
            return `booked-day-${status}`;
          }
          return null;
        }}
        className="w-full !border-none !rounded-xl !shadow-none p-2 sm:p-4"
      />
    </div>
  );
}
