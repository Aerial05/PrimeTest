import React from 'react';
import styles from './PackagesPage.module.css';

export default function SingleServicesSection({
  // tabs/header
  activeTab,
  onTabChange,
  editingId,
  onHeaderAddSingle,
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
            <button type="button" className={styles.btnPrimary} onClick={onHeaderAddSingle}>
              Add Service
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
                  placeholder={'e.g., CBC Test'}
                  value={form.name}
                  onChange={onChange}
                  required
                />
              </div>
            </div>

            {/* Single-only fields */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="serviceId">Service ID</label>
                <input
                  type="text"
                  id="serviceId"
                  name="serviceId"
                  placeholder="Auto-generated if left blank"
                  value={form.serviceId}
                  onChange={onChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="singleIsActive">Active (Yes/No)</label>
                <select id="singleIsActive" name="singleIsActive" value={form.singleIsActive} onChange={onChange}>
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
                <label htmlFor="specialInstructions">Special Instructions</label>
                <textarea
                  id="specialInstructions"
                  name="specialInstructions"
                  rows="3"
                  placeholder="e.g., Fasting 8 hours"
                  value={form.specialInstructions}
                  onChange={onChange}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="singleAvailability">Availability</label>
                <input
                  type="text"
                  id="singleAvailability"
                  name="singleAvailability"
                  placeholder="e.g., Daily 09:00–16:00"
                  value={form.singleAvailability}
                  onChange={onChange}
                  disabled={form.singleUseRegular}
                />
                <div className={styles.inlineControl}>
                  <input
                    type="checkbox"
                    id="singleUseRegular"
                    name="singleUseRegular"
                    checked={form.singleUseRegular}
                    onChange={onToggleRegular}
                  />
                  <label htmlFor="singleUseRegular">{REGULAR_SCHEDULE}</label>
                  {form.singleUseRegular && (
                    <span className={styles.badge}>Regular</span>
                  )}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="singleDurMinute">Duration (minutes)</label>
                <input
                  type="number"
                  min="0"
                  id="singleDurMinute"
                  name="singleDurMinute"
                  value={form.singleDurMinute}
                  onChange={onChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="singleSlot">Slots (capacity per schedule)</label>
                <input
                  type="number"
                  min="0"
                  id="singleSlot"
                  name="singleSlot"
                  value={form.singleSlot}
                  onChange={onChange}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroupFull}>
                <label htmlFor="singlePriceNote">Price Note (if no price)</label>
                <textarea
                  id="singlePriceNote"
                  name="singlePriceNote"
                  rows="3"
                  placeholder="Explain if pricing is not set"
                  value={form.singlePriceNote}
                  onChange={onChange}
                />
                <small className={styles.helpText}>If you provide a Price Note, the three prices below become optional. Otherwise, all three are required.</small>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="singleOriginalPrice">Original Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  id="singleOriginalPrice"
                  name="singleOriginalPrice"
                  value={form.singleOriginalPrice}
                  onChange={onChange}
                  required={!(form.singlePriceNote || '').trim().length}
                />
                <small className={styles.helpText}>Required unless a Price Note is provided.</small>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="singleDiscountedPrice">Discounted Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  id="singleDiscountedPrice"
                  name="singleDiscountedPrice"
                  value={form.singleDiscountedPrice}
                  onChange={onChange}
                  required={!(form.singlePriceNote || '').trim().length}
                />
                <small className={styles.helpText}>Required unless a Price Note is provided.</small>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="singlePhilHealthPromoPrice">PhilHealth Promo Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  id="singlePhilHealthPromoPrice"
                  name="singlePhilHealthPromoPrice"
                  value={form.singlePhilHealthPromoPrice}
                  onChange={onChange}
                  required={!(form.singlePriceNote || '').trim().length}
                />
                <small className={styles.helpText}>Required unless a Price Note is provided.</small>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Created At</label>
                <input type="text" readOnly value={form.singleCreatedAt || '—'} />
              </div>
              <div className={styles.formGroup}>
                <label>Updated At</label>
                <input type="text" readOnly value={form.singleUpdatedAt || '—'} />
              </div>
              <div className={styles.formGroup}>
                <label>Archived At</label>
                <input type="text" readOnly value={form.singleArchivedAt || '—'} />
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
                Add Service
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Single Services</h2>
          <div className={styles.searchWrap}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={'Search services…'}
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
                  <th>Slots</th>
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
                        {s.type === 'single' && s.serviceId ? (
                          <div className={styles.helpText}>ID: {s.serviceId}</div>
                        ) : null}
                      </td>
                      <td>{(s.singleSlot !== undefined && s.singleSlot !== '') ? s.singleSlot : '—'}</td>
                      <td>₱{Number(s.price).toLocaleString()}</td>
                      <td>
                        <span
                          className={`${styles.status} ${s.status === 'Active' ? styles.activeStatus : styles.inactiveStatus}`}
                        >
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
    </>
  );
}
