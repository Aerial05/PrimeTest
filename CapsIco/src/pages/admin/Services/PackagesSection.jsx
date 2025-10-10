import React from 'react';
import AvailabilityBuilder from './AvailabilityBuilder.jsx';
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
  filters,
  onFiltersChange,
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
          <form onSubmit={onSubmit} className={styles.formGrid}>
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
                  placeholder="e.g., Daily 07:00-16:00; Sun 07:30-11:30"
                  value={form.availability}
                  onChange={onChange}
                  disabled={form.useRegularSchedule}
                />
                <small className={styles.helpText}>Format: "Daily 07:00-16:00" or "Mon-Fri 07:00-16:00; Sun 07:30-11:30"</small>
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
                {!form.useRegularSchedule && (
                  <AvailabilityBuilder
                    value={form.availability}
                    onChange={(v) => onChange({ target: { name: 'availability', value: v } })}
                    disabled={!!form.useRegularSchedule}
                  />
                )}
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
              <div className={styles.formGroup}>
                <label htmlFor="slot">Slots (capacity per schedule)</label>
                <input
                  type="number"
                  min="0"
                  id="slot"
                  name="slot"
                  value={form.slot}
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
                />
                <small className={styles.helpText}>At least one of Price Note, Original, Discounted, or PhilHealth Promo is required.</small>
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
                />
                <small className={styles.helpText}>At least one of Price Note, Original, Discounted, or PhilHealth Promo is required.</small>
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
                />
                <small className={styles.helpText}>At least one of Price Note, Original, Discounted, or PhilHealth Promo is required.</small>
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
          <div className={styles.filterBar}>
            <select
              className={styles.filterInput}
              value={filters?.enabled || ''}
              onChange={(e)=> onFiltersChange?.setEnabled && onFiltersChange.setEnabled(e.target.value)}
              title="Booking Enabled"
            >
              <option value="">All Enabled</option>
              <option value="Yes">Enabled</option>
              <option value="No">Disabled</option>
            </select>
            <select
              className={styles.filterInput}
              value={filters?.status || ''}
              onChange={(e)=> onFiltersChange?.setStatus && onFiltersChange.setStatus(e.target.value)}
              title="Status"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <input
              type="number"
              className={styles.filterInput}
              placeholder="Min slots"
              value={filters?.slotsMin || ''}
              onChange={(e)=> onFiltersChange?.setSlotsMin && onFiltersChange.setSlotsMin(e.target.value)}
              min="0"
            />
            <input
              type="number"
              className={styles.filterInput}
              placeholder="Max slots"
              value={filters?.slotsMax || ''}
              onChange={(e)=> onFiltersChange?.setSlotsMax && onFiltersChange.setSlotsMax(e.target.value)}
              min="0"
            />
            <input
              type="number"
              className={styles.filterInput}
              placeholder="Min price"
              value={filters?.priceMin || ''}
              onChange={(e)=> onFiltersChange?.setPriceMin && onFiltersChange.setPriceMin(e.target.value)}
              min="0" step="0.01"
            />
            <input
              type="number"
              className={styles.filterInput}
              placeholder="Max price"
              value={filters?.priceMax || ''}
              onChange={(e)=> onFiltersChange?.setPriceMax && onFiltersChange.setPriceMax(e.target.value)}
              min="0" step="0.01"
            />
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Booking Enabled</th>
                  <th>Slots</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.empty}>No items found.</td>
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
                      <td>{(s.slot !== undefined && s.slot !== '') ? s.slot : '—'}</td>
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
