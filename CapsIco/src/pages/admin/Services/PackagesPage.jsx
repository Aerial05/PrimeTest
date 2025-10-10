import React, { useEffect, useMemo, useState } from 'react';
import styles from './PackagesPage.module.css';
import servicePackagesService from '/src/services/ServicePackagesService';
import singleServicesService from '/src/services/SingleServicesService';
import { useToast } from '/src/components/shared/toast/ToastProvider.jsx';
import SingleServicesSection from './SingleServicesSection.jsx';
import PackagesSection from './PackagesSection.jsx';

export function PackagesPage() {
	const REGULAR_SCHEDULE = 'Regular Schedule : Mon-Sat 7:00 AM - 4:00 PM (3:30 PM cutoff). Sunday 7:30 AM - 11:30 AM.';
	const { show } = useToast();
	const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bundle'
	const [services, setServices] = useState([]);
	const [editingId, setEditingId] = useState(null);
	const [editingDbId, setEditingDbId] = useState(null);
	const [searchSingle, setSearchSingle] = useState('');
	const [searchBundle, setSearchBundle] = useState('');
	const [lastSingleForm, setLastSingleForm] = useState(null);
	const [lastBundleForm, setLastBundleForm] = useState(null);
	// removed: includedInput (features now a textarea)

	// Pagination state — 5 items per page per tab
	const [pageSingle, setPageSingle] = useState(1);
	const [pageBundle, setPageBundle] = useState(1);

	// Filters: Singles
	const [singleStatus, setSingleStatus] = useState(''); // '', 'Active', 'Inactive'
	const [singleSlotsMin, setSingleSlotsMin] = useState('');
	const [singleSlotsMax, setSingleSlotsMax] = useState('');
	const [singlePriceMin, setSinglePriceMin] = useState('');
	const [singlePriceMax, setSinglePriceMax] = useState('');
	// Filters: Bundles
	const [bundleEnabled, setBundleEnabled] = useState(''); // '', 'Yes', 'No'
	const [bundleStatus, setBundleStatus] = useState(''); // '', 'Active', 'Inactive'
	const [bundleSlotsMin, setBundleSlotsMin] = useState('');
	const [bundleSlotsMax, setBundleSlotsMax] = useState('');
	const [bundlePriceMin, setBundlePriceMin] = useState('');
	const [bundlePriceMax, setBundlePriceMax] = useState('');

	const [form, setForm] = useState({
		type: 'single',
		// shared/basic
		name: '',
		description: '',
		// single only (new schema)
		serviceId: '',
		specialInstructions: '',
		singleAvailability: '',
		singleUseRegular: false,
		singleDurMinute: '',
		singleSlot: '',
		singlePriceNote: '',
		singleOriginalPrice: '',
		singleDiscountedPrice: '',
		singlePhilHealthPromoPrice: '',
		singleIsActive: 'Yes',
		singleCreatedAt: '',
		singleUpdatedAt: '',
		singleArchivedAt: '',
		// bundle only (Service Packages spec)
		servicePackageId: '',
		features: '',
		specialInstruction: '',
		availability: '',
		useRegularSchedule: false,
		slot: '',
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
			description: '',
			// singles
			serviceId: '',
			specialInstructions: '',
			singleAvailability: '',
			singleUseRegular: false,
			singleDurMinute: '',
			singleSlot: '',
			singlePriceNote: '',
			singleOriginalPrice: '',
			singleDiscountedPrice: '',
			singlePhilHealthPromoPrice: '',
			singleIsActive: 'Yes',
			singleCreatedAt: '',
			singleUpdatedAt: '',
			singleArchivedAt: '',
			servicePackageId: '',
			features: '',
			specialInstruction: '',
			availability: '',
			useRegularSchedule: false,
			slot: '',
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
		setEditingDbId(null);
	};

	// Compute Availability value respecting Regular Schedule toggle (bundles)
	const getAvailabilityValue = () => (form.useRegularSchedule ? REGULAR_SCHEDULE : (form.availability || ''));

	// Singles helpers
	const getSingleAvailabilityValue = () => (form.singleUseRegular ? REGULAR_SCHEDULE : (form.singleAvailability || ''));
	// Validate availability format: semicolon-separated segments like "Mon-Fri 07:00-16:00; Sun 07:30-11:30" or "Daily 07:00-16:00"
	const isValidAvailabilityFormat = (str) => {
		if (!str) return false;
		const segments = String(str).split(/;|\n/).map(s => s.trim()).filter(Boolean);
		if (segments.length === 0) return false;
		const day = '(Mon|Tue|Wed|Thu|Fri|Sat|Sun)';
		const time = '([01]\\d|2[0-3]):[0-5]\\d';
		const re = new RegExp(`^(?:Daily|${day}(?:-${day})?)\\s+${time}-${time}$`);
		for (const seg of segments) {
			const m = seg.match(re);
			if (!m) return false;
			// Extract times and ensure start < end
			const times = seg.match(new RegExp(time, 'g')) || [];
			if (times.length !== 2) return false;
			const [a,b] = times;
			const toMin = (t) => { const [h,mi] = t.split(':').map(Number); return h*60+mi; };
			if (toMin(a) >= toMin(b)) return false;
		}
		return true;
	};
	const collectMissingFieldsForSingle = () => {
		const miss = [];
		if (!(form.name || '').trim()) miss.push('Name of Service');
		if (!(form.description || '').trim()) miss.push('Description');
		const av = getSingleAvailabilityValue().trim();
		if (!av) miss.push('Availability');
		else if (!form.singleUseRegular && !isValidAvailabilityFormat(av)) miss.push('Availability format (e.g., Mon-Fri 07:00-16:00; Sun 07:30-11:30)');
		return miss;
	};
	const generateNextSingleServiceId = () => {
		const singles = services.filter((s) => s.type === 'single');
		let maxNum = 0;
		for (const b of singles) {
			const id = (b.serviceId || '').toString().trim();
			const m = id.match(/^SP-(\d+)$/i);
			if (m) {
				const n = parseInt(m[1], 10);
				if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
			}
		}
		return `SP-${maxNum + 1}`;
	};
	const findDuplicateSingleIssues = (name, serviceId, excludeDbId = null) => {
		const norm = (v) => (v || '').toString().trim().toLowerCase();
		const singles = services.filter((s) => s.type === 'single');
		const issues = [];
		if (name && singles.some((b) => (excludeDbId ? b.dbId !== excludeDbId : true) && norm(b.name) === norm(name))) issues.push('Name already exists');
		if (serviceId && singles.some((b) => (excludeDbId ? b.dbId !== excludeDbId : true) && norm(b.serviceId) === norm(serviceId))) issues.push('Service ID already exists');
		return issues;
	};

	// Validate required fields for creating a package
	const collectMissingFieldsForCreate = () => {
		const missing = [];
		if (!(form.name || '').trim()) missing.push('Name of Service');
		if (!(form.description || '').trim()) missing.push('Description');
		const av = getAvailabilityValue().trim();
		if (!av) missing.push('Availability');
		else if (!form.useRegularSchedule && !isValidAvailabilityFormat(av)) missing.push('Availability format (e.g., Mon-Fri 07:00-16:00; Sun 07:30-11:30)');
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
    
	// Check duplicates for bundles by Name and Service Package ID
	const findDuplicateIssues = (name, servicePackageId, excludeDbId = null) => {
		const norm = (v) => (v || '').toString().trim().toLowerCase();
		const bundles = services.filter((s) => s.type === 'bundle');
		const issues = [];
		if (name && bundles.some((b) => (excludeDbId ? b.dbId !== excludeDbId : true) && norm(b.name) === norm(name))) issues.push('Name already exists');
		if (servicePackageId && bundles.some((b) => (excludeDbId ? b.dbId !== excludeDbId : true) && norm(b.servicePackageId) === norm(servicePackageId))) issues.push('Service Package ID already exists');
		return issues;
	};

	// Load packages and single services from Firebase on mount and map to UI shape
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const [bundlesList, singlesList] = await Promise.all([
					servicePackagesService.list(),
					singleServicesService.list(),
				]);
				if (cancelled) return;
				const mapped = bundlesList.map((item) => {
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
						slot: db.SLOT ?? '',
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
				const singlesMapped = singlesList.map((item) => {
					const db = item;
					// Handle header/field variants from CSVs or legacy data
					const original = db.ORIGINAL_PRICE ?? db['ORIGINAL PRICE'];
					const discounted = db.DISCOUNTED_PRICE ?? db['DISCOUNTED PRICE'] ?? db.DICOUNTED_PRICE ?? db['DICOUNTED PRICE'];
					const phil = db.PHIL_HEALTH_PROMO_PRICE ?? db.PHILHEALTH_PROMO_PRICE ?? db['PHILHEALTH PROMO PRICE'];
					const priceNote = db.PRICE_NOTE ?? db['PRICE NOTE'] ?? db['PRICE_NOTE (If no price)'];
					const isActiveYesNo = db.IS_ACTIVE_YesNo ?? db['IS_ACTIVE(Yes/No)'];
					const serviceId = db.SERVICE_ID ?? db['Service_ID'] ?? db['SERVICE ID'] ?? '';
					const availability = db.AVAILABILITY ?? '';

					// Compute final price (priority: Discounted -> Original -> PhilHealth)
					const price = discounted ?? original ?? phil ?? 0;
					const useRegular = (availability === REGULAR_SCHEDULE) || (String(availability).toUpperCase() === 'REGULAR');

						return {
						id: serviceId || item.id,
						dbId: item.id,
						type: 'single',
						name: db.NAME || '',
						description: db.DESC || '',
						serviceId,
						specialInstructions: db.SPECIAL_INSTRUCTIONS || '',
						singleAvailability: availability,
						singleUseRegular: useRegular,
							singleSlot: db.SLOT ?? '',
						singleDurMinute: db.DUR_MINUTE ?? 0,
						singlePriceNote: priceNote || '',
						singleOriginalPrice: original,
						singleDiscountedPrice: discounted,
						singlePhilHealthPromoPrice: phil,
						singleIsActive: isActiveYesNo || 'Yes',
						singleCreatedAt: db.CREATED_AT || '',
						singleUpdatedAt: db.UPDATED_AT || '',
						singleArchivedAt: db.ARCHIVED_AT || '',
						// For table consistency
						price: Number(price) || 0,
						status: (isActiveYesNo || 'Yes') === 'Yes' ? 'Active' : 'Inactive',
					};
				});
				setServices([...singlesMapped, ...mapped]);
			} catch (_) {
				// fail silently for now; could add toast
			}
		})();
		return () => { cancelled = true; };
	}, []);

	const handleTabChange = (tab) => {
		// Save current form as draft for the current tab
		if (activeTab === 'single') {
			setLastSingleForm(form);
		} else if (activeTab === 'bundle') {
			setLastBundleForm(form);
		}
		setActiveTab(tab);
		// no pagination to reset
		// Restore draft for the target tab if available; otherwise keep current values
		setForm((prev) => {
			const draft = tab === 'single' ? (lastSingleForm || prev) : (lastBundleForm || prev);
			return { ...draft, type: tab };
		});
		setEditingId(null);
		setEditingDbId(null);
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
	const handleSingleUseRegularSchedule = (e) => {
		const checked = e.target.checked;
		setForm((prev) => ({
			...prev,
			singleUseRegular: checked,
			singleAvailability: checked ? REGULAR_SCHEDULE : '',
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
			const ok = hasNote || hasOriginal || hasDiscounted || hasPhilHealth;
			if (!ok) {
				alert('Please provide at least one: Price Note, Original Price, Discounted Price, or PhilHealth Promo Price.');
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
			// single only
			// bundle only — Service Packages fields
			servicePackageId: isBundle ? (form.servicePackageId || `PKG-${idValue}`) : undefined,
			features: isBundle ? form.features : undefined,
			specialInstruction: isBundle ? form.specialInstruction : undefined,
			availability: isBundle ? (form.useRegularSchedule ? REGULAR_SCHEDULE : form.availability) : undefined,
			slot: isBundle ? (form.slot !== '' ? Number(form.slot) : undefined) : undefined,
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
							description: form.description,
				features: payload.features,
				specialInstruction: payload.specialInstruction,
				availability: payload.availability,
							slot: form.slot !== '' ? Number(form.slot) : undefined,
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

			const dbKey = editingDbId || updating?.dbId;
			if (dbKey) {
				// Update existing package
				const dupIssues = findDuplicateIssues(payload.name, payload.servicePackageId, dbKey);
				if (dupIssues.length) {
					show({ type: 'error', title: 'Cannot update package', message: dupIssues.join('; ') });
					return;
				}
				servicePackagesService
					.update(dbKey, uiForDb)
					.then(() => {
												setServices((prev) => prev.map((s) => (
														s.dbId === dbKey ? { 
															...s, 
															...payload, 
															id: payload.servicePackageId || s.id,
															description: form.description,
															slot: form.slot !== '' ? Number(form.slot) : s.slot,
														} : s
												)));
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
						setServices((prev) => [{ ...payload, dbId, id: payload.servicePackageId || payload.id }, ...prev]);
						show({ type: 'success', title: 'Saved', message: 'Package created successfully.' });
					})
					.finally(resetForm);
			}
		} else {
				// Single Service: validate requireds
				const missing = collectMissingFieldsForSingle();
				if (missing.length) {
					show({ type: 'error', title: 'Missing required fields', message: `Please provide: ${missing.join(', ')}` });
					return;
				}
				const hasNote = (form.singlePriceNote || '').trim().length > 0;
				const hasOriginal = form.singleOriginalPrice !== '' && Number(form.singleOriginalPrice) > 0;
				const hasDiscounted = form.singleDiscountedPrice !== '' && Number(form.singleDiscountedPrice) > 0;
				const hasPhilHealth = form.singlePhilHealthPromoPrice !== '' && Number(form.singlePhilHealthPromoPrice) > 0;
				const ok = hasNote || hasOriginal || hasDiscounted || hasPhilHealth;
				if (!ok) {
					alert('Please provide at least one: Price Note, Original Price, Discounted Price, or PhilHealth Promo Price.');
					return;
				}

				const generatedId = (form.serviceId && form.serviceId.trim()) ? form.serviceId.trim() : generateNextSingleServiceId();
				const singlePayload = {
					id: editingId ?? Date.now(),
					type: 'single',
					name: form.name,
					description: form.description,
					serviceId: generatedId,
					specialInstructions: form.specialInstructions,
					singleAvailability: getSingleAvailabilityValue(),
					singleUseRegular: form.singleUseRegular,
					singleDurMinute: Number(form.singleDurMinute || 0),
					singleSlot: form.singleSlot !== '' ? Number(form.singleSlot) : undefined,
					singlePriceNote: form.singlePriceNote,
					singleOriginalPrice: form.singleOriginalPrice !== '' ? Number(form.singleOriginalPrice) : undefined,
					singleDiscountedPrice: form.singleDiscountedPrice !== '' ? Number(form.singleDiscountedPrice) : undefined,
					singlePhilHealthPromoPrice: form.singlePhilHealthPromoPrice !== '' ? Number(form.singlePhilHealthPromoPrice) : undefined,
					singleIsActive: form.singleIsActive,
					singleCreatedAt: form.singleCreatedAt || nowIso,
					singleUpdatedAt: nowIso,
					singleArchivedAt: form.singleIsActive === 'No' ? (form.singleArchivedAt || nowIso) : '',
					// Computed for table
					price: (form.singleDiscountedPrice !== '' && Number(form.singleDiscountedPrice) > 0)
						? Number(form.singleDiscountedPrice)
						: (form.singleOriginalPrice !== '' && Number(form.singleOriginalPrice) > 0)
							? Number(form.singleOriginalPrice)
							: (form.singlePhilHealthPromoPrice !== '' && Number(form.singlePhilHealthPromoPrice) > 0)
								? Number(form.singlePhilHealthPromoPrice)
								: 0,
					status: form.singleIsActive === 'Yes' ? 'Active' : 'Inactive',
				};

				const uiForDb = {
					serviceId: singlePayload.serviceId,
					name: singlePayload.name,
					description: singlePayload.description,
					specialInstructions: singlePayload.specialInstructions,
					availability: singlePayload.singleAvailability,
					durMinute: singlePayload.singleDurMinute,
					slot: singlePayload.singleSlot,
					priceNote: singlePayload.singlePriceNote,
					originalPrice: singlePayload.singleOriginalPrice,
					discountedPrice: singlePayload.singleDiscountedPrice,
					philHealthPromoPrice: singlePayload.singlePhilHealthPromoPrice,
					isActive: singlePayload.singleIsActive,
					createdAt: singlePayload.singleCreatedAt,
					updatedAt: singlePayload.singleUpdatedAt,
					archivedAt: singlePayload.singleArchivedAt,
				};

				const updatingSingle = services.find((s) => s.id === singlePayload.id && s.type === 'single');
				const dbKey = editingDbId || updatingSingle?.dbId;
				if (dbKey) {
					// Update existing single service
					const dupIssues = findDuplicateSingleIssues(singlePayload.name, singlePayload.serviceId, dbKey);
					if (dupIssues.length) {
						show({ type: 'error', title: 'Cannot update service', message: dupIssues.join('; ') });
						return;
					}
					singleServicesService
						.update(dbKey, uiForDb)
						.then(() => {
							setServices((prev) => prev.map((s) => (
								s.dbId === dbKey
									? { ...s, ...singlePayload, id: singlePayload.serviceId }
									: s
							)));
							setForm((prev) => ({ ...prev, singleUpdatedAt: nowIso }));
							show({ type: 'success', title: 'Changes saved', message: 'Service updated successfully.' });
						});
				} else {
					// Create new single service
					const dupIssues = findDuplicateSingleIssues(singlePayload.name, singlePayload.serviceId);
					if (dupIssues.length) {
						show({ type: 'error', title: 'Cannot add service', message: dupIssues.join('; ') });
						return;
					}
					singleServicesService
						.create(uiForDb)
						.then((dbId) => {
							setServices((prev) => [{ ...singlePayload, dbId, id: singlePayload.serviceId || singlePayload.id }, ...prev]);
							show({ type: 'success', title: 'Saved', message: 'Service created successfully.' });
							resetForm();
							setActiveTab('single');
						});
				}
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

		// Validation for bundle: require at least one of the four pricing fields
		const hasNote = (form.priceNote || '').trim().length > 0;
		const hasOriginal = form.originalPrice !== '' && Number(form.originalPrice) > 0;
		const hasDiscounted = form.discountedPrice !== '' && Number(form.discountedPrice) > 0;
		const hasPhilHealth = form.philHealthPromoPrice !== '' && Number(form.philHealthPromoPrice) > 0;
		if (!(hasNote || hasOriginal || hasDiscounted || hasPhilHealth)) {
			alert('Please provide at least one: Price Note, Original Price, Discounted Price, or PhilHealth Promo Price.');
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
			slot: payload.slot,
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

	const handleAddService = (e) => {
		e.preventDefault();
		if (activeTab !== 'single') return;
		const nowIso = new Date().toISOString();

		// Validate required fields for create
		const missing = collectMissingFieldsForSingle();
		if (missing.length) {
			show({ type: 'error', title: 'Missing required fields', message: `Please provide: ${missing.join(', ')}` });
			return;
		}

		// Pricing validation (single): require at least one of the four pricing fields
		const hasNote = (form.singlePriceNote || '').trim().length > 0;
		const hasOriginal = form.singleOriginalPrice !== '' && Number(form.singleOriginalPrice) > 0;
		const hasDiscounted = form.singleDiscountedPrice !== '' && Number(form.singleDiscountedPrice) > 0;
		const hasPhilHealth = form.singlePhilHealthPromoPrice !== '' && Number(form.singlePhilHealthPromoPrice) > 0;
		if (!(hasNote || hasOriginal || hasDiscounted || hasPhilHealth)) {
			alert('Please provide at least one: Price Note, Original Price, Discounted Price, or PhilHealth Promo Price.');
			return;
		}

		const idValue = Date.now();
		const generatedId = (form.serviceId && form.serviceId.trim()) ? form.serviceId.trim() : generateNextSingleServiceId();
		const payload = {
			id: idValue,
			type: 'single',
			name: form.name,
			price:
				form.singleDiscountedPrice !== '' && Number(form.singleDiscountedPrice) > 0
					? Number(form.singleDiscountedPrice)
					: form.singleOriginalPrice !== '' && Number(form.singleOriginalPrice) > 0
						? Number(form.singleOriginalPrice)
						: form.singlePhilHealthPromoPrice !== '' && Number(form.singlePhilHealthPromoPrice) > 0
							? Number(form.singlePhilHealthPromoPrice)
							: 0,
			status: form.singleIsActive === 'Yes' ? 'Active' : 'Inactive',
			category: form.category,
			durationMinutes: form.singleDurMinute,
			description: form.description,
			serviceId: generatedId,
			specialInstructions: form.specialInstructions,
			singleAvailability: getSingleAvailabilityValue(),
			singleUseRegular: form.singleUseRegular,
			singleDurMinute: Number(form.singleDurMinute || 0),
			singlePriceNote: form.singlePriceNote,
			singleOriginalPrice: form.singleOriginalPrice !== '' ? Number(form.singleOriginalPrice) : undefined,
			singleDiscountedPrice: form.singleDiscountedPrice !== '' ? Number(form.singleDiscountedPrice) : undefined,
			singlePhilHealthPromoPrice: form.singlePhilHealthPromoPrice !== '' ? Number(form.singlePhilHealthPromoPrice) : undefined,
			singleIsActive: form.singleIsActive,
			singleCreatedAt: form.singleCreatedAt || nowIso,
			singleUpdatedAt: nowIso,
			singleArchivedAt: form.singleIsActive === 'No' ? (form.singleArchivedAt || nowIso) : '',
		};

		const dupIssues = findDuplicateSingleIssues(payload.name, payload.serviceId);
		if (dupIssues.length) {
			show({ type: 'error', title: 'Cannot add service', message: dupIssues.join('; ') });
			return;
		}

				const uiForDb = {
			serviceId: payload.serviceId,
			name: payload.name,
			description: payload.description,
			specialInstructions: payload.specialInstructions,
			availability: payload.singleAvailability,
			durMinute: payload.singleDurMinute,
					slot: payload.singleSlot,
			priceNote: payload.singlePriceNote,
			originalPrice: payload.singleOriginalPrice,
			discountedPrice: payload.singleDiscountedPrice,
			philHealthPromoPrice: payload.singlePhilHealthPromoPrice,
			isActive: payload.singleIsActive,
			createdAt: payload.singleCreatedAt,
			updatedAt: payload.singleUpdatedAt,
			archivedAt: payload.singleArchivedAt,
		};

		singleServicesService
			.create(uiForDb)
			.then((dbId) => {
				setServices((prev) => [{ ...payload, dbId }, ...prev]);
				show({ type: 'success', title: 'Saved', message: 'Service created successfully.' });
			})
			.finally(() => {
				resetForm();
				setActiveTab('single');
			});
	};

	const onEdit = (svc) => {
		setActiveTab(svc.type);
		setEditingId(svc.id);
		setEditingDbId(svc.dbId || null);
		if (svc.type === 'bundle') {
			setForm({
				type: 'bundle',
				name: svc.name || '',
				description: svc.description || '',
				servicePackageId: svc.servicePackageId || '',
				features: svc.features || (Array.isArray(svc.included) ? svc.included.join(', ') : ''),
				specialInstruction: svc.specialInstruction || '',
				availability: svc.availability || '',
				useRegularSchedule: svc.availability === REGULAR_SCHEDULE,
				slot: svc.slot?.toString?.() || '',
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
				// singles defaults
				serviceId: '',
				specialInstructions: '',
				singleAvailability: '',
				singleUseRegular: false,
				singleDurMinute: '',
				singlePriceNote: '',
				singleOriginalPrice: '',
				singleDiscountedPrice: '',
				singlePhilHealthPromoPrice: '',
				singleIsActive: 'Yes',
				singleCreatedAt: '',
				singleUpdatedAt: '',
				singleArchivedAt: '',
			});
		} else {
			setForm({
				type: 'single',
				name: svc.name || '',
				description: svc.description || '',
				serviceId: svc.serviceId || '',
				specialInstructions: svc.specialInstructions || '',
				singleAvailability: svc.singleAvailability || '',
				singleUseRegular: svc.singleUseRegular || false,
				singleDurMinute: svc.singleDurMinute?.toString?.() || '',
				singleSlot: svc.singleSlot?.toString?.() || '',
				singlePriceNote: svc.singlePriceNote || '',
				singleOriginalPrice: svc.singleOriginalPrice?.toString?.() || '',
				singleDiscountedPrice: svc.singleDiscountedPrice?.toString?.() || '',
				singlePhilHealthPromoPrice: svc.singlePhilHealthPromoPrice?.toString?.() || '',
				singleIsActive: svc.singleIsActive || (svc.status === 'Active' ? 'Yes' : 'No'),
				singleCreatedAt: svc.singleCreatedAt || '',
				singleUpdatedAt: svc.singleUpdatedAt || '',
				singleArchivedAt: svc.singleArchivedAt || '',
				// bundle defaults
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
		}
	};

	const onDelete = (id) => {
		const target = services.find((s) => s.id === id);
		const msg = target?.type === 'single'
			? 'Are you sure you want to delete this item? It will be archived to "single_service_archives" and removed from the active list.'
			: 'Are you sure you want to delete this item? It will be archived to "package_archives" and removed from the active list.';
		if (!confirm(msg)) return;
		if (target && target.type === 'bundle' && target.dbId) {
			// Archive remotely, then remove locally
			servicePackagesService
				.archive(target.dbId)
				.catch(() => {})
				.finally(() => {
					setServices((prev) => prev.filter((s) => s.id !== id));
				});
		} else if (target && target.type === 'single' && target.dbId) {
			singleServicesService
				.archive(target.dbId)
				.catch(() => {})
				.finally(() => {
					setServices((prev) => prev.filter((s) => s.id !== id));
				});
		} else {
			setServices((prev) => prev.filter((s) => s.id !== id));
		}
		if (editingId === id) resetForm();
	};

	// Filtered lists
	const filteredSingles = useMemo(() => {
		const q = searchSingle.trim().toLowerCase();
		let arr = services.filter((s) => s.type === 'single');
		if (q) {
			const includes = (v) => (v ?? '').toString().toLowerCase().includes(q);
			arr = arr.filter((s) => (
				includes(s.name) ||
				includes(s.serviceId) ||
				includes(s.description) ||
				includes(s.specialInstructions) ||
				includes(s.singleAvailability) ||
				includes(s.status) ||
				includes(s.price)
			));
		}
		// Apply single-specific filters
		arr = arr.filter((s) => {
			// Status filter
			if (singleStatus && s.status !== singleStatus) return false;
			// Slots filter
			const slotsVal = (s.singleSlot !== undefined && s.singleSlot !== '') ? Number(s.singleSlot) : null;
			if (singleSlotsMin !== '' && !(slotsVal !== null && slotsVal >= Number(singleSlotsMin))) return false;
			if (singleSlotsMax !== '' && !(slotsVal !== null && slotsVal <= Number(singleSlotsMax))) return false;
			// Price filter
			const priceVal = Number(s.price) || 0;
			if (singlePriceMin !== '' && !(priceVal >= Number(singlePriceMin))) return false;
			if (singlePriceMax !== '' && !(priceVal <= Number(singlePriceMax))) return false;
			return true;
		});
		return arr;
	}, [services, searchSingle, singleStatus, singleSlotsMin, singleSlotsMax, singlePriceMin, singlePriceMax]);

	const filteredBundles = useMemo(() => {
		const q = searchBundle.trim().toLowerCase();
		let arr = services.filter((s) => s.type === 'bundle');
		if (q) {
			const includes = (v) => (v ?? '').toString().toLowerCase().includes(q);
			arr = arr.filter((s) => (
				includes(s.name) ||
				includes(s.servicePackageId) ||
				includes(s.description) ||
				includes(s.features) ||
				includes(s.specialInstruction) ||
				includes(s.slot) ||
				includes(s.bookingEnabled) ||
				includes(s.isActive) ||
				includes(s.status) ||
				includes(s.price)
			));
		}
		// Apply bundle-specific filters
		arr = arr.filter((s) => {
			// Enabled (booking)
			if (bundleEnabled && (s.bookingEnabled || 'Yes') !== bundleEnabled) return false;
			// Status (active)
			if (bundleStatus) {
				const isActive = (s.isActive || 'Yes') === 'Yes' ? 'Active' : 'Inactive';
				if (isActive !== bundleStatus) return false;
			}
			// Slots filter
			const slotsVal = (s.slot !== undefined && s.slot !== '') ? Number(s.slot) : null;
			if (bundleSlotsMin !== '' && !(slotsVal !== null && slotsVal >= Number(bundleSlotsMin))) return false;
			if (bundleSlotsMax !== '' && !(slotsVal !== null && slotsVal <= Number(bundleSlotsMax))) return false;
			// Price filter
			const priceVal = Number(s.price) || 0;
			if (bundlePriceMin !== '' && !(priceVal >= Number(bundlePriceMin))) return false;
			if (bundlePriceMax !== '' && !(priceVal <= Number(bundlePriceMax))) return false;
			return true;
		});
		return arr;
	}, [services, searchBundle, bundleEnabled, bundleStatus, bundleSlotsMin, bundleSlotsMax, bundlePriceMin, bundlePriceMax]);

	// Pagination: 5 per page, clamp and reset as filters change
	const PAGE_SIZE = 5;
	useEffect(() => { setPageSingle(1); }, [searchSingle]);
	useEffect(() => { setPageBundle(1); }, [searchBundle]);
	useEffect(() => {
		const pages = Math.max(1, Math.ceil(filteredSingles.length / PAGE_SIZE));
		if (pageSingle > pages) setPageSingle(pages);
	}, [filteredSingles, pageSingle]);
	useEffect(() => {
		const pages = Math.max(1, Math.ceil(filteredBundles.length / PAGE_SIZE));
		if (pageBundle > pages) setPageBundle(pages);
	}, [filteredBundles, pageBundle]);

	const totalSingles = filteredSingles.length;
	const totalBundles = filteredBundles.length;
	const totalSinglePages = Math.max(1, Math.ceil(totalSingles / PAGE_SIZE));
	const totalBundlePages = Math.max(1, Math.ceil(totalBundles / PAGE_SIZE));
	const singleStart = totalSingles ? (pageSingle - 1) * PAGE_SIZE + 1 : 0;
	const singleEnd = Math.min(pageSingle * PAGE_SIZE, totalSingles);
	const bundleStart = totalBundles ? (pageBundle - 1) * PAGE_SIZE + 1 : 0;
	const bundleEnd = Math.min(pageBundle * PAGE_SIZE, totalBundles);
	const pageSingles = useMemo(() => filteredSingles.slice((pageSingle - 1) * PAGE_SIZE, pageSingle * PAGE_SIZE), [filteredSingles, pageSingle]);
	const pageBundles = useMemo(() => filteredBundles.slice((pageBundle - 1) * PAGE_SIZE, pageBundle * PAGE_SIZE), [filteredBundles, pageBundle]);

	return (
		<>
			<main className={styles.main}>
				{activeTab === 'single' ? (
					<>
					<SingleServicesSection
						activeTab={activeTab}
						onTabChange={handleTabChange}
						editingId={editingId}
						onHeaderAddSingle={() => {
							// Save current single draft, then prep a fresh single form
							setLastSingleForm(form);
							setActiveTab('single');
							setEditingId(null);
							setEditingDbId(null);
							setForm({
								type: 'single',
								name: '',
								price: '',
								category: '',
								durationMinutes: '',
								status: 'Active',
								description: '',
								preparation: '',
								serviceId: '',
								specialInstructions: '',
								singleAvailability: '',
								singleUseRegular: false,
								singleDurMinute: '',
								singleSlot: '',
								singlePriceNote: '',
								singleOriginalPrice: '',
								singleDiscountedPrice: '',
								singlePhilHealthPromoPrice: '',
								singleIsActive: 'Yes',
								singleCreatedAt: '',
								singleUpdatedAt: '',
								singleArchivedAt: '',
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
						form={form}
						onChange={handleChange}
						onToggleRegular={handleSingleUseRegularSchedule}
						onReset={resetForm}
						onSubmit={handleSubmit}
						onAdd={handleAddService}
						REGULAR_SCHEDULE={REGULAR_SCHEDULE}
						searchValue={searchSingle}
						onSearchChange={setSearchSingle}
						filters={{ status: singleStatus, slotsMin: singleSlotsMin, slotsMax: singleSlotsMax, priceMin: singlePriceMin, priceMax: singlePriceMax }}
						onFiltersChange={{
							setStatus: setSingleStatus,
							setSlotsMin: setSingleSlotsMin,
							setSlotsMax: setSingleSlotsMax,
							setPriceMin: setSinglePriceMin,
							setPriceMax: setSinglePriceMax,
						}}
						filteredServices={pageSingles}
						onEdit={onEdit}
						onDelete={onDelete}
					/>
					{/* Pagination footer for singles: Prev/Next only */}
					{totalSingles > PAGE_SIZE && (
						<div className={styles.paginationBar}>
							<div className={styles.pageInfo}>
								Showing {singleStart}-{singleEnd} of {totalSingles} services
							</div>
							<div className={styles.pageControls}>
								<button type="button" className={`${styles.pageBtn}`} onClick={() => setPageSingle(Math.max(1, pageSingle - 1))} disabled={pageSingle === 1}>
									Prev
								</button>
								<button type="button" className={`${styles.pageBtn} ${styles.pageBtnPrimary}`} onClick={() => setPageSingle(Math.min(totalSinglePages, pageSingle + 1))} disabled={pageSingle >= totalSinglePages}>
									Next
								</button>
							</div>
						</div>
					)}
					</>
				) : (
					<>
					<PackagesSection
						activeTab={activeTab}
						onTabChange={handleTabChange}
						editingId={editingId}
						onHeaderAddPackage={() => {
							setLastBundleForm(form);
							setActiveTab('bundle');
							setEditingId(null);
							setEditingDbId(null);
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
								slot: '',
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
						form={form}
						onChange={handleChange}
						onToggleRegular={handleUseRegularSchedule}
						onReset={resetForm}
						onSubmit={handleSubmit}
						onAdd={handleAddPackage}
						REGULAR_SCHEDULE={REGULAR_SCHEDULE}
						searchValue={searchBundle}
						onSearchChange={setSearchBundle}
						filters={{ enabled: bundleEnabled, status: bundleStatus, slotsMin: bundleSlotsMin, slotsMax: bundleSlotsMax, priceMin: bundlePriceMin, priceMax: bundlePriceMax }}
						onFiltersChange={{
							setEnabled: setBundleEnabled,
							setStatus: setBundleStatus,
							setSlotsMin: setBundleSlotsMin,
							setSlotsMax: setBundleSlotsMax,
							setPriceMin: setBundlePriceMin,
							setPriceMax: setBundlePriceMax,
						}}
						filteredServices={pageBundles}
						onEdit={onEdit}
						onDelete={onDelete}
					/>
					{/* Pagination footer for bundles: Prev/Next only */}
					{totalBundles > PAGE_SIZE && (
						<div className={styles.paginationBar}>
							<div className={styles.pageInfo}>
								Showing {bundleStart}-{bundleEnd} of {totalBundles} packages
							</div>
							<div className={styles.pageControls}>
								<button type="button" className={`${styles.pageBtn}`} onClick={() => setPageBundle(Math.max(1, pageBundle - 1))} disabled={pageBundle === 1}>
									Prev
								</button>
								<button type="button" className={`${styles.pageBtn} ${styles.pageBtnPrimary}`} onClick={() => setPageBundle(Math.min(totalBundlePages, pageBundle + 1))} disabled={pageBundle >= totalBundlePages}>
									Next
								</button>
							</div>
						</div>
					)}
					</>
				)}
			</main>
		</>
	);
}
