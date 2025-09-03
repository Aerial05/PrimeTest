import React, { useMemo, useState } from 'react';
import styles from './PackagesPage.module.css';

export function PackagesPage() {
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bundle'
  const [services, setServices] = useState([
    { id: 1, type: 'single', name: 'CBC Test', price: 350, status: 'Active' },
    { id: 2, type: 'bundle', name: 'Wellness Package A', price: 1500, status: 'Active' },
  ]);
  const [editingId, setEditingId] = useState(null);
  const [includedInput, setIncludedInput] = useState('');

  const [form, setForm] = useState({
    type: 'single',
    name: '',
    price: '',
    category: '',
    durationMinutes: '',
    status: 'Active',
    description: '',
    tags: '',
    imageUrl: '',
    preparation: '', // single only
    included: [],     // bundle only
    discountPercent: '', // bundle only
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
      tags: '',
      imageUrl: '',
      preparation: '',
      included: [],
      discountPercent: '',
    });
    setIncludedInput('');
    setEditingId(null);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Switch form type but keep shared fields where reasonable
    setForm((prev) => ({
      ...prev,
      type: tab,
      preparation: tab === 'single' ? prev.preparation : '',
      discountPercent: tab === 'bundle' ? prev.discountPercent : '',
      included: tab === 'bundle' ? prev.included : [],
    }));
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addIncluded = () => {
    const val = includedInput.trim();
    if (!val) return;
    setForm((prev) => ({ ...prev, included: [...prev.included, val] }));
    setIncludedInput('');
  };

  const removeIncluded = (idx) => {
    setForm((prev) => ({
      ...prev,
      included: prev.included.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      id: editingId ?? Date.now(),
      type: form.type,
      name: form.name,
      price: Number(form.price) || 0,
      status: form.status,
      category: form.category,
      durationMinutes: form.durationMinutes,
      description: form.description,
      tags: form.tags,
      imageUrl: form.imageUrl,
      preparation: form.type === 'single' ? form.preparation : undefined,
      included: form.type === 'bundle' ? form.included : undefined,
      discountPercent: form.type === 'bundle' ? form.discountPercent : undefined,
    };

    setServices((prev) => {
      const exists = prev.some((s) => s.id === payload.id);
      if (exists) {
        return prev.map((s) => (s.id === payload.id ? { ...s, ...payload } : s));
      }
      return [payload, ...prev];
    });
    resetForm();
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
      tags: svc.tags || '',
      imageUrl: svc.imageUrl || '',
      preparation: svc.preparation || '',
      included: svc.included || [],
      discountPercent: svc.discountPercent || '',
    });
  };

  const onDelete = (id) => {
    if (!confirm('Delete this service?')) return;
    setServices((prev) => prev.filter((s) => s.id !== id));
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
          <p>Catalog</p>
          <h1>Packages & Services</h1>
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
                Bundle Package
              </button>
            </div>
            <div className={styles.headerActions}>
              {editingId && (
                <span className={styles.editingBadge}>Editing #{editingId}</span>
              )}
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
                </div>
              </div>

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
                      <label>Included Services</label>
                      <div className={styles.includedInputRow}>
                        <input
                          type="text"
                          placeholder="Add a service (e.g., CBC Test)"
                          value={includedInput}
                          onChange={(e) => setIncludedInput(e.target.value)}
                        />
                        <button type="button" className={styles.btnAdd} onClick={addIncluded}>
                          Add
                        </button>
                      </div>
                      <div className={styles.chips}>
                        {form.included.map((item, idx) => (
                          <span key={`${item}-${idx}`} className={styles.chip}>
                            {item}
                            <button
                              type="button"
                              className={styles.chipRemove}
                              onClick={() => removeIncluded(idx)}
                              aria-label={`Remove ${item}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="discountPercent">Bundle Discount (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        id="discountPercent"
                        name="discountPercent"
                        value={form.discountPercent}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="imageUrl">Image URL</label>
                  <input
                    type="url"
                    id="imageUrl"
                    name="imageUrl"
                    placeholder="https://..."
                    value={form.imageUrl}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="tags">Tags (comma-separated)</label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    placeholder="e.g., blood, routine"
                    value={form.tags}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroupFull}>
                  <label htmlFor="description">Additional Information</label>
                  <textarea
                    id="description"
                    name="description"
                    rows="4"
                    placeholder="Provide details or notes about the service/package"
                    value={form.description}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={resetForm}>
                  Reset
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>{activeTab === 'single' ? 'Single Services' : 'Bundle Packages'}</h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
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
                        <td>₱{Number(s.price).toLocaleString()}</td>
                        <td>
                          <span className={`${styles.status} ${s.status === 'Active' ? styles.activeStatus : styles.inactiveStatus}`}>
                            {s.status}
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

