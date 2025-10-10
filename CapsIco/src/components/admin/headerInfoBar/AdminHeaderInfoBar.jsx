import styles from './AdminHeaderInfoBar.module.css';
import {
  Activity,
  CalendarClock,
  ClipboardList,
  CalendarDays,
  AlertTriangle,
  BellRing,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import appointmentsService from '/src/services/AppointmentsService';

const EMPTY_COUNTS = Object.freeze({
  pending: 0,
  upcoming: 0,
  today: 0,
  overdue: 0,
  cancelled: 0,
});

function normalizeStatus(raw) {
  return String(raw || '').trim().toLowerCase();
}

function parseAppointmentDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  const str = String(raw).trim();
  if (!str) return null;

  const direct = new Date(str);
  if (!Number.isNaN(direct.getTime())) return direct;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const iso = new Date(`${str}T00:00:00`);
    if (!Number.isNaN(iso.getTime())) return iso;
  }

  const parts = str.split(/[\/-]/).map((segment) => parseInt(segment, 10));
  if (parts.length === 3 && parts.every((segment) => !Number.isNaN(segment))) {
    let [a, b, c] = parts;
    let year = c;
    if (String(year).length !== 4) {
      if (String(a).length === 4) {
        year = a;
        [a, b] = [b, c];
      } else if (String(b).length === 4) {
        year = b;
        b = c;
      } else {
        year = year + 2000;
      }
    }
    const month = [a, b].find((segment) => segment >= 1 && segment <= 12) || 1;
    const day = [a, b].find((segment) => segment !== month) || 1;
    const reconstructed = new Date(year, month - 1, day);
    if (!Number.isNaN(reconstructed.getTime())) return reconstructed;
  }

  return null;
}

function pickCount(overrideValue, fallbackValue) {
  if (overrideValue == null) return fallbackValue;
  const numeric = Number(overrideValue);
  return Number.isFinite(numeric) ? numeric : fallbackValue;
}

function formatCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(numeric);
}

/**
 * AdminHeaderInfoBar
 * Mirrors the public header info bar but surfaces actionable admin metrics.
 */
