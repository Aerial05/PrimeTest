import styles from './AdminHeaderInfoBar.module.css';
import {
  Activity,
  CalendarClock,
  ClipboardList,
  CalendarDays,
  AlertTriangle,
  BellRing,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

        for (const appt of rows) {
          const status = normalizeStatus(appt.BOOKING_STATUS);
          const appointmentDate = parseAppointmentDate(appt.DATE_OF_APPOINTMENT);
          const isScheduled = status === 'pending' || status === 'approved';
          const isCancelled =
            status === 'cancelled' ||
            status === 'canceled' ||
            status === 'declined' ||
            status === 'rejected' ||
            status === 'no-show' ||
            status === 'noshow';

          if (status === 'pending') pending += 1;
          if (isCancelled) cancelled += 1;

          if (!appointmentDate || !isScheduled) continue;

          if (appointmentDate >= startOfToday && appointmentDate <= upcomingEnd) upcoming += 1;
          if (appointmentDate >= startOfToday && appointmentDate <= endOfToday) today += 1;
          if (appointmentDate < startOfToday) overdue += 1;
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

  const pendingVal = pickCount(pendingCount, auto.pending);
  const upcomingVal = pickCount(upcomingCount, auto.upcoming);
  const todayVal = pickCount(todayCount, auto.today);
  const overdueVal = pickCount(overdueCount, auto.overdue);
  const cancelledVal = pickCount(cancelledCount, auto.cancelled);
  const alertsVal = pickCount(notificationsCount, pendingVal + overdueVal + cancelledVal);

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
      title: `Pending ${formatCount(pendingVal)} | Overdue ${formatCount(overdueVal)} | Cancelled ${formatCount(cancelledVal)}`,
      value: alertsVal,
      icon: BellRing,
      accent: '#dc2626',
      meta: `Cancelled ${formatCount(cancelledVal)}`,
    },
  ], [alertsVal, cancelledVal, overdueVal, pendingVal, todayVal, upcomingVal]);

  return (
    <header className={styles.siteHeader}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          <Link to="/admin-dashboard" className={styles.logoLink}>
            <Activity className={styles.logoIcon} />
            <span className={styles.brandName}>
              <span className={styles.textPrimary}>PRIME</span>
              <span className={styles.textSecondary}>LAB</span>
            </span>
          </Link>

          <div className={styles.infoRow}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className={styles.infoItem} title={item.title}>
                  <Icon className={styles.infoIcon} style={{ color: item.accent }} />
                  <div className={styles.infoText}>
                    <span className={styles.infoLabel}>{item.label}</span>
                    <span className={styles.infoValue} style={{ color: item.accent }}>
                      {formatCount(item.value)}
                    </span>
                    {item.meta ? (
                      <span className={styles.infoMeta}>{item.meta}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}



