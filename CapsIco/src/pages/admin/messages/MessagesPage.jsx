import React, { useMemo, useState } from 'react';
import styles from './MessagesPage.module.css';

export function MessagesPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All | Unread | Read | Archived
  const [sort, setSort] = useState('Newest'); // Newest | Oldest | Unread First
  const [messages, setMessages] = useState([
    {
      id: 1,
      name: 'Juan Dela Cruz',
      email: 'juan@example.com',
      subject: 'Question about CBC preparation',
      body: 'Hi, I would like to ask if fasting is required before the CBC test. Thank you!',
      source: 'Contact Form',
      serviceName: 'CBC Test',
      rating: null,
      createdAt: '2025-08-25T10:30:00Z',
      status: 'Unread',
    },
    {
      id: 2,
      name: 'Maria Santos',
      email: 'maria@example.com',
      subject: 'Great service!',
      body: 'I had a smooth experience with the Wellness Package. Staff were helpful.',
      source: 'Service Feedback',
      serviceName: 'Wellness Package A',
      rating: 5,
      createdAt: '2025-08-23T08:12:00Z',
      status: 'Read',
    },
    {
      id: 3,
      name: 'Mark Reyes',
      email: 'markr@example.com',
      subject: 'Schedule inquiry',
      body: 'Do you have available slots this Saturday for a urinalysis?',
      source: 'Contact Form',
      serviceName: 'Urinalysis',
      rating: null,
      createdAt: '2025-08-26T14:05:00Z',
      status: 'Unread',
    },
  ]);
  const [selectedId, setSelectedId] = useState(1);

  const filtered = useMemo(() => {
    let data = [...messages];
    if (statusFilter !== 'All') data = data.filter((m) => m.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.subject.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q)
      );
    }
    if (sort === 'Newest') data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sort === 'Oldest') data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (sort === 'Unread First') data.sort((a, b) => (a.status === 'Unread' ? -1 : 1));
    return data;
  }, [messages, query, statusFilter, sort]);

  const selected = useMemo(() => messages.find((m) => m.id === selectedId) || filtered[0], [messages, selectedId, filtered]);

  const setStatus = (id, status) => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
  const onDelete = (id) => {
    if (!confirm('Delete this message?')) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id && filtered.length > 1) setSelectedId(filtered[0]?.id);
  };

  const mailtoHref = selected
    ? `mailto:${selected.email}?subject=${encodeURIComponent('Re: ' + selected.subject)}`
    : '#';

  return (
    <>
      <div className={styles.banner}>
        <div className={styles.container}>
          <p>Inbox</p>
          <h1>Messages & Feedback</h1>
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.filters}>
              <input
                className={styles.search}
                type="text"
                placeholder="Search name, subject, or content..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All</option>
                <option>Unread</option>
                <option>Read</option>
                <option>Archived</option>
              </select>
              <select className={styles.select} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option>Newest</option>
                <option>Oldest</option>
                <option>Unread First</option>
              </select>
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.split}>
              <aside className={styles.listPane}>
                {filtered.length === 0 ? (
                  <div className={styles.empty}>No messages found.</div>
                ) : (
                  <ul className={styles.list}>
                    {filtered.map((m) => (
                      <li
                        key={m.id}
                        className={`${styles.item} ${m.status === 'Unread' ? styles.unread : ''} ${
                          selected?.id === m.id ? styles.selected : ''
                        }`}
                        onClick={() => setSelectedId(m.id)}
                      >
                        <div className={styles.itemHeader}>
                          <span className={styles.sender}>{m.name}</span>
                          <span className={styles.date}>{new Date(m.createdAt).toLocaleString()}</span>
                        </div>
                        <div className={styles.subject}>{m.subject}</div>
                        <div className={styles.snippet}>{m.body}</div>
                        <div className={styles.metaRow}>
                          <span className={`${styles.badge} ${m.source === 'Service Feedback' ? styles.badgePink : styles.badgeBlue}`}>
                            {m.source}
                          </span>
                          {m.status !== 'Archived' && m.status !== 'Unread' && (
                            <span className={`${styles.badge} ${styles.badgeGray}`}>Read</span>
                          )}
                          {m.status === 'Unread' && <span className={styles.unreadDot} />}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              <section className={styles.detailPane}>
                {!selected ? (
                  <div className={styles.empty}>Select a message to view</div>
                ) : (
                  <div className={styles.detailCard}>
                    <div className={styles.detailHeader}>
                      <h2>{selected.subject}</h2>
                      <div className={styles.headerActions}>
                        {selected.status !== 'Unread' ? (
                          <button className={styles.btnGhost} onClick={() => setStatus(selected.id, 'Unread')}>
                            Mark Unread
                          </button>
                        ) : (
                          <button className={styles.btnGhost} onClick={() => setStatus(selected.id, 'Read')}>
                            Mark Read
                          </button>
                        )}
                        {selected.status !== 'Archived' && (
                          <button className={styles.btnSecondary} onClick={() => setStatus(selected.id, 'Archived')}>
                            Archive
                          </button>
                        )}
                        <a className={styles.btnPrimary} href={mailtoHref}>
                          Reply
                        </a>
                        <button className={`${styles.btnDanger}`} onClick={() => onDelete(selected.id)}>
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className={styles.detailMeta}>
                      <div>
                        <div className={styles.metaLabel}>From</div>
                        <div className={styles.metaValue}>
                          {selected.name} • {selected.email}
                        </div>
                      </div>
                      <div>
                        <div className={styles.metaLabel}>Received</div>
                        <div className={styles.metaValue}>{new Date(selected.createdAt).toLocaleString()}</div>
                      </div>
                      {selected.serviceName && (
                        <div>
                          <div className={styles.metaLabel}>Service</div>
                          <div className={styles.metaValue}>{selected.serviceName}</div>
                        </div>
                      )}
                      {selected.rating != null && (
                        <div>
                          <div className={styles.metaLabel}>Rating</div>
                          <div className={styles.stars} aria-label={`Rating: ${selected.rating} out of 5`}>
                            {Array.from({ length: 5 }, (_, i) => (
                              <span key={i} className={i < selected.rating ? styles.starFilled : styles.starEmpty}>★</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={styles.detailBody}>
                      <p>{selected.body}</p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

