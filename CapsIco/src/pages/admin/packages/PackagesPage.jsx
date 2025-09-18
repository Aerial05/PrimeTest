import React, { useEffect, useMemo, useState } from 'react';
import styles from './PackagesPage.module.css';
import servicePackagesService from '/src/services/ServicePackagesService';
import { useToast } from '/src/components/shared/toast/ToastProvider.jsx';

export function PackagesPage() {
  const REGULAR_SCHEDULE = 'Regular Schedule : Mon-Sat 7:00 AM - 4:00 PM (3:30 PM cutoff). Sunday 7:30 AM - 11:30 AM.';
  const { show } = useToast();
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bundle'
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  // removed: includedInput (features now a textarea)

  const [form, setForm] = useState({
    type: 'single',
    // shared/basic
    name: '',
    price: '',
    category: '',
    durationMinutes: '',
    status: 'Active',
    description: '',
    // single only
    preparation: '',
    // bundle only (Service Packages spec)
    servicePackageId: '',
    features: '',
    specialInstruction: '',
    availability: '',
  useRegularSchedule: false,
    durMinute: '',
    priceNote: '',
    bookingEnabled: 'Yes',
    originalPrice: '',
    discountedPrice: '',
    philHealthPromoPrice: '',
    isActive: 'Yes',
    createdAt: '',
    updatedAt: '',
    archivedAt: '',
  });

  const resetForm = () => {
    setForm({
      type: activeTab,
      name: '',
      price: '',
      category: '',
      durationMinutes: '',
      status: 'Active',
      description: '',
      preparation: '',
      servicePackageId: '',
      features: '',
      specialInstruction: '',
      availability: '',
  useRegularSchedule: false,
      durMinute: '',
      priceNote: '',
      bookingEnabled: 'Yes',
      originalPrice: '',
      discountedPrice: '',
      philHealthPromoPrice: '',
      isActive: 'Yes',
      createdAt: '',
      updatedAt: '',
      archivedAt: '',
    });
    setEditingId(null);
  };

  // Compute Availability value respecting Regular Schedule toggle
  const getAvailabilityValue = () => (form.useRegularSchedule ? REGULAR_SCHEDULE : (form.availability || ''));

  // Validate required fields for creating a package
  const collectMissingFieldsForCreate = () => {
    const missing = [];
    if (!(form.name || '').trim()) missing.push('Name of Service');
    if (!(form.description || '').trim()) missing.push('Description');
    if (!getAvailabilityValue().trim()) missing.push('Availability');
    return missing;
  };

  // Generate next Service Package ID in the format SP-<number>
  const generateNextServicePackageId = () => {
    const bundles = services.filter((s) => s.type === 'bundle');
    let maxNum = 0;
    for (const b of bundles) {
      const id = (b.servicePackageId || '').toString().trim();
      const m = id.match(/^SP-(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
      }
    }
    return `SP-${maxNum + 1}`;
  };

  // Helper: check duplicates among existing bundles (case-insensitive, trimmed)
  const findDuplicateIssues = (name, servicePackageId) => {
    const norm = (v) => (v || '').toString().trim().toLowerCase();
    const bundles = services.filter((s) => s.type === 'bundle');
    const issues = [];
    if (name && bundles.some((b) => norm(b.name) === norm(name))) {
      issues.push('Name already exists');
    }
    if (servicePackageId && bundles.some((b) => norm(b.servicePackageId) === norm(servicePackageId))) {
      issues.push('Service Package ID already exists');
    }
    return issues;
  };

  // Load packages from Firebase on mount and map to UI shape
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await servicePackagesService.list();
        if (cancelled) return;
        const mapped = list.map((item) => {
          const db = item; // item has id and db fields flattened by fromDbRecord
          const originalPrice = db.ORIGINAL_PRICE ?? db.ORIGINAL_RPICE;
          const priceNote = db.PRICE_NOTE ?? db['PRICE_NOTE (If no price)'];
          const price = db.DISCOUNTED_PRICE ?? originalPrice ?? db.PHIL_HEALTH_PROMO_PRICE ?? 0;
          return {
            id: db.SERVICE_PACKGE_ID || item.id,
            dbId: item.id,
            type: 'bundle',
            name: db.NAME || '',
            description: db.DESC || '',
            features: db.FEATURES || '',
            specialInstruction: db.SPECIAL_INSTRUCTION || '',
            availability: db.AVAILABILITY || '',
            durMinute: db.DUR_MINUTE ?? 0,
            priceNote: priceNote || '',
            bookingEnabled: db.BOOKING_ENABLED_YesNo || 'Yes',
            originalPrice: originalPrice,
            discountedPrice: db.DISCOUNTED_PRICE,
            philHealthPromoPrice: db.PHIL_HEALTH_PROMO_PRICE,
            isActive: db.IS_ACTIVE_YesNo || 'Yes',
            createdAt: db.CREATED_AT || '',
            updatedAt: db.UPDATED_AT || '',
            archivedAt: db.ARCHIVED_AT || '',
            servicePackageId: db.SERVICE_PACKGE_ID || '',
            // table display helpers
            price: Number(price) || 0,
            status: (db.IS_ACTIVE_YesNo === 'Yes' ? 'Active' : 'Inactive'),
          };
        });
        // Keep room for single services in future; currently we only load bundles from DB
        setServices((prev) => {
          const singles = prev.filter((s) => s.type === 'single');
          return [...singles, ...mapped];
        });
      } catch (_) {
        // fail silently for now; could add toast
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Switch form type but keep shared fields where reasonable
    setForm((prev) => ({
      ...prev,
      type: tab,
      preparation: tab === 'single' ? prev.preparation : '',
      features: tab === 'bundle' ? prev.features : '',
    }));
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseRegularSchedule = (e) => {
    const checked = e.target.checked;
    setForm((prev) => ({
      ...prev,
      useRegularSchedule: checked,
      availability: checked ? REGULAR_SCHEDULE : '',
    }));
  };
  

  const handleSubmit = (e) => {
    e.preventDefault();
    const nowIso = new Date().toISOString();
    const isBundle = form.type === 'bundle';
    const idValue = editingId ?? Date.now();

    if (isBundle) {
      const hasNote = (form.priceNote || '').trim().length > 0;
      const hasOriginal = form.originalPrice !== '' && Number(form.originalPrice) > 0;
      const hasDiscounted = form.discountedPrice !== '' && Number(form.discountedPrice) > 0;
      const hasPhilHealth = form.philHealthPromoPrice !== '' && Number(form.philHealthPromoPrice) > 0;

      if (!hasNote && !(hasOriginal && hasDiscounted && hasPhilHealth)) {
        alert('Please provide Original, Discounted, and PhilHealth Promo prices or add a Price Note.');
        return;
      }
    }

    const payload = {
      id: idValue,
      type: form.type,
      name: form.name,
      // For table display fallback
      price: isBundle
        ? (form.discountedPrice !== '' && Number(form.discountedPrice) > 0
            ? Number(form.discountedPrice)
            : form.originalPrice !== '' && Number(form.originalPrice) > 0
              ? Number(form.originalPrice)
              : form.philHealthPromoPrice !== '' && Number(form.philHealthPromoPrice) > 0
                ? Number(form.philHealthPromoPrice)
                : 0)
        : Number(form.price) || 0,
      status: form.status,
      category: form.category,
      durationMinutes: form.durationMinutes,
      description: form.description,
      // single only
      preparation: form.type === 'single' ? form.preparation : undefined,
      // bundle only — Service Packages fields
      servicePackageId: isBundle ? (form.servicePackageId || `PKG-${idValue}`) : undefined,
      features: isBundle ? form.features : undefined,
      specialInstruction: isBundle ? form.specialInstruction : undefined,
  availability: isBundle ? (form.useRegularSchedule ? REGULAR_SCHEDULE : form.availability) : undefined,
      durMinute: isBundle ? Number(form.durMinute || 0) : undefined,
      priceNote: isBundle ? form.priceNote : undefined,
      bookingEnabled: isBundle ? form.bookingEnabled : undefined, // 'Yes' | 'No'
  originalPrice: isBundle ? (form.originalPrice !== '' ? Number(form.originalPrice) : undefined) : undefined,
  discountedPrice: isBundle ? (form.discountedPrice !== '' ? Number(form.discountedPrice) : undefined) : undefined,
  philHealthPromoPrice: isBundle ? (form.philHealthPromoPrice !== '' ? Number(form.philHealthPromoPrice) : undefined) : undefined,
      isActive: isBundle ? form.isActive : undefined,
      createdAt: isBundle ? (form.createdAt || nowIso) : undefined,
      updatedAt: isBundle ? nowIso : undefined,
      archivedAt: isBundle ? (form.isActive === 'No' ? (form.archivedAt || nowIso) : '') : undefined,
    };

    if (isBundle) {
      // Persist to Firebase with exact field names through the service
      const updating = services.find((s) => s.id === payload.id);
      const uiForDb = {
        servicePackageId: payload.servicePackageId,
        name: payload.name,
        description: payload.description,
        features: payload.features,
        specialInstruction: payload.specialInstruction,
        availability: payload.availability,
        durMinute: payload.durMinute,
        priceNote: payload.priceNote,
        bookingEnabled: payload.bookingEnabled,
        originalPrice: payload.originalPrice,
        discountedPrice: payload.discountedPrice,
        philHealthPromoPrice: payload.philHealthPromoPrice,
        isActive: payload.isActive,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        archivedAt: payload.archivedAt,
      };

      if (updating?.dbId) {
        servicePackagesService
          .update(updating.dbId, uiForDb)
          .then(() => {
            setServices((prev) => prev.map((s) => (s.id === payload.id ? { ...s, ...payload } : s)));
            // Keep the form populated on update; just refresh the updatedAt value
            setForm((prev) => ({ ...prev, updatedAt: nowIso }));
            show({ type: 'success', title: 'Changes saved', message: 'Package updated successfully.' });
          });
        // Note: do NOT reset form after update to keep information visible
      } else {
        // Create: check uniqueness of Name and (if provided) Service Package ID
        const dupIssues = findDuplicateIssues(payload.name, payload.servicePackageId);
        if (dupIssues.length) {
          show({ type: 'error', title: 'Cannot add package', message: dupIssues.join('; ') });
          return;
        }
        servicePackagesService
          .create(uiForDb)
          .then((dbId) => {
            setServices((prev) => [{ ...payload, dbId }, ...prev]);
            show({ type: 'success', title: 'Saved', message: 'Package created successfully.' });
          })
          .finally(resetForm);
      }
    } else {
      setServices((prev) => {
        const exists = prev.some((s) => s.id === payload.id);
        if (exists) {
          return prev.map((s) => (s.id === payload.id ? { ...s, ...payload } : s));
        }
        return [payload, ...prev];
      });
      // Optional: show toast for single services as well
      show({ type: 'success', title: editingId ? 'Changes saved' : 'Saved', message: editingId ? 'Service updated successfully.' : 'Service created successfully.' });
      resetForm();
    }
  };

  const handleAddPackage = (e) => {
    e.preventDefault();
    if (activeTab !== 'bundle') return;
    const nowIso = new Date().toISOString();

    // Validate required fields for create
    const missing = collectMissingFieldsForCreate();
    if (missing.length) {
      show({ type: 'error', title: 'Missing required fields', message: `Please provide: ${missing.join(', ')}` });
      return;
    }

    // Validation for bundle
    const hasNote = (form.priceNote || '').trim().length > 0;
    const hasOriginal = form.originalPrice !== '' && Number(form.originalPrice) > 0;
    const hasDiscounted = form.discountedPrice !== '' && Number(form.discountedPrice) > 0;
    const hasPhilHealth = form.philHealthPromoPrice !== '' && Number(form.philHealthPromoPrice) > 0;
    if (!hasNote && !(hasOriginal && hasDiscounted && hasPhilHealth)) {
      alert('Please provide Original, Discounted, and PhilHealth Promo prices or add a Price Note.');
      return;
    }

    const idValue = Date.now();
    const generatedId = (form.servicePackageId && form.servicePackageId.trim()) ? form.servicePackageId.trim() : generateNextServicePackageId();
    const payload = {
      id: idValue,
      type: 'bundle',
      name: form.name,
      price:
        form.discountedPrice !== '' && Number(form.discountedPrice) > 0
          ? Number(form.discountedPrice)
          : form.originalPrice !== '' && Number(form.originalPrice) > 0
            ? Number(form.originalPrice)
            : form.philHealthPromoPrice !== '' && Number(form.philHealthPromoPrice) > 0
              ? Number(form.philHealthPromoPrice)
              : 0,
      status: form.status,
      category: form.category,
      durationMinutes: form.durationMinutes,
      description: form.description,
      servicePackageId: generatedId,
      features: form.features,
      specialInstruction: form.specialInstruction,
      availability: getAvailabilityValue(),
      durMinute: Number(form.durMinute || 0),
      priceNote: form.priceNote,
      bookingEnabled: form.bookingEnabled,
      originalPrice: form.originalPrice !== '' ? Number(form.originalPrice) : undefined,
      discountedPrice: form.discountedPrice !== '' ? Number(form.discountedPrice) : undefined,
      philHealthPromoPrice: form.philHealthPromoPrice !== '' ? Number(form.philHealthPromoPrice) : undefined,
      isActive: form.isActive,
      createdAt: form.createdAt || nowIso,
      updatedAt: nowIso,
      archivedAt: form.isActive === 'No' ? (form.archivedAt || nowIso) : '',
    };

    // Create: check uniqueness of Name and (if provided) Service Package ID
    const dupIssues = findDuplicateIssues(payload.name, payload.servicePackageId);
    if (dupIssues.length) {
      show({ type: 'error', title: 'Cannot add package', message: dupIssues.join('; ') });
      return;
    }

    const uiForDb = {
      servicePackageId: payload.servicePackageId,
      name: payload.name,
      description: payload.description,
      features: payload.features,
      specialInstruction: payload.specialInstruction,
      availability: payload.availability,
      durMinute: payload.durMinute,
      priceNote: payload.priceNote,
      bookingEnabled: payload.bookingEnabled,
      originalPrice: payload.originalPrice,
      discountedPrice: payload.discountedPrice,
      philHealthPromoPrice: payload.philHealthPromoPrice,
      isActive: payload.isActive,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      archivedAt: payload.archivedAt,
    };

    servicePackagesService
      .create(uiForDb)
      .then((dbId) => {
        setServices((prev) => [{ ...payload, dbId }, ...prev]);
        show({ type: 'success', title: 'Saved', message: 'Package created successfully.' });
      })
      .finally(() => {
        resetForm();
        setActiveTab('bundle');
      });
  };

  const onEdit = (svc) => {
    setActiveTab(svc.type);
    setEditingId(svc.id);
    setForm({
      type: svc.type,
      name: svc.name || '',
      price: svc.price?.toString?.() || '',
      category: svc.category || '',
      durationMinutes: svc.durationMinutes || '',
      status: svc.status || 'Active',
      description: svc.description || '',
      preparation: svc.preparation || '',
      // bundle-only mapped fields
      servicePackageId: svc.servicePackageId || '',
      features: svc.features || (Array.isArray(svc.included) ? svc.included.join(', ') : ''),
      specialInstruction: svc.specialInstruction || '',
  availability: svc.availability || '',
  useRegularSchedule: svc.availability === REGULAR_SCHEDULE,
      durMinute: svc.durMinute?.toString?.() || '',
      priceNote: svc.priceNote || '',
      bookingEnabled: svc.bookingEnabled || 'Yes',
      originalPrice: svc.originalPrice?.toString?.() || '',
      discountedPrice: svc.discountedPrice?.toString?.() || '',
      philHealthPromoPrice: svc.philHealthPromoPrice?.toString?.() || '',
      isActive: svc.isActive || 'Yes',
      createdAt: svc.createdAt || '',
      updatedAt: svc.updatedAt || '',
      archivedAt: svc.archivedAt || '',
    });
  };

  const onDelete = (id) => {
    const target = services.find((s) => s.id === id);
    const msg = 'Are you sure you want to delete this item? It will be archived to "package_archives" and removed from the active list.';
    if (!confirm(msg)) return;
    if (target && target.type === 'bundle' && target.dbId) {
      // Archive remotely, then remove locally
      servicePackagesService
        .archive(target.dbId)
        .catch(() => {})
        .finally(() => {
          setServices((prev) => prev.filter((s) => s.id !== id));
        });
    } else {
      // Single services are local-only for now
      setServices((prev) => prev.filter((s) => s.id !== id));
    }
    if (editingId === id) resetForm();
  };

  const filteredServices = useMemo(
    () => services.filter((s) => s.type === activeTab),
    [services, activeTab]
  );

  return (
    <>
      <div className={styles.banner}>
        <div className={styles.container}>
          <p>Admin</p>
          <h1>Service Management Page</h1>
          <p className={styles.subtitle}>Create, edit, and manage your services and packages</p>
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'single' ? styles.active : ''}`}
                onClick={() => handleTabChange('single')}
              >
                Single Service
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'bundle' ? styles.active : ''}`}
                onClick={() => handleTabChange('bundle')}
              >
                Packages
              </button>
            </div>
            <div className={styles.headerActions}>
              {editingId && (
                <span className={styles.editingBadge}>Editing #{editingId}</span>
              )}
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  // Switch to Packages tab and prep a fresh form
                  setActiveTab('bundle');
                  setEditingId(null);
                  setForm({
                    type: 'bundle',
                    name: '',
                    price: '',
                    category: '',
                    durationMinutes: '',
                    status: 'Active',
                    description: '',
                    preparation: '',
                    servicePackageId: '',
                    features: '',
                    specialInstruction: '',
                    availability: '',
                    useRegularSchedule: false,
                    durMinute: '',
                    priceNote: '',
                    bookingEnabled: 'Yes',
                    originalPrice: '',
                    discountedPrice: '',
                    philHealthPromoPrice: '',
                    isActive: 'Yes',
                    createdAt: '',
                    updatedAt: '',
                    archivedAt: '',
                  });
                }}
              >
                Add Package
              </button>
            </div>
          </div>

          <div className={styles.cardBody}>
            <form onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">Name of Service</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder={activeTab === 'single' ? 'e.g., CBC Test' : 'e.g., Wellness Package A'}
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                {activeTab === 'single' && (
                  <div className={styles.formGroup}>
                    <label htmlFor="price">Pricing (₱)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      id="price"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      required
                    />
                    <small className={styles.helpText}>Set a single price for this service.</small>
                  </div>
                )}
              </div>

              {activeTab === 'single' && (
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="category">Category</label>
                    <select id="category" name="category" value={form.category} onChange={handleChange}>
                      <option value="">Select Category</option>
                      <option value="Laboratory">Laboratory</option>
                      <option value="Radiology">Radiology</option>
                      <option value="Wellness">Wellness</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="durationMinutes">Duration (minutes)</label>
                    <input
                      type="number"
                      min="0"
                      id="durationMinutes"
                      name="durationMinutes"
                      value={form.durationMinutes}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="status">Status</label>
                    <select id="status" name="status" value={form.status} onChange={handleChange}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'single' && (
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="preparation">Preparation Instructions</label>
                    <input
                      type="text"
                      id="preparation"
                      name="preparation"
                      placeholder="e.g., Fasting for 8 hours"
                      value={form.preparation}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'bundle' && (
                <>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="servicePackageId">Service Package ID</label>
                      <input
                        type="text"
                        id="servicePackageId"
                        name="servicePackageId"
                        placeholder="Auto-generated if left blank"
                        value={form.servicePackageId}
                        onChange={handleChange}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="isActive">Active (Yes/No)</label>
                      <select id="isActive" name="isActive" value={form.isActive} onChange={handleChange}>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="bookingEnabled">Booking Enabled (Yes/No)</label>
                      <select id="bookingEnabled" name="bookingEnabled" value={form.bookingEnabled} onChange={handleChange}>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroupFull}>
                      <label htmlFor="description">Description</label>
                      <textarea
                        id="description"
                        name="description"
                        rows="3"
                        placeholder="Short description"
                        value={form.description}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroupFull}>
                      <label htmlFor="features">Features</label>
                      <textarea
                        id="features"
                        name="features"
                        rows="3"
                        placeholder="List the package features"
                        value={form.features}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroupFull}>
                      <label htmlFor="specialInstruction">Special Instruction</label>
                      <textarea
                        id="specialInstruction"
                        name="specialInstruction"
                        rows="3"
                        placeholder="e.g., Fasting 8 hours"
                        value={form.specialInstruction}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="availability">Availability</label>
                      <input
                        type="text"
                        id="availability"
                        name="availability"
                        placeholder="e.g., Daily 09:00–16:00"
                        value={form.availability}
                        onChange={handleChange}
                        disabled={form.useRegularSchedule}
                      />
                      <div className={styles.inlineControl}>
                        <input
                          type="checkbox"
                          id="useRegularSchedule"
                          name="useRegularSchedule"
                          checked={form.useRegularSchedule}
                          onChange={handleUseRegularSchedule}
                        />
                        <label htmlFor="useRegularSchedule">{REGULAR_SCHEDULE}</label>
                        {form.useRegularSchedule && (
                          <span className={styles.badge}>Regular</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="durMinute">Duration (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        id="durMinute"
                        name="durMinute"
                        value={form.durMinute}
                        onChange={handleChange}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="priceNote">Price Note (if no price)</label>
                      <input
                        type="text"
                        id="priceNote"
                        name="priceNote"
                        placeholder="Explain if pricing is not set"
                        value={form.priceNote}
                        onChange={handleChange}
                      />
                      <small className={styles.helpText}>If you provide a Price Note, the three prices below become optional. Otherwise, all three are required.</small>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="originalPrice">Original Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        id="originalPrice"
                        name="originalPrice"
                        value={form.originalPrice}
                        onChange={handleChange}
                        required={!(form.priceNote || '').trim().length}
                      />
                      <small className={styles.helpText}>Required unless a Price Note is provided.</small>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="discountedPrice">Discounted Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        id="discountedPrice"
                        name="discountedPrice"
                        value={form.discountedPrice}
                        onChange={handleChange}
                        required={!(form.priceNote || '').trim().length}
                      />
                      <small className={styles.helpText}>Required unless a Price Note is provided.</small>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="philHealthPromoPrice">PhilHealth Promo Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        id="philHealthPromoPrice"
                        name="philHealthPromoPrice"
                        value={form.philHealthPromoPrice}
                        onChange={handleChange}
                        required={!(form.priceNote || '').trim().length}
                      />
                      <small className={styles.helpText}>Required unless a Price Note is provided.</small>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Created At</label>
                      <input type="text" readOnly value={form.createdAt || '—'} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Updated At</label>
                      <input type="text" readOnly value={form.updatedAt || '—'} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Archived At</label>
                      <input type="text" readOnly value={form.archivedAt || '—'} />
                    </div>
                  </div>
                </>
              )}

              {/* Removed Image URL and Tags per request */}

              {activeTab === 'single' && (
                <div className={styles.formRow}>
                  <div className={styles.formGroupFull}>
                    <label htmlFor="description">Additional Information</label>
                    <textarea
                      id="description"
                      name="description"
                      rows="4"
                      placeholder="Provide details or notes about the service"
                      value={form.description}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={resetForm}>
                  Reset
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  {editingId ? 'Update' : 'Save'}
                </button>
                {activeTab === 'bundle' && (
                  <button type="button" className={styles.btnSecondary} onClick={handleAddPackage}>
                    Add Package
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>{activeTab === 'single' ? 'Single Services' : 'Packages'}</h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    {activeTab === 'bundle' && <th>Booking Enabled</th>}
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan="4" className={styles.empty}>No items found.</td>
                    </tr>
                  ) : (
                    filteredServices.map((s) => (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        {activeTab === 'bundle' && (
                          <td>{s.bookingEnabled || 'Yes'}</td>
                        )}
                        <td>₱{Number(s.price).toLocaleString()}</td>
                        <td>
                          <span
                            className={`${styles.status} ${
                              (s.type === 'bundle'
                                ? s.isActive === 'Yes'
                                : s.status === 'Active')
                                ? styles.activeStatus
                                : styles.inactiveStatus
                            }`}
                          >
                            {s.type === 'bundle' ? (s.isActive === 'Yes' ? 'Active' : 'Inactive') : s.status}
                          </span>
                        </td>
                        <td>
                          <button className={styles.tableBtn} onClick={() => onEdit(s)}>Edit</button>
                          <button className={`${styles.tableBtn} ${styles.danger}`} onClick={() => onDelete(s.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

