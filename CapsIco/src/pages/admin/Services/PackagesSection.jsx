import React from 'react';
import styles from './PackagesPage.module.css';

export default function PackagesSection({
  // tabs/header
  activeTab,
  onTabChange,
  editingId,
  onHeaderAddPackage,
  // form
  form,
  onChange,
  onToggleRegular,
  onReset,
  onSubmit,
  onAdd,
  REGULAR_SCHEDULE,
  // list/table
  searchValue,
  onSearchChange,
  filteredServices,
  onEdit,
  onDelete,
}) {
  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'single' ? styles.active : ''}`}
              onClick={() => onTabChange('single')}
            >
              Single Service
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'bundle' ? styles.active : ''}`}
              onClick={() => onTabChange('bundle')}
            >
              Packages
            </button>
          </div>
          <div className={styles.headerActions}>
            {editingId && (
              <span className={styles.editingBadge}>Editing #{editingId}</span>
            )}
            <button type="button" className={styles.btnPrimary} onClick={onHeaderAddPackage}>
              Add Package
            </button>
          </div>
        </div>

        <div className={styles.cardBody}>
          <form onSubmit={onSubmit}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Name of Service</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder={'e.g., Wellness Package A'}
                  value={form.name}
                  onChange={onChange}
                  required
                />
              </div>
            </div>

            {/* Bundle-only fields */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="servicePackageId">Service Package ID</label>
                <input
                  type="text"
                  id="servicePackageId"
                  name="servicePackageId"
                  placeholder="Auto-generated if left blank"
                  value={form.servicePackageId}
                  onChange={onChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="isActive">Active (Yes/No)</label>
                <select id="isActive" name="isActive" value={form.isActive} onChange={onChange}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="bookingEnabled">Booking Enabled (Yes/No)</label>
                <select id="bookingEnabled" name="bookingEnabled" value={form.bookingEnabled} onChange={onChange}>
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
                  onChange={onChange}
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
                  onChange={onChange}
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
                  onChange={onChange}
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
                  onChange={onChange}
                  disabled={form.useRegularSchedule}
                />
                <div className={styles.inlineControl}>
                  <input
                    type="checkbox"
                    id="useRegularSchedule"
                    name="useRegularSchedule"
                    checked={form.useRegularSchedule}
                    onChange={onToggleRegular}
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
                  onChange={onChange}
                />
              </div>
              <div className={styles.formGroupFull}>
                <label htmlFor="priceNote">Price Note (if no price)</label>
                <textarea
                  id="priceNote"
                  name="priceNote"
                  rows="3"
                  placeholder="Explain if pricing is not set"
                  value={form.priceNote}
                  onChange={onChange}
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
                  onChange={onChange}
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
                  onChange={onChange}
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
                  onChange={onChange}
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

            <div className={styles.formActions}>
              <button type="button" className={styles.btnSecondary} onClick={onReset}>
                Reset
              </button>
              <button type="submit" className={styles.btnPrimary}>
                {editingId ? 'Update' : 'Save'}
              </button>
              <button type="button" className={styles.btnSecondary} onClick={onAdd}>
                Add Package
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Packages</h2>
          <div className={styles.searchWrap}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={'Search packages…'}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Booking Enabled</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.empty}>No items found.</td>
                  </tr>
                ) : (
                  filteredServices.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {s.name}
                        {s.type === 'bundle' && s.servicePackageId ? (
                          <div className={styles.helpText}>ID: {s.servicePackageId}</div>
                        ) : null}
                      </td>
                      <td>{s.bookingEnabled || 'Yes'}</td>
                      <td>₱{Number(s.price).toLocaleString()}</td>
                      <td>
                        <span
                          className={`${styles.status} ${(s.isActive === 'Yes') ? styles.activeStatus : styles.inactiveStatus}`}
                        >
                          {s.isActive === 'Yes' ? 'Active' : 'Inactive'}
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
    </>
  );
}