export function AdminHeaderInfoBar({
  upcomingCount,
  pendingCount,
  todayCount,
  overdueCount,
  notificationsCount,
  cancelledCount,
}) {
  const [auto, setAuto] = useState(EMPTY_COUNTS);
  const headerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await appointmentsService.list();
        if (!active) return;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const upcomingEnd = new Date(startOfToday);
        upcomingEnd.setDate(upcomingEnd.getDate() + 7);

        let pending = 0;
        let upcoming = 0;
        let today = 0;
        let overdue = 0;
        let cancelled = 0;

        const parseTimeSlot = (raw) => {
          if (!raw) return null;
          const parts = String(raw).trim().split(':');
            if (parts.length < 2) return null;
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) || 0;
            if (Number.isNaN(h) || h < 0 || h > 23) return null;
            if (Number.isNaN(m) || m < 0 || m > 59) return null;
            return { h, m };
        };

        for (const appt of rows) {
          const status = normalizeStatus(appt.BOOKING_STATUS);
          const appointmentDate = parseAppointmentDate(appt.DATE_OF_APPOINTMENT);
          const timeSlot = parseTimeSlot(appt.TIME_SLOT || appt.TIME || appt.TIME_SLOT_24H); // attempt multiple fields
          const isCancelled =
            status === 'cancelled' ||
            status === 'canceled' ||
            status === 'declined' ||
            status === 'rejected' ||
            status === 'no-show' ||
            status === 'noshow';
          const isSuccessful = status === 'successful' || status === 'success' || status === 'successfull';
          const isScheduled = (status === 'pending' || status === 'approved' || isSuccessful) && !isCancelled;

          if (status === 'pending') pending += 1;
          if (isCancelled) cancelled += 1;

          if (!appointmentDate || !isScheduled) continue;

          // Build full DateTime for comparison (default to end of day if missing time)
          let apptDateTime;
          if (timeSlot) {
            apptDateTime = new Date(
              appointmentDate.getFullYear(),
              appointmentDate.getMonth(),
              appointmentDate.getDate(),
              timeSlot.h,
              timeSlot.m,
              0,
              0
            );
          } else {
            apptDateTime = new Date(
              appointmentDate.getFullYear(),
              appointmentDate.getMonth(),
              appointmentDate.getDate(),
              23, 59, 59, 999
            );
          }

          if (appointmentDate >= startOfToday && appointmentDate <= upcomingEnd) upcoming += 1;
          if (appointmentDate >= startOfToday && appointmentDate <= endOfToday) today += 1;

            // Overdue: past the scheduled date & time and not successful & not cancelled
          if (apptDateTime < now && !isSuccessful && !isCancelled) {
            overdue += 1;
          }
        }

        setAuto({ pending, upcoming, today, overdue, cancelled });
      } catch (_err) {
        if (!active) return;
        setAuto(EMPTY_COUNTS);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Keep a live CSS variable of the header's actual height so the sticky nav can offset correctly
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const setVar = () => {
      const rectH = el.getBoundingClientRect().height;
      const h = Math.max(rectH, el.scrollHeight || rectH);
      document.documentElement.style.setProperty('--admin-info-height', `${Math.ceil(h)}px`);
    };

    setVar();
    // Re-run after layout settles (e.g., metrics fetched)
    const t = setTimeout(setVar, 0);
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener('resize', setVar);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('resize', setVar);
    };
  }, []);

  const pendingVal = pickCount(pendingCount, auto.pending);
  const upcomingVal = pickCount(upcomingCount, auto.upcoming);
  const todayVal = pickCount(todayCount, auto.today);
  const overdueVal = pickCount(overdueCount, auto.overdue);
  const cancelledVal = pickCount(cancelledCount, auto.cancelled);
  const alertsVal = pickCount(notificationsCount, pendingVal + overdueVal);

  const items = useMemo(() => [
    {
      key: 'upcoming',
      label: 'Upcoming (7d)',
      title: 'Appointments scheduled within the next seven days',
      value: upcomingVal,
      icon: CalendarClock,
      accent: 'var(--primary-color)',
    },
    {
      key: 'pending',
      label: 'Pending',
      title: 'Bookings waiting for approval or completion',
      value: pendingVal,
      icon: ClipboardList,
      accent: '#0f766e',
    },
    {
      key: 'today',
      label: "Today’s Schedule",
      title: 'Appointments happening today',
      value: todayVal,
      icon: CalendarDays,
      accent: '#7c3aed',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      title: 'Appointments in the past that still require follow-up',
      value: overdueVal,
      icon: AlertTriangle,
      accent: '#ea580c',
    },
    {
      key: 'attention',
      label: 'Needs Attention',
      title: `Pending ${formatCount(pendingVal)} | Overdue ${formatCount(overdueVal)}`,
      value: alertsVal,
      icon: BellRing,
      accent: '#dc2626',
      inlineMeta: `Pending ${formatCount(pendingVal)} • Overdue ${formatCount(overdueVal)}`,
    },
  ], [alertsVal, cancelledVal, overdueVal, pendingVal, todayVal, upcomingVal]);

  const dateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const goFor = (key) => {
    const now = new Date();
    const today = dateStr(now);
    const yesterday = (() => { const d = new Date(now); d.setDate(d.getDate() - 1); return dateStr(d); })();
    const in7 = (() => { const d = new Date(now); d.setDate(d.getDate() + 7); return dateStr(d); })();
    switch (key) {
      case 'pending':
        navigate(`/appointment-management?status=pending`);
        break;
      case 'today':
        navigate(`/appointment-management?from=${today}&to=${today}`);
        break;
      case 'upcoming':
        // Use new preset range for Next 7 days
        navigate(`/appointment-management?range=next7`);
        break;
      case 'overdue':
        // Go to appointment management focused on overdue (client-side filter will exclude successful/cancelled)
        navigate(`/appointment-management?overdue=1`);
        break;
      case 'attention':
        // Navigate with attention flag so the table shows Pending OR Overdue
        navigate(`/appointment-management?attention=1`);
        break;
      default:
        navigate('/admin-dashboard');
    }
  };

  return (
    <header className={styles.siteHeader} ref={headerRef}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          <Link to="/admin-dashboard" className={styles.logoLink}>
            <Activity className={styles.logoIcon} />
            <span className={styles.brandName}>Prime Medical Laboratory</span>
          </Link>

          <div className={styles.infoRow}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={styles.infoItem}
                  data-key={item.key}
                  title={item.title}
                  onClick={() => goFor(item.key)}
                >
                  <Icon className={styles.infoIcon} style={{ color: item.accent }} />
                  <div className={styles.infoText}>
                    <span className={styles.infoLabel}>{item.label}</span>
                    <span className={styles.infoValueRow}>
                      <span className={styles.infoValue} style={{ color: item.accent }}>
                        {formatCount(item.value)}
                      </span>
                      {item.key === 'attention' && item.inlineMeta ? (
                        <span className={styles.infoInlineMeta}>{item.inlineMeta}</span>
                      ) : null}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}



