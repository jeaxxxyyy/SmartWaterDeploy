import { bootResponsiveLayout, observeChartWidth, responsiveChartWidth, setHouseholdNavigationOpen } from './responsive-layout';

const tokenKey = 'smart-water-token';
const sessionUserKey = 'smart-water-session-user';
const dashboardCachePrefix = 'smart-water-dashboard-cache';
const localeKey = 'smart-water-locale';
const lowBandwidthKey = 'smart-water-low-bandwidth';
const DASHBOARD_CACHE_STALE_MS = 12 * 60 * 60 * 1000;
const dashboardCacheRevalidations = new Map();
let dashboardCacheForceNetwork = false;
let installPromptEvent = null;
let lowBandwidthMode = false;
try {
    lowBandwidthMode = localStorage.getItem(lowBandwidthKey) === '1';
} catch {
    lowBandwidthMode = false;
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const formatNumber = (value, digits = 2) =>
    Number(value ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });

let activeCurrency = 'PHP';
let consumptionBaselineRefreshTimer = null;
let consumptionBaselineRefreshInFlight = false;

const formatCurrency = (value, currency = activeCurrency) =>
    `${currency} ${Number(value ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const formatPersonalDisplay = (value, fallback = '--') => {
    const text = String(value ?? '').trim();
    return text ? text.toUpperCase() : fallback;
};

const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const litersToCubicMeters = (value) => Number(value ?? 0) / 1000;

const formatCubicMeters = (liters) => `${formatNumber(litersToCubicMeters(liters))} m³`;

const formatCubicMeterValue = (value) => `${formatNumber(value)} m³`;

const formatDateTime = (value) => {
    if (!value) {
        return '--';
    }

    return new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

const formatLiveReadingDateTime = (value) => {
    if (!value) return '--';

    return new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });
};

const formatCompactDateTime = (value) => {
    if (!value) return '--';

    return new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const formatMonthLabel = (value) => {
    if (!/^\d{4}-\d{2}$/.test(String(value ?? ''))) return '--';

    return new Date(`${value}-01T00:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
    });
};

const page = document.body.dataset.page ?? 'default';
const logoutButtons = $$('[data-logout]');
const logoutTransition = $('[data-logout-transition]');
const statusLabel = $('[data-status]');
const tokenInput = $('[data-token-input]');
const saveTokenButton = $('[data-token-save]');
const refreshButton = $('[data-refresh]');
const householdSidebarCollapse = $('[data-household-sidebar-collapse]');
const notificationControl = $('[data-notification-control]');
const notificationToggle = $('[data-notification-toggle]');
const notificationDropdown = $('[data-notification-dropdown]');
const notificationDropdownList = $('[data-notification-dropdown-list]');
const notificationDropdownSummary = $('[data-notification-dropdown-summary]');
const adminNotificationControl = $('[data-admin-notification-control]');
const adminNotificationToggle = $('[data-admin-notification-toggle]');
const adminNotificationDropdown = $('[data-admin-notification-dropdown]');
const adminNotificationDropdownList = $('[data-admin-notification-dropdown-list]');
const adminNotificationDropdownSummary = $('[data-admin-notification-dropdown-summary]');
const dashboardFilterForm = $('[data-reading-filters]');
const consumptionFilterForm = $('[data-consumption-filters]');
const householdUserFilterForm = $('[data-household-user-filters]');
const adminNotificationFilterForm = $('[data-admin-notification-filters]');
const billingManagementFilterForm = $('[data-billing-management-filters]');
const reportManagementFilterForm = $('[data-report-management-filters]');
const billingDetailDialog = $('[data-billing-detail-dialog]');
const paymentDialog = $('[data-payment-dialog]');
const paymentForm = $('[data-payment-form]');
const serviceRequestForm = $('[data-service-request-form]');
const notificationPreferencesForm = $('[data-notification-preferences-form]');
const consumptionGoalForm = $('[data-consumption-goal-form]');
const adminSearch = $('[data-admin-search]');
const adminPageTitle = $('[data-admin-page-title]');
const adminSidebar = $('#admin-sidebar');
const adminSidebarCollapse = $('[data-admin-sidebar-collapse]');
const readingsPagers = $$('[data-readings-pager]');
const accountForm = $('[data-account-form]');
const passwordForm = $('[data-password-form]');
const accountProfileState = $('[data-account-profile-state]');
const householdBillingState = $('[data-household-billing-state]');
const toastStack = $('[data-toast-stack]');
const adminHouseholdDialog = $('[data-admin-household-dialog]');
const adminHouseholdEditForm = $('[data-admin-household-edit-form]');
const passwordToggleButtons = $$('[data-password-toggle]');
const accountSubmitButton = $('[data-account-submit]');
const passwordSubmitButton = $('[data-password-submit]');
const activityContainer = $('[data-account-activity]');
const badgeDisplay = $('[data-profile-badge]');
const passwordCriteria = $('[data-password-criteria]');

let accountFormInitial = {};
let passwordValidationState = {
    length: false,
};
const consumptionDialog = $('[data-consumption-dialog]');
const adminAnalyticsRange = $('[data-admin-analytics-range]');
const householdAnalyticsRange = $('[data-household-analytics-range]');
const adminAnalyticsCustom = $('[data-admin-analytics-custom]');
const householdAnalyticsCustom = $('[data-household-analytics-custom]');
const householdAnalyticsCustomToggle = $('[data-household-analytics-custom-toggle]');
const adminAnalyticsFrom = $('[data-admin-analytics-from]');
const adminAnalyticsTo = $('[data-admin-analytics-to]');
const householdAnalyticsFrom = $('[data-household-analytics-from]');
const householdAnalyticsTo = $('[data-household-analytics-to]');
const historyFilterForm = $('[data-history-filters]');

const showToast = (message, type = 'success') => {
    if (!toastStack || !message) return;
    const toast = document.createElement('div');
    toast.className = `toast-alert${type === 'error' ? ' is-error' : ''}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    toastStack.appendChild(toast);
    window.setTimeout(() => toast.remove(), type === 'error' ? 6000 : 4000);
};

const localeLabels = {
    fil: {
        Dashboard: 'Dashboard',
        'Live Monitoring': 'Live na Pagsubaybay',
        'Consumption History': 'Kasaysayan ng Konsumo',
        'Estimated Billing': 'Tinatayang Singil',
        Messages: 'Mga Mensahe',
        'Leak Detection': 'Pagtukoy ng Tagas',
        Notifications: 'Mga Abiso',
        'Account Settings': 'Mga Setting ng Account',
    },
};

const applyLocale = (locale = 'en') => {
    const normalized = locale === 'fil' ? 'fil' : 'en';
    document.documentElement.lang = normalized;
    try { localStorage.setItem(localeKey, normalized); } catch { /* Preferences still apply for this page. */ }
    $$('.sidebar-nav-label').forEach((node) => {
        node.dataset.englishLabel ||= node.textContent.trim();
        node.textContent = localeLabels[normalized]?.[node.dataset.englishLabel] ?? node.dataset.englishLabel;
    });
};

const applyLowBandwidthMode = (enabled, persist = true) => {
    lowBandwidthMode = enabled === true;
    document.body.classList.toggle('low-bandwidth-mode', lowBandwidthMode);
    if (persist) {
        try { localStorage.setItem(lowBandwidthKey, lowBandwidthMode ? '1' : '0'); } catch { /* Apply for this page only. */ }
    }
};

const downloadAuthenticatedFile = async (url, fallbackName) => {
    const response = await fetch(url, { headers: authHeaders() });
    if (!response.ok) throw new Error('Document download failed.');
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fallbackName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
};

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPromptEvent = event;
    const button = $('[data-install-app]');
    if (button) button.hidden = false;
});

const errorPayload = (error) => {
    try {
        return JSON.parse(error?.message ?? '{}');
    } catch {
        return {};
    }
};

const errorMessage = (error, fallback = 'The action could not be completed.') => {
    const payload = errorPayload(error);
    return payload.message ?? Object.values(payload.errors ?? {}).flat()[0] ?? fallback;
};

const setText = (selector, value) => {
    $$(selector).forEach((node) => {
        node.textContent = value;
    });
};

const setFieldError = (fieldName, message) => {
    const feedback = $(`[data-field-error="${fieldName}"]`);
    if (!feedback) return;
    feedback.textContent = message;
    feedback.hidden = !message;
    feedback.classList.toggle('is-error', Boolean(message));
};

const clearFieldErrors = () => {
    $$('[data-field-error]').forEach((node) => {
        node.textContent = '';
        node.hidden = true;
        node.classList.remove('is-error');
    });
};

const setHouseholdAlertCount = (value) => {
    const count = Number(value ?? 0);
    const hasUnread = count > 0;
    $$('[data-household-alert-count]').forEach((node) => {
        node.dataset.unreadCount = String(count);
        node.hidden = !hasUnread;
    });
    const sidebarNotificationButton = $('.household-sidebar-nav [data-household-nav="notifications"]');
    sidebarNotificationButton?.setAttribute('aria-label', hasUnread
        ? `Notifications, ${count} unread`
        : 'Notifications');
    notificationToggle?.classList.toggle('has-unread', hasUnread);
    notificationToggle?.setAttribute('aria-label', hasUnread
        ? `Open notifications, ${count} unread`
        : 'Open notifications');
    if (notificationDropdownSummary) {
        notificationDropdownSummary.textContent = hasUnread
            ? `${count} unread message${count === 1 ? '' : 's'}`
            : 'No unread messages';
    }
};

const setNotificationDropdownOpen = (isOpen) => {
    if (!notificationDropdown || !notificationToggle) return;
    notificationDropdown.hidden = !isOpen;
    notificationToggle.setAttribute('aria-expanded', String(isOpen));
    notificationControl?.classList.toggle('is-open', isOpen);
};

const setAdminNotificationCount = (value) => {
    const count = Math.max(0, Number(value) || 0);
    const hasUnread = count > 0;

    $$('[data-admin-alert-count]').forEach((node) => {
        node.dataset.unreadCount = String(count);
        node.hidden = !hasUnread;
    });
    adminNotificationToggle?.classList.toggle('has-unread', hasUnread);
    adminNotificationToggle?.setAttribute('aria-label', hasUnread
        ? `Open administrator notifications, ${count} unread household message${count === 1 ? '' : 's'}`
        : 'Open administrator notifications');
    if (adminNotificationDropdownSummary) {
        adminNotificationDropdownSummary.textContent = hasUnread
            ? `${count} unread household message${count === 1 ? '' : 's'}`
            : 'No unread household messages';
    }
};

const setAdminNotificationDropdownOpen = (isOpen) => {
    if (!adminNotificationDropdown || !adminNotificationToggle) return;
    adminNotificationDropdown.hidden = !isOpen;
    adminNotificationToggle.setAttribute('aria-expanded', String(isOpen));
    adminNotificationControl?.classList.toggle('is-open', isOpen);
};

const dashboardState = {
    page: 1,
    per_page: 10,
    from: '',
    to: '',
};
const historyState = {
    period: 'daily',
    from: '',
    to: '',
    search: '',
    page: 1,
    per_page: 10,
};
let consumptionHistory = { daily: [], weekly: [], monthly: [] };
let historyPeriod = 'daily';
let historyReloadQueued = false;
let notificationObserver = null;
let householdChartObserver = null;
let adminChartObserver = null;
const notificationReadInFlight = new Set();
let householdProfile = null;
let accountProfileLoaded = false;
let accountProfileLoading = false;
let householdBillingLoaded = false;
let householdBillingRequest = null;
let householdBillingSnapshot = null;
let notificationRefreshInFlight = false;
let notificationMutationInFlight = false;
let notificationMutationVersion = 0;
let householdNotifications = [];
let historyRefreshInFlight = false;
let householdAnalyticsLoadedRange = '';
let householdAnalytics = null;
let householdDeviceState = null;
let householdSummaryData = null;
const householdConsumptionPeriods = {
    daily: { label: "TODAY'S CONSUMPTION", caption: 'Today', description: 'Consumption recorded today.' },
    weekly: { label: "THIS WEEK'S CONSUMPTION", caption: 'This Week', description: 'Consumption recorded this week.' },
    monthly: { label: "THIS MONTH'S CONSUMPTION", caption: 'This Month', description: 'Consumption recorded this month.' },
};
const householdConsumptionAvailability = {
    no_meter: { value: 'No meter assigned', state: 'Assign a meter to begin tracking consumption.' },
    pending_activation: { value: 'Waiting for meter activation', state: 'The assigned meter is awaiting activation.' },
    waiting_for_first_reading: { value: 'Waiting for first reading', state: 'Consumption will appear after the meter submits a reading.' },
    no_valid_readings: { value: 'No data', state: 'No valid readings are available for this period.' },
    no_period_data: { value: 'No data', state: 'No water consumption recorded for this period.' },
};
let householdConsumptionPeriod = 'daily';
let householdConsumptionRequestController = null;
let householdConsumptionRequestId = 0;
const householdTrendPeriods = {
    daily: { label: 'day', title: 'Daily water consumption', empty: 'No usage data is available for this period. Try selecting a wider time range.' },
    weekly: { label: 'week', title: 'Weekly water consumption', empty: 'No usage data is available for this period. Try selecting a wider time range.' },
    monthly: { label: 'month', title: 'Monthly water consumption', empty: 'No usage data is available for this period. Try selecting a wider time range.' },
};
let householdTrendPeriod = 'monthly';
let householdTrendRequestController = null;
let householdTrendRequestId = 0;
let householdTrendHasValidChart = false;
const liveChartState = {
    readings: [],
    timezone: 'UTC',
    chart: null,
    error: false,
};

const adminState = {
    page: 1,
    per_page: 10,
    search: '',
    role: '',
    is_active: '',
};

const householdUserState = {
    page: 1,
    per_page: 10,
    search: '',
    account_status: '',
};

const consumptionState = {
    page: 1,
    per_page: 10,
    search: '',
    account_status: '',
    meter_status: '',
    usage_condition: '',
    from: '',
    to: '',
};

const adminNotificationState = {
    page: 1,
    per_page: 10,
    search: '',
    type: '',
    status: '',
};

const billingManagementState = {
    page: 1,
    per_page: 10,
    search: '',
    bill_type: 'all',
    status: 'all',
    from: '',
    to: '',
};

const reportManagementState = {
    page: 1,
    per_page: 5,
    period: 'monthly',
    report_type: 'all',
    from: '',
    to: '',
    search: '',
    status: '',
};

let householdUsersById = new Map();
let adminMunicipalDevices = [];
let billingRecordsByKey = new Map();

const adminViewTitles = {
    'admin-dashboard': 'Dashboard',
    'customer-management': 'Customer Management',
    'device-management': 'Device Management',
    'water-rates': 'Water Rate Management',
    'billing-management': 'Billing',
    'service-requests': 'Messages',
    'consumption-monitoring': 'Consumption Monitoring',
    'leak-monitoring': 'Leak Monitoring',
};

const updateAdminPageTitle = (target) => {
    if (adminPageTitle) {
        adminPageTitle.textContent = adminViewTitles[target] ?? 'Dashboard';
    }
};

const DASHBOARD_REFRESH_MS = 3000;
const FULL_DASHBOARD_REFRESH_MS = 60000;
let dashboardRefreshTimer = null;
let dashboardRefreshInFlight = false;
let lastFullDashboardRefreshAt = 0;
let householdActiveView = 'dashboard';
const ADMIN_DEVICE_REFRESH_MS = 10000;
let adminDeviceRefreshTimer = null;
let adminDeviceRefreshInFlight = false;

const stopDashboardPolling = () => {
    if (dashboardRefreshTimer) {
        window.clearTimeout(dashboardRefreshTimer);
        dashboardRefreshTimer = null;
    }
};

const scheduleDashboardPolling = () => {
    stopDashboardPolling();

    if (page !== 'household' || householdActiveView !== 'dashboard' || !readToken()) {
        return;
    }

    dashboardRefreshTimer = window.setTimeout(() => {
        if (Date.now() - lastFullDashboardRefreshAt >= FULL_DASHBOARD_REFRESH_MS) {
            loadDashboard({ reschedule: true });
        } else {
            refreshLiveDashboard();
        }
    }, lowBandwidthMode ? 15000 : DASHBOARD_REFRESH_MS);
};

const stopAdminDevicePolling = () => {
    if (adminDeviceRefreshTimer) {
        window.clearTimeout(adminDeviceRefreshTimer);
        adminDeviceRefreshTimer = null;
    }
};

const scheduleAdminDevicePolling = () => {
    stopAdminDevicePolling();

    if (page !== 'admin' || !readToken()) return;

    adminDeviceRefreshTimer = window.setTimeout(() => {
        loadAdminDevices();
    }, lowBandwidthMode ? 30000 : ADMIN_DEVICE_REFRESH_MS);
};

const bindAdminUserDeleteActions = (container) => {
    if (!container || container.dataset.deleteBound === '1') {
        return;
    }

    container.dataset.deleteBound = '1';
    container.addEventListener('click', async (event) => {
        const editButton = event.target.closest('[data-edit-user]');
        if (editButton) {
            const user = householdUsersById.get(String(editButton.dataset.editUser));
            if (user) openAdminHouseholdDialog(user);
            return;
        }

        const button = event.target.closest('[data-delete-user]');
        if (!button) {
            return;
        }

        const userId = button.dataset.deleteUser;
        const userName = button.dataset.userName || 'this user';

        if (!window.confirm(`Delete ${userName}?`)) {
            return;
        }

        try {
            await requestJson(`/api/users/${userId}`, { method: 'DELETE' });
            showToast(`${userName} was deleted successfully.`);
            loadAdmin();
        } catch (error) {
            if (!handleAuthFailure(error)) {
                console.error(error);
                showToast(errorMessage(error, `Could not delete ${userName}.`), 'error');
            }
        }
    });
};

const setAdminUserFieldErrors = (form, errors = {}) => {
    const hasSpecificErrors = Object.keys(errors).length > 0;

    $$('[data-admin-user-field-error]', form).forEach((errorNode) => {
        const field = errorNode.dataset.adminUserFieldError;
        if (hasSpecificErrors && !Object.prototype.hasOwnProperty.call(errors, field)) return;

        const message = Array.isArray(errors[field]) ? errors[field][0] : (errors[field] ?? '');
        const input = form.elements.namedItem(field);

        errorNode.textContent = message;
        input?.classList.toggle('is-invalid', Boolean(message));
        input?.setAttribute('aria-invalid', message ? 'true' : 'false');
    });
};

const setAdminUserFormFeedback = (form, message = '', type = '') => {
    const feedback = $('[data-admin-user-form-status], [data-admin-household-edit-status]', form);
    if (!feedback) return;

    feedback.textContent = message;
    feedback.hidden = !message;
    feedback.classList.toggle('is-error', type === 'error');
    feedback.classList.toggle('is-loading', type === 'loading');
};

const splitCalapeAddress = (address, barangaySelect) => {
    const fullAddress = String(address ?? '').trim();
    const barangays = [...(barangaySelect?.options ?? [])]
        .map((option) => option.value.trim())
        .filter(Boolean)
        .sort((first, second) => second.length - first.length);
    const normalizedAddress = fullAddress.toLocaleLowerCase();

    for (const barangay of barangays) {
        const suffixes = [`barangay ${barangay}`, barangay];
        const suffix = suffixes.find((candidate) => {
            const normalizedCandidate = candidate.toLocaleLowerCase();
            return normalizedAddress === normalizedCandidate || normalizedAddress.endsWith(`, ${normalizedCandidate}`);
        });
        if (!suffix) continue;

        return {
            addressLine: fullAddress.slice(0, fullAddress.length - suffix.length).replace(/,\s*$/, '').trim(),
            barangay,
        };
    }

    return { addressLine: fullAddress, barangay: '' };
};

const composeCalapeAddress = (addressLine, barangay) => {
    const detail = String(addressLine ?? '').trim().replace(/,\s*$/, '');
    const selectedBarangay = String(barangay ?? '').trim();
    return `${detail}, Barangay ${selectedBarangay}`;
};

const openAdminHouseholdDialog = (user) => {
    if (!adminHouseholdDialog || !adminHouseholdEditForm) return;

    adminHouseholdEditForm.elements.user_id.value = user.id;
    adminHouseholdEditForm.elements.name.value = user.name ?? '';
    adminHouseholdEditForm.elements.email.value = user.email ?? '';
    const parsedAddress = splitCalapeAddress(user.address, adminHouseholdEditForm.elements.barangay);
    adminHouseholdEditForm.elements.address.value = parsedAddress.addressLine;
    adminHouseholdEditForm.elements.barangay.value = parsedAddress.barangay;
    adminHouseholdEditForm.elements.phone.value = user.phone ?? '';
    adminHouseholdEditForm.elements.password.value = '';
    adminHouseholdEditForm.elements.password_confirmation.value = '';
    const accountStatus = String(user.account_status ?? 'active');
    const displayedAccountStatus = ['suspended', 'archived'].includes(accountStatus)
        ? accountStatus
        : user.is_active ? 'active' : 'inactive';
    adminHouseholdEditForm.elements.account_status.value = displayedAccountStatus;
    adminHouseholdEditForm.dataset.previousAccountStatus = displayedAccountStatus;

    const deviceSelect = adminHouseholdEditForm.elements.device_id;
    const assignedDevice = adminMunicipalDevices.find((device) => Number(device.household_id) === Number(user.id))
        ?? (Array.isArray(user.devices) ? user.devices[0] : null);
    adminHouseholdEditForm.dataset.currentDeviceId = assignedDevice?.id ?? '';
    const assignmentOptions = assignedDevice
        ? `<option value="">Keep current: ${escapeHtml(formatPersonalDisplay(assignedDevice.name, 'current meter'))} · ${escapeHtml(assignedDevice.asset_number ?? 'Meter')}</option><option value="__unassign">Unassign current meter</option>`
        : '<option value="">No meter currently assigned</option>';
    deviceSelect.innerHTML = assignmentOptions +
        adminMunicipalDevices
            .filter((device) => device.status !== 'decommissioned' && Number(device.id) !== Number(assignedDevice?.id))
            .map((device) => `<option value="${device.id}">${escapeHtml(formatPersonalDisplay(device.name))} · ${escapeHtml(device.asset_number)}${device.household_id && Number(device.household_id) !== Number(user.id) ? ' · assigned' : ''}</option>`)
            .join('');

    setAdminUserFormFeedback(adminHouseholdEditForm);
    setAdminUserFieldErrors(adminHouseholdEditForm);
    adminHouseholdEditForm.dataset.saving = '0';
    if (typeof adminHouseholdDialog.showModal === 'function') {
        adminHouseholdDialog.showModal();
    } else {
        adminHouseholdDialog.setAttribute('open', '');
    }
};

const closeAdminHouseholdDialog = () => {
    if (!adminHouseholdDialog) return;
    if (typeof adminHouseholdDialog.close === 'function') {
        adminHouseholdDialog.close();
    } else {
        adminHouseholdDialog.removeAttribute('open');
    }
};

const bindAdminHouseholdEditForm = () => {
    if (!adminHouseholdEditForm || adminHouseholdEditForm.dataset.bound === '1') return;

    adminHouseholdEditForm.dataset.bound = '1';
    $('[data-admin-household-dialog-close]')?.addEventListener('click', closeAdminHouseholdDialog);
    $('[data-admin-household-dialog-cancel]')?.addEventListener('click', closeAdminHouseholdDialog);

    adminHouseholdEditForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (adminHouseholdEditForm.dataset.saving === '1') return;

        const submitButton = $('[data-admin-household-edit-submit]', adminHouseholdEditForm);
        const userId = adminHouseholdEditForm.elements.user_id.value;
        const selectedAccountStatus = adminHouseholdEditForm.elements.account_status.value;
        const payload = {
            name: adminHouseholdEditForm.elements.name.value.trim(),
            email: adminHouseholdEditForm.elements.email.value.trim(),
            address: composeCalapeAddress(
                adminHouseholdEditForm.elements.address.value,
                adminHouseholdEditForm.elements.barangay.value,
            ),
            phone: adminHouseholdEditForm.elements.phone.value.trim(),
            is_active: selectedAccountStatus !== 'inactive',
            account_status: selectedAccountStatus === 'inactive' ? 'active' : selectedAccountStatus,
        };
        const password = adminHouseholdEditForm.elements.password.value;
        const passwordConfirmation = adminHouseholdEditForm.elements.password_confirmation.value;
        if (password || passwordConfirmation) {
            payload.password = password;
            payload.password_confirmation = passwordConfirmation;
        }

        const statusActions = {
            inactive: 'Deactivate',
            suspended: 'Suspend',
            archived: 'Archive',
        };
        if (adminHouseholdEditForm.dataset.previousAccountStatus === 'active'
            && selectedAccountStatus !== 'active'
            && !window.confirm(`${statusActions[selectedAccountStatus]} this household account? The user will no longer be able to sign in and existing sessions will be revoked.`)) {
            return;
        }

        const editErrors = {};
        if (!payload.name) editErrors.name = ['Full name is required.'];
        if (!payload.email) editErrors.email = ['Email address is required.'];
        else if (!/^\S+@\S+\.\S+$/.test(payload.email)) editErrors.email = ['Enter a valid email address.'];
        if (!adminHouseholdEditForm.elements.address.value.trim()) editErrors.address = ['House, street, or purok is required.'];
        if (!adminHouseholdEditForm.elements.barangay.value) editErrors.barangay = ['Select a barangay.'];
        if (password && password.length < 8) editErrors.password = ['Password must be at least 8 characters.'];
        if ((password || passwordConfirmation) && password !== passwordConfirmation) {
            editErrors.password_confirmation = ['Passwords do not match.'];
        }

        if (Object.keys(editErrors).length) {
            setAdminUserFieldErrors(adminHouseholdEditForm, editErrors);
            setAdminUserFormFeedback(adminHouseholdEditForm, 'Please correct the highlighted fields.', 'error');
            return;
        }

        adminHouseholdEditForm.dataset.saving = '1';
        adminHouseholdEditForm.setAttribute('aria-busy', 'true');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
        }
        setAdminUserFormFeedback(adminHouseholdEditForm, 'Saving household account changes...', 'loading');

        try {
            await requestJson(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(payload) });

            const selectedDeviceId = adminHouseholdEditForm.elements.device_id.value;
            const currentDeviceId = adminHouseholdEditForm.dataset.currentDeviceId;
            if (selectedDeviceId === '__unassign' && currentDeviceId) {
                await requestJson(`/api/municipal-devices/${currentDeviceId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ household_id: null }),
                });
            } else if (selectedDeviceId) {
                await requestJson(`/api/municipal-devices/${selectedDeviceId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ household_id: Number(userId) }),
                });
                if (currentDeviceId && Number(currentDeviceId) !== Number(selectedDeviceId)) {
                    await requestJson(`/api/municipal-devices/${currentDeviceId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ household_id: null }),
                    });
                }
            }

            closeAdminHouseholdDialog();
            showToast('Household account updated successfully.');
            await loadAdmin();
        } catch (error) {
            if (!handleAuthFailure(error)) {
                setAdminUserFormFeedback(adminHouseholdEditForm, errorMessage(error, 'Could not update the household account.'), 'error');
                showToast(errorMessage(error, 'Could not update the household account.'), 'error');
            }
        } finally {
            adminHouseholdEditForm.dataset.saving = '0';
            adminHouseholdEditForm.removeAttribute('aria-busy');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Save changes';
            }
        }
    });
};

const validateAdminUserForm = (form) => {
    const values = Object.fromEntries(new FormData(form).entries());
    const errors = {};
    const email = String(values.email ?? '').trim();

    if (!String(values.name ?? '').trim()) {
        errors.name = ['Name is required.'];
    }

    if (!email) {
        errors.email = ['Email address is required.'];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = ['Enter a valid email address.'];
    }

    if (!String(values.password ?? '')) {
        errors.password = ['Password is required.'];
    } else if (String(values.password).length < 8) {
        errors.password = ['Password must be at least 8 characters.'];
    }

    if (!String(values.address ?? '').trim()) {
        errors.address = ['House, street, or purok is required.'];
    }

    if (!String(values.barangay ?? '').trim()) {
        errors.barangay = ['Select a barangay.'];
    }

    return errors;
};

const bindAdminUserForm = (form) => {
    if (!form || form.dataset.bound === '1') return;

    form.dataset.bound = '1';
    const submitButton = $('[data-admin-user-submit]', form);
    const defaultButtonText = submitButton?.textContent.trim() ?? 'Create household user';

    form.querySelectorAll('input, select').forEach((field) => {
        field.addEventListener('input', () => setAdminUserFieldErrors(form, { [field.name]: '' }));
        field.addEventListener('change', () => setAdminUserFieldErrors(form, { [field.name]: '' }));
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (form.dataset.saving === '1') return;

        setAdminUserFieldErrors(form);
        const clientErrors = validateAdminUserForm(form);
        if (Object.keys(clientErrors).length) {
            setAdminUserFieldErrors(form, clientErrors);
            setAdminUserFormFeedback(form, 'Please correct the highlighted fields.', 'error');
            return;
        }

        const payload = Object.fromEntries(new FormData(form).entries());
        payload.address = composeCalapeAddress(payload.address, payload.barangay);
        delete payload.barangay;
        Object.keys(payload).forEach((key) => {
            if (payload[key] === '') delete payload[key];
        });

        form.dataset.saving = '1';
        form.setAttribute('aria-busy', 'true');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
        }
        setAdminUserFormFeedback(form, 'Saving household user account...', 'loading');

        try {
            const response = await requestJson('/api/household-users', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            form.reset();
            setAdminUserFieldErrors(form);
            setAdminUserFormFeedback(form, response?.message ?? 'Household user account created successfully. The user can now log in.');
            showToast(response?.message ?? 'Household user account created successfully. The user can now log in.');
            householdUserState.page = 1;

            try {
                await loadAdminUsers({ householdsOnly: true });
            } catch (refreshError) {
                showToast('Account created, but the customer list could not be refreshed.', 'error');
            }
        } catch (error) {
            if (handleAuthFailure(error)) return;

            const payload = errorPayload(error);
            setAdminUserFieldErrors(form, payload.errors ?? {});
            setAdminUserFormFeedback(form, errorMessage(error, 'Could not create the household user account.'), 'error');
            showToast(errorMessage(error, 'Could not create the household user account.'), 'error');
        } finally {
            form.dataset.saving = '0';
            form.removeAttribute('aria-busy');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = defaultButtonText;
            }
        }
    });
};

const readToken = () => localStorage.getItem(tokenKey) ?? '';
const persistToken = (value) => {
    if (value) {
        localStorage.setItem(tokenKey, value);
    } else {
        localStorage.removeItem(tokenKey);
    }
};

const readSessionUser = () => {
    try {
        const user = JSON.parse(sessionStorage.getItem(sessionUserKey) ?? 'null');
        return user?.id ? user : null;
    } catch {
        return null;
    }
};

const persistSessionUser = (user) => {
    try {
        if (user?.id) {
            sessionStorage.setItem(sessionUserKey, JSON.stringify({
                id: user.id,
                role: user.role,
                email: user.email,
            }));
        }
    } catch {
        // Storage can be unavailable in hardened/private browsing contexts.
    }
};

const dashboardCacheKey = (url) => {
    const user = readSessionUser();
    return user?.id ? `${dashboardCachePrefix}:${user.id}:${url}` : '';
};

const readDashboardCache = (url, key = dashboardCacheKey(url)) => {
    if (!key) return null;

    try {
        const entry = JSON.parse(sessionStorage.getItem(key) ?? 'null');
        if (!entry || Date.now() - Number(entry.storedAt ?? 0) > DASHBOARD_CACHE_STALE_MS) {
            sessionStorage.removeItem(key);
            return null;
        }
        return entry.payload;
    } catch {
        return null;
    }
};

const writeDashboardCache = (url, payload, key = dashboardCacheKey(url)) => {
    if (!key || payload === undefined) return;

    try {
        sessionStorage.setItem(key, JSON.stringify({ storedAt: Date.now(), payload }));
    } catch {
        // A full storage quota should never prevent fresh dashboard rendering.
    }
};

const clearDashboardCache = () => {
    const user = readSessionUser();
    if (!user?.id) return;
    const prefix = `${dashboardCachePrefix}:${user.id}:`;

    try {
        Object.keys(sessionStorage)
            .filter((key) => key.startsWith(prefix))
            .forEach((key) => sessionStorage.removeItem(key));
    } catch {
        // Ignore unavailable session storage.
    }
};

const isDashboardCacheable = (url, options = {}) => {
    const method = String(options.method ?? 'GET').toUpperCase();
    const dashboardContext = options.cacheScope === 'dashboard' || page === 'household' || page === 'admin';
    const excluded = url === '/api/me'
        || url === '/api/account'
        || url.startsWith('/api/live-')
        || url.startsWith('/api/system-health')
        || url.startsWith('/api/exports/');

    return method === 'GET' && dashboardContext && readToken() && url.startsWith('/api/') && !excluded;
};

const authHeaders = () => {
    const token = readToken();

    return token
        ? {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
          }
        : {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          };
};

const REQUEST_TIMEOUT_MS = 15000;
const BILLING_REQUEST_TIMEOUT_MS = 30000;

const requestJsonFromNetwork = async (url, options = {}) => {
    const requestOptions = { ...options };
    const timeoutMs = Number(requestOptions.timeout ?? REQUEST_TIMEOUT_MS);
    delete requestOptions.timeout;
    delete requestOptions.cacheScope;
    delete requestOptions.forceNetwork;
    const timeoutController = requestOptions.signal ? null : new AbortController();
    if (timeoutController) requestOptions.signal = timeoutController.signal;
    const timeoutId = timeoutController && timeoutMs > 0
        ? window.setTimeout(() => timeoutController.abort(), timeoutMs)
        : null;
    let response;

    try {
        response = await fetch(url, {
            ...requestOptions,
            headers: {
                ...authHeaders(),
                ...(requestOptions.headers ?? {}),
            },
        });
    } catch (error) {
        if (error?.name === 'AbortError' && timeoutController?.signal.aborted) {
            const timeoutError = new Error('The server took too long to respond. Please try again.');
            timeoutError.status = 408;
            timeoutError.code = 'request_timeout';
            throw timeoutError;
        }
        throw error;
    } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
    }

    if (!response.ok) {
        const text = await response.text();
        const error = new Error(text || response.statusText);
        error.status = response.status;
        throw error;
    }

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    return contentType.includes('application/json') ? response.json() : response.text();
};

const requestJson = async (url, options = {}) => {
    const method = String(options.method ?? 'GET').toUpperCase();
    const cacheable = isDashboardCacheable(url, options);
    const cacheKey = cacheable ? dashboardCacheKey(url) : '';
    const forceNetwork = options.forceNetwork === true || dashboardCacheForceNetwork;
    const cached = cacheable && !forceNetwork ? readDashboardCache(url, cacheKey) : null;

    if (cached !== null) {
        if (!dashboardCacheRevalidations.has(cacheKey)) {
            const revalidation = requestJsonFromNetwork(url, options)
                .then((payload) => writeDashboardCache(url, payload, cacheKey))
                .catch(() => {})
                .finally(() => dashboardCacheRevalidations.delete(cacheKey));
            dashboardCacheRevalidations.set(cacheKey, revalidation);
        }
        return cached;
    }

    const payload = await requestJsonFromNetwork(url, options);
    if (url === '/api/me' && payload?.data) persistSessionUser(payload.data);
    if (cacheable) writeDashboardCache(url, payload, cacheKey);
    if (method !== 'GET' && !['/api/login', '/api/logout', '/api/register'].includes(url)) clearDashboardCache();

    return payload;
};

const buildQuery = (params) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, value);
        }
    });

    const query = searchParams.toString();
    return query ? `?${query}` : '';
};

const analyticsQuery = (select, fromInput, toInput, fallback) => buildQuery({
    range: select?.value || fallback,
    from: select?.value === 'custom' ? fromInput?.value : '',
    to: select?.value === 'custom' ? toInput?.value : '',
});

const updateCustomAnalyticsRange = (select, container) => {
    if (!select || !container) return;
    const isCustom = select.value === 'custom';
    container.hidden = !isCustom;
    select.setAttribute('aria-expanded', String(isCustom));
};

const setHouseholdCustomRangeOpen = (isOpen) => {
    if (!householdAnalyticsRange || !householdAnalyticsCustom) return;
    const shouldOpen = Boolean(isOpen) && householdAnalyticsRange.value === 'custom';
    householdAnalyticsCustom.hidden = !shouldOpen;
    householdAnalyticsRange.setAttribute('aria-expanded', String(shouldOpen));
    householdAnalyticsCustomToggle?.setAttribute('aria-expanded', String(shouldOpen));
};

const responseItems = (response) => {
    if (Array.isArray(response?.data?.data)) {
        return response.data.data;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.data?.items)) {
        return response.data.items;
    }

    if (Array.isArray(response?.items)) {
        return response.items;
    }

    return [];
};

const responsePaginator = (response) => {
    if (response?.data?.current_page) {
        return response.data;
    }

    if (response?.current_page) {
        return response;
    }

    return null;
};

const renderPager = (container, paginator, onPageChange) => {
    if (!container) {
        return;
    }

    if (!paginator?.total) {
        container.innerHTML = '';
        return;
    }

    const from = paginator.from ?? 0;
    const to = paginator.to ?? 0;
    const currentPage = paginator.current_page ?? 1;
    const lastPage = paginator.last_page ?? 1;

    container.innerHTML = `
        <div class="subtle">Showing ${from} to ${to} of ${paginator.total} records</div>
        <div class="pager-group">
            <button type="button" ${currentPage <= 1 ? 'disabled' : ''} data-page="prev">Previous</button>
            <button type="button" ${currentPage >= lastPage ? 'disabled' : ''} data-page="next">Next</button>
        </div>
    `;

    container.querySelectorAll('button[data-page]').forEach((button) => {
        button.addEventListener('click', () => {
            if (button.dataset.page === 'prev' && currentPage > 1) {
                onPageChange(currentPage - 1);
            }

            if (button.dataset.page === 'next' && currentPage < lastPage) {
                onPageChange(currentPage + 1);
            }
        });
    });
};

const renderHouseholdAreaChart = (container, series, options = {}) => {
    if (!container) return;
    observeChartWidth(container, () => renderHouseholdAreaChart(container, series, options));
    const width = responsiveChartWidth(container);

    const rows = (Array.isArray(series) ? series : []).map((row) => {
        const readingCount = row.reading_count === undefined || row.reading_count === null
            ? null
            : Number(row.reading_count);
        const value = Number(row.total_cubic_meter ?? row.consumption ?? 0);

        return {
            label: String(row.label ?? row.period ?? row.month ?? ''),
            value: Number.isFinite(value) ? value : 0,
            hasReading: readingCount === null ? value > 0 : readingCount > 0,
        };
    });
    const actualIndexes = rows.reduce((indexes, row, index) => {
        if (row.hasReading) indexes.push(index);
        return indexes;
    }, []);
    const hasData = options.dataAvailable ?? actualIndexes.length > 0;
    const emptyMarkup = options.emptyMessage ?? '<div class="empty-state">No consumption history available yet.</div>';

    if (!hasData || !actualIndexes.length) {
        container.classList.add('is-empty');
        container.dataset.chartSignature = JSON.stringify({ rows, state: 'empty' });
        if (options.showEmptyChart) {
            const height = 320;
            const padding = { top: 22, right: 20, bottom: 42, left: 58 };
            const plotBottom = height - padding.bottom;
            const grid = [0, 1 / 3, 2 / 3, 1].map((ratio) => {
                const y = padding.top + (1 - ratio) * (plotBottom - padding.top);
                return `<line class="area-chart-grid-line" x1="${padding.left}" x2="${width - padding.right}" y1="${y}" y2="${y}"></line>`;
            }).join('');

            container.classList.add('has-empty-chart');
            container.innerHTML = `
                <div class="area-chart-shell area-chart-empty-shell">
                    <svg class="area-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Consumption trend chart with no readings in the selected period">
                        <g class="area-chart-grid">${grid}</g>
                        <text class="area-chart-y-label" x="${padding.left - 10}" y="${plotBottom + 4}" text-anchor="end">0</text>
                        <text class="area-chart-axis-unit" x="${padding.left}" y="${padding.top - 7}">m³</text>
                        <path class="area-chart-line area-chart-zero-line" d="M ${padding.left} ${plotBottom} L ${width - padding.right} ${plotBottom}"></path>
                    </svg>
                    <div class="area-chart-empty-overlay">${emptyMarkup}</div>
                </div>`;
        } else {
            container.classList.remove('has-empty-chart');
            container.innerHTML = emptyMarkup;
        }
        return;
    }

    container.classList.remove('is-empty', 'has-empty-chart');
    const chartRows = actualIndexes.map((index) => rows[index]);
    const signature = JSON.stringify({ chartRows, state: 'area', width });
    if (container.dataset.chartSignature === signature) return;
    container.dataset.chartSignature = signature;

    const height = 320;
    const padding = { top: 22, right: 20, bottom: 52, left: 58 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...chartRows.filter((row) => row.hasReading).map((row) => row.value), 0);
    const domainMax = maxValue > 0 ? maxValue * 1.15 : 1;
    const xFor = (index) => chartRows.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (index / (chartRows.length - 1)) * plotWidth;
    const yFor = (value) => padding.top + plotHeight - (value / domainMax) * plotHeight;
    const points = chartRows.map((row, index) => row.hasReading
        ? { x: xFor(index), y: yFor(row.value), row }
        : null);
    const segments = [];
    let segment = [];
    points.forEach((point) => {
        if (point) {
            segment.push(point);
        } else if (segment.length) {
            segments.push(segment);
            segment = [];
        }
    });
    if (segment.length) segments.push(segment);

    const linePath = segments.map((items) => items.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')).join(' ');
    const areaPath = segments.map((items) => {
        const first = items[0];
        const last = items[items.length - 1];
        return `M ${first.x.toFixed(2)} ${(padding.top + plotHeight).toFixed(2)} ${items.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')} L ${last.x.toFixed(2)} ${(padding.top + plotHeight).toFixed(2)} Z`;
    }).join(' ');
    const grid = [0, 1 / 3, 2 / 3, 1].map((ratio) => {
        const y = padding.top + plotHeight - ratio * plotHeight;
        return `<line class="area-chart-grid-line" x1="${padding.left}" x2="${width - padding.right}" y1="${y}" y2="${y}"></line><text class="area-chart-y-label" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${escapeHtml(formatNumber(domainMax * ratio))}</text>`;
    }).join('');
    const xLabelIndexes = [...new Set(width < 480 ? [0, chartRows.length - 1] : [0, Math.floor((chartRows.length - 1) / 2), chartRows.length - 1])];
    const xLabels = xLabelIndexes.map((index) => `<text class="area-chart-x-label" x="${xFor(index)}" y="${height - 17}" text-anchor="${chartRows.length === 1 ? 'middle' : index === 0 ? 'start' : index === chartRows.length - 1 ? 'end' : 'middle'}">${escapeHtml(chartRows[index].label)}</text>`).join('');
    const pointMarkup = points.filter(Boolean).map((point) => `
        <circle class="area-chart-point" cx="${point.x}" cy="${point.y}" r="4" tabindex="0" role="button"
            data-chart-label="${escapeHtml(point.row.label)}"
            data-chart-value="${escapeHtml(formatCubicMeterValue(point.row.value))}"
            aria-label="${escapeHtml(`${point.row.label}: ${formatCubicMeterValue(point.row.value)}`)}"></circle>
    `).join('');
    const wasAnimated = container.classList.contains('is-animated');
    container.classList.remove('is-animated');
    container.innerHTML = `
        <div class="area-chart-shell">
            <svg class="area-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly household water consumption trend">
                <g class="area-chart-grid">${grid}</g>
                <path class="area-chart-area" d="${areaPath}"></path>
                <path class="area-chart-line" d="${linePath}"></path>
                <g class="area-chart-points">${pointMarkup}</g>
                <g class="area-chart-x-labels">${xLabels}</g>
            </svg>
            <div class="area-chart-tooltip" data-chart-tooltip role="status" hidden></div>
        </div>
    `;

    const shell = $('.area-chart-shell', container);
    const tooltip = $('[data-chart-tooltip]', container);
    const showTooltip = (point) => {
        if (!tooltip || !shell) return;
        tooltip.textContent = `${point.dataset.chartLabel}: ${point.dataset.chartValue}`;
        tooltip.hidden = false;
        const shellRect = shell.getBoundingClientRect();
        const chartRect = $('.area-line-chart', shell).getBoundingClientRect();
        const x = ((Number(point.getAttribute('cx')) / width) * chartRect.width) + (chartRect.left - shellRect.left);
        const y = ((Number(point.getAttribute('cy')) / height) * chartRect.height) + (chartRect.top - shellRect.top);
        tooltip.style.left = `${Math.max(8, Math.min(shellRect.width - tooltip.offsetWidth - 8, x - tooltip.offsetWidth / 2))}px`;
        tooltip.style.top = `${Math.max(8, y - tooltip.offsetHeight - 12)}px`;
    };
    $$('.area-chart-point', container).forEach((point) => {
        point.addEventListener('pointerenter', () => showTooltip(point));
        point.addEventListener('focus', () => showTooltip(point));
        point.addEventListener('click', () => showTooltip(point));
        point.addEventListener('pointerleave', (event) => {
            if (event.pointerType !== 'touch' && tooltip) tooltip.hidden = true;
        });
    });

    if (wasAnimated) {
        container.classList.add('is-animated');
    } else if (container.closest('.dashboard-view')?.classList.contains('is-active')) {
        observeHouseholdChart(container);
    }
};

const renderHouseholdTrendAreaChart = (container, series, options = {}) => {
    if (!container) return;
    observeChartWidth(container, () => renderHouseholdTrendAreaChart(container, series, options));
    const width = responsiveChartWidth(container);

    const rows = (Array.isArray(series) ? series : []).map((row) => {
        const rawValue = row.cubic_meters ?? row.total_cubic_meter ?? row.consumption ?? null;
        const value = rawValue === null || rawValue === undefined ? null : Number(rawValue);
        const hasReading = row.has_data === undefined
            ? (row.reading_count === undefined ? Number.isFinite(value) : Number(row.reading_count) > 0)
            : row.has_data === true;

        return {
            label: String(row.short_label ?? row.label ?? row.period ?? ''),
            tooltipLabel: String(row.label ?? row.period ?? ''),
            value: Number.isFinite(value) ? value : 0,
            liters: row.liters === null || row.liters === undefined ? (Number.isFinite(value) ? value * 1000 : 0) : Number(row.liters),
            hasReading,
        };
    });
    const actualIndexes = rows.reduce((indexes, row, index) => {
        if (row.hasReading) indexes.push(index);
        return indexes;
    }, []);
    const hasData = options.dataAvailable ?? actualIndexes.length > 0;
    const emptyMarkup = options.emptyMessage ?? '<div class="chart-empty-state"><strong>No consumption history available yet.</strong></div>';

    if (!hasData || !actualIndexes.length) {
        container.classList.add('is-empty');
        container.classList.remove('is-single-point');
        container.dataset.chartSignature = JSON.stringify({ rows, state: 'empty' });
        container.innerHTML = emptyMarkup;
        return;
    }

    container.classList.remove('is-empty');
    container.classList.toggle('is-single-point', actualIndexes.length === 1);
    const signature = JSON.stringify({ rows, state: 'area', period: options.period ?? '', width });
    if (container.dataset.chartSignature === signature) return;
    container.dataset.chartSignature = signature;

    const height = actualIndexes.length === 1 ? 260 : 320;
    container.style.setProperty('--chart-height', `${height}px`);
    const padding = { top: 28, right: 20, bottom: 52, left: 70 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...actualIndexes.map((index) => rows[index].value), 0);
    const domainMax = maxValue > 0 ? maxValue * 1.15 : 1;
    const xFor = (index) => rows.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (index / (rows.length - 1)) * plotWidth;
    const yFor = (value) => padding.top + plotHeight - (value / domainMax) * plotHeight;
    const points = rows.map((row, index) => row.hasReading ? { x: xFor(index), y: yFor(row.value), row } : null);
    const segments = [];
    let segment = [];
    points.forEach((point) => {
        if (point) segment.push(point);
        else if (segment.length) {
            segments.push(segment);
            segment = [];
        }
    });
    if (segment.length) segments.push(segment);
    const linePath = segments.map((items) => items.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')).join(' ');
    const areaPath = segments.map((items) => {
        const first = items[0];
        const last = items.at(-1);
        return `M ${first.x.toFixed(2)} ${(padding.top + plotHeight).toFixed(2)} ${items.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')} L ${last.x.toFixed(2)} ${(padding.top + plotHeight).toFixed(2)} Z`;
    }).join(' ');
    const grid = [0, 0.5, 1].map((ratio) => {
        const y = padding.top + plotHeight - ratio * plotHeight;
        return `<line class="area-chart-grid-line" x1="${padding.left}" x2="${width - padding.right}" y1="${y}" y2="${y}"></line><text class="area-chart-y-label" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${escapeHtml(formatNumber(domainMax * ratio))}</text>`;
    }).join('');
    const xLabelIndexes = [...new Set(width < 480 ? [0, rows.length - 1] : [0, Math.floor((rows.length - 1) / 2), rows.length - 1])];
    const xLabels = xLabelIndexes.map((index) => `<text class="area-chart-x-label" x="${xFor(index)}" y="${height - 17}" text-anchor="${rows.length === 1 ? 'middle' : index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle'}">${escapeHtml(rows[index].label)}</text>`).join('');
    const pointMarkup = points.filter(Boolean).map((point) => {
        const valueText = `${formatNumber(point.row.value)} m³`;
        const litersText = `${formatNumber(point.row.liters, 2)} L`;
        return `<circle class="area-chart-point" cx="${point.x}" cy="${point.y}" r="4" tabindex="0" role="button" data-chart-label="${escapeHtml(point.row.tooltipLabel)}" data-chart-value="${escapeHtml(valueText)}" data-chart-liters="${escapeHtml(litersText)}" aria-label="${escapeHtml(`${point.row.tooltipLabel}: ${valueText}, equivalent ${litersText}`)}"></circle>`;
    }).join('');
    const wasAnimated = container.classList.contains('is-animated');
    container.classList.remove('is-animated');
    container.innerHTML = `<div class="area-chart-shell"><svg class="area-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(options.title ?? 'Household water consumption trend')}"><g class="area-chart-grid">${grid}</g><text class="area-chart-axis-unit" x="${padding.left}" y="18">Consumption (m³)</text><path class="area-chart-area" d="${areaPath}"></path><path class="area-chart-line" d="${linePath}"></path><g class="area-chart-points">${pointMarkup}</g><g class="area-chart-x-labels">${xLabels}</g></svg><div class="area-chart-tooltip" data-chart-tooltip role="status" hidden></div></div>`;

    const shell = $('.area-chart-shell', container);
    const tooltip = $('[data-chart-tooltip]', container);
    const showTooltip = (point) => {
        if (!tooltip || !shell) return;
        tooltip.innerHTML = `<strong>${escapeHtml(point.dataset.chartLabel)}</strong><span>Consumption: ${escapeHtml(point.dataset.chartValue)}</span><span>Equivalent: ${escapeHtml(point.dataset.chartLiters)}</span>`;
        tooltip.hidden = false;
        const shellRect = shell.getBoundingClientRect();
        const chartRect = $('.area-line-chart', shell).getBoundingClientRect();
        const x = ((Number(point.getAttribute('cx')) / width) * chartRect.width) + (chartRect.left - shellRect.left);
        const y = ((Number(point.getAttribute('cy')) / height) * chartRect.height) + (chartRect.top - shellRect.top);
        tooltip.style.left = `${Math.max(8, Math.min(shellRect.width - tooltip.offsetWidth - 8, x - tooltip.offsetWidth / 2))}px`;
        tooltip.style.top = `${Math.max(8, y - tooltip.offsetHeight - 12)}px`;
    };
    $$('.area-chart-point', container).forEach((point) => {
        point.addEventListener('pointerenter', () => showTooltip(point));
        point.addEventListener('focus', () => showTooltip(point));
        point.addEventListener('click', () => showTooltip(point));
        point.addEventListener('pointerleave', (event) => {
            if (event.pointerType !== 'touch' && tooltip) tooltip.hidden = true;
        });
    });

    if (wasAnimated) container.classList.add('is-animated');
    else if (container.closest('.dashboard-view')?.classList.contains('is-active')) observeHouseholdChart(container);
};

const liveChartTimestamp = (value, timezone = liveChartState.timezone) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';

    const time = date.toLocaleTimeString(undefined, {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
    });
    const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
    const readingDay = date.toLocaleDateString('en-CA', { timeZone: timezone });

    return readingDay === today
        ? time
        : `${date.toLocaleDateString(undefined, { timeZone: timezone, month: 'short', day: 'numeric' })} ${time}`;
};

const liveChartReadingKey = (reading) => String(reading?.id ?? reading?.reading_id ?? reading?.recorded_at ?? '');

const liveChartTooltip = (reading) => {
    const total = reading?.total_liters === null || reading?.total_liters === undefined
        ? ''
        : `<div>Total: ${formatNumber(reading.total_liters, 4)} L</div>`;

    return `<strong>${escapeHtml(liveChartTimestamp(reading?.recorded_at))}</strong>
        <div>Flow: ${formatNumber(reading?.flow_rate, 2)} L/min</div>
        <div>Interval: ${formatNumber(reading?.liters_used, 4)} L</div>${total}`;
};

const ensureLiveChart = (container) => {
    if (liveChartState.chart?.container === container) return liveChartState.chart;

    const width = 760;
    const height = 320;
    const padding = { top: 28, right: 20, bottom: 54, left: 74 };
    container.innerHTML = `
        <div class="area-chart-shell live-chart-shell">
            <svg class="area-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Real-time interval water consumption trend">
                <g class="area-chart-grid"></g>
                <text class="area-chart-axis-unit" x="${padding.left}" y="18">Interval consumption (L)</text>
                <g class="area-chart-y-labels"></g>
                <path class="area-chart-area"></path>
                <path class="area-chart-line"></path>
                <g class="area-chart-points"></g>
                <g class="area-chart-x-labels"></g>
            </svg>
            <div class="area-chart-tooltip" data-live-chart-tooltip role="status" hidden></div>
        </div>
        <div class="live-chart-note" data-live-chart-note hidden>Waiting for more readings to generate a trend.</div>
        <div class="chart-empty-state" data-live-chart-empty hidden><strong>No live consumption data received yet.</strong></div>
    `;

    const svg = $('.area-line-chart', container);
    const chart = {
        container,
        svg,
        shell: $('.live-chart-shell', container),
        grid: $('.area-chart-grid', container),
        yLabels: $('.area-chart-y-labels', container),
        xLabels: $('.area-chart-x-labels', container),
        area: $('.area-chart-area', container),
        line: $('.area-chart-line', container),
        points: $('.area-chart-points', container),
        tooltip: $('[data-live-chart-tooltip]', container),
        empty: $('[data-live-chart-empty]', container),
        note: $('[data-live-chart-note]', container),
        width,
        height,
        padding,
        tooltipReadings: new Map(),
    };

    const showTooltip = (point) => {
        const reading = chart.tooltipReadings.get(point.dataset.key);
        if (!reading || !chart.tooltip) return;
        chart.tooltip.innerHTML = liveChartTooltip(reading);
        chart.tooltip.hidden = false;
        const shellRect = chart.shell.getBoundingClientRect();
        const chartRect = chart.svg.getBoundingClientRect();
        const x = (Number(point.getAttribute('cx')) / chart.width) * chartRect.width + (chartRect.left - shellRect.left);
        const y = (Number(point.getAttribute('cy')) / chart.height) * chartRect.height + (chartRect.top - shellRect.top);
        chart.tooltip.style.left = `${Math.max(8, Math.min(shellRect.width - chart.tooltip.offsetWidth - 8, x - chart.tooltip.offsetWidth / 2))}px`;
        chart.tooltip.style.top = `${Math.max(8, y - chart.tooltip.offsetHeight - 12)}px`;
    };

    svg.addEventListener('pointerover', (event) => {
        const point = event.target.closest?.('.area-chart-point');
        if (point) showTooltip(point);
    });
    svg.addEventListener('focusin', (event) => {
        const point = event.target.closest?.('.area-chart-point');
        if (point) showTooltip(point);
    });
    svg.addEventListener('click', (event) => {
        const point = event.target.closest?.('.area-chart-point');
        if (point) showTooltip(point);
    });
    svg.addEventListener('pointerout', (event) => {
        if (!event.relatedTarget?.closest?.('.area-chart-point')) chart.tooltip.hidden = true;
    });

    liveChartState.chart = chart;
    return chart;
};

const renderLiveConsumptionChart = (readings = []) => {
    const container = $('[data-live-consumption-chart]');
    if (!container) return;
    observeChartWidth(container, () => renderLiveConsumptionChart(readings));

    const chart = ensureLiveChart(container);
    chart.width = responsiveChartWidth(container);
    chart.svg.setAttribute('viewBox', `0 0 ${chart.width} ${chart.height}`);
    const rows = Array.isArray(readings) ? readings : [];
    const hasConsumption = rows.some((reading) => Number(reading?.liters_used ?? 0) > 0);
    const legend = container.closest('.chart-panel')?.querySelector('[data-live-chart-legend]');

    if (!hasConsumption) {
        const hasReadings = rows.length > 0;
        chart.shell.hidden = true;
        chart.empty.hidden = false;
        chart.empty.innerHTML = hasReadings
            ? '<strong>No water use recorded in these readings.</strong><span>The meter is reporting normally; no water flowed during this time.</span>'
            : '<strong>No live readings received yet.</strong><span>Connect the meter and wait for it to send a reading.</span>';
        chart.note.hidden = true;
        if (legend) legend.hidden = true;
        container.classList.add('is-empty');
        return;
    }

    if (legend) legend.hidden = false;
    const plotWidth = chart.width - chart.padding.left - chart.padding.right;
    const plotHeight = chart.height - chart.padding.top - chart.padding.bottom;
    const maxValue = Math.max(...rows.map((reading) => Number(reading.liters_used ?? 0)), 0);
    const domainMax = maxValue > 0 ? maxValue * 1.15 : 1;
    const xFor = (index) => rows.length === 1
        ? chart.padding.left + plotWidth / 2
        : chart.padding.left + (index / (rows.length - 1)) * plotWidth;
    const yFor = (value) => chart.padding.top + plotHeight - (Number(value || 0) / domainMax) * plotHeight;
    const points = rows.map((reading, index) => ({
        reading,
        x: xFor(index),
        y: yFor(reading.liters_used),
    }));

    chart.grid.innerHTML = [0, 1 / 3, 2 / 3, 1].map((ratio) => {
        const y = chart.padding.top + plotHeight - ratio * plotHeight;
        return `<line class="area-chart-grid-line" x1="${chart.padding.left}" x2="${chart.width - chart.padding.right}" y1="${y}" y2="${y}"></line>`;
    }).join('');
    chart.yLabels.innerHTML = [0, 1 / 3, 2 / 3, 1].map((ratio) => {
        const y = chart.padding.top + plotHeight - ratio * plotHeight;
        return `<text class="area-chart-y-label" x="${chart.padding.left - 10}" y="${y + 4}" text-anchor="end">${escapeHtml(formatNumber(domainMax * ratio, 4))}</text>`;
    }).join('');

    const linePath = points.length > 1
        ? points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
        : '';
    const areaPath = points.length > 1
        ? `M ${points[0].x.toFixed(2)} ${(chart.padding.top + plotHeight).toFixed(2)} ${points.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')} L ${points.at(-1).x.toFixed(2)} ${(chart.padding.top + plotHeight).toFixed(2)} Z`
        : '';
    chart.line.setAttribute('d', linePath);
    chart.area.setAttribute('d', areaPath);
    chart.tooltipReadings = new Map(points.map((point) => [liveChartReadingKey(point.reading), point.reading]));

    chart.points.replaceChildren(...points.map((point) => {
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        marker.setAttribute('class', 'area-chart-point');
        marker.setAttribute('cx', point.x.toFixed(2));
        marker.setAttribute('cy', point.y.toFixed(2));
        marker.setAttribute('r', '3.5');
        marker.setAttribute('tabindex', '0');
        marker.setAttribute('role', 'button');
        marker.setAttribute('aria-label', `${liveChartTimestamp(point.reading.recorded_at)}: ${formatNumber(point.reading.liters_used, 4)} L interval consumption`);
        marker.dataset.key = liveChartReadingKey(point.reading);
        return marker;
    }));

    const labelIndexes = [...new Set(chart.width < 480 ? [rows.length - 1] : [0, Math.floor((rows.length - 1) / 2), rows.length - 1])];
    chart.xLabels.innerHTML = labelIndexes.map((index) => `<text class="area-chart-x-label" x="${xFor(index)}" y="${chart.height - 17}" text-anchor="${rows.length === 1 ? 'middle' : index === rows.length - 1 ? 'end' : index === 0 ? 'start' : 'middle'}">${escapeHtml(liveChartTimestamp(rows[index]?.recorded_at))}</text>`).join('');
    chart.shell.hidden = rows.length === 0;
    chart.empty.hidden = rows.length !== 0;
    chart.note.hidden = rows.length !== 1;
    container.classList.remove('is-empty');
};

const renderLiveConsumptionSummary = (response) => {
    const latest = response?.latest;
    const status = response?.status?.value ?? 'offline';
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    setText('[data-live-latest-flow]', latest ? `${formatNumber(latest.flow_rate, 2)} L/min` : '--');
    setText('[data-live-latest-interval]', latest ? `${formatNumber(latest.liters_used, 4)} L` : '--');
    setText('[data-live-total-consumption]', latest ? `${formatNumber(response.total_recorded_liters, 4)} L` : '--');
    setText('[data-live-last-reading]', latest ? liveChartTimestamp(latest.recorded_at) : '--');
    setText('[data-live-chart-status]', statusLabel);
    setText('[data-current-flow]', latest ? `${formatNumber(latest.flow_rate, 2)} L/min` : '--');
    const lastReading = latest?.recorded_at ? ` Last reading: ${liveChartTimestamp(latest.recorded_at)}.` : '';
    setText('[data-flow-state]', !latest
        ? 'No meter reading received yet.'
        : status !== 'live'
            ? `Meter is ${statusLabel.toLowerCase()}.${lastReading}`
            : Number(latest.flow_rate) > 0
                ? 'Water is currently flowing.'
                : 'Meter is online. No active water flow detected.');
    $$('[data-live-chart-status]').forEach((node) => {
        node.classList.toggle('status-pill-live', status === 'live');
        node.classList.toggle('status-pill-soft', status === 'live');
        node.classList.toggle('status-pill-warning', status === 'delayed');
        node.classList.toggle('status-pill-inactive', status === 'offline');
    });
};

const applyLiveConsumptionResponse = (response) => {
    liveChartState.timezone = response?.timezone || liveChartState.timezone;
    const incoming = Array.isArray(response?.readings) ? response.readings : [];
    const readingsByKey = new Map();
    [...liveChartState.readings, ...incoming].forEach((reading) => {
        const key = liveChartReadingKey(reading);
        if (key) readingsByKey.set(key, reading);
    });
    liveChartState.readings = [...readingsByKey.values()]
        .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at) || Number(a.id || 0) - Number(b.id || 0))
        .slice(-30);
    renderLiveConsumptionSummary(response);
    renderLiveConsumptionChart(liveChartState.readings);
    liveChartState.error = false;
    const feedback = $('[data-live-chart-feedback]');
    if (feedback) {
        feedback.hidden = true;
        feedback.textContent = '';
        feedback.classList.remove('is-error');
    }
};

const markLiveConsumptionUnavailable = () => {
    liveChartState.error = true;
    const feedback = $('[data-live-chart-feedback]');
    if (!feedback) return;
    feedback.hidden = false;
    feedback.textContent = 'Unable to retrieve the latest reading. Retrying…';
    feedback.classList.add('is-error');
};

const renderMonthlyChart = (container, series, options = {}) => {
    if (!container) {
        return;
    }

    if (container.matches('[data-household-monthly-chart]')) {
        renderHouseholdTrendAreaChart(container, series, options);
        return;
    }

    const rows = Array.isArray(series) ? series : [];
    const hasBills = options.hasBills ?? false;
    const hasData = options.dataAvailable ?? rows.some((row) => Number(row.total_cubic_meter ?? 0) > 0 || Number(row.estimated_bill ?? 0) > 0);
    const chartRows = (hasData ? rows.filter((row) => row.reading_count === undefined || Number(row.reading_count) > 0) : []).slice(-3);
    const maxUsage = Math.max(...chartRows.map((row) => Number(row.total_cubic_meter ?? 0)), 0);
    const maxBill = Math.max(...chartRows.map((row) => Number(row.estimated_bill ?? 0)), 0);

    if (!chartRows.length) {
        container.innerHTML = options.emptyMessage ?? '<div class="empty-state">No monthly usage available yet.</div>';
        return;
    }

    const signature = JSON.stringify({ chartRows, hasBills });
    if (container.dataset.chartSignature === signature) return;
    container.dataset.chartSignature = signature;
    const wasAnimated = container.classList.contains('is-animated');
    container.classList.remove('is-animated');
    container.innerHTML = `<div class="vertical-chart-grid">${chartRows
        .map((row) => {
            const usage = Number(row.total_cubic_meter ?? 0);
            const bill = Number(row.estimated_bill ?? 0);
            const usageHeight = maxUsage > 0 ? Math.max((usage / maxUsage) * 100, usage > 0 ? 5 : 0) : 0;
            const billHeight = maxBill > 0 ? Math.max((bill / maxBill) * 100, bill > 0 ? 5 : 0) : 0;

            return `
                <div class="chart-month" title="${row.label}: ${formatCubicMeterValue(usage)}${hasBills ? `, ${formatCurrency(bill)}` : ''}">
                    <div class="vertical-bars">
                        <span class="vertical-bar usage-bar" style="--bar-height:${usageHeight}%"><i>${formatCubicMeterValue(usage)}</i></span>
                        ${hasBills ? `<span class="vertical-bar bill-bar" style="--bar-height:${billHeight}%"><i>${formatCurrency(bill)}</i></span>` : ''}
                    </div>
                    <strong>${row.label}</strong>
                </div>
            `;
        })
        .join('')}</div>`;

    if (wasAnimated) {
        container.classList.add('is-animated');
    } else if (container.closest('.dashboard-view')?.classList.contains('is-active')) {
        if (container.matches('[data-household-monthly-chart]')) {
            observeHouseholdChart(container);
        } else {
            observeAdminChart(container);
        }
    }
};

const observeHouseholdChart = (chart) => {
    householdChartObserver?.disconnect();
    householdChartObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                entry.target.classList.add('is-animated');
                householdChartObserver?.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    householdChartObserver.observe(chart);
};

const observeAdminChart = (chart) => {
    adminChartObserver?.disconnect();
    adminChartObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 1) {
                entry.target.classList.add('is-animated');
                adminChartObserver?.unobserve(entry.target);
            }
        });
    }, { threshold: 1 });
    adminChartObserver.observe(chart);
};

const animateVisibleCharts = (view) => {
    $$('[data-admin-monthly-chart], [data-household-monthly-chart]', view).forEach((chart) => {
        chart.classList.remove('is-animated');
        void chart.offsetHeight;
        if (chart.matches('[data-household-monthly-chart]')) {
            observeHouseholdChart(chart);
            return;
        }
        observeAdminChart(chart);
    });
};

const serializeForm = (form) => Object.fromEntries(new FormData(form).entries());

const safeRedirect = (target) => {
    window.location.assign(target);
};

const isConfiguredAdmin = (user) => user?.role === 'admin';

const roleLabelForUser = (user) => {
    if (isConfiguredAdmin(user)) return 'Administrator';
    if (user?.role === 'user') return 'Household User';
    return 'Unsupported account';
};

const pathForUser = (user) => {
    if (isConfiguredAdmin(user)) return '/admin';
    if (user?.role === 'user') return '/household';
    return '/login';
};

const redirectToRoleHome = async () => {
    try {
        const response = await requestJson('/api/me');
        safeRedirect(pathForUser(response.data));
    } catch (error) {
        persistToken('');
        safeRedirect('/login');
    }
};

const bootHomeSessionActions = () => {
    const actions = $$('[data-home-session-action]');
    if (page !== 'home' || !actions.length || !readToken()) return;

    let destination = '';
    const destinationPromise = requestJson('/api/me')
        .then((response) => pathForUser(response.data))
        .catch(() => {
            persistToken('');
            return '/login';
        })
        .then((target) => {
            destination = target;

            actions.forEach((action) => {
                const label = $('[data-home-session-label]', action);
                action.href = target;
                action.removeAttribute('aria-busy');

                if (target === '/login' && label) {
                    label.textContent = action.dataset.signedOutLabel ?? 'Sign In';
                }
            });

            return target;
        });

    actions.forEach((action) => {
        const label = $('[data-home-session-label]', action);
        action.dataset.signedOutLabel = label?.textContent?.trim() ?? 'Sign In';
        action.href = '#';
        action.setAttribute('aria-busy', 'true');

        if (label) {
            label.textContent = action.dataset.authenticatedLabel ?? 'Open Dashboard';
        }

        action.addEventListener('click', async (event) => {
            if (destination) return;

            event.preventDefault();
            safeRedirect(await destinationPromise);
        });
    });
};

const handleAuthFailure = (error) => {
    if (error?.status === 401) {
        persistToken('');
        safeRedirect('/login');
        return true;
    }

    return false;
};

const redirectAwayFromWrongRole = (user, expectedRole) => {
    if (!user) {
        safeRedirect('/login');
        return true;
    }

    if (expectedRole === 'admin' && !isConfiguredAdmin(user)) {
        safeRedirect(user.role === 'user' ? '/household' : '/login');
        return true;
    }

    if (expectedRole === 'household' && isConfiguredAdmin(user)) {
        safeRedirect('/admin');
        return true;
    }

    if (expectedRole === 'household' && user.role !== 'user') {
        safeRedirect('/login');
        return true;
    }

    return false;
};

const setStatus = (message) => {
    if (statusLabel) {
        statusLabel.textContent = message;
    }
};

const setTokenInput = () => {
    if (tokenInput) {
        tokenInput.value = readToken();
    }
};

const showHouseholdView = (target) => {
    setHouseholdNavigationOpen(false);
    const previousView = householdActiveView;
    householdActiveView = target;
    $$('[data-household-view]').forEach((view) => {
        const isActive = view.dataset.householdView === target;
        view.classList.toggle('is-active', isActive);
        view.hidden = !isActive;
        view.inert = !isActive;
    });

    $$('[data-household-nav]').forEach((button) => {
        const isActive = button.dataset.householdNav === target;
        const isSidebarItem = button.closest('.household-sidebar-nav');
        button.classList.toggle('is-active', Boolean(isSidebarItem && isActive));
        if (isSidebarItem && isActive) {
            button.setAttribute('aria-current', 'page');
        } else {
            button.removeAttribute('aria-current');
        }
    });
    const activeView = $(`[data-household-view="${target}"]`);
    if (activeView) {
        animateVisibleCharts(activeView);
        const heading = $('h1, h2', activeView);
        if (heading) {
            heading.setAttribute('tabindex', '-1');
            heading.focus({ preventScroll: true });
        }
    }
    if (previousView !== target) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (target === 'dashboard') {
        loadDashboard();
        loadConsumptionGoal();
    } else {
        stopDashboardPolling();
    }
    if (target === 'notifications') loadNotifications();
    if (target === 'history') loadConsumptionHistory();
    if (target === 'billing') loadHouseholdBilling({ force: true });
    if (target === 'requests') loadHouseholdServiceRequests();
    if (target === 'settings') loadNotificationPreferences();
};

const showAdminView = (target, shouldUpdateHash = true) => {
    const previousView = $('[data-admin-view].is-active')?.dataset.adminView;
    $$('[data-admin-view]').forEach((view) => {
        const isActive = view.dataset.adminView === target;
        view.classList.toggle('is-active', isActive);
        view.hidden = !isActive;
        view.inert = !isActive;
    });

    $$('[data-admin-nav]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.adminNav === target);
    });

    if (shouldUpdateHash) {
        window.history.replaceState(null, '', `#${target}`);
    }
    updateAdminPageTitle(target);
    const activeView = $(`[data-admin-view="${target}"]`);
    if (activeView) {
        animateVisibleCharts(activeView);
        const heading = $('h1, h2', activeView);
        if (heading) {
            heading.setAttribute('tabindex', '-1');
            heading.focus({ preventScroll: true });
        }
    }
    if (previousView !== target) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (target === 'service-requests') loadAdminServiceRequests();
    if (target === 'water-rates') startConsumptionBaselineRefresh();
    else stopConsumptionBaselineRefresh();

    if (adminSidebar?.classList.contains('show')) {
        window.bootstrap?.Offcanvas.getInstance(adminSidebar)?.hide();
    }
};

const hasTokenOrReport = () => {
    if (readToken()) {
        return true;
    }

    setStatus('Redirecting to sign in.');
    safeRedirect('/login');
    return false;
};

const bootLogout = () => {
    logoutButtons.forEach((logoutButton) => logoutButton.addEventListener('click', async () => {
        if (logoutButton.dataset.signingOut === '1') return;
        logoutButtons.forEach((button) => {
            button.dataset.signingOut = '1';
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
        });
        document.body.classList.add('logout-is-transitioning');
        if (logoutTransition) logoutTransition.hidden = false;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const minimumAnimation = new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 180 : 800));

        try {
            await Promise.allSettled([
                readToken() ? requestJson('/api/logout', { method: 'POST' }) : Promise.resolve(),
                minimumAnimation,
            ]);
        } finally {
            stopDashboardPolling();
            stopAdminDevicePolling();
            stopAdminLeakPolling();
            persistToken('');
            safeRedirect('/login');
        }
    }));
};

const submitJsonForm = async (url, payload) =>
    requestJson(url, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

const activeTab = (target) => {
    $$('[data-tab-target]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.tabTarget === target);
    });

    $$('[data-auth-form]').forEach((form) => {
        form.classList.toggle('is-active', form.dataset.authForm === target);
    });
};

const warmDashboardCache = (user) => {
    persistSessionUser(user);
    const urls = user?.role === 'admin'
        ? [
              '/api/summary',
              '/api/analytics/admin?range=last_12_months',
              '/api/billing-settings',
              '/api/reports/consumption',
              '/api/admin/action-center',
          ]
        : [
              `/api/summary?user_id=${encodeURIComponent(user?.id ?? '')}`,
              '/api/household-consumption?period=daily',
              '/api/notifications?per_page=100',
              '/api/notification-preferences',
              '/api/service-requests?per_page=50',
          ];

    return Promise.allSettled(urls.map((url) => requestJson(url, {
        cacheScope: 'dashboard',
        timeout: 10000,
    })));
};

const completeLoginTransition = async (destination, warmup = Promise.resolve()) => {
    const transition = $('[data-login-transition]');
    if (!transition) {
        safeRedirect(destination);
        return;
    }

    document.body.classList.add('login-is-transitioning');
    transition.hidden = false;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minimumAnimation = new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 250 : 850));
    await Promise.all([minimumAnimation, Promise.race([warmup, minimumAnimation])]);
    safeRedirect(destination);
};

const bootLoginPage = () => {
    const authStatus = $('[data-auth-status]');

    const report = (message, state = 'info') => {
        if (authStatus) {
            authStatus.textContent = message;
            authStatus.hidden = !message;
            authStatus.classList.toggle('is-error', state === 'error');
        }
    };

    $$('[data-tab-target]').forEach((button) => {
        button.addEventListener('click', () => activeTab(button.dataset.tabTarget));
    });

    $$('[data-auth-form]').forEach((form) => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (form.dataset.submitting === 'true') return;

            const submitButton = $('button[type="submit"]', form);
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());
            form.dataset.submitting = 'true';
            if (submitButton) submitButton.disabled = true;

            try {
                if (form.dataset.authForm === 'login') {
                    report('Signing in...');
                    const response = await submitJsonForm('/api/login', payload);
                    const destination = pathForUser(response.data.user);
                    if (destination === '/login') {
                        persistToken('');
                        report('This account type does not have an application dashboard.');
                        return;
                    }
                    persistToken(response.data.token);
                    persistSessionUser(response.data.user);
                    report('Login successful.');
                    await completeLoginTransition(destination, warmDashboardCache(response.data.user));
                    return;
                }

                if (form.dataset.authForm === 'register') {
                    report('Creating account...');
                    const response = await submitJsonForm('/api/register', payload);
                    persistToken(response.data.token);
                    report('Account created.');
                    safeRedirect('/household');
                    return;
                }

                report('This account type must be commissioned by the municipal administrator.');
            } catch (error) {
                report(handleAuthFailure(error)
                    ? 'Session expired.'
                    : errorMessage(error, 'Unable to log in. Please check your credentials or contact the administrator.'), 'error');
            } finally {
                form.dataset.submitting = 'false';
                if (submitButton) submitButton.disabled = false;
            }
        });
    });

    if (readToken()) {
        redirectToRoleHome();
    }
};

const renderReadings = (items) => {
    const containers = $$('[data-live-readings-list]');
    const previews = $$('[data-recent-readings-list]');
    if (!containers.length && !previews.length) {
        return;
    }

    if (!items?.length) {
        containers.forEach((container) => {
            container.innerHTML = '<div class="table-empty-state"><i class="bi bi-broadcast" aria-hidden="true"></i><strong>No recent readings</strong><span>The connected meter has not submitted data for this account yet.</span></div>';
        });
        previews.forEach((container) => {
            container.innerHTML = '<div class="dashboard-empty-state"><strong>No recent readings yet</strong><span>Readings will appear here after the connected water meter sends an update.</span></div>';
        });
        return;
    }

    const markup = items
        .map((reading) => {
            const status = reading.is_possible_leak ? 'Leak detected' : reading.is_threshold_exceeded ? 'Usage limit reached' : 'Normal';
            const statusClass = reading.is_possible_leak ? 'badge badge-leak' : reading.is_threshold_exceeded ? 'badge badge-threshold' : 'badge badge-normal';

            return `
                <div class="table-row">
                    <span>${formatLiveReadingDateTime(reading.recorded_at)}</span>
                    <span>${formatNumber(reading.flow_rate)} L/min</span>
                    <span>${formatCubicMeters(reading.liters_used)}</span>
                    <span>${formatCurrency(reading.estimated_bill)}</span>
                    <span><span class="${statusClass}">${status}</span></span>
                </div>
            `;
        })
        .join('');

    containers.forEach((container) => {
        container.innerHTML = markup;
    });

    previews.forEach((container) => {
        container.innerHTML = items.slice(0, 4).map((reading) => {
            const status = reading.is_possible_leak ? 'Leak detected' : reading.is_threshold_exceeded ? 'Usage limit reached' : 'Normal';
            const statusClass = reading.is_possible_leak ? 'badge badge-leak' : reading.is_threshold_exceeded ? 'badge badge-threshold' : 'badge badge-normal';

            return `<div class="recent-reading-row">
                <div><strong>${formatDateTime(reading.recorded_at)}</strong><small>${formatNumber(reading.flow_rate)} L/min · ${formatCubicMeters(reading.liters_used)}</small></div>
                <span class="${statusClass}">${status}</span>
            </div>`;
        }).join('');
    });
};

const renderHistorySummary = (summary) => {
    setText('[data-history-period-label]', `${historyPeriod.charAt(0).toUpperCase() + historyPeriod.slice(1)} trend`);
    if (!summary) return;
    setText('[data-history-today-usage]', `${formatNumber(summary.today_usage, 3)} L`);
    setText('[data-history-week-usage]', `${formatNumber(summary.week_usage, 3)} L`);
    setText('[data-history-month-usage]', `${formatNumber(summary.month_usage, 3)} L`);
    setText('[data-history-estimated-bill]', formatCurrency(summary.estimated_bill, summary.currency));
    setText('[data-history-average-usage]', `${formatNumber(summary.average_daily_usage, 3)} L`);
};

const renderHistoryChart = (chartData = []) => {
    const container = $('[data-history-chart]');
    if (!container) return;
    renderHouseholdAreaChart(container, chartData.map((item) => ({
        label: item.label,
        total_cubic_meter: item.value,
        reading_count: 1,
    })), {
        dataAvailable: Array.isArray(chartData) && chartData.length > 0,
        showEmptyChart: true,
        emptyMessage: '<div class="chart-empty-state"><strong>No consumption trend data available</strong><span>Try applying a different date range.</span></div>',
    });
};

const historyTableHeadLabels = (period) => {
    const label = period === 'weekly' ? 'Week' : period === 'monthly' ? 'Month' : 'Day';
    const head = $('[data-history-table-head]');
    if (!head) return;
    head.innerHTML = `
        <span>${label}</span>
        <span>Total liters</span>
        <span>Total m³</span>
        <span>Estimated bill</span>
        <span>Status</span>
    `;
};

const exportHistoryCsv = (items) => {
    if (!Array.isArray(items) || !items.length) {
        showToast('No history rows available to export.', 'error');
        return;
    }

    const headers = ['Period', 'Total liters', 'Total cubic meter', 'Estimated bill', 'Status'];
    const rows = items.map((item) => {
        const label = historyPeriod === 'weekly'
            ? `Week of ${new Date(`${item.period}T00:00:00`).toLocaleDateString()}`
            : historyPeriod === 'monthly'
                ? new Date(`${item.period}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                : new Date(`${item.period}T00:00:00`).toLocaleDateString();
        return [
            label,
            formatNumber(item.total_liters, 3) + ' L',
            formatCubicMeterValue(item.total_cubic_meter),
            formatCurrency(item.estimated_bill),
            item.status || 'Normal',
        ];
    });

    const csv = [headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consumption-history-${historyPeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
};

const renderConsumptionHistory = () => {
    const container = $('[data-history-list]');
    if (!container) return;
    const items = consumptionHistory[historyPeriod] ?? [];
    historyTableHeadLabels(historyPeriod);
    if (!items.length) {
        container.innerHTML = '<div class="table-empty-state"><i class="bi bi-bar-chart-line" aria-hidden="true"></i><strong>No usage records yet</strong><span>Try another period, or wait for the meter to submit readings.</span></div>';
        return;
    }

    container.innerHTML = items.map((item) => {
        const label = historyPeriod === 'weekly'
            ? `Week of ${new Date(`${item.period}T00:00:00`).toLocaleDateString()}`
            : historyPeriod === 'monthly'
                ? new Date(`${item.period}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                : new Date(`${item.period}T00:00:00`).toLocaleDateString();
        const alerts = Number(item.leak_count || 0) + Number(item.limit_count || 0);
        const statusClass = item.condition === 'leak'
            ? 'badge badge-leak'
            : item.condition === 'threshold'
                ? 'badge badge-threshold'
                : item.condition === 'night'
                    ? 'badge badge-muted'
                    : 'badge badge-normal';

        return `<div class="table-row">
            <span>${escapeHtml(label)}</span>
            <span>${formatNumber(item.total_liters, 3)} L</span>
            <span>${formatCubicMeterValue(item.total_cubic_meter)}</span>
            <span>${formatCurrency(item.estimated_bill)}</span>
            <span><span class="${statusClass}">${escapeHtml(item.status || (alerts ? `${alerts} alert(s)` : 'Normal'))}</span></span>
        </div>`;
    }).join('');
};

const notificationTypeLabel = (type) => ({
    announcement: 'General announcement',
    service_interruption: 'Service interruption',
    maintenance: 'Scheduled maintenance',
    billing: 'Billing notice',
    leak_alert: 'Leak or emergency alert',
    device_system: 'Device or system notice',
    possible_leak: 'Leak alert',
    threshold_exceeded: 'Usage threshold alert',
    consumption_change: 'Consumption change alert',
}[type] ?? 'System notification');

const renderNotificationDropdown = (items) => {
    if (!notificationDropdownList) return;

    const notifications = Array.isArray(items) ? items.slice(0, 6) : [];
    if (!notifications.length) {
        notificationDropdownList.innerHTML = `
            <div class="notification-dropdown-empty">
                <i class="bi bi-bell-slash" aria-hidden="true"></i>
                <strong>You’re all caught up</strong>
                <span>New messages will appear here.</span>
            </div>`;
        return;
    }

    notificationDropdownList.innerHTML = notifications.map((notification) => {
        const isUnread = !notification.is_read;
        return `
            <button class="notification-dropdown-item${isUnread ? ' is-unread' : ''}" type="button" data-notification-dropdown-item data-notification-id="${notification.id}" data-notification-read="${notification.is_read ? '1' : '0'}">
                <span class="notification-dropdown-icon" aria-hidden="true"><i class="bi ${notification.type === 'leak_alert' || notification.type === 'possible_leak' ? 'bi-exclamation-triangle' : 'bi-bell'}"></i></span>
                <span class="notification-dropdown-copy">
                    <strong>${escapeHtml(notification.title)}</strong>
                    <span>${escapeHtml(notification.message)}</span>
                    <small>${escapeHtml(notificationTypeLabel(notification.type))} · ${escapeHtml(formatCompactDateTime(notification.sent_at ?? notification.created_at))}</small>
                </span>
                <i class="notification-dropdown-unread-dot" aria-label="Unread"></i>
            </button>`;
    }).join('');
};

const renderNotifications = (items, selector = '[data-notifications-list]') => {
    const containers = $$(selector);
    if (!containers.length) {
        return;
    }

    const isPreview = selector === '[data-dashboard-notifications-list]';
    if (!isPreview) {
        const clearButton = $('[data-clear-notifications]');
        if (clearButton) clearButton.disabled = !items?.some((item) => !item.is_read);
    }

    if (!items?.length) {
        const emptyMessage = selector === '[data-dashboard-notifications-list]'
            ? '<div class="dashboard-empty-state"><strong>No recent notifications</strong><span>New alerts and service updates will appear here.</span></div>'
            : '<div class="notification-page-empty"><i class="bi bi-bell-slash" aria-hidden="true"></i><strong>No notifications yet</strong><span>New alerts and service updates will appear here automatically.</span></div>';
        containers.forEach((container) => {
            container.innerHTML = emptyMessage;
        });
        return;
    }

    const markup = (isPreview ? items.slice(0, 3) : items)
        .map((notification) => {
            const label = notificationTypeLabel(notification.type);
            const isLeakAlert = ['leak_alert', 'possible_leak'].includes(notification.type);
            const actions = isPreview ? '' : `<div class="notification-card-actions">
                ${isLeakAlert ? '<button type="button" class="link-button" data-view-leak-alert>View leak details</button>' : ''}
                <button type="button" class="link-button notification-remove-button" data-delete-received-notification="${notification.id}">Remove</button>
            </div>`;

            return `
            <article class="notification-card${isPreview ? ' dashboard-notification-card' : ''}" data-notification-id="${notification.id}" data-notification-read="${notification.is_read ? '1' : '0'}" tabindex="0">
                <div class="notification-head">
                    <h4>${escapeHtml(notification.title)}</h4>
                    <span class="status-chip ${notification.is_read ? 'status-chip-muted' : 'status-chip-soft'}">${notification.is_read ? 'Read' : 'Unread'}</span>
                </div>
                <p class="notification-tag">${escapeHtml(label)}</p>
                <p>${escapeHtml(notification.message)}</p>
                <small>${formatCompactDateTime(notification.sent_at ?? notification.created_at)}</small>
                ${actions}
            </article>
        `;
        })
        .join('');

    containers.forEach((container) => {
        container.innerHTML = markup;
        bindNotificationReadTracking(container);
    });
};

const applyHouseholdNotifications = (items) => {
    householdNotifications = Array.isArray(items) ? items : [];
    const unreadCount = householdNotifications.filter((item) => !item.is_read).length;

    renderNotifications(householdNotifications);
    renderNotifications(householdNotifications, '[data-dashboard-notifications-list]');
    renderNotificationDropdown(householdNotifications);
    setHouseholdAlertCount(unreadCount);
    setText('[data-stat-alerts]', unreadCount > 0
        ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
        : 'No unread notifications');
    setText('[data-notification-state]', unreadCount > 0 ? 'Unread alerts need your attention.' : "You're all caught up.");
};

const loadNotifications = async () => {
    if (notificationRefreshInFlight || notificationMutationInFlight || !readToken()) return false;
    notificationRefreshInFlight = true;
    const requestedMutationVersion = notificationMutationVersion;

    try {
        const response = await requestJson('/api/notifications?per_page=100');
        if (requestedMutationVersion !== notificationMutationVersion) return true;
        applyHouseholdNotifications(responseItems(response));
        return true;
    } catch (error) {
        console.error('Dashboard request failed: /api/notifications?per_page=100', error);
        if (handleAuthFailure(error)) return false;
        $$('[data-notifications-list], [data-dashboard-notifications-list]').forEach((container) => {
            container.innerHTML = '<div class="empty-state is-error">Unable to load notifications.</div>';
        });
        if (notificationDropdownList) {
            notificationDropdownList.innerHTML = '<div class="notification-dropdown-empty is-error">Unable to load notifications.</div>';
        }
        setText('[data-stat-alerts]', 'Unable to load notifications.');
        setText('[data-notification-state]', '');
        return false;
    } finally {
        notificationRefreshInFlight = false;
    }
};

const loadConsumptionHistory = async () => {
    if (!readToken()) return;
    if (historyRefreshInFlight) {
        historyReloadQueued = true;
        return;
    }

    historyRefreshInFlight = true;
    const requestedPeriod = historyState.period;
    $('[data-history-tabs]')?.setAttribute('aria-busy', 'true');

    try {
        const response = await requestJson(`/api/consumption-history${buildQuery({
            period: historyState.period,
            from: historyState.from,
            to: historyState.to,
            search: historyState.search,
            page: historyState.page,
            per_page: historyState.per_page,
        })}`);

        const data = response.data ?? {};
        if (requestedPeriod !== historyState.period) {
            historyReloadQueued = true;
            return;
        }

        consumptionHistory = {
            daily: data.daily ?? [],
            weekly: data.weekly ?? [],
            monthly: data.monthly ?? [],
        };
        historyState.page = data.meta?.current_page ?? historyState.page;
        renderHistorySummary(data.summary);
        renderHistoryChart(data.chart);
        renderConsumptionHistory();
        renderPager($('[data-history-pager]'), data.meta ?? {}, (page) => {
            historyState.page = page;
            loadConsumptionHistory();
        });
    } catch (error) {
        if (handleAuthFailure(error)) return;
        const container = $('[data-history-list]');
        if (container) container.innerHTML = '<div class="empty-state is-error">Unable to retrieve consumption history. Try again.</div>';
    } finally {
        historyRefreshInFlight = false;
        $('[data-history-tabs]')?.removeAttribute('aria-busy');
        if (historyReloadQueued) {
            historyReloadQueued = false;
            loadConsumptionHistory();
        }
    }
};

const markNotificationRead = async (card) => {
    const id = card?.dataset.notificationId;
    if (!id || card.dataset.notificationRead === '1' || notificationReadInFlight.has(id)) return;
    notificationReadInFlight.add(id);
    try {
        await requestJson(`/api/notifications/${id}/read`, { method: 'PATCH' });
        const notification = householdNotifications.find((item) => String(item.id) === String(id));
        if (notification) notification.is_read = true;
        card.dataset.notificationRead = '1';
        const badge = $('.status-chip', card);
        if (badge) {
            badge.textContent = 'Read';
            badge.classList.remove('status-chip-soft');
            badge.classList.add('status-chip-muted');
        }
        card.classList.remove('is-unread');
        $('.notification-dropdown-unread-dot', card)?.remove();
        const unreadCount = Math.max(0, Number($('[data-household-alert-count]')?.dataset.unreadCount ?? 0) - 1);
        setHouseholdAlertCount(unreadCount);
    } catch (error) {
        if (!handleAuthFailure(error)) console.error(error);
    } finally {
        notificationReadInFlight.delete(id);
    }
};

const bindNotificationReadTracking = (container) => {
    notificationObserver?.disconnect();
    if (container.dataset.readTrackingBound !== '1') {
        container.dataset.readTrackingBound = '1';
        container.addEventListener('click', async (event) => {
            const leakButton = event.target.closest('[data-view-leak-alert]');
            if (leakButton) {
                event.stopPropagation();
                await markNotificationRead(leakButton.closest('[data-notification-id]'));
                showHouseholdView('leak');
                return;
            }
            const deleteButton = event.target.closest('[data-delete-received-notification]');
            if (deleteButton) {
                event.stopPropagation();
                if (notificationMutationInFlight) return;
                if (!window.confirm('Remove this notification from your inbox?')) return;

                const notificationId = String(deleteButton.dataset.deleteReceivedNotification);
                const previousNotifications = householdNotifications;
                notificationMutationInFlight = true;
                notificationMutationVersion++;
                applyHouseholdNotifications(previousNotifications.filter((item) => String(item.id) !== notificationId));

                try {
                    await requestJson(`/api/notifications/received/${notificationId}`, { method: 'DELETE' });
                    showToast('Notification removed from your inbox.');
                } catch (error) {
                    applyHouseholdNotifications(previousNotifications);
                    if (!handleAuthFailure(error)) showToast(errorMessage(error, 'Could not delete the notification.'), 'error');
                } finally {
                    notificationMutationInFlight = false;
                }
                return;
            }
            markNotificationRead(event.target.closest('[data-notification-id]'));
        });
        container.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') markNotificationRead(event.target.closest('[data-notification-id]'));
        });
    }
    notificationObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
                markNotificationRead(entry.target);
                notificationObserver?.unobserve(entry.target);
            }
        });
    }, { threshold: 0.75 });
    $$('[data-notification-id]', container).forEach((card) => {
        if (card.dataset.notificationRead !== '1') notificationObserver.observe(card);
    });
};

const renderProfile = (user) => {
    setText('[data-account-role]', roleLabelForUser(user));
    setText('[data-profile-name]', String(user?.name ?? '').trim() || 'Household account');
    setText('[data-profile-email]', user?.email ?? '--');
    setText('[data-profile-account]', user?.account_number ?? '--');
    setText('[data-profile-address]', String(user?.address ?? '').trim() || 'No address recorded');
    setText('[data-profile-phone]', user?.phone ?? '--');
    setText('[data-profile-role]', roleLabelForUser(user));
    setText('[data-profile-status]', user?.is_active && (user?.account_status ?? 'active') === 'active' ? 'Active' : String(user?.account_status ?? 'Inactive').replaceAll('_', ' '));
    setText('[data-profile-badge]', user?.is_active && (user?.account_status ?? 'active') === 'active' ? '🟢 Verified Household' : '⚠️ Household status pending');
    setText('[data-profile-initials]', (user?.name ?? 'SW')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join(''));
    setText('[data-profile-password-changed]', user?.password_changed_at ? formatDateTime(user.password_changed_at) : 'Not available');
    setText('[data-profile-last-login]', user?.last_login_at ? formatDateTime(user.last_login_at) : 'Not available');
    setText('[data-profile-created-at]', user?.created_at ? formatDateTime(user.created_at) : 'Not available');
    setText('[data-profile-device]', user?.registered_device ?? 'Not available');
    setText('[data-profile-meter]', user?.assigned_meter ?? 'Not available');
    if (accountForm && accountForm.dataset.dirty !== '1' && !accountForm.contains(document.activeElement)) {
        accountForm.elements.email.value = user?.email ?? '';
        accountForm.elements.phone.value = user?.phone ?? '';
    }
    accountFormInitial = {
        email: user?.email ?? '',
        phone: user?.phone ?? '',
    };
    updateAccountFormState();
};

const setAccountProfileState = (message, tone = '') => {
    if (!accountProfileState) return;
    accountProfileState.textContent = message;
    accountProfileState.classList.remove('is-loading', 'is-error', 'is-ready');
    if (tone) accountProfileState.classList.add(`is-${tone}`);
};

const loadAccountProfile = async () => {
    if (accountProfileLoading || accountProfileLoaded || !accountForm) return;

    accountProfileLoading = true;
    setAccountProfileState('Loading account details...', 'loading');
    try {
        const response = await requestJson('/api/account');
        householdProfile = response?.data ?? householdProfile;
        renderProfile(householdProfile);
        accountProfileLoaded = true;
        setAccountProfileState('Account details loaded', 'ready');
    } catch (error) {
        if (handleAuthFailure(error)) return;
        setAccountProfileState(errorMessage(error, 'Account details could not be loaded.'), 'error');
        showToast(errorMessage(error, 'Account details could not be loaded.'), 'error');
    } finally {
        accountProfileLoading = false;
    }
};

const setButtonLoading = (button, isLoading, label) => {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle('is-loading', isLoading);
    button.textContent = isLoading ? label : button.dataset.originalText || button.textContent;
};

const setAccountFormFeedback = (form, message = '', type = '') => {
    const feedback = form === accountForm
        ? $('[data-account-feedback]', form)
        : $('[data-password-feedback]', form);
    if (!feedback) return;
    feedback.textContent = message;
    feedback.hidden = !message;
    feedback.classList.toggle('is-error', type === 'error');
    feedback.classList.toggle('is-loading', type === 'loading');
};

const validateEmail = (value) => {
    if (!value) return 'Email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? '' : 'Enter a valid email address.';
};

const validatePhone = (value) => {
    if (!value) return '';
    const phoneRegex = /^[0-9+()\s-]{6,50}$/;
    return phoneRegex.test(value) ? '' : 'Enter a valid phone number.';
};

const updateAccountFormState = () => {
    if (!accountForm || !accountSubmitButton) return;
    const email = accountForm.elements.email?.value.trim() ?? '';
    const phone = accountForm.elements.phone?.value.trim() ?? '';
    const hasChanged = email !== (accountFormInitial.email ?? '') || phone !== (accountFormInitial.phone ?? '');
    accountForm.dataset.dirty = hasChanged ? '1' : '0';
    const emailError = validateEmail(email);
    const phoneError = validatePhone(phone);
    setFieldError('email', emailError);
    setFieldError('phone', phoneError);
    const valid = !emailError && !phoneError && hasChanged;
    accountSubmitButton.disabled = !valid;
};

const updatePasswordCriteria = (value) => {
    passwordValidationState.length = value.length >= 8;

    if (passwordCriteria) {
        Object.entries(passwordValidationState).forEach(([key, isValid]) => {
            const item = passwordCriteria.querySelector(`[data-criteria="${key}"]`);
            if (!item) return;
            item.classList.toggle('is-valid', isValid);
            item.classList.toggle('is-invalid', !isValid);
        });
    }
};

const updatePasswordFormState = () => {
    if (!passwordForm || !passwordSubmitButton) return;
    const currentPassword = passwordForm.elements.current_password?.value ?? '';
    const password = passwordForm.elements.password?.value ?? '';
    const confirmation = passwordForm.elements.password_confirmation?.value ?? '';
    updatePasswordCriteria(password);
    const confirmationError = confirmation && password !== confirmation ? 'Passwords do not match.' : '';
    setFieldError('password_confirmation', confirmationError);
    const isValid = Boolean(currentPassword)
        && passwordValidationState.length
        && confirmation.length > 0
        && password === confirmation;
    passwordSubmitButton.disabled = !isValid;
};

const renderAccountActivity = (user) => {
    if (!activityContainer) return;
    const items = [];
    if (user?.created_at) {
        items.push({ label: 'Account created', date: formatDateTime(user.created_at) });
    }
    if (user?.last_login_at) {
        items.push({ label: 'Last login', date: formatDateTime(user.last_login_at) });
    }
    if (user?.password_changed_at) {
        items.push({ label: 'Password changed', date: formatDateTime(user.password_changed_at) });
    }
    if (user?.updated_at && user?.updated_at !== user?.created_at) {
        items.push({ label: 'Contact information updated', date: formatDateTime(user.updated_at) });
    }
    activityContainer.innerHTML = items.length
        ? items.map((item) => `
            <div class="timeline-entry">
                <strong>${escapeHtml(item.label)}</strong>
                <small>${escapeHtml(item.date)}</small>
            </div>
        `).join('')
        : '<div class="timeline-empty"><strong>No activity available yet.</strong><span>Account activity will appear here when available.</span></div>';
};

const setHouseholdBillingState = (message, tone = '') => {
    if (!householdBillingState) return;
    householdBillingState.textContent = message;
    householdBillingState.classList.remove('is-loading', 'is-error', 'is-ready', 'is-empty');
    if (tone) householdBillingState.classList.add(`is-${tone}`);
};

const billingRecordTypeLabel = (type) => ({
    estimated: 'Estimated',
    finalized: 'Finalized',
    unavailable: 'Unavailable',
}[type] ?? 'Unavailable');

const normalizeConnectionStatus = (value, unavailable = 'Unavailable') => {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return unavailable;
    if (['connected', 'online', 'active'].includes(normalized)) return 'Connected';
    if (['disconnected', 'offline', 'inactive'].includes(normalized)) return 'Disconnected';

    return normalized
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

const applyHouseholdBillingSummary = (billing) => {
    const calculation = billing?.calculation ?? {};
    const periodIsCurrent = billing?.period?.is_current !== false;
    const periodLabel = billing?.period?.label ?? 'the latest available period';
    const currentCharge = calculation.current_charge;
    const hasCharge = currentCharge !== null && currentCharge !== undefined;
    const amount = hasCharge ? formatCurrency(currentCharge, calculation.currency) : 'No data';
    const badge = billing?.record_type === 'finalized'
        ? 'Finalized'
        : billing?.record_type === 'estimated' && !periodIsCurrent
            ? 'Latest estimate'
            : billing?.record_type === 'estimated'
                ? 'Estimated'
                : 'Unavailable';

    setText('[data-estimated-bill]', amount);
    setText('[data-stat-bill]', amount);
    setText('[data-billing-state]', billing?.record_type === 'unavailable'
        ? 'No billable readings this period.'
        : periodIsCurrent
            ? 'Includes usage and the fixed monthly charge.'
            : `Latest available estimate from ${periodLabel}.`);
    setText('[data-billing-badge]', badge);
    applyStatusTone('[data-billing-badge]', badge);
};

const renderHouseholdBilling = (billing) => {
    const calculation = billing?.calculation ?? {};
    const type = billing?.record_type ?? 'unavailable';
    const periodLabel = billing?.period?.label ?? 'Current billing period';
    const periodIsCurrent = billing?.period?.is_current !== false;
    const recordTypeLabel = type === 'estimated' && !periodIsCurrent
        ? 'Latest estimate'
        : billingRecordTypeLabel(type);
    const hasReadings = Number(billing?.reading_count ?? 0) > 0;
    const hasRate = billing?.has_rate_configuration === true;
    const currency = calculation.currency ?? 'PHP';
    activeCurrency = currency;
    const unavailableReason = !hasReadings
        ? 'No water readings are available for this billing period.'
        : !hasRate
            ? 'An active water rate has not been configured yet. Billing will appear after the administrator publishes a rate.'
            : 'This amount is based on the recorded readings and the effective billing configuration for this period.';

    setText('[data-household-billing-period]', periodLabel);
    setText('[data-billing-current-charge]', type === 'unavailable' ? 'Unavailable' : formatCurrency(calculation.current_charge, currency));
    setText('[data-billing-consumption]', type === 'unavailable' && !hasReadings ? 'No readings' : type === 'unavailable' ? 'Unavailable' : formatCubicMeterValue(calculation.total_cubic_meter));
    setText('[data-billing-reading-count]', `${formatNumber(billing?.reading_count ?? 0, 0)} reading${Number(billing?.reading_count ?? 0) === 1 ? '' : 's'} in this period`);
    setText('[data-billing-rate]', hasRate || type === 'finalized' ? formatCurrency(calculation.water_rate, currency) + ' / m³' : 'Unavailable');
    setText('[data-billing-rate-effective]', billing?.has_rate_configuration
        ? (billing.rate_effective_date ? `Effective ${billing.rate_effective_date}` : 'Effective for this billing period')
        : 'No active rate configured');
    setText('[data-billing-balance]', calculation.remaining_balance === null || calculation.remaining_balance === undefined ? 'Not finalized' : formatCurrency(calculation.remaining_balance, currency));
    const currentStatement = (billing?.history ?? []).find((item) => Number(item.id) === Number(billing?.statement_id));
    const pendingPayment = currentStatement?.payments?.find((payment) => payment.status === 'pending');
    const paymentStatus = pendingPayment ? 'Pending verification' : (billing?.statement_status ?? (type === 'estimated' ? 'Estimated' : 'Unpaid'));
    setText('[data-payment-status]', String(paymentStatus).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()));
    setText('[data-payment-status-detail]', pendingPayment ? `Submitted ${formatCurrency(pendingPayment.amount, currency)}; staff must verify it before your balance changes.` : currentStatement?.status === 'paid' ? `Paid ${currentStatement.payments?.find((payment) => payment.status === 'confirmed')?.received_at ? `on ${formatDateTime(currentStatement.payments.find((payment) => payment.status === 'confirmed').received_at)}` : ''}` : currentStatement?.due_date ? `Due ${currentStatement.due_date}.` : 'No finalized statement is available yet.');
    const statusBadge = $('[data-payment-status-badge]');
    if (statusBadge) { statusBadge.textContent = pendingPayment ? 'Pending' : String(paymentStatus).replaceAll('_', ' '); statusBadge.className = `metric-card-badge ${paymentStatus === 'paid' ? 'status-chip-soft' : pendingPayment ? 'status-chip-alert' : 'metric-card-badge-neutral'}`; }
    const paymentForm = $('[data-household-payment-form]');
    if (paymentForm) {
        paymentForm.elements.billing_statement_id.value = currentStatement?.id ?? '';
        const canSubmit = Boolean(currentStatement?.id) && !pendingPayment && ['unpaid', 'partial', 'overdue'].includes(currentStatement.status);
        paymentForm.querySelectorAll('input, select, textarea, button').forEach((field) => { if (field.name !== 'billing_statement_id') field.disabled = !canSubmit; });
        if (canSubmit) paymentForm.elements.amount.max = Number(currentStatement.remaining_balance).toFixed(2);
    }
    setText('[data-billing-record-type]', `${recordTypeLabel} · ${periodLabel}`);
    setText(
        '[data-billing-explanation]',
        type === 'unavailable'
            ? 'This estimate will update automatically after the missing meter data or billing rate becomes available.'
            : !periodIsCurrent
                ? `No readings have been received for the current month yet. This is the latest available estimate from ${periodLabel}.`
                : unavailableReason,
    );

    const typeChip = $('[data-billing-type-chip]');
    if (typeChip) {
        typeChip.textContent = recordTypeLabel;
        typeChip.classList.toggle('status-chip-soft', type === 'finalized');
        typeChip.classList.toggle('status-chip-muted', type === 'estimated' || type === 'unavailable');
        typeChip.classList.toggle('status-chip-alert', type === 'unavailable');
    }

    const calculationContainer = $('[data-billing-calculation]');
    if (calculationContainer) {
        calculationContainer.innerHTML = type === 'unavailable'
            ? `<div class="billing-empty-state"><span class="billing-empty-icon" aria-hidden="true"><i class="bi bi-calculator"></i></span><div><strong>Estimate unavailable</strong><span>${escapeHtml(unavailableReason)}</span></div></div>`
            : `<div class="billing-calculation-row"><span>Consumption</span><strong>${formatCubicMeterValue(calculation.total_cubic_meter)} <small>${formatNumber(calculation.total_liters, 2)} L</small></strong></div>
                <div class="billing-calculation-row"><span>Usage charge</span><strong>${formatCurrency(calculation.usage_charge, currency)}</strong></div>
                <div class="billing-calculation-row"><span>Fixed monthly charge</span><strong>${formatCurrency(calculation.fixed_monthly_charge, currency)}</strong></div>
                <div class="billing-calculation-row"><span>Subsidy or discount</span><strong class="billing-discount">− ${formatCurrency(calculation.subsidy_deduction, currency)}</strong></div>
                <div class="billing-calculation-total"><span>${type === 'finalized' ? 'Finalized charge' : periodIsCurrent ? 'Estimated current charge' : 'Latest estimated charge'}</span><strong>${formatCurrency(calculation.current_charge, currency)}</strong></div>`;
    }

    const meterContainer = $('[data-billing-meter]');
    if (meterContainer) {
        const meter = billing?.meter;
        meterContainer.innerHTML = meter
            ? `<div class="billing-meter-icon" aria-hidden="true">⌁</div><div><strong>${escapeHtml(meter.name ?? 'Assigned water meter')}</strong><small>${escapeHtml(meter.asset_number ?? meter.serial_number ?? 'Meter identity unavailable')}</small><span class="status-chip ${meter.is_online ? 'status-chip-soft' : 'status-chip-muted'}">${meter.is_online ? 'Online' : 'Offline'}</span></div>`
            : '<div class="billing-empty-state"><span class="billing-empty-icon" aria-hidden="true"><i class="bi bi-cpu"></i></span><div><strong>No meter assigned</strong><span>Contact the administrator to connect a household meter.</span></div></div>';
    }

    const meterForMeta = billing?.meter;
    if (meterForMeta?.last_seen_at) {
        $('[data-billing-meter] > div:last-child')?.insertAdjacentHTML('beforeend', `<small>Last seen ${escapeHtml(formatDateTime(meterForMeta.last_seen_at))}</small>`);
    }

    const latest = billing?.latest_reading;
    const latestContainer = $('[data-billing-latest-reading]');
    if (latestContainer) {
        latestContainer.innerHTML = latest
            ? `<div><dt>Recorded</dt><dd>${escapeHtml(formatDateTime(latest.recorded_at))}</dd></div><div><dt>Flow rate</dt><dd>${formatNumber(latest.flow_rate)} L/min</dd></div><div><dt>Reading volume</dt><dd>${formatNumber(latest.liters_used, 2)} L · ${formatCubicMeterValue(latest.cubic_meter)}</dd></div><div><dt>Connection when recorded</dt><dd>${escapeHtml(normalizeConnectionStatus(latest.device_connection_status))}</dd></div>`
            : '<div class="billing-reading-empty"><i class="bi bi-activity" aria-hidden="true"></i><div><strong>No recent meter reading</strong><span>The latest billing-period reading will appear here automatically.</span></div></div>';
    }

    if (latest && latestContainer) {
        const latestTotal = latest.total_liters === null || latest.total_liters === undefined
            ? 'Not reported'
            : `${formatNumber(latest.total_liters, 2)} L`;
        latestContainer.insertAdjacentHTML('beforeend', `<div><dt>Total recorded</dt><dd>${escapeHtml(latestTotal)}</dd></div><div><dt>Leak status</dt><dd>${escapeHtml(latest.leak_detection_status ?? (latest.is_possible_leak ? 'Leak detected' : 'Normal'))}</dd></div>`);
    }

    const history = Array.isArray(billing?.history) ? billing.history : [];
    const latestStatement = history[0];
    const latestDownload = $('[data-download-latest-statement]');
    if (latestDownload) {
        latestDownload.disabled = !latestStatement?.id;
        latestDownload.dataset.statementId = latestStatement?.id ?? '';
    }
    const relatedStatement = $('[data-request-statement]');
    if (relatedStatement) {
        relatedStatement.innerHTML = '<option value="">Not related to a statement</option>' + history
            .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.statement_number ?? item.billing_month)} · ${formatCurrency(item.remaining_balance, item.currency)}</option>`).join('');
    }
    const historyContainer = $('[data-billing-history]');
    if (historyContainer) {
        historyContainer.innerHTML = history.length
            ? history.map((item) => {
                const receipts = (item.payments ?? []).filter((payment) => payment.status === 'confirmed').map((payment) => `<button class="link-button" type="button" data-download-receipt="${escapeHtml(payment.id)}">${escapeHtml(payment.receipt_number)}</button>`).join('');
                const pending = (item.payments ?? []).find((payment) => payment.status === 'pending');
                const displayStatus = pending ? 'Pending verification' : String(item.status ?? 'Unknown').replaceAll('_', ' ');
                return `<tr><td><strong>${escapeHtml(item.statement_number ?? 'Statement')}</strong><small>${escapeHtml(item.billing_month ? new Date(item.billing_month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—')}</small></td><td>${formatCubicMeterValue(item.total_cubic_meter)}</td><td>${formatCurrency(item.current_charge, item.currency)}</td><td>${formatCurrency(item.remaining_balance, item.currency)}<small>Paid ${formatCurrency(item.amount_paid, item.currency)}</small></td><td><span class="status-chip ${item.status === 'paid' ? 'status-chip-soft' : pending ? 'status-chip-alert' : 'status-chip-alert'}">${escapeHtml(displayStatus)}</span><small>${item.due_date ? `Due ${escapeHtml(item.due_date)}` : ''}${pending ? ` · Ref ${escapeHtml(pending.reference_number ?? 'submitted')}` : ''}</small></td><td><button class="link-button" type="button" data-download-statement="${escapeHtml(item.id)}">Statement PDF</button>${receipts || '<small>No verified receipts</small>'}</td></tr>`;
            }).join('')
            : '<tr><td colspan="6"><div class="empty-state">No finalized billing statements are available yet.</div></td></tr>';
    }
};

const loadHouseholdBilling = ({ force = false } = {}) => {
    if (!householdBillingState) return Promise.resolve(false);
    if (householdBillingRequest) return householdBillingRequest;
    if (householdBillingLoaded && !force) return Promise.resolve(true);

    setHouseholdBillingState('Loading billing details...', 'loading');
    householdBillingRequest = (async () => {
        try {
            const response = await requestJson('/api/household-billing');
            const billing = response?.data ?? {};
            renderHouseholdBilling(billing);
            householdBillingSnapshot = billing;
            householdBillingLoaded = true;
            const periodIsCurrent = billing?.period?.is_current !== false;
            const periodLabel = billing?.period?.label ?? 'the latest available period';
            applyHouseholdBillingSummary(billing);
            setHouseholdBillingState(
                billing.record_type === 'unavailable'
                    ? 'Billing needs attention'
                    : billing.record_type === 'estimated' && !periodIsCurrent
                        ? `${periodLabel} estimate ready`
                        : `${billingRecordTypeLabel(billing.record_type)} ready`,
                billing.record_type === 'unavailable' ? 'empty' : 'ready',
            );
            return true;
        } catch (error) {
            console.error('Dashboard request failed: /api/household-billing', error);
            householdBillingLoaded = false;
            householdBillingSnapshot = null;
            if (handleAuthFailure(error)) return false;
            const payload = errorPayload(error);
            const message = error?.status === 404
                ? (payload.message ?? 'No active water meter is assigned to this household.')
                : error?.status === 422
                    ? (payload.message ?? 'No active water rate is configured for this billing period.')
                    : (payload.message ?? 'Billing estimate is temporarily unavailable. Please try again.');
            const rateStatus = error?.status === 422 ? 'No active rate configured' : 'Rate data unavailable';
            setHouseholdBillingState(message, 'error');
            setText('[data-estimated-bill]', message);
            setText('[data-billing-state]', '');
            setText('[data-billing-current-charge]', 'Unavailable');
            setText('[data-billing-consumption]', 'Unavailable');
            setText('[data-billing-rate]', 'Unavailable');
            setText('[data-billing-balance]', 'Not finalized');
            setText('[data-billing-reading-count]', 'Billing data unavailable');
            setText('[data-billing-record-type]', 'Unavailable');
            setText('[data-billing-rate-effective]', rateStatus);
            setText('[data-billing-explanation]', message);
            const typeChip = $('[data-billing-type-chip]');
            if (typeChip) {
                typeChip.textContent = 'Unavailable';
                typeChip.classList.remove('status-chip-soft', 'status-chip-muted');
                typeChip.classList.add('status-chip-alert');
            }
            const calculationContainer = $('[data-billing-calculation]');
            if (calculationContainer) calculationContainer.innerHTML = `<div class="empty-state is-error"><strong>${escapeHtml(message)}</strong><button class="button button-ghost" type="button" data-billing-retry>Retry</button></div>`;
            if (error?.status === 404) {
                const meterContainer = $('[data-billing-meter]');
                if (meterContainer) meterContainer.innerHTML = '<div class="billing-empty-state"><span class="billing-empty-icon" aria-hidden="true"><i class="bi bi-cpu"></i></span><div><strong>No meter assigned</strong><span>Contact the administrator to connect a household meter.</span></div></div>';
            }
            const latestContainer = $('[data-billing-latest-reading]');
            if (latestContainer) latestContainer.innerHTML = '<div class="billing-reading-empty"><i class="bi bi-activity" aria-hidden="true"></i><div><strong>No recent meter reading</strong><span>Latest telemetry is unavailable.</span></div></div>';
            const retryButton = $('[data-billing-retry]');
            retryButton?.addEventListener('click', async () => {
                retryButton.disabled = true;
                retryButton.setAttribute('aria-busy', 'true');
                retryButton.textContent = 'Retrying...';
                await loadHouseholdBilling({ force: true });
            });
            return false;
        } finally {
            householdBillingRequest = null;
        }
    })();

    return householdBillingRequest;
};

const renderGoalForecast = (goal = {}) => {
    const container = $('[data-goal-progress]');
    if (!container) return;
    const progress = Math.max(0, Number(goal.progress_percent ?? 0));
    const forecast = Number(goal.forecast_percent ?? 0);
    const hasGoal = goal.target_liters !== null && goal.target_liters !== undefined;
    setText('[data-goal-status]', !hasGoal ? 'Goal not set' : goal.status === 'at_risk' ? 'At risk of exceeding goal' : 'On track');
    container.innerHTML = hasGoal
        ? `<div class="goal-progress-summary"><span><small>Used</small><strong>${formatNumber(goal.used_liters, 0)} L</strong></span><span><small>Target</small><strong>${formatNumber(goal.target_liters, 0)} L</strong></span><span><small>Forecast</small><strong>${formatNumber(goal.forecast_liters, 0)} L</strong></span></div>
            <div class="goal-progress-track" role="progressbar" aria-label="Monthly goal progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(progress, 100)}"><span style="width:${Math.min(progress, 100)}%"></span></div>
            <p class="goal-forecast-message ${goal.status === 'at_risk' ? 'is-at-risk' : 'is-on-track'}">${goal.status === 'at_risk' ? `At the current pace, usage may reach ${formatNumber(forecast)}% of your target.` : `You have ${formatNumber(goal.remaining_liters, 0)} L remaining and are projected to stay within the target.`}</p>`
        : '<div class="dashboard-empty-state"><strong>No monthly goal yet</strong><span>Enter a target to see progress and an end-of-month forecast.</span></div>';
};

const loadConsumptionGoal = async () => {
    if (!consumptionGoalForm) return;
    const monthInput = consumptionGoalForm.elements.month;
    monthInput.value ||= new Date().toISOString().slice(0, 7);
    try {
        const response = await requestJson(`/api/consumption-goal?month=${encodeURIComponent(monthInput.value)}`);
        const goal = response.data ?? {};
        if (goal.target_liters !== null) consumptionGoalForm.elements.target_liters.value = goal.target_liters;
        renderGoalForecast(goal);
    } catch (error) {
        if (!handleAuthFailure(error)) setText('[data-goal-status]', 'Forecast unavailable');
    }
};

const renderHouseholdServiceRequestDetail = (item) => {
    const container = $('[data-service-request-list]');
    if (!container) return;
    const messages = (item.messages ?? []).map((message) => `<div class="service-request-message ${message.author?.role === 'admin' ? 'is-staff' : 'is-household'}"><strong>${escapeHtml(message.author?.role === 'admin' ? 'Municipal staff' : 'You')}</strong><p>${escapeHtml(message.message)}</p><small>${escapeHtml(formatDateTime(message.created_at))}</small></div>`).join('');
    container.innerHTML = `<button class="link-button" type="button" data-request-back>← Back to messages</button>
        <article class="service-request-detail"><header><div><small>${escapeHtml(item.reference_number)}</small><h3>${escapeHtml(item.subject)}</h3></div><span class="status-chip">${escapeHtml(String(item.status).replaceAll('_', ' '))}</span></header>
        <p>${escapeHtml(item.description)}</p><div class="service-request-thread">${messages}</div>
        ${!['closed'].includes(item.status) ? `<form class="stack-form service-request-reply-form" data-household-request-reply="${escapeHtml(item.id)}"><label>Add a reply<textarea name="message" maxlength="5000" required></textarea></label><button class="button button-secondary" type="submit">Send reply</button></form>` : ''}</article>`;
};

const loadHouseholdServiceRequests = async () => {
    const container = $('[data-service-request-list]');
    if (!container) return;
    try {
        const response = await requestJson('/api/service-requests?per_page=50');
        const items = responseItems(response);
        setText('[data-request-summary]', `${items.length} message${items.length === 1 ? '' : 's'}`);
        container.innerHTML = items.length ? items.map((item) => `<article class="service-request-item"><div><small>${escapeHtml(item.reference_number)} · ${escapeHtml(String(item.category).replaceAll('_', ' '))}</small><strong>${escapeHtml(item.subject)}</strong><span>Updated ${escapeHtml(formatCompactDateTime(item.updated_at))}</span></div><span class="status-chip">${escapeHtml(String(item.status).replaceAll('_', ' '))}</span><button class="link-button" type="button" data-request-open="${escapeHtml(item.id)}">Open message</button></article>`).join('') : '<div class="dashboard-empty-state"><strong>No household messages</strong><span>New messages and administrator responses will appear here.</span></div>';
    } catch (error) {
        if (!handleAuthFailure(error)) container.innerHTML = '<div class="dashboard-empty-state is-error"><strong>Messages unavailable</strong><span>Please try again.</span></div>';
    }
};

const loadNotificationPreferences = async () => {
    if (!notificationPreferencesForm || notificationPreferencesForm.dataset.loaded === '1') return;
    try {
        const response = await requestJson('/api/notification-preferences');
        const preferences = response.data ?? {};
        const regularNotificationNames = ['announcements', 'billing_updates', 'consumption_alerts', 'service_request_updates'];
        if (notificationPreferencesForm.elements.regular_notifications) {
            notificationPreferencesForm.elements.regular_notifications.checked = regularNotificationNames.every((name) => preferences[name] !== false);
        }
        ['leak_alerts', 'low_bandwidth_mode'].forEach((name) => {
            if (notificationPreferencesForm.elements[name]) notificationPreferencesForm.elements[name].checked = preferences[name] !== false;
        });
        ['quiet_hours_start', 'quiet_hours_end', 'preferred_locale'].forEach((name) => {
            if (notificationPreferencesForm.elements[name]) notificationPreferencesForm.elements[name].value = preferences[name] ?? (name === 'preferred_locale' ? 'en' : '');
        });
        notificationPreferencesForm.dataset.loaded = '1';
        applyLocale(preferences.preferred_locale ?? 'en');
        applyLowBandwidthMode(preferences.low_bandwidth_mode === true);
    } catch (error) {
        if (!handleAuthFailure(error)) showToast('Preferences could not be loaded.', 'error');
    }
};

const renderLegacyAdminAlerts = (items) => {
    const containers = $$('[data-admin-alerts]');
    if (!containers.length) {
        return;
    }

    const alerts = items ?? [];

    if (!alerts.length) {
        containers.forEach((container) => {
            container.innerHTML = '<div class="empty-state">No alerts found for this period.</div>';
        });
        return;
    }

    const markup = alerts
        .map((leak) => `
            <article class="notification-card">
                <div class="notification-head">
            <h4>${formatPersonalDisplay(leak.user.name)} · ${leak.user.account_number ?? leak.user.email}</h4>
                    <span class="status-chip ${leak.status === 'resolved' ? 'status-chip-soft' : 'status-chip-alert'}">${leak.status === 'resolved' ? 'Resolved' : 'Unresolved'}</span>
                </div>
                <p>${formatPersonalDisplay(leak.user.address, 'NO HOUSEHOLD ADDRESS RECORDED')} · Flow: ${formatNumber(leak.flow_rate)} L/min</p>
                <small>Last reading: ${formatDateTime(leak.last_reading_at)} · Last notice: ${formatDateTime(leak.last_notice_at)}</small>
            </article>
        `)
        .join('');

    containers.forEach((container) => {
        container.innerHTML = markup;
    });
};

const renderAdminAlerts = (items) => {
    const containers = $$('[data-admin-alerts]');
    if (!containers.length) return;

    const alerts = Array.isArray(items) ? items : [];
    if (!alerts.length) {
        containers.forEach((container) => {
            container.innerHTML = '<div class="empty-state">No possible leak alerts are currently recorded.</div>';
        });
        return;
    }

    const statusLabels = {
        detected: 'Detected',
        acknowledged: 'Acknowledged',
        investigating: 'Investigating',
        resolved: 'Resolved',
        false_alarm: 'False alarm',
    };
    const markup = alerts.map((alert) => {
        const status = alert.status ?? 'detected';
        const statusClass = ['resolved', 'false_alarm'].includes(status) ? 'status-chip-soft' : 'status-chip-alert';
        const user = alert.user ?? {};
        const latest = alert.latest_reading ?? {};
        const first = alert.first_reading ?? {};
        const device = alert.device ?? {};
        const notification = alert.notification ?? {};
        const statusOptions = Object.entries(statusLabels)
            .map(([value, label]) => '<option value="' + value + '"' + (value === status ? ' selected' : '') + '>' + label + '</option>')
            .join('');

        return '<article class="notification-card leak-alert-card" data-leak-alert-id="' + escapeHtml(alert.id) + '">'
            + '<div class="notification-head"><div>'
            + '<h4>' + escapeHtml(formatPersonalDisplay(user.name)) + ' · ' + escapeHtml(user.account_number ?? user.email ?? 'HOUSEHOLD') + '</h4>'
            + '<p>' + escapeHtml(user.email ?? 'No email recorded') + ' · ' + escapeHtml(formatPersonalDisplay(user.address, 'NO HOUSEHOLD ADDRESS RECORDED')) + '</p>'
            + '</div><span class="status-chip ' + statusClass + '">' + escapeHtml(statusLabels[status] ?? status) + '</span></div>'
            + '<div class="summary-list leak-alert-summary">'
            + '<div><dt>Meter</dt><dd>' + escapeHtml(device.name ?? latest.device_name ?? 'Registered meter') + ' · ' + escapeHtml(device.asset_number ?? 'Asset not recorded') + '</dd></div>'
            + '<div><dt>Current flow</dt><dd>' + escapeHtml(formatNumber(latest.flow_rate)) + ' L/min</dd></div>'
            + '<div><dt>Leak started</dt><dd>' + escapeHtml(formatDateTime(alert.detected_at ?? first.recorded_at)) + '</dd></div>'
            + '<div><dt>Last detected</dt><dd>' + escapeHtml(formatDateTime(alert.last_detected_at ?? latest.recorded_at)) + '</dd></div>'
            + '<div><dt>Latest reading</dt><dd>' + escapeHtml(formatDateTime(latest.recorded_at)) + ' · ' + escapeHtml(latest.leak_detection_status ?? 'Possible leak') + '</dd></div>'
            + '<div><dt>Household notified</dt><dd>' + escapeHtml(formatDateTime(alert.notified_at ?? notification.sent_at)) + '</dd></div>'
            + '</div>'
            + '<small>Device status: ' + escapeHtml(device.status ?? 'Unknown') + ' · Connection: ' + escapeHtml(latest.device_connection_status ?? 'Not reported') + ' · Server: ' + escapeHtml(latest.server_connection_status ?? 'Not reported') + '</small>'
            + '<div class="leak-alert-workspace">'
            + '<form class="stack-form leak-alert-update-form" data-leak-alert-update-form>'
            + '<div class="leak-alert-workflow-heading"><div><p class="eyebrow">Investigation and resolution</p><p>Record the current state and staff findings.</p></div></div>'
            + '<div class="leak-alert-workflow-fields"><label>Status<select name="status" required>' + statusOptions + '</select></label>'
            + '<label>Administrative notes<textarea name="notes" maxlength="2000" placeholder="Record investigation or resolution notes">' + escapeHtml(alert.notes ?? '') + '</textarea></label></div>'
            + '<div class="leak-alert-card-actions"><button class="button button-secondary" type="submit">Save alert status</button></div>'
            + '</form>'
            + '<form class="stack-form leak-alert-notify-form" data-leak-alert-notify-form>'
            + '<div class="leak-alert-workflow-heading"><div><p class="eyebrow">Household notification</p><p>Send a follow-up after reviewing the alert.</p></div></div>'
            + '<div class="leak-alert-notify-fields"><label>Follow-up title<input type="text" name="title" maxlength="255" value="Follow-up: possible water leak" required></label>'
            + '<label>Follow-up message<textarea name="message" maxlength="2000" required>Smart Water is following up on the possible leak detected by your meter. Please check your household plumbing and contact the municipal water office if the flow continues.</textarea></label></div>'
            + '<div class="leak-alert-card-actions"><button class="button button-primary" type="submit">Notify household</button></div>'
            + '</form></div></article>';
    }).join('');

    containers.forEach((container) => {
        container.innerHTML = markup;
    });
};

let adminLeakRefreshTimer = null;
let adminLeakRefreshInFlight = false;

const stopAdminLeakPolling = () => {
    if (adminLeakRefreshTimer) {
        window.clearTimeout(adminLeakRefreshTimer);
        adminLeakRefreshTimer = null;
    }
};

const scheduleAdminLeakPolling = () => {
    stopAdminLeakPolling();
    if (page !== 'admin' || !readToken()) return;
    adminLeakRefreshTimer = window.setTimeout(() => loadAdminLeakAlerts(), 10000);
};

const loadAdminLeakAlerts = async () => {
    const container = $('[data-admin-alerts]');
    if (!container || adminLeakRefreshInFlight || !readToken()) return [];

    adminLeakRefreshInFlight = true;
    try {
        const response = await requestJson('/api/leak-alerts?per_page=100');
        const alerts = responseItems(response);
        renderAdminAlerts(alerts);
        return alerts;
    } catch (error) {
        if (!handleAuthFailure(error)) {
            container.innerHTML = '<div class="empty-state is-error">Unable to load leak alerts. Try again.</div>';
            console.error(error);
        }
        return [];
    } finally {
        adminLeakRefreshInFlight = false;
        scheduleAdminLeakPolling();
    }
};

const bindAdminLeakActions = (container) => {
    if (!container || container.dataset.bound === '1') return;
    container.dataset.bound = '1';

    container.addEventListener('submit', async (event) => {
        const updateForm = event.target.closest('[data-leak-alert-update-form]');
        const notifyForm = event.target.closest('[data-leak-alert-notify-form]');
        if (!updateForm && !notifyForm) return;

        event.preventDefault();
        const card = event.target.closest('[data-leak-alert-id]');
        const alertId = card?.dataset.leakAlertId;
        if (!alertId) return;

        const form = updateForm ?? notifyForm;
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.dataset.defaultText = submitButton.dataset.defaultText || submitButton.textContent;
            submitButton.textContent = 'Saving...';
        }

        try {
            const payload = Object.fromEntries(new FormData(form).entries());
            const endpoint = updateForm ? '/api/leak-alerts/' + alertId : '/api/leak-alerts/' + alertId + '/notify';
            const response = await requestJson(endpoint, {
                method: updateForm ? 'PATCH' : 'POST',
                body: JSON.stringify(payload),
            });
            showToast(response?.message ?? 'Leak alert updated successfully.');
            await loadAdminLeakAlerts();
        } catch (error) {
            if (!handleAuthFailure(error)) showToast(errorMessage(error, 'Could not update the leak alert.'), 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = submitButton.dataset.defaultText || 'Save';
            }
        }
    });
};

const renderAdminSentNotifications = (items) => {
    const types = ['service_interruption', 'maintenance', 'announcement'];
    types.forEach((type) => {
        const container = $(`[data-admin-sent-type="${type}"]`);
        if (!container) return;
        const grouped = new Map();
        (items ?? []).filter((item) => item.type === type).forEach((item) => {
            const sentTime = item.sent_at ?? item.created_at ?? '';
            const legacyTime = sentTime.slice(0, 16);
            const key = item.batch_id ?? `${item.type}|${item.title}|${item.message}|${legacyTime}`;
            if (!grouped.has(key)) grouped.set(key, { ...item, recipientCount: 0 });
            grouped.get(key).recipientCount += 1;
        });
        const records = [...grouped.values()];
        container.innerHTML = records.length
            ? records.map((item) => `<article class="notification-card">
                <div class="notification-head">
                    <h4>${item.title}</h4>
                </div>
                <p>${item.message}</p>
                <small>Sent ${formatDateTime(item.sent_at ?? item.created_at)} · ${item.recipientCount} recipient${item.recipientCount === 1 ? '' : 's'}</small>
                <button type="button" class="link-button rose" data-delete-sent-notification="${item.id}" data-notification-title="${item.title}">Delete</button>
            </article>`).join('')
            : '<div class="empty-state">No sent records in this category.</div>';
    });
};

const renderAdminNotificationHistory = (response) => {
    const container = $('[data-admin-notification-history]');
    const records = responseItems(response);
    const paginator = responsePaginator(response);
    setText('[data-admin-notification-summary]', paginator?.total ? `${paginator.total} notification batch${paginator.total === 1 ? '' : 'es'}` : 'No notification batches');
    if (!container) return;

    if (!records.length) {
        container.innerHTML = '<div class="empty-state">No sent notification records match the current filters.</div>';
    } else {
        container.innerHTML = records.map((item) => {
            const status = item.delivery_status ?? 'delivered';
            const statusLabel = status === 'partial' ? 'Partially delivered' : status.charAt(0).toUpperCase() + status.slice(1);
            const audience = item.audience === 'selected_household' ? 'Selected household' : 'All active households';
            const actionMarkup = item.failed_count > 0
                ? `<button type="button" class="link-button" data-retry-sent-notification="${escapeHtml(item.id)}">Retry failed</button>`
                : '';

            return `<article class="notification-card admin-notification-history-item">
                <div class="notification-head"><div><h4>${escapeHtml(item.title)}</h4><p class="notification-tag">${escapeHtml(notificationTypeLabel(item.type))}</p></div><span class="status-chip ${status === 'delivered' ? 'status-chip-soft' : 'status-chip-alert'}">${escapeHtml(statusLabel)}</span></div>
                <p>${escapeHtml(item.message)}</p>
                <div class="summary-list admin-notification-stats">
                    <div><dt>Audience</dt><dd>${escapeHtml(audience)}</dd></div>
                    <div><dt>Recipients</dt><dd>${formatNumber(item.recipient_count, 0)}</dd></div>
                    <div><dt>Delivered</dt><dd>${formatNumber(item.delivered_count, 0)}</dd></div>
                    <div><dt>Read</dt><dd>${formatNumber(item.read_count, 0)} / ${formatNumber(item.recipient_count, 0)}</dd></div>
                    <div><dt>Sent / scheduled</dt><dd>${escapeHtml(formatDateTime(item.sent_at ?? item.scheduled_at))}</dd></div>
                </div>
                <small>${status === 'scheduled' ? 'Scheduled delivery' : 'Created'} ${escapeHtml(formatDateTime(item.created_at))}</small>
                <div class="table-actions admin-notification-actions">${actionMarkup}<button type="button" class="link-button" data-archive-sent-notification="${escapeHtml(item.id)}">Archive</button><button type="button" class="link-button rose" data-delete-sent-notification="${escapeHtml(item.id)}" data-notification-title="${escapeHtml(item.title)}">Delete</button></div>
            </article>`;
        }).join('');
    }

    renderPager($('[data-admin-notification-pager]'), paginator, (page) => {
        adminNotificationState.page = page;
        loadAdminNotificationHistory();
    });
};

const renderAdminNotificationDropdown = (response) => {
    if (!adminNotificationDropdownList) return;

    const records = responseItems(response).slice(0, 5);
    if (!records.length) {
        adminNotificationDropdownList.innerHTML = `
            <div class="notification-dropdown-empty">
                <i class="bi bi-bell-slash" aria-hidden="true"></i>
                <strong>No notification activity yet</strong>
                <span>Recent household notices will appear here.</span>
            </div>`;
        return;
    }

    adminNotificationDropdownList.innerHTML = records.map((item) => {
        const recipients = Math.max(0, Number(item.recipient_count) || 0);
        const readCount = Math.max(0, Number(item.read_count) || 0);
        const unreadCount = Math.max(0, recipients - readCount);
        const needsAttention = unreadCount > 0;
        const status = item.delivery_status ?? 'delivered';
        const icon = status === 'scheduled' ? 'bi-clock' : (status === 'partial' || status === 'failed' ? 'bi-exclamation-triangle' : 'bi-megaphone');
        const activity = status === 'scheduled'
            ? `Scheduled for ${formatCompactDateTime(item.scheduled_at)}`
            : `${readCount} of ${recipients} recipient${recipients === 1 ? '' : 's'} read`;

        return `<article class="notification-dropdown-item admin-notification-dropdown-item${needsAttention ? ' is-unread' : ''}">
            <span class="notification-dropdown-icon" aria-hidden="true"><i class="bi ${icon}"></i></span>
            <span class="notification-dropdown-copy">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(notificationTypeLabel(item.type))} · ${escapeHtml(activity)}</span>
                <small>${escapeHtml(formatCompactDateTime(item.sent_at ?? item.scheduled_at ?? item.created_at))}</small>
            </span>
            <span class="notification-dropdown-unread-dot" aria-hidden="true"></span>
        </article>`;
    }).join('');
};

const loadAdminNotificationDropdown = async () => {
    if (!adminNotificationDropdownList) return;

    adminNotificationDropdownList.innerHTML = '<div class="notification-dropdown-empty">Loading notifications...</div>';
    try {
        const response = await requestJson('/api/notification-management?page=1&per_page=5');
        renderAdminNotificationDropdown(response);
    } catch (error) {
        if (handleAuthFailure(error)) return;
        adminNotificationDropdownList.innerHTML = '<div class="notification-dropdown-empty is-error">Unable to load recent notifications.</div>';
    }
};

const loadAdminNotificationHistory = async () => {
    const container = $('[data-admin-notification-history]');
    try {
        const response = await requestJson(`/api/notification-management${buildQuery(adminNotificationState)}`);
        renderAdminNotificationHistory(response);
        return response;
    } catch (error) {
        if (handleAuthFailure(error)) return null;
        if (container) container.innerHTML = `<div class="empty-state is-error">${escapeHtml(errorMessage(error, 'Unable to load notification history.'))}</div>`;
        return null;
    }
};

const bindAdminNotificationFilters = () => {
    if (!adminNotificationFilterForm || adminNotificationFilterForm.dataset.bound === '1') return;
    adminNotificationFilterForm.dataset.bound = '1';
    adminNotificationFilterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const fields = serializeForm(adminNotificationFilterForm);
        adminNotificationState.page = 1;
        adminNotificationState.search = fields.search ?? '';
        adminNotificationState.type = fields.type ?? '';
        adminNotificationState.status = fields.status ?? '';
        loadAdminNotificationHistory();
    });
};

const normalizeMonitoringStatus = (value, unavailable = 'Unavailable') => {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return unavailable;
    if (['connected', 'online', 'active', 'monitoring', 'ok'].includes(normalized)) return 'Active';
    return 'Inactive';
};

const resolveHouseholdConnection = (deviceState, latestReading) => {
    if (deviceState === null || deviceState === undefined) {
        return {
            label: 'Unavailable',
            description: 'Connection health is temporarily unavailable. Refresh the dashboard to try again.',
            isLive: false,
        };
    }
    const status = String(deviceState?.status ?? '').trim().toLowerCase();
    if (!deviceState?.device_id) {
        return {
            label: 'No meter assigned',
            description: 'Assign a meter to view connection health.',
            isLive: false,
        };
    }
    if (status === 'pending') {
        return {
            label: 'Pending activation',
            description: 'The assigned meter is awaiting activation.',
            isLive: false,
        };
    }
    if (['disabled', 'decommissioned', 'maintenance'].includes(status)) {
        return {
            label: 'Disabled',
            description: 'The assigned meter is not currently active.',
            isLive: false,
        };
    }
    if (!latestReading) {
        return {
            label: 'Waiting for first reading',
            description: 'No meter reading has been received yet.',
            isLive: false,
        };
    }

    const isLive = deviceState.is_live === true;
    return {
        label: isLive ? 'Online' : 'Offline',
        description: deviceState.last_seen_at
            ? `Last reading received ${formatDateTime(deviceState.last_seen_at)}.`
            : 'No recent meter communication is available.',
        isLive,
    };
};

const applyStatusTone = (selector, value) => {
    $$(selector).forEach((node) => {
        node.classList.remove('is-good', 'is-warning', 'is-unavailable', 'is-error');
        const normalized = String(value ?? '').toLowerCase();
        node.classList.add(normalized.includes('unavailable') || normalized.includes('no meter') ? 'is-unavailable' : normalized.includes('disconnected') || normalized.includes('offline') || normalized.includes('disabled') || normalized.includes('critical') || normalized.includes('leak') ? 'is-error' : normalized.includes('inactive') || normalized.includes('pending') || normalized.includes('waiting') || normalized.includes('warning') ? 'is-warning' : 'is-good');
    });
};

const applySummary = (summary, deviceState = householdDeviceState) => {
    const current = summary?.current_month ?? {};
    const notifications = summary?.notifications ?? {};
    const billingStatement = summary?.billing_statement ?? null;
    const activeBilling = summary?.active_billing ?? null;
    activeCurrency = activeBilling?.currency ?? 'PHP';

    const summaryData = {
        ...current,
        reading_count: current.reading_count ?? null,
        total_liters: current.total_liters ?? null,
        estimated_bill: current.estimated_bill ?? null,
        monthly_usage: summary?.monthly_usage ?? [],
    };
    const latestReading = current.latest_reading ?? null;

    setText('[data-water-rate]', activeBilling ? formatCurrency(activeBilling.water_rate) : '--');
    setText('[data-balance]', billingStatement ? formatCurrency(billingStatement.remaining_balance) : '--');
    setText('[data-threshold]', activeBilling ? `${formatNumber(activeBilling.threshold_liters ?? 0)} L` : '--');
    setText('[data-leak-threshold]', activeBilling ? `${formatNumber(activeBilling.leak_flow_rate_threshold ?? 0)} L/min` : '--');
    setText('[data-billing-month]', billingStatement?.billing_month
        ? new Date(billingStatement.billing_month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        : '--');
    setText('[data-leak-details]', !latestReading ? 'No recent device reading available.' : Boolean(latestReading?.is_possible_leak) ? 'Possible leak detected from the latest reading.' : 'No leak has been detected yet.');
    const leakStatus = !latestReading ? 'Unavailable' : latestReading.is_possible_leak ? 'Possible leak' : 'Normal';
    setText('[data-leak-status]', leakStatus);
    $$('[data-leak-status]').forEach((node) => {
        node.classList.toggle('status-chip-alert', Boolean(latestReading?.is_possible_leak));
        node.classList.toggle('status-chip-soft', !latestReading?.is_possible_leak);
    });

    householdDeviceState = deviceState ?? householdDeviceState;
    renderHouseholdSummaryCards(summaryData, latestReading, notifications, activeBilling, billingStatement, householdDeviceState);
};

const setHouseholdAnalyticsValue = (selector, value, isEmpty = false) => {
    $$(selector).forEach((node) => {
        node.textContent = value;
        node.classList.toggle('is-empty', isEmpty);
    });
};

const applyHouseholdAnalytics = (analytics) => {
    householdAnalytics = analytics ?? null;
    const period = analytics?.period ?? {};
    const current = analytics?.current_period ?? {};
    const previous = analytics?.previous_period ?? {};
    const comparison = analytics?.comparison ?? {};
    const highest = analytics?.highest_usage_period ?? null;
    const latestWeek = Array.isArray(analytics?.weekly_consumption) ? analytics.weekly_consumption.at(-1) : null;
    const latestMonth = Array.isArray(analytics?.monthly_consumption) ? analytics.monthly_consumption.at(-1) : null;

    setText('[data-household-analytics-timezone]', period.timezone ?? analytics?.timezone ?? 'UTC');
    const hasPeriod = Boolean(period.from && period.to);
    const hasDaily = analytics?.daily_consumption !== null && analytics?.daily_consumption !== undefined;
    const hasBill = current.estimated_bill !== null && current.estimated_bill !== undefined;
    const hasPrevious = previous.total_liters !== null && previous.total_liters !== undefined;
    const hasComparison = comparison.change_percent !== null && comparison.change_percent !== undefined;
    const hasLeakHistory = Array.isArray(analytics?.leak_warning_history);
    const hasLastReading = Boolean(analytics?.last_successful_meter_reading?.recorded_at);

    setHouseholdAnalyticsValue('[data-household-analytics-period]', hasPeriod
        ? `${formatCompactDateTime(period.from)} – ${formatCompactDateTime(period.to)}`
        : 'Choose a date range to begin', !hasPeriod);
    setHouseholdAnalyticsValue('[data-household-daily-consumption]', hasDaily
        ? formatCubicMeters(analytics.daily_consumption) : 'Awaiting readings', !hasDaily);
    setHouseholdAnalyticsValue('[data-household-weekly-consumption]', latestWeek
        ? formatCubicMeters(latestWeek.total_liters) : 'Awaiting readings', !latestWeek);
    setHouseholdAnalyticsValue('[data-household-monthly-consumption]', latestMonth
        ? formatCubicMeters(latestMonth.total_liters) : 'Awaiting readings', !latestMonth);
    setHouseholdAnalyticsValue('[data-household-analytics-bill]', hasBill
        ? formatCurrency(current.estimated_bill) : 'Not calculated yet', !hasBill);
    setHouseholdAnalyticsValue('[data-household-previous-period]', hasPrevious
        ? formatCubicMeters(previous.total_liters) : 'Awaiting comparison', !hasPrevious);
    setHouseholdAnalyticsValue('[data-household-period-comparison]', hasComparison
        ? `${comparison.change_percent > 0 ? '+' : ''}${formatNumber(comparison.change_percent)}% (${comparison.direction})`
        : 'Awaiting comparison', !hasComparison);
    setHouseholdAnalyticsValue('[data-household-highest-usage]', highest
        ? `${formatCompactDateTime(highest.period)} · ${formatCubicMeters(highest.total_liters)}`
        : 'No usage recorded', !highest);
    setHouseholdAnalyticsValue('[data-household-leak-warning-count]', hasLeakHistory
        ? analytics.leak_warning_history.length : 'Not available', !hasLeakHistory);
    setHouseholdAnalyticsValue('[data-household-last-reading]', hasLastReading
        ? formatDateTime(analytics.last_successful_meter_reading.recorded_at)
        : 'No reading recorded', !hasLastReading);
};

const setDashboardFeedback = (message = '', type = 'info') => {
    const feedback = $('[data-dashboard-feedback]');
    if (!feedback) return;

    feedback.hidden = !message;
    feedback.textContent = message;
    feedback.classList.toggle('is-error', type === 'error');
    feedback.classList.toggle('is-loading', type === 'loading');
};

const renderDashboardSummaryUnavailable = () => {
    setText('[data-current-flow]', 'Unable to load current flow.');
    setText('[data-flow-state]', 'Refresh the dashboard to try again.');
    setText('[data-leak-summary]', 'Unable to load leak status.');
    setText('[data-leak-state]', 'Refresh the dashboard to try again.');
    setText('[data-connection-summary]', 'Unable to load meter connection.');
    setText('[data-connection-state]', 'Refresh the dashboard to try again.');
    setText('[data-flow-badge]', 'Unavailable');
    setText('[data-connection-badge]', 'Unavailable');
    setText('[data-billing-badge]', 'Unavailable');
};

const renderDashboardReadingsUnavailable = () => {
    $$('[data-live-readings-list], [data-recent-readings-list]').forEach((container) => {
        container.innerHTML = '<div class="empty-state is-error">Unable to load recent readings.</div>';
    });
};

const setHouseholdConsumptionPeriod = (period) => {
    const labels = householdConsumptionPeriods[period] ?? householdConsumptionPeriods.daily;
    setText('[data-household-consumption-label]', labels.label);
    setText('[data-household-consumption-state]', labels.description);
    $$('[data-household-consumption-period]').forEach((button) => {
        const isActive = button.dataset.householdConsumptionPeriod === period;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
};

const renderHouseholdConsumptionState = ({ value = '', description = '', hasUnit = false, loading = false } = {}) => {
    const valueNode = $('[data-household-consumption-value]');
    const unitNode = $('[data-household-consumption-unit]');
    const skeletonNode = $('[data-household-consumption-skeleton]');
    const stateNode = $('[data-household-consumption-state]');
    const cardNode = $('[data-household-consumption-card]');

    if (valueNode) {
        valueNode.textContent = value;
        valueNode.hidden = loading;
    }
    if (stateNode) stateNode.textContent = description;
    if (unitNode) unitNode.hidden = !hasUnit;
    if (skeletonNode) skeletonNode.hidden = !loading;
    if (cardNode) cardNode.setAttribute('aria-busy', String(loading));
};

const renderHouseholdConsumption = (data) => {
    const value = Number(data?.liters);
    const cubicMeters = Number(data?.cubic_meters);
    const period = data?.period ?? householdConsumptionPeriod;
    setHouseholdConsumptionPeriod(period);

    if (data?.has_data === true && Number.isFinite(value)) {
        const description = value === 0
            ? 'No water consumption recorded for this period.'
            : `${householdConsumptionPeriods[period]?.description ?? 'Consumption recorded for this period.'}${Number.isFinite(cubicMeters) ? ` Equivalent to ${formatNumber(cubicMeters, 4)} m³ for billing.` : ''}`;
        renderHouseholdConsumptionState({ value: formatNumber(value, 2), description, hasUnit: true });
        return;
    }

    const unavailable = householdConsumptionAvailability[data?.availability] ?? householdConsumptionAvailability.no_valid_readings;
    renderHouseholdConsumptionState({ value: unavailable.value, description: unavailable.state });
};

const loadHouseholdConsumption = async (period = householdConsumptionPeriod) => {
    const card = $('[data-household-consumption-card]');
    if (!card || !householdConsumptionPeriods[period]) return false;

    householdConsumptionPeriod = period;
    const requestId = ++householdConsumptionRequestId;
    householdConsumptionRequestController?.abort();
    householdConsumptionRequestController = new AbortController();
    setHouseholdConsumptionPeriod(period);
    renderHouseholdConsumptionState({ description: 'Loading consumption…', loading: true });

    try {
        const response = await requestJson(`/api/household-consumption?period=${encodeURIComponent(period)}`, {
            signal: householdConsumptionRequestController.signal,
        });
        if (requestId !== householdConsumptionRequestId) return;
        renderHouseholdConsumption(response?.data);
        return true;
    } catch (error) {
        if (error?.name === 'AbortError' || requestId !== householdConsumptionRequestId) return;
        console.error(`Dashboard request failed: /api/household-consumption?period=${encodeURIComponent(period)}`, error);
        if (handleAuthFailure(error)) {
            renderHouseholdConsumptionState({ value: 'Unable to load consumption.', description: '' });
            return false;
        }
        renderHouseholdConsumptionState({ value: 'Unable to load consumption.', description: '' });
        return false;
    } finally {
        if (requestId === householdConsumptionRequestId) {
            householdConsumptionRequestController = null;
        }
    }
};

const setHouseholdTrendSelector = (period, disabled = false) => {
    $$('[data-household-trend-period]').forEach((button) => {
        const isActive = button.dataset.householdTrendPeriod === period;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
        button.disabled = disabled;
    });
};

const householdTrendMessage = (availability) => ({
    no_meter: 'No water meter assigned.\nContact the administrator to assign a meter before consumption trends can be displayed.',
    pending_activation: 'Meter awaiting activation.\nConsumption trends will appear after the assigned meter is activated.',
    no_valid_readings: 'No consumption history yet.\nYour usage trend will appear after the meter submits valid readings.',
    no_period_data: 'No usage data is available for this period.\nTry selecting a wider time range.',
}[availability] ?? 'No usage data is available for this period.\nTry selecting a wider time range.');

const renderHouseholdTrendSummary = (summary) => {
    const summaryCard = $('[data-household-trend-summary]');
    if (!summaryCard) return;
    const hasCurrent = summary?.current?.cubic_meters !== null && summary?.current?.cubic_meters !== undefined;
    const hasAverage = summary?.average_cubic_meters !== null && summary?.average_cubic_meters !== undefined;
    summaryCard.hidden = !hasCurrent && !hasAverage;
    setText('[data-household-trend-current-label]', `Current ${summary?.period_label ?? 'period'}`);
    setText('[data-household-trend-previous-label]', `Previous ${summary?.period_label ?? 'period'}`);
    setText('[data-household-trend-current]', hasCurrent ? `${formatNumber(summary.current.cubic_meters)} m³` : 'No data');
    setText('[data-household-trend-previous]', summary?.previous?.cubic_meters === null || summary?.previous?.cubic_meters === undefined
        ? 'Not enough history for comparison.'
        : `${formatNumber(summary.previous.cubic_meters)} m³`);
    setText('[data-household-trend-change]', summary?.change_percent === null || summary?.change_percent === undefined
        ? 'Not enough history for comparison.'
        : `${summary.change_percent > 0 ? '+' : ''}${formatNumber(summary.change_percent, 1)}%`);
    setText('[data-household-trend-average]', hasAverage ? `${formatNumber(summary.average_cubic_meters)} m³` : 'No data');
};

const setHouseholdTrendState = (message = '', type = 'info', retry = false) => {
    const state = $('[data-household-trend-state]');
    if (!state) return;
    state.hidden = !message;
    state.classList.toggle('is-error', type === 'error');
    state.classList.toggle('is-loading', type === 'loading');
    state.innerHTML = message
        ? `<span>${escapeHtml(message).replaceAll('\n', '<br>')}</span>${retry ? '<button type="button" class="button button-secondary household-trend-retry" data-household-trend-retry>Retry</button>' : ''}`
        : '';
    $('[data-household-trend-retry]', state)?.addEventListener('click', () => loadHouseholdTrend(householdTrendPeriod));
};

const renderHouseholdTrend = (data) => {
    const usageContent = $('[data-household-usage-content]');
    const chart = $('[data-household-monthly-chart]');
    const trend = Array.isArray(data?.trend) ? data.trend : [];
    const hasTrendData = trend.some((row) => row.has_data === true || Number(row.reading_count ?? 0) > 0);
    const availability = data?.availability ?? 'no_valid_readings';
    householdTrendHasValidChart = hasTrendData;
    usageContent?.classList.remove('is-loading');
    usageContent?.classList.toggle('is-empty', !hasTrendData);
    setHouseholdTrendState('', 'info');

    if (availability !== 'ready') {
        setHouseholdTrendState(householdTrendMessage(availability));
    }

    renderHouseholdTrendSummary(data?.summary);
    renderMonthlyChart(chart, trend, {
        period: householdTrendPeriod,
        title: householdTrendPeriods[householdTrendPeriod]?.title ?? 'Household water consumption trend',
        dataAvailable: hasTrendData,
        emptyMessage: '<div class="chart-empty-state" aria-hidden="true"></div>',
    });
    const text = $('[data-household-trend-text]');
    if (text) {
        text.hidden = !hasTrendData;
        text.textContent = data?.summary?.direction
            ? `Usage is ${data.summary.direction} compared with the previous ${data.summary.period_label}.`
            : 'Not enough history for comparison.';
    }
};

const loadHouseholdTrend = async (period = householdTrendPeriod) => {
    const card = $('[data-household-trend-card]');
    if (!card || !householdTrendPeriods[period]) return false;

    householdTrendPeriod = period;
    const requestId = ++householdTrendRequestId;
    householdTrendRequestController?.abort();
    householdTrendRequestController = new AbortController();
    setHouseholdTrendSelector(period, true);
    $('[data-household-usage-content]')?.classList.toggle('is-loading', !householdTrendHasValidChart);
    setHouseholdTrendState('Loading consumption trend…', 'loading');

    try {
        const response = await requestJson(`/api/household-consumption?period=${encodeURIComponent(period)}`, {
            signal: householdTrendRequestController.signal,
        });
        if (requestId !== householdTrendRequestId) return;
        renderHouseholdTrend(response?.data);
        return true;
    } catch (error) {
        if (error?.name === 'AbortError' || requestId !== householdTrendRequestId) return;
        console.error(`Dashboard request failed: /api/household-consumption?period=${encodeURIComponent(period)}`, error);
        if (handleAuthFailure(error)) return false;
        setHouseholdTrendState('Unable to load the consumption trend. Check your connection and try again.', 'error', true);
        return false;
    } finally {
        if (requestId === householdTrendRequestId) {
            householdTrendRequestController = null;
            setHouseholdTrendSelector(householdTrendPeriod, false);
        }
    }
};

const renderHouseholdSummaryCards = (summaryData, latestReading, notifications, activeBilling, billingStatement, deviceState) => {
    const readingCount = Number(summaryData?.reading_count ?? 0);
    const hasReadings = readingCount > 0;
    const totalConsumed = hasReadings ? formatCubicMeters(summaryData.total_liters) : 'No data yet';
    const hasRate = activeBilling?.water_rate !== null && activeBilling?.water_rate !== undefined;
    const hasEstimatedBill = hasReadings && summaryData?.estimated_bill !== null && summaryData?.estimated_bill !== undefined;
    const estimatedBill = !hasRate ? 'Rate unavailable' : hasEstimatedBill ? formatCurrency(summaryData.estimated_bill) : 'No data';
    const leakDetected = Boolean(latestReading?.is_possible_leak);
    const leakStatus = !latestReading ? 'Unavailable' : leakDetected ? 'Possible leak' : 'Normal';
    const connection = resolveHouseholdConnection(deviceState, latestReading);
    const monitoringStatus = connection.isLive
        ? normalizeMonitoringStatus(latestReading?.monitoring_status)
        : connection.label;
    const wifiStatus = !connection.isLive
        ? connection.label
        : latestReading?.wifi_signal_strength === null || latestReading?.wifi_signal_strength === undefined
            ? 'Unavailable'
            : Number(latestReading.wifi_signal_strength) > 0 ? 'Connected' : 'Disconnected';
    const overallConnection = connection.label;
    const lastUpdated = deviceState?.last_seen_at || latestReading?.recorded_at
        ? formatDateTime(deviceState?.last_seen_at ?? latestReading.recorded_at)
        : 'Waiting for first reading';
    const quickSummary = hasReadings ? `${readingCount} readings · ${totalConsumed}` : 'No readings yet';

    setText('[data-stat-readings]', readingCount);
    setText('[data-stat-liters]', totalConsumed);
    setText('[data-stat-bill]', householdBillingSnapshot ? formatCurrency(householdBillingSnapshot.calculation?.current_charge, householdBillingSnapshot.calculation?.currency) : estimatedBill);
    const unreadCount = Number(notifications.unread ?? 0);
    setText('[data-stat-alerts]', unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'No unread notifications');
    setHouseholdAlertCount(notifications.unread ?? 0);
    setText('[data-today-total]', totalConsumed);
    setText('[data-total-consumed]', totalConsumed);
    setText('[data-estimated-bill]', householdBillingSnapshot ? formatCurrency(householdBillingSnapshot.calculation?.current_charge, householdBillingSnapshot.calculation?.currency) : estimatedBill);
    setText('[data-quick-summary]', quickSummary);
    const flowValue = Number(latestReading?.flow_rate);
    const hasFlowReading = latestReading && Number.isFinite(flowValue);
    setText('[data-current-flow]', hasFlowReading ? `${formatNumber(flowValue)} L/min` : 'No reading');
    setText('[data-leak-summary]', leakStatus);
    setText('[data-connection-summary]', overallConnection);
    setText('[data-connection-state]', connection.description);
    setText('[data-flow-state]', !hasFlowReading
        ? 'No recent reading available.'
        : flowValue === 0
            ? 'No active water flow detected.'
            : connection.isLive ? 'Water is currently flowing.' : `Last known reading. Last reading received ${formatDateTime(latestReading.recorded_at)}.`);
    if (householdBillingSnapshot) {
        applyHouseholdBillingSummary(householdBillingSnapshot);
    } else {
        setText('[data-billing-state]', !hasRate ? 'No active water rate is configured.' : hasEstimatedBill ? 'Usage charge only; loading the complete monthly estimate.' : 'No billable readings this period.');
    }
    setText('[data-leak-state]', !latestReading ? 'No recent device reading available.' : leakDetected ? 'Possible leak detected from the latest reading.' : 'No leak detected in the latest reading.');
    setText('[data-notification-state]', unreadCount > 0 ? 'Unread alerts need your attention.' : "You're all caught up.");
    setText('[data-system-water-meter]', connection.label);
    setText('[data-system-monitoring]', monitoringStatus);
    setText('[data-system-wifi]', wifiStatus);
    setText('[data-system-server]', 'Connected');
    setText('[data-system-leak]', leakStatus === 'Normal' ? 'Normal' : leakStatus);
    setText('[data-last-updated-label]', `Last updated: ${lastUpdated}`);
    setText('[data-last-updated]', lastUpdated);

    applyStatusTone('[data-leak-summary], [data-system-leak]', leakStatus);
    applyStatusTone('[data-system-water-meter], [data-connection-summary]', overallConnection);
    applyStatusTone('[data-system-server]', 'Connected');
    applyStatusTone('[data-flow-badge], [data-connection-badge]', overallConnection);
    applyStatusTone('[data-system-monitoring]', monitoringStatus);
    applyStatusTone('[data-system-wifi]', wifiStatus);
    $$('[data-leak-summary]').forEach((node) => {
        node.classList.toggle('mint', leakStatus === 'Normal');
        node.classList.toggle('rose', leakDetected);
    });
    setText('[data-flow-badge]', connection.isLive ? 'Live' : connection.label);
    setText('[data-connection-badge]', connection.label);
    if (!householdBillingSnapshot) {
        setText('[data-billing-badge]', !hasRate ? 'Unavailable' : billingStatement ? 'Finalized' : 'Loading');
        applyStatusTone('[data-billing-badge]', !hasRate ? 'Unavailable' : billingStatement ? 'Finalized' : 'Loading');
    }

    renderNotifications(notifications.latest ?? [], '[data-dashboard-notifications-list]');
    setText('[data-live-label]', connection.isLive ? 'Live' : connection.label);
    setText('[data-dashboard-live-state]', connection.isLive ? 'Meter online' : connection.label);
    applyStatusTone('[data-dashboard-live-state]', connection.label);
};

const refreshLiveDashboard = async () => {
    if (!readToken() || page !== 'household' || householdActiveView !== 'dashboard') {
        stopDashboardPolling();
        return;
    }

    if (dashboardRefreshInFlight) {
        scheduleDashboardPolling();
        return;
    }

    dashboardRefreshInFlight = true;
    try {
        const [stateResult, readingsResult] = await Promise.allSettled([
            requestJson('/api/live-state'),
            requestJson('/api/live-readings?limit=30'),
        ]);

        for (const result of [stateResult, readingsResult]) {
            if (result.status === 'rejected' && handleAuthFailure(result.reason)) {
                stopDashboardPolling();
                return;
            }
        }

        if (stateResult.status === 'fulfilled') {
            householdDeviceState = stateResult.value?.data?.device_state ?? householdDeviceState;
            if (householdSummaryData) applySummary(householdSummaryData, householdDeviceState);
        }

        if (readingsResult.status === 'fulfilled') {
            applyLiveConsumptionResponse(readingsResult.value);
            setDashboardFeedback('');
            setStatus('Connected');
        } else {
            markLiveConsumptionUnavailable();
            setDashboardFeedback('Live readings are temporarily unavailable. Retrying…', 'error');
        }
    } catch (error) {
        if (!handleAuthFailure(error)) {
            markLiveConsumptionUnavailable();
            setDashboardFeedback(errorMessage(error, 'Live readings are temporarily unavailable. Retrying…'), 'error');
        }
    } finally {
        dashboardRefreshInFlight = false;
        scheduleDashboardPolling();
    }
};

const loadDashboard = async (options = {}) => {
    const { reschedule = true, manual = false } = options;

    if (!readToken()) {
        if (manual) dashboardCacheForceNetwork = false;
        stopDashboardPolling();
        safeRedirect('/login');
        return;
    }

    if (dashboardRefreshInFlight) {
        if (manual) dashboardCacheForceNetwork = false;
        if (reschedule) {
            scheduleDashboardPolling();
        }

        return;
    }

    dashboardRefreshInFlight = true;
    if (manual && refreshButton) {
        refreshButton.disabled = true;
        refreshButton.classList.add('is-loading');
        refreshButton.setAttribute('aria-busy', 'true');
        refreshButton.setAttribute('aria-label', 'Refreshing dashboard data');
    }

    let dashboardHasUsableData = false;

    try {
        const offlineUser = !navigator.onLine ? readSessionUser() : null;
        const me = householdProfile ? { data: householdProfile } : offlineUser ? { data: offlineUser } : await requestJson('/api/me');
        householdProfile = me.data;
        renderProfile(me.data);
        renderAccountActivity(me.data);
        void loadAccountProfile();
        if (redirectAwayFromWrongRole(me.data, 'household')) {
            stopDashboardPolling();
            return;
        }

        const readingsQuery = buildQuery({
            page: dashboardState.page,
            per_page: dashboardState.per_page,
            from: dashboardState.from,
            to: dashboardState.to,
        });

        const summaryUrl = `/api/summary?user_id=${me.data.id}`;
        const householdAnalyticsKey = `${householdAnalyticsRange?.value || 'last_30_days'}:${householdAnalyticsFrom?.value || ''}:${householdAnalyticsTo?.value || ''}`;
        const shouldLoadAnalytics = householdAnalyticsLoadedRange !== householdAnalyticsKey
            && (householdAnalyticsRange?.value !== 'custom' || (householdAnalyticsFrom?.value && householdAnalyticsTo?.value));
        const dashboardRequests = [
            { name: 'summary', url: summaryUrl, promise: requestJson(summaryUrl) },
            { name: 'readings', url: `/api/readings${readingsQuery}`, promise: requestJson(`/api/readings${readingsQuery}`) },
            { name: 'live-state', url: '/api/live-state', promise: requestJson('/api/live-state') },
            { name: 'live-readings', url: '/api/live-readings?limit=30', promise: requestJson('/api/live-readings?limit=30') },
            {
                name: 'analytics',
                url: `/api/analytics/household${analyticsQuery(householdAnalyticsRange, householdAnalyticsFrom, householdAnalyticsTo, 'last_30_days')}`,
                promise: shouldLoadAnalytics
                    ? requestJson(`/api/analytics/household${analyticsQuery(householdAnalyticsRange, householdAnalyticsFrom, householdAnalyticsTo, 'last_30_days')}`)
                    : Promise.resolve(null),
            },
            { name: 'billing', url: '/api/household-billing', promise: loadHouseholdBilling() },
            { name: 'consumption', url: `/api/household-consumption?period=${encodeURIComponent(householdConsumptionPeriod)}`, promise: loadHouseholdConsumption() },
            { name: 'consumption-trend', url: `/api/household-consumption?period=${encodeURIComponent(householdTrendPeriod)}`, promise: loadHouseholdTrend() },
            { name: 'notifications', url: '/api/notifications?per_page=100', promise: loadNotifications() },
        ];
        const dashboardResults = await Promise.allSettled(dashboardRequests.map(({ promise }) => promise));
        const resultFor = (name) => dashboardResults[dashboardRequests.findIndex((request) => request.name === name)];

        for (const [index, result] of dashboardResults.entries()) {
            if (result.status === 'rejected') {
                console.error(`Dashboard request failed: ${dashboardRequests[index].url}`, result.reason);
                if (handleAuthFailure(result.reason)) {
                    stopDashboardPolling();
                    return;
                }
            }
        }

        const summaryResult = resultFor('summary');
        if (summaryResult.status === 'fulfilled') {
            dashboardHasUsableData = true;
            householdSummaryData = summaryResult.value?.data ?? null;
            householdDeviceState = resultFor('live-state').status === 'fulfilled'
                ? resultFor('live-state').value?.data?.device_state ?? null
                : householdDeviceState;
            applySummary(householdSummaryData, householdDeviceState);
        } else {
            renderDashboardSummaryUnavailable();
        }

        const readingsResult = resultFor('readings');
        if (readingsResult.status === 'fulfilled') {
            dashboardHasUsableData = true;
            const readingsResponse = readingsResult.value;
            renderReadings(responseItems(readingsResponse));
            readingsPagers.forEach((readingsPager) => renderPager(readingsPager, responsePaginator(readingsResponse), (page) => {
                dashboardState.page = page;
                loadDashboard();
            }));
        } else {
            renderDashboardReadingsUnavailable();
        }

        const liveReadingsResult = resultFor('live-readings');
        if (liveReadingsResult.status === 'fulfilled') {
            dashboardHasUsableData = true;
            applyLiveConsumptionResponse(liveReadingsResult.value);
        } else {
            markLiveConsumptionUnavailable();
        }

        const analyticsResult = resultFor('analytics');
        if (shouldLoadAnalytics && analyticsResult.status === 'fulfilled') {
            dashboardHasUsableData = true;
            householdAnalyticsLoadedRange = householdAnalyticsKey;
            applyHouseholdAnalytics(analyticsResult.value?.data);
        } else if (shouldLoadAnalytics && analyticsResult.status === 'rejected') {
            applyHouseholdAnalytics(null);
        }

        ['billing', 'consumption', 'consumption-trend', 'notifications'].forEach((name) => {
            const result = resultFor(name);
            if (result.status === 'fulfilled' && result.value === true) dashboardHasUsableData = true;
        });

        if (dashboardHasUsableData) {
            lastFullDashboardRefreshAt = Date.now();
            setDashboardFeedback('');
            setStatus('Connected');
        } else {
            setStatus('Connection failed');
            setDashboardFeedback('Unable to retrieve dashboard data. Try again.', 'error');
        }
        if (reschedule) {
            scheduleDashboardPolling();
        }
    } catch (error) {
        if (handleAuthFailure(error)) {
            stopDashboardPolling();
            return;
        }

        console.error(error);
        if (!dashboardHasUsableData) {
            setStatus('Connection failed');
            setDashboardFeedback('Unable to retrieve dashboard data. Try again.', 'error');
        } else {
            setStatus('Connected');
        }
        if (!accountProfileLoaded) {
            setAccountProfileState('Account details are temporarily unavailable. Try again.', 'error');
            setText('[data-profile-name]', 'Account unavailable');
            setText('[data-profile-email]', 'Unavailable');
            setText('[data-profile-account]', 'Unavailable');
            setText('[data-profile-address]', 'Unavailable');
            setText('[data-profile-phone]', 'Unavailable');
            setText('[data-profile-status]', 'Unavailable');
        }
        markLiveConsumptionUnavailable();
        $('[data-live-label]') && ($('[data-live-label]').textContent = 'Offline');
        if (reschedule) {
            scheduleDashboardPolling();
        }
    } finally {
        dashboardRefreshInFlight = false;
        if (manual) dashboardCacheForceNetwork = false;
        if (manual && refreshButton) {
            refreshButton.disabled = false;
            refreshButton.classList.remove('is-loading');
            refreshButton.removeAttribute('aria-busy');
            refreshButton.setAttribute('aria-label', 'Refresh dashboard data');
        }
    }
};

const renderAdminUsers = (usersResponse, { householdsOnly = false } = {}) => {
    const usersContainers = $$(householdsOnly ? '[data-admin-household-users]' : '[data-admin-users]');
    const users = responseItems(usersResponse);
    if (householdsOnly) {
        householdUsersById = new Map(users.map((user) => [String(user.id), user]));
    }
    const usersMarkup = users.length
        ? users
            .map(
                (user) => {
                    const devices = Array.isArray(user.devices) ? user.devices : [];
                    const device = devices[0];
                    const meterHealth = device
                        ? (device.is_online ? 'Online' : device.status === 'pending' ? 'Pending activation' : 'Offline')
                        : 'No meter assigned';
                    const deviceMarkup = householdsOnly
                        ? device
                            ? `<span class="table-primary">${escapeHtml(formatPersonalDisplay(device.name))}</span><small class="table-secondary">${escapeHtml(device.asset_number ?? 'Meter')}</small><small class="table-secondary">${escapeHtml(meterHealth)}</small>`
                            : '<span class="table-secondary">No meter assigned</span>'
                        : '';
                    const accountStatus = String(user.account_status ?? (user.is_active ? 'active' : 'inactive'));
                    const statusLabel = accountStatus === 'active' && user.is_active
                        ? 'Active'
                        : accountStatus === 'archived'
                            ? 'Archived'
                            : accountStatus === 'suspended'
                                ? 'Suspended'
                                : 'Inactive';
                    const statusMarkup = statusLabel === 'Active'
                        ? '<span class="status-pill status-pill-soft">Active</span>'
                        : `<span class="status-pill status-pill-inactive">${statusLabel}</span>`;
                    return `
                <div class="table-row admin-table-row">
                    <span>
                        <strong class="table-primary">${escapeHtml(formatPersonalDisplay(user.name))}</strong>
                        ${householdsOnly ? `<small class="table-secondary">${escapeHtml(user.account_number ?? 'No account number')}</small>` : ''}
                    </span>
                    <span>
                        <span class="table-primary">${escapeHtml(user.email)}</span>
                        ${householdsOnly && user.phone ? `<small class="table-secondary">${escapeHtml(user.phone)}</small>` : ''}
                        ${householdsOnly && user.address ? `<small class="table-secondary">${escapeHtml(user.address)}</small>` : ''}
                    </span>
                    ${householdsOnly ? `<span>${deviceMarkup}</span>` : `<span>${escapeHtml(user.role)}</span>`}
                    <span>${statusMarkup}</span>
                    <span class="table-actions">
                        ${householdsOnly ? `<button type="button" class="link-button" data-edit-user="${user.id}">Manage</button>` : ''}
                        <button type="button" class="link-button rose admin-user-delete-button" data-delete-user="${user.id}" data-user-name="${escapeHtml(formatPersonalDisplay(user.name))}">Delete</button>
                    </span>
                </div>
            `;
                },
            )
            .join('')
        : `<div class="empty-state table-empty-state"><strong>${householdsOnly ? 'No household accounts found' : 'No users match the current filters.'}</strong><span>${householdsOnly ? 'Create a household user account or adjust the filters to see matching customers.' : 'Try a different search or filter.'}</span></div>`;

    usersContainers.forEach((usersContainer) => {
        usersContainer.innerHTML = usersMarkup;
        bindAdminUserDeleteActions(usersContainer);
    });

    $$(householdsOnly ? '[data-admin-household-users-pager]' : '[data-admin-users-pager]').forEach((pager) => renderPager(pager, responsePaginator(usersResponse), (page) => {
        const state = householdsOnly ? householdUserState : adminState;
        state.page = page;
        loadAdminUsers({ householdsOnly });
    }));

    if (householdsOnly) {
        setText('[data-household-user-summary]', `${responsePaginator(usersResponse)?.total ?? users.length} household accounts`);
    } else {
        setText('[data-admin-summary]', `${responsePaginator(usersResponse)?.total ?? users.length} records`);
    }
    return users;
};

const loadAdminUsers = async ({ householdsOnly = false } = {}) => {
    const state = householdsOnly ? householdUserState : adminState;
    const usersQuery = buildQuery({
        page: state.page,
        per_page: state.per_page,
        search: state.search,
        ...(householdsOnly ? {} : { role: adminState.role }),
        ...(householdsOnly ? { account_status: state.account_status } : { is_active: state.is_active }),
    });
    const endpoint = householdsOnly ? '/api/household-users' : '/api/users';
    const response = await requestJson(`${endpoint}${usersQuery}`);
    renderAdminUsers(response, { householdsOnly });
    return response;
};

const consumptionConditionLabel = (condition) => ({
    leak: 'Leak alert',
    high: 'High usage',
    threshold: 'Threshold exceeded',
    normal: 'Normal',
    no_data: 'No readings',
}[condition] ?? 'No readings');

const consumptionConditionClass = (condition) => ({
    leak: 'badge badge-leak',
    high: 'badge badge-threshold',
    threshold: 'badge badge-threshold',
    normal: 'badge badge-normal',
    no_data: 'badge',
}[condition] ?? 'badge');

const renderConsumptionMonitoring = (response) => {
    const container = $('[data-consumption-records]');
    const items = responseItems(response);
    const summary = $('[data-consumption-monitoring-summary]');
    const meta = response?.meta ?? {};

    if (summary) {
        summary.innerHTML = `
            <div><dt>Households</dt><dd>${formatNumber(meta.household_count ?? 0, 0)}</dd></div>
            <div><dt>Usage</dt><dd>${formatNumber(meta.total_liters ?? 0, 3)} L</dd></div>
            <div><dt>Estimated billing</dt><dd>${formatCurrency(meta.estimated_bill ?? 0)}</dd></div>
            <div><dt>Abnormal households</dt><dd>${formatNumber(meta.abnormal_count ?? 0, 0)}</dd></div>
        `;
    }

    setText('[data-consumption-filter-status]', meta.period
        ? `Showing ${formatDateTime(meta.period.from)} to ${formatDateTime(meta.period.to)}. Search and filters are applied on the server.`
        : 'Search and filters are applied on the server.');

    if (!container) return;
    if (!items.length) {
        container.innerHTML = '<div class="empty-state table-empty-state"><strong>No household consumption records found</strong><span>Try another search, date range, or filter.</span></div>';
    } else {
        container.innerHTML = items.map((item) => {
            const household = item.household ?? {};
            const meter = item.device;
            const usage = item.summary ?? {};
            const latest = item.latest_reading;
            const condition = usage.condition ?? 'no_data';
            const meterLabel = meter
                ? `<span class="table-primary">${escapeHtml(formatPersonalDisplay(meter.name))}</span><small class="table-secondary">${escapeHtml(meter.asset_number ?? meter.serial_number ?? 'Meter')}</small><small class="table-secondary">${escapeHtml(meter.status ?? 'Unknown')}${meter.is_online ? ' · Online' : ' · Offline'}</small>`
                : '<span class="table-secondary">No meter assigned</span>';
            const latestLabel = latest
                ? `<span class="table-primary">${escapeHtml(formatDateTime(latest.recorded_at))}</span><small class="table-secondary">${formatNumber(latest.flow_rate ?? 0)} L/min · ${formatNumber(latest.liters_used, 3)} L</small>`
                : '<span class="table-secondary">No reading in period</span>';

            return `<div class="table-row admin-table-row consumption-monitoring-row">
                <span><strong class="table-primary">${escapeHtml(formatPersonalDisplay(household.name))}</strong><small class="table-secondary">${escapeHtml(household.account_number ?? household.email ?? 'No account number')}</small><small class="table-secondary">${escapeHtml(household.address ?? 'No address')}</small></span>
                <span>${meterLabel}</span>
                <span><strong class="table-primary">${formatNumber(usage.total_liters, 3)} L</strong><small class="table-secondary">${formatCubicMeterValue(usage.total_cubic_meter)} · ${formatNumber(usage.reading_count, 0)} readings</small></span>
                <span>${formatCurrency(usage.estimated_bill)}</span>
                <span>${latestLabel}</span>
                <span><span class="${consumptionConditionClass(condition)}">${consumptionConditionLabel(condition)}</span></span>
                <span><button type="button" class="link-button" data-consumption-history-id="${household.id}">View history</button></span>
            </div>`;
        }).join('');
    }

    renderPager($('[data-consumption-pager]'), responsePaginator(response), (page) => {
        consumptionState.page = page;
        loadAdminConsumption();
    });
};

const renderAdminConsumptionHistory = (data) => {
    const container = $('[data-consumption-history]');
    const household = data?.household ?? {};
    const summary = data?.summary ?? {};
    const latest = data?.latest_reading;
    const period = data?.period ?? {};
    const rows = (items) => (Array.isArray(items) && items.length)
        ? items.map((item) => `<div class="table-row"><span>${escapeHtml(item.period)}</span><span>${formatNumber(item.total_liters, 3)} L</span><span>${formatCubicMeterValue(item.total_cubic_meter)}</span><span>${formatCurrency(item.estimated_bill)}</span></div>`).join('')
        : '<div class="empty-state table-empty-state">No readings in this period.</div>';

    if ($('[data-consumption-dialog-title]')) {
        $('[data-consumption-dialog-title]').textContent = formatPersonalDisplay(household.name, 'Household history');
    }
    if (!container) return;
    container.innerHTML = `
        <div class="summary-list consumption-history-summary">
            <div><dt>Period</dt><dd>${escapeHtml(formatDateTime(period.from))} – ${escapeHtml(formatDateTime(period.to))}</dd></div>
            <div><dt>Total usage</dt><dd>${formatNumber(summary.total_liters, 3)} L</dd></div>
            <div><dt>Estimated billing</dt><dd>${formatCurrency(summary.estimated_bill)}</dd></div>
            <div><dt>Active rate</dt><dd>${data.active_billing ? formatCurrency(data.active_billing.water_rate) + ' / m³' : 'Not configured'}</dd></div>
            <div><dt>Latest meter reading</dt><dd>${latest ? escapeHtml(formatDateTime(latest.recorded_at)) : 'No reading'}</dd></div>
        </div>
        <div class="consumption-history-section"><p class="eyebrow">Daily consumption</p><div class="table"><div class="table-head"><span>Day</span><span>Liters</span><span>Volume</span><span>Estimated bill</span></div>${rows(data.daily)}</div></div>
        <div class="consumption-history-section"><p class="eyebrow">Weekly consumption</p><div class="table"><div class="table-head"><span>Week of</span><span>Liters</span><span>Volume</span><span>Estimated bill</span></div>${rows(data.weekly)}</div></div>
        <div class="consumption-history-section"><p class="eyebrow">Monthly consumption</p><div class="table"><div class="table-head"><span>Month</span><span>Liters</span><span>Volume</span><span>Estimated bill</span></div>${rows(data.monthly)}</div></div>
        <div class="dialog-actions"><button type="button" class="button button-ghost" data-consumption-export>Export this history</button></div>
    `;
    container.querySelector('[data-consumption-export]')?.addEventListener('click', async () => {
        const printWindow = window.open('', '_blank');
        try {
            const url = `/api/exports/readings${buildQuery({ user_id: household.id, from: consumptionState.from || period.from?.slice(0, 10), to: consumptionState.to || period.to?.slice(0, 10) })}`;
            const response = await fetch(url, { headers: authHeaders() });
            if (!response.ok) throw new Error('PDF export failed.');
            const blobUrl = URL.createObjectURL(await response.blob());
            if (printWindow) printWindow.location.href = blobUrl;
            else window.location.href = blobUrl;
            showToast('PDF export created successfully.');
            window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (error) {
            printWindow?.close();
            if (!handleAuthFailure(error)) showToast('Could not create the PDF export.', 'error');
        }
    });
};

const openConsumptionHistory = async (userId) => {
    if (!consumptionDialog) return;
    const container = $('[data-consumption-history]');
    if (container) container.innerHTML = '<div class="empty-state">Loading consumption history...</div>';
    if (typeof consumptionDialog.showModal === 'function') consumptionDialog.showModal();
    else consumptionDialog.setAttribute('open', '');

    try {
        const response = await requestJson(`/api/consumption-monitoring/${userId}/history${buildQuery({ from: consumptionState.from, to: consumptionState.to })}`);
        renderAdminConsumptionHistory(response.data);
    } catch (error) {
        if (!handleAuthFailure(error) && container) container.innerHTML = `<div class="empty-state"><strong>Unable to load history</strong><span>${escapeHtml(errorMessage(error, 'Try again later.'))}</span></div>`;
    }
};

const bindConsumptionMonitoring = () => {
    const records = $('[data-consumption-records]');
    if (records && records.dataset.bound !== '1') {
        records.dataset.bound = '1';
        records.addEventListener('click', (event) => {
            const button = event.target.closest('[data-consumption-history-id]');
            if (button) openConsumptionHistory(button.dataset.consumptionHistoryId);
        });
    }
    if (consumptionDialog && consumptionDialog.dataset.bound !== '1') {
        consumptionDialog.dataset.bound = '1';
        $('[data-consumption-dialog-close]')?.addEventListener('click', () => {
            if (consumptionDialog.close) consumptionDialog.close();
            else consumptionDialog.removeAttribute('open');
        });
    }
};

const loadAdminConsumption = async () => {
    const container = $('[data-consumption-records]');
    try {
        const response = await requestJson(`/api/consumption-monitoring${buildQuery(consumptionState)}`);
        renderConsumptionMonitoring(response);
        return response;
    } catch (error) {
        if (handleAuthFailure(error)) return null;
        if (container) container.innerHTML = `<div class="empty-state"><strong>Consumption monitoring is unavailable</strong><span>${escapeHtml(errorMessage(error, 'Try again later.'))}</span></div>`;
        setText('[data-consumption-filter-status]', 'Unable to load consumption records.');
        return null;
    }
};

const renderHouseholdOptions = (users, selects) => {
    const eligibleUsers = [...(Array.isArray(users) ? users : [])]
        .filter((user) => user.role === 'user' && user.is_active !== false && (user.account_status ?? 'active') === 'active')
        .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));

    selects.forEach((select) => {
        if (!select) return;
        const isAnnouncement = select.matches('[data-announcement-user]');
        const emptyLabel = isAnnouncement
            ? 'All active households'
            : eligibleUsers.length ? 'Choose household' : 'No active household users are available.';
        select.innerHTML = `<option value="">${emptyLabel}</option>` + eligibleUsers
            .map((user) => {
                const details = isAnnouncement
                    ? user.email
                    : [user.email, user.address].filter(Boolean).join(' · ');
                return `<option value="${user.id}">${escapeHtml(formatPersonalDisplay(user.name))} (${escapeHtml(details)})</option>`;
            })
            .join('');
        select.disabled = eligibleUsers.length === 0;
    });

    const status = $('[data-device-household-status]');
    if (status) status.textContent = eligibleUsers.length ? `${eligibleUsers.length} active household user${eligibleUsers.length === 1 ? '' : 's'} available.` : 'No active household users are available.';
    return eligibleUsers;
};

const loadEligibleHouseholds = async (selects) => {
    const status = $('[data-device-household-status]');
    selects.forEach((select) => {
        if (select) {
            select.disabled = true;
            select.innerHTML = '<option value="">Loading household users...</option>';
        }
    });
    if (status) status.textContent = 'Loading active household users...';

    try {
        const response = await requestJson('/api/household-users?for_device=1&per_page=100');
        const users = responseItems(response);
        renderHouseholdOptions(users, selects);
        return users;
    } catch (error) {
        selects.forEach((select) => {
            if (select) {
                select.disabled = true;
                select.innerHTML = '<option value="">Household users could not be loaded.</option>';
            }
        });
        if (status) status.textContent = 'Unable to load household users. Refresh and try again.';
        console.error(error);
        return [];
    }
};

const bindAdminNotificationAudience = (form, users = []) => {
    if (!form) return;
    const audience = $('[data-notification-audience]', form);
    const householdField = $('[data-notification-household-field]', form);
    const householdSelect = $('[data-announcement-user]', form);
    const status = $('[data-notification-recipient-status]', form);
    const message = $('[data-notification-message]', form);
    const characterCount = $('[data-notification-character-count]', form);
    form.notificationEligibleUsers = Array.isArray(users) ? users : [];
    const update = () => {
        const eligibleUsers = form.notificationEligibleUsers ?? [];
        const selected = audience?.value === 'selected_household';
        if (householdField) householdField.hidden = !selected;
        if (householdSelect) {
            householdSelect.disabled = !selected || eligibleUsers.length === 0;
            if (!selected) householdSelect.value = '';
        }
        if (status) {
            status.textContent = selected
                ? (eligibleUsers.length ? 'Choose one active household recipient.' : 'No eligible active households are available.')
                : `${eligibleUsers.length} active household${eligibleUsers.length === 1 ? '' : 's'} will receive this notice.`;
        }
    };
    if (form.dataset.audienceBound !== '1') {
        form.dataset.audienceBound = '1';
        audience?.addEventListener('change', update);
        form.addEventListener('reset', () => window.setTimeout(update, 0));
        message?.addEventListener('input', () => {
            if (characterCount) characterCount.textContent = `${message.value.length} / 2000`;
        });
    }
    update();
};

const bindAdminNotificationForm = (form) => {
    if (!form || form.dataset.bound === '1') return;

    form.dataset.bound = '1';
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(form).entries());
        if (payload.audience === 'all_active_households') delete payload.user_id;
        if (!payload.user_id) delete payload.user_id;
        if (payload.audience === 'all_active_households' && !window.confirm('Send this notification to every active household?')) return;

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.dataset.defaultText = submitButton.dataset.defaultText || submitButton.textContent;
            submitButton.textContent = 'Sending...';
        }

        try {
            const response = await requestJson('/api/notifications', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            showToast(response?.message ?? `Notification sent successfully to ${response?.delivered_count ?? 0} household user${response?.delivered_count === 1 ? '' : 's'}.`);
            form.reset();
            bindAdminNotificationFilters();
            loadAdmin();
        } catch (error) {
            if (!handleAuthFailure(error)) {
                console.error(error);
                showToast(errorMessage(error, 'Could not send the notification.'), 'error');
            }
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = submitButton.dataset.defaultText || 'Send notification';
            }
        }
    });
};

const renderActivationResult = (container, details, heading = 'One-time activation information') => {
    if (!container || !details) return;

    container.innerHTML = `<article class="notification-card">
        <h4>${escapeHtml(heading)}</h4>
        <p>Device UUID: <code>${escapeHtml(details.device_uuid ?? details.device?.uuid)}</code></p>
        <p>Activation code: <strong>${escapeHtml(details.activation_code)}</strong></p>
        <small>Expires: ${escapeHtml(formatDateTime(details.expires_at))}. This code is shown once, stored only as a hash, and must be entered on the physical meter.</small>
    </article>`;
};

const renderMunicipalDevices = (items, container) => {
    if (!container) return;

    const devices = Array.isArray(items) ? items : [];
    if (!devices.length) {
        container.innerHTML = '<div class="empty-state">No registered meters found.</div>';
        return;
    }

    container.innerHTML = devices.map((device) => {
        const lifecycle = String(device.status ?? 'pending');
        const health = lifecycle === 'decommissioned'
            ? 'Decommissioned'
            : device.is_online ? 'Online' : 'Offline';
        const healthClass = health === 'Online' ? 'status-chip-soft' : health === 'Offline' ? 'status-chip-alert' : 'status-chip-muted';
        const householdName = formatPersonalDisplay(device.household?.name, 'UNASSIGNED');
        const maintenance = String(device.maintenance_status ?? 'operational').replaceAll('_', ' ');

        return `<article class="notification-card device-health-card">
            <div class="notification-head">
                <div>
                    <h4>${escapeHtml(device.asset_number)} · ${escapeHtml(device.name)}</h4>
                    <p>${escapeHtml(householdName)}</p>
                </div>
                <span class="status-chip ${healthClass}">${escapeHtml(health)}</span>
            </div>
            <div class="device-health-summary">
                <span><strong>Last seen</strong>${escapeHtml(formatDateTime(device.last_seen_at))}</span>
                <span><strong>Address</strong>${escapeHtml(device.installation_address ?? 'Not set')}</span>
            </div>
            <div class="button-row">
                ${lifecycle === 'active' ? `<button type="button" class="button button-secondary" data-device-status="${escapeHtml(device.id)}" data-next-status="maintenance">Maintenance</button>` : ''}
                ${lifecycle === 'maintenance' ? `<button type="button" class="button button-secondary" data-device-status="${escapeHtml(device.id)}" data-next-status="active">Return to service</button>` : ''}
                ${lifecycle !== 'decommissioned' ? `<button type="button" class="link-button rose" data-device-decommission="${escapeHtml(device.id)}">Decommission</button>` : ''}
            </div>
            <details class="device-technical-details">
                <summary>Meter details</summary>
                <div>
                    <span><strong>Lifecycle</strong>${escapeHtml(lifecycle)} · Maintenance: ${escapeHtml(maintenance)}</span>
                    <span><strong>Serial number</strong>${escapeHtml(device.serial_number)}</span>
                    <span><strong>Last telemetry</strong>${escapeHtml(formatDateTime(device.last_telemetry_at))}</span>
                    <span><strong>Firmware</strong>${escapeHtml(device.firmware_version ?? 'Not reported')} · Hardware: ${escapeHtml(device.hardware_id ?? 'Not commissioned')}</span>
                    <span><strong>Installed</strong>${escapeHtml(device.installed_at ? formatDateTime(device.installed_at) : 'Not set')}</span>
                    ${lifecycle !== 'decommissioned' ? `<button type="button" class="link-button" data-device-new-code="${escapeHtml(device.id)}">${lifecycle === 'suspended' ? 'Reactivate with a new activation code' : 'Create a new activation code'}</button>` : ''}
                </div>
            </details>
        </article>`;
    }).join('');
};

const loadAdminDevices = async () => {
    const devicesContainer = $('[data-municipal-devices]');
    if (!devicesContainer || adminDeviceRefreshInFlight || !readToken()) return adminMunicipalDevices;

    adminDeviceRefreshInFlight = true;
    try {
        const response = await requestJson('/api/municipal-devices');
        adminMunicipalDevices = responseItems(response);
        renderMunicipalDevices(adminMunicipalDevices, devicesContainer);
        return adminMunicipalDevices;
    } catch (error) {
        if (!handleAuthFailure(error)) {
            devicesContainer.innerHTML = '<div class="empty-state is-error">Unable to load meter connection health. Try again.</div>';
            console.error(error);
        }
        return [];
    } finally {
        adminDeviceRefreshInFlight = false;
        scheduleAdminDevicePolling();
    }
};

const bindAdminDeviceRegistrationForm = (form, activationResult) => {
    if (!form || form.dataset.bound === '1') return;

    form.dataset.bound = '1';
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const payload = Object.fromEntries(new FormData(form).entries());
        Object.keys(payload).forEach((key) => payload[key] === '' && delete payload[key]);

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.dataset.defaultText = submitButton.dataset.defaultText || submitButton.textContent;
            submitButton.textContent = 'Registering...';
        }

        try {
            const response = await requestJson('/api/municipal-devices', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            renderActivationResult(activationResult, response.data, 'Save this one-time activation information');
            showToast('M5Stack CoreS3 meter registered and assigned successfully.');
            form.reset();
            await loadAdminDevices();
        } catch (error) {
            if (!handleAuthFailure(error)) {
                console.error(error);
                showToast(errorMessage(error, 'Could not register the meter.'), 'error');
            }
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = submitButton.dataset.defaultText || 'Register and create activation code';
            }
        }
    });
};

const bindAdminDeviceActions = (container, activationResult) => {
    if (!container || container.dataset.bound === '1') return;

    container.dataset.bound = '1';
    container.addEventListener('click', async (event) => {
        const codeButton = event.target.closest('[data-device-new-code]');
        const statusButton = event.target.closest('[data-device-status]');
        const decommissionButton = event.target.closest('[data-device-decommission]');

        try {
            if (codeButton) {
                if (!window.confirm('Rotate credentials and create a new activation code? The current device token will stop working.')) return;
                const response = await requestJson(`/api/municipal-devices/${codeButton.dataset.deviceNewCode}/activation-code`, { method: 'POST' });
                renderActivationResult(activationResult, response.data);
                showToast('New activation code created and old device credentials revoked.');
            } else if (statusButton) {
                await requestJson(`/api/municipal-devices/${statusButton.dataset.deviceStatus}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: statusButton.dataset.nextStatus,
                        maintenance_status: statusButton.dataset.nextStatus === 'active' ? 'operational' : 'under_maintenance',
                    }),
                });
                showToast('Meter lifecycle status updated.');
            } else if (decommissionButton) {
                if (!window.confirm('Permanently decommission this meter and revoke its credentials?')) return;
                await requestJson(`/api/municipal-devices/${decommissionButton.dataset.deviceDecommission}`, { method: 'DELETE' });
                showToast('Meter decommissioned and device credentials revoked.');
            } else {
                return;
            }

            await loadAdminDevices();
        } catch (error) {
            if (!handleAuthFailure(error)) showToast(errorMessage(error, 'Could not update the meter.'), 'error');
        }
    });
};

const renderAdminOverviewActivity = (analytics) => {
    const container = $('[data-admin-activity-list]');
    if (!container) return;

    const activity = Array.isArray(analytics.recent?.administrative_actions)
        ? analytics.recent.administrative_actions.slice(0, 3)
        : [];
    container.innerHTML = activity.length
        ? activity.map((item) => {
            const label = String(item.action ?? 'system event').replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase());
            return `<div class="admin-overview-list-item"><span class="admin-overview-list-icon"><i class="bi bi-clock-history" aria-hidden="true"></i></span><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(item.description ?? 'Administrative event')} · ${escapeHtml(item.actor ?? 'System')} · ${escapeHtml(formatCompactDateTime(item.created_at))}</small></span></div>`;
        }).join('')
        : '<div class="empty-state">No recent administrative or device activity.</div>';
};

const renderAdminConsumptionBaselines = (items = [], threshold = 100) => {
    const container = $('[data-admin-consumption-baselines]');
    if (!container) return;

    const comparisons = Array.isArray(items) ? items : [];
    const hasAlertThreshold = Number.isFinite(threshold) && threshold > 0;
    const relevantCount = comparisons.filter((item) => {
        const latest = item.latest ?? {};
        return hasAlertThreshold && !latest.is_baseline
            && latest.change_percent !== null
            && Math.abs(Number(latest.change_percent)) >= threshold;
    }).length;

    if (!comparisons.length) {
        container.innerHTML = '<div class="dashboard-empty-state"><strong>No household usage comparison yet</strong><span>Comparisons appear after meters submit monthly readings.</span></div>';
        return;
    }

    const summary = relevantCount
        ? `${relevantCount} consumption alert${relevantCount === 1 ? '' : 's'} need review.`
        : 'No consumption alerts.';
    const monitored = `${comparisons.length} household${comparisons.length === 1 ? '' : 's'} monitored.`;
    container.innerHTML = `<div class="consumption-alert-summary${relevantCount ? ' requires-attention' : ''}">
        <span class="consumption-alert-summary-icon" aria-hidden="true"><i class="bi ${relevantCount ? 'bi-exclamation-triangle' : 'bi-check-circle'}"></i></span>
        <span><strong>${summary}</strong><small>${monitored}</small></span>
    </div>`;
};

const loadAdminActionCenter = async () => {
    const list = $('[data-action-center-list]');
    if (!list) return;
    try {
        const response = await requestJson('/api/admin/action-center');
        const data = response.data ?? {};
        const summary = data.summary ?? {};
        const actions = [
            {
                count: Number(summary.active_leaks ?? 0),
                label: 'active leak',
                target: 'leak-monitoring',
                action: 'Review leaks',
                detail: (count) => count ? `${count} leak${count === 1 ? '' : 's'} need review.` : 'No active leaks need action.',
                severity: 'high',
            },
            {
                count: Number(summary.open_service_requests ?? 0),
                label: 'open message',
                target: 'service-requests',
                action: 'Open messages',
                detail: (count) => count ? `${count} household message${count === 1 ? '' : 's'} await a response.` : 'No household messages need action.',
                severity: 'normal',
            },
            {
                count: Number(summary.overdue_statements ?? 0),
                label: 'overdue bill',
                target: 'billing-management',
                action: 'View bills',
                detail: (count) => count ? `${count} bill${count === 1 ? '' : 's'} need follow-up.` : 'No overdue bills need action.',
                severity: 'normal',
            },
        ];
        list.innerHTML = actions.map((item) => `<article class="action-center-item is-${item.count ? item.severity : 'normal'}">
            <span><strong>${formatNumber(item.count, 0)} ${item.label}${item.count === 1 ? '' : 's'}</strong><small>${item.detail(item.count)}</small></span>
            <button class="link-button" type="button" data-admin-nav="${item.target}">${item.action}</button>
        </article>`).join('');
        const panel = $('.admin-action-center');
        if (panel && panel.dataset.bound !== '1') {
            panel.dataset.bound = '1';
            panel.addEventListener('click', (event) => {
                const button = event.target.closest('[data-admin-nav]');
                if (button) showAdminView(button.dataset.adminNav);
            });
        }
    } catch (error) {
        if (!handleAuthFailure(error)) list.innerHTML = '<div class="dashboard-empty-state is-error"><strong>Action center unavailable</strong></div>';
    }
};

const renderAdminServiceRequestDetail = (item) => {
    const dialog = $('[data-admin-service-request-dialog]');
    const container = $('[data-admin-service-request-detail]');
    if (!dialog || !container) return;
    setText('[data-admin-service-request-title]', `${item.reference_number} · ${item.subject}`);
    const threadMessages = item.messages ?? [];
    const initialMessageIndex = item.description
        ? threadMessages.findIndex((message) => !message.is_internal && message.author?.role !== 'admin' && String(message.message ?? '').trim() === String(item.description).trim())
        : -1;
    const initialMessage = initialMessageIndex >= 0 ? threadMessages[initialMessageIndex] : null;
    const messages = threadMessages.filter((_, index) => index !== initialMessageIndex).map((message) => `<div class="service-request-message ${message.is_internal ? 'is-internal' : (message.author?.role === 'admin' ? 'is-staff' : 'is-household')}"><strong>${escapeHtml(message.is_internal ? 'Internal staff note' : (message.author?.role === 'admin' ? message.author.name : item.household?.name))}</strong><p>${escapeHtml(message.message)}</p><small>${escapeHtml(formatDateTime(message.created_at))}</small></div>`).join('');
    const conversation = messages ? `<section class="service-request-conversation"><p class="eyebrow">Conversation</p><div class="service-request-thread">${messages}</div></section>` : '';
    container.innerHTML = `<div class="service-request-meta"><div><span>Household</span><strong>${escapeHtml(item.household?.name)} · ${escapeHtml(item.household?.account_number)}</strong></div><div><span>Category</span><strong>${escapeHtml(String(item.category).replaceAll('_', ' '))}</strong></div><div><span>Priority</span><strong>${escapeHtml(item.priority)}</strong></div><div><span>Status</span><strong>${escapeHtml(String(item.status).replaceAll('_', ' '))}</strong></div></div>
        ${item.description ? `<section class="service-request-concern"><p class="eyebrow">Household concern</p><p>${escapeHtml(item.description)}</p>${initialMessage?.created_at ? `<small>Submitted ${escapeHtml(formatDateTime(initialMessage.created_at))}</small>` : ''}</section>` : ''}
        ${conversation}
        <form class="stack-form admin-service-request-workflow" data-admin-request-workflow="${escapeHtml(item.id)}">
            <section class="admin-request-workflow-section">
                <div class="admin-request-workflow-heading"><div><p class="eyebrow">Request management</p><p>Update the handling status and priority.</p></div><button class="button button-secondary" type="submit" name="workflow_action" value="update">Save changes</button></div>
                <div class="form-grid-two"><label>Status<select name="status">${['open','acknowledged','in_progress','waiting_for_household','resolved','closed'].map((value) => `<option value="${value}" ${item.status === value ? 'selected' : ''}>${value.replaceAll('_', ' ')}</option>`).join('')}</select></label><label>Priority<select name="priority">${['low','normal','high','urgent'].map((value) => `<option value="${value}" ${item.priority === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label></div>
            </section>
            <section class="admin-request-reply-section">
                <div><p class="eyebrow">Reply</p><p>Send a response to the household, or keep it as a staff-only note.</p></div>
                <label>Message<textarea name="message" maxlength="5000" placeholder="Write a reply or staff note"></textarea></label>
                <label class="admin-request-internal-note"><input type="checkbox" name="is_internal" value="1"><span><strong>Internal note</strong><small>Only staff can see this message.</small></span></label>
                <button class="button button-primary" type="submit" name="workflow_action" value="reply">Send response</button>
            </section>
        </form>`;
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
};

const loadAdminServiceRequests = async () => {
    const container = $('[data-admin-service-request-list]');
    if (!container) return;
    const filter = $('[data-admin-service-request-filters]');
    try {
        const query = filter ? buildQuery(Object.fromEntries(new FormData(filter).entries())) : '';
        const response = await requestJson(`/api/service-requests${query}`);
        const items = responseItems(response);
        container.innerHTML = items.length ? items.map((item) => {
            const priority = String(item.priority ?? 'normal');
            const priorityChip = ['high', 'urgent'].includes(priority) ? `<span class="status-chip status-chip-alert">${escapeHtml(priority)}</span>` : '';
            return `<article class="admin-service-request-item"><span><strong>${escapeHtml(item.subject)}</strong><small>${escapeHtml(item.reference_number)} · ${escapeHtml(item.household?.name)} · ${escapeHtml(String(item.category).replaceAll('_', ' '))}</small></span>${priorityChip}<span class="status-chip">${escapeHtml(String(item.status).replaceAll('_', ' '))}</span><button class="link-button" type="button" data-admin-request-open="${escapeHtml(item.id)}">Open</button></article>`;
        }).join('') : '<div class="dashboard-empty-state"><strong>No matching household messages</strong></div>';
    } catch (error) {
        if (!handleAuthFailure(error)) container.innerHTML = '<div class="dashboard-empty-state is-error"><strong>Household messages unavailable</strong></div>';
    }
};

const bindAdminServiceRequests = () => {
    const filter = $('[data-admin-service-request-filters]');
    if (filter && filter.dataset.bound !== '1') {
        filter.dataset.bound = '1';
        filter.addEventListener('submit', (event) => { event.preventDefault(); loadAdminServiceRequests(); });
    }
    const list = $('[data-admin-service-request-list]');
    if (list && list.dataset.bound !== '1') {
        list.dataset.bound = '1';
        list.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-admin-request-open]');
            if (!button) return;
            try {
                const response = await requestJson(`/api/service-requests/${button.dataset.adminRequestOpen}`, { forceNetwork: true });
                renderAdminServiceRequestDetail(response.data);
            } catch (error) {
                if (!handleAuthFailure(error)) showToast('Could not open this request.', 'error');
            }
        });
    }
    const detail = $('[data-admin-service-request-detail]');
    if (detail && detail.dataset.bound !== '1') {
        detail.dataset.bound = '1';
        detail.addEventListener('submit', async (event) => {
            const form = event.target.closest('[data-admin-request-workflow]');
            if (!form) return;
            event.preventDefault();
            const action = event.submitter?.value;
            const values = Object.fromEntries(new FormData(form).entries());
            try {
                const response = action === 'reply'
                    ? await requestJson(`/api/service-requests/${form.dataset.adminRequestWorkflow}/messages`, { method: 'POST', body: JSON.stringify({ message: values.message, is_internal: values.is_internal === '1' }) })
                    : await requestJson(`/api/service-requests/${form.dataset.adminRequestWorkflow}`, { method: 'PATCH', body: JSON.stringify({ status: values.status, priority: values.priority }) });
                renderAdminServiceRequestDetail(response.data);
                await Promise.all([loadAdminServiceRequests(), loadAdminActionCenter()]);
                showToast(response.message);
            } catch (error) {
                if (!handleAuthFailure(error)) showToast(errorMessage(error, 'Could not update this request.'), 'error');
            }
        });
    }
    const closeButton = $('[data-admin-service-request-close]');
    if (closeButton && closeButton.dataset.bound !== '1') {
        closeButton.dataset.bound = '1';
        closeButton.addEventListener('click', () => {
            const dialog = $('[data-admin-service-request-dialog]');
            if (typeof dialog?.close === 'function') dialog.close(); else dialog?.removeAttribute('open');
        });
    }
};

const bindAdminSettingsForm = (form, endpoint, statusSelector, successMessage) => {
    if (!form || form.dataset.bound === '1') return;

    form.dataset.bound = '1';
    const markDirty = () => {
        form.dataset.dirty = '1';
        form.dataset.revision = String(Number(form.dataset.revision ?? 0) + 1);
    };
    form.addEventListener('input', markDirty);
    form.addEventListener('change', markDirty);
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (form.dataset.saving === '1') return;

        const submitButton = $('button[type="submit"]', form);
        const feedback = $(statusSelector);
        const payload = Object.fromEntries(new FormData(form).entries());
        const submittedRevision = form.dataset.revision;
        $$('input[type="checkbox"]', form).forEach((checkbox) => {
            payload[checkbox.name] = checkbox.checked;
        });

        form.dataset.saving = '1';
        submitButton && (submitButton.disabled = true);
        if (feedback) {
            feedback.hidden = false;
            feedback.classList.remove('is-error');
            feedback.textContent = 'Saving configuration...';
        }

        try {
            await requestJson(endpoint, { method: 'POST', body: JSON.stringify(payload) });
            if (form.dataset.revision === submittedRevision) form.dataset.dirty = '0';
            if (feedback) feedback.textContent = successMessage;
            showToast(successMessage);
            await loadAdmin();
        } catch (error) {
            if (!handleAuthFailure(error)) {
                const message = errorMessage(error, 'Could not save this configuration.');
                if (feedback) {
                    feedback.hidden = false;
                    feedback.classList.add('is-error');
                    feedback.textContent = message;
                }
                showToast(message, 'error');
            }
        } finally {
            form.dataset.saving = '0';
            if (submitButton) submitButton.disabled = false;
        }
    });
};

const setBillingManagementState = (message, tone = '') => {
    const state = $('[data-billing-management-state]');
    if (!state) return;
    state.textContent = message;
    state.classList.remove('is-loading', 'is-error', 'is-empty', 'is-ready');
    if (tone) state.classList.add(`is-${tone}`);
};

const renderBillingManagementSummary = (meta = {}) => {
    setText('[data-billing-total-records]', formatNumber(meta.total_records ?? 0, 0));
    setText('[data-billing-finalized-charges]', formatCurrency(meta.finalized_charges ?? 0));
    setText('[data-billing-estimated-charges]', formatCurrency(meta.estimated_charges ?? 0));
    setText('[data-billing-outstanding]', formatCurrency(meta.outstanding_balance ?? 0));
};

const billingStatusLabel = (status) => ({
    estimated: 'Estimated',
    unpaid: 'Unpaid',
    partial: 'Partial',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
    paid: 'Paid',
}[status] ?? String(status ?? 'Unknown').replaceAll('_', ' '));

const renderBillingRecords = (response) => {
    const container = $('[data-billing-management-records]');
    if (!container) return;
    const errorNode = $('[data-billing-management-error]');
    if (errorNode) errorNode.hidden = true;
    const records = responseItems(response);
    billingRecordsByKey = new Map(records.map((record) => [String(record.id), record]));
    renderBillingManagementSummary(response?.meta ?? {});

    if (!records.length) {
        container.innerHTML = '<div class="empty-state table-empty-state"><strong>No billing records found</strong><span>There are no estimated readings or finalized statements for the selected period and filters.</span></div>';
        setBillingManagementState('No billing records match the selected period.', 'empty');
    } else {
        container.innerHTML = records.map((record) => {
            const household = record.household ?? {};
            const statusClass = record.status === 'paid' ? 'status-chip-soft' : record.status === 'estimated' ? 'status-chip-muted' : 'status-chip-alert';
            const key = escapeHtml(String(record.id));
            const actions = record.record_type === 'finalized'
                ? `<button type="button" class="link-button" data-billing-detail="${key}">View statement</button><button type="button" class="link-button" data-admin-download-statement="${key}">Download PDF</button>${['unpaid', 'partial'].includes(record.status) ? `<button type="button" class="link-button" data-billing-pay="${key}">Record payment</button>` : ''}`
                : `<button type="button" class="link-button" data-billing-detail="${key}">View estimate</button><button type="button" class="link-button" data-billing-generate="${key}">Finalize bill</button>`;

            return `<div class="table-row billing-management-row">
                <span><strong class="table-primary">${escapeHtml(formatPersonalDisplay(household.name))}</strong><small class="table-secondary">${escapeHtml(household.account_number ?? household.email ?? 'No account number')}</small></span>
                <span>${escapeHtml(record.period?.label ?? '--')}</span>
                <span><strong class="table-primary">${formatCubicMeterValue(record.total_cubic_meter ?? 0)}</strong><small class="table-secondary">${formatNumber(record.total_liters ?? 0, 2)} L${record.reading_count ? ` · ${formatNumber(record.reading_count, 0)} readings` : ''}</small></span>
                <span><strong class="table-primary">${formatCurrency(record.current_charge ?? 0, record.currency)}</strong><small class="table-secondary">Rate ${formatCurrency(record.water_rate ?? 0, record.currency)} / m³</small></span>
                <span><span class="status-chip ${statusClass}">${escapeHtml(billingStatusLabel(record.status))}</span>${record.record_type === 'finalized' ? `<small class="table-secondary">Balance ${formatCurrency(record.remaining_balance ?? 0, record.currency)}</small>` : ''}</span>
                <span class="table-actions">${actions}</span>
            </div>`;
        }).join('');
        setBillingManagementState(`${formatNumber(response?.meta?.total_records ?? records.length, 0)} real billing record${Number(response?.meta?.total_records ?? records.length) === 1 ? '' : 's'} loaded.`, 'ready');
    }

    const hasRecords = Number(response?.meta?.total_records ?? records.length) > 0;
    $$('[data-billing-export]').forEach((button) => {
        button.hidden = !hasRecords;
        button.disabled = !hasRecords;
    });
};

const renderBillingDetail = (data) => {
    const container = $('[data-billing-detail-content]');
    if (!container) return;
    const record = data.record_type === 'finalized' ? {
        ...data.statement,
        record_type: 'finalized',
        household: data.household,
        total_liters: data.statement.total_liters,
        total_cubic_meter: data.statement.total_cubic_meter,
        water_rate: data.statement.water_rate,
        fixed_monthly_charge: data.calculation.fixed_monthly_charge,
        subsidy_deduction: data.calculation.subsidy_deduction,
        current_charge: data.calculation.current_charge,
        amount_paid: data.calculation.amount_paid,
        remaining_balance: data.calculation.remaining_balance,
        currency: data.calculation.currency,
        period: { label: new Date(data.statement.billing_month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) },
    } : data;
    const household = record.household ?? {};
    const usageCharge = data.calculation?.usage_charge ?? Number(record.total_cubic_meter ?? 0) * Number(record.water_rate ?? 0);
    const readings = Array.isArray(data.readings) ? data.readings : [];
    const payments = Array.isArray(data.payments) ? data.payments : [];
    const detailTitle = $('[data-billing-detail-title]');
    if (detailTitle) detailTitle.textContent = `${formatPersonalDisplay(household.name, 'Household')} · ${record.period?.label ?? 'Billing details'}`;
    container.innerHTML = `<div class="summary-list billing-detail-summary">
        <div><dt>Record type</dt><dd>${record.record_type === 'finalized' ? 'Finalized statement' : 'Estimated from readings'}</dd></div>
        ${record.record_type === 'finalized' ? `<div><dt>Statement number</dt><dd>${escapeHtml(record.statement_number ?? 'Pending')}</dd></div><div><dt>Due date</dt><dd>${escapeHtml(record.due_date ?? 'Not specified')}</dd></div>` : ''}
        <div><dt>Household</dt><dd>${escapeHtml(formatPersonalDisplay(household.name))}</dd></div>
        <div><dt>Consumption</dt><dd>${formatCubicMeterValue(record.total_cubic_meter ?? 0)} · ${formatNumber(record.total_liters ?? 0, 2)} L</dd></div>
        <div><dt>Usage charge</dt><dd>${formatCurrency(usageCharge, record.currency)}</dd></div>
        <div><dt>Fixed monthly charge</dt><dd>${formatCurrency(record.fixed_monthly_charge ?? 0, record.currency)}</dd></div>
        <div><dt>Subsidy or discount</dt><dd>− ${formatCurrency(record.subsidy_deduction ?? 0, record.currency)}</dd></div>
        <div><dt>Current charge</dt><dd>${formatCurrency(record.current_charge ?? 0, record.currency)}</dd></div>
        <div><dt>Paid</dt><dd>${formatCurrency(record.amount_paid ?? 0, record.currency)}</dd></div>
        <div><dt>Remaining balance</dt><dd>${formatCurrency(record.remaining_balance ?? 0, record.currency)}</dd></div>
        <div><dt>Applicable rate</dt><dd>${formatCurrency(record.water_rate ?? 0, record.currency)} / m³</dd></div>
    </div>${payments.length ? `<div class="billing-detail-readings"><p class="eyebrow">Payment verification and receipts</p>${payments.map((payment) => `<div class="table-actions"><span>${escapeHtml(payment.receipt_number)} · ${formatCurrency(payment.amount, record.currency)} · ${escapeHtml(billingStatusLabel(payment.status))}</span>${payment.status === 'confirmed' ? `<button class="button button-ghost" type="button" data-admin-download-receipt="${escapeHtml(payment.id)}">Receipt</button><button class="link-button" type="button" data-payment-void="${escapeHtml(payment.id)}">Void</button>` : payment.status === 'pending' ? `<button class="button button-primary" type="button" data-payment-confirm="${escapeHtml(payment.id)}">Approve</button><button class="link-button" type="button" data-payment-reject="${escapeHtml(payment.id)}">Reject</button>` : `<small>${escapeHtml(payment.status_note ?? '')}</small>`}</div>`).join('')}</div>` : ''}${readings.length ? `<div class="billing-detail-readings"><p class="eyebrow">Source readings</p><div class="table"><div class="table-head"><span>Recorded</span><span>Flow</span><span>Liters</span><span>Estimated</span></div>${readings.slice(0, 20).map((reading) => `<div class="table-row"><span>${escapeHtml(formatDateTime(reading.recorded_at))}</span><span>${formatNumber(reading.flow_rate)} L/min</span><span>${formatNumber(reading.liters_used, 2)} L</span><span>${formatCurrency(reading.estimated_bill, record.currency)}</span></div>`).join('')}</div></div>` : '<div class="empty-state">No source readings are attached to this finalized statement.</div>'}`;
};

const openBillingDetail = async (record) => {
    if (!billingDetailDialog) return;
    const container = $('[data-billing-detail-content]');
    if (container) container.innerHTML = '<div class="empty-state">Loading billing calculation...</div>';
    if (typeof billingDetailDialog.showModal === 'function') billingDetailDialog.showModal();
    else billingDetailDialog.setAttribute('open', '');

    try {
        const data = record.record_type === 'finalized'
            ? (await requestJson(`/api/billing-management/${record.id}`)).data
            : record;
        renderBillingDetail(data);
    } catch (error) {
        if (!handleAuthFailure(error) && container) container.innerHTML = `<div class="billing-management-error">${escapeHtml(errorMessage(error, 'Could not load this billing calculation.'))}</div>`;
    }
};

const closeBillingDetail = () => {
    if (!billingDetailDialog) return;
    if (typeof billingDetailDialog.close === 'function') billingDetailDialog.close();
    else billingDetailDialog.removeAttribute('open');
};

const openPaymentDialog = (record) => {
    if (!paymentDialog || !paymentForm) return;
    paymentForm.reset();
    paymentForm.elements.billing_statement_id.value = record.id;
    paymentForm.elements.amount.value = Number(record.remaining_balance ?? 0).toFixed(2);
    paymentForm.elements.amount.max = Number(record.remaining_balance ?? 0).toFixed(2);
    paymentForm.elements.received_at.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setText('[data-payment-dialog-summary]', `${formatPersonalDisplay(record.household?.name)} · ${record.statement_number ?? record.period?.label} · Balance ${formatCurrency(record.remaining_balance, record.currency)}`);
    if (typeof paymentDialog.showModal === 'function') paymentDialog.showModal(); else paymentDialog.setAttribute('open', '');
};

const closePaymentDialog = () => {
    if (typeof paymentDialog?.close === 'function') paymentDialog.close(); else paymentDialog?.removeAttribute('open');
};

const bindBillingManagementActions = () => {
    const container = $('[data-billing-management-records]');
    if (container && container.dataset.bound !== '1') {
        container.dataset.bound = '1';
        container.addEventListener('click', async (event) => {
            const detailButton = event.target.closest('[data-billing-detail]');
            const generateButton = event.target.closest('[data-billing-generate]');
            const payButton = event.target.closest('[data-billing-pay]');
            const statementButton = event.target.closest('[data-admin-download-statement]');
            const key = detailButton?.dataset.billingDetail ?? generateButton?.dataset.billingGenerate ?? payButton?.dataset.billingPay ?? statementButton?.dataset.adminDownloadStatement;
            const record = key ? billingRecordsByKey.get(String(key)) : null;
            if (!record) return;
            try {
                if (detailButton) {
                    await openBillingDetail(record);
                    return;
                }
                if (statementButton) {
                    await downloadAuthenticatedFile(`/api/billing-statements/${record.id}/document`, `${record.statement_number ?? 'billing-statement'}.pdf`);
                    return;
                }
                if (generateButton) {
                    if (!window.confirm(`Finalize the ${record.period?.label ?? 'selected'} statement for ${formatPersonalDisplay(record.household?.name)}?`)) return;
                    await requestJson('/api/billing-statements/generate', { method: 'POST', body: JSON.stringify({ user_id: record.household.id, month: (record.period_from ?? '').slice(0, 7) || new Date().toISOString().slice(0, 7) }) });
                    showToast('Billing statement finalized successfully.');
                    await loadAdminBillingManagement();
                    return;
                }
                openPaymentDialog(record);
            } catch (error) {
                if (!handleAuthFailure(error)) showToast(errorMessage(error, 'Could not update this billing record.'), 'error');
            }
        });
    }
    const closeButton = $('[data-billing-detail-close]');
    if (closeButton && closeButton.dataset.bound !== '1') {
        closeButton.dataset.bound = '1';
        closeButton.addEventListener('click', closeBillingDetail);
    }
    if (billingDetailDialog && billingDetailDialog.dataset.receiptsBound !== '1') {
        billingDetailDialog.dataset.receiptsBound = '1';
        billingDetailDialog.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-admin-download-receipt]');
            const confirmButton = event.target.closest('[data-payment-confirm]');
            const rejectButton = event.target.closest('[data-payment-reject]');
            const voidButton = event.target.closest('[data-payment-void]');
            try {
                if (button) { await downloadAuthenticatedFile(`/api/billing-payments/${button.dataset.adminDownloadReceipt}/receipt`, 'payment-receipt.pdf'); return; }
                const action = confirmButton ? 'confirm' : rejectButton ? 'reject' : voidButton ? 'void' : null;
                const id = confirmButton?.dataset.paymentConfirm ?? rejectButton?.dataset.paymentReject ?? voidButton?.dataset.paymentVoid;
                if (!action || !id) return;
                const note = action === 'confirm' ? '' : window.prompt(`Reason to ${action} this payment:`);
                if (action !== 'confirm' && !note) return;
                await requestJson(`/api/billing-payments/${id}/${action}`, { method: 'PATCH', body: JSON.stringify(note ? { note } : {}) });
                showToast(`Payment ${action === 'confirm' ? 'approved' : action + 'ed'}.`);
                closeBillingDetail();
                await Promise.all([loadAdminBillingManagement(), loadAdminActionCenter()]);
            } catch (error) { showToast(errorMessage(error, 'Could not update this payment.'), 'error'); }
        });
    }
    if (paymentForm && paymentForm.dataset.bound !== '1') {
        paymentForm.dataset.bound = '1';
        paymentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const feedback = $('[data-payment-feedback]');
            const values = Object.fromEntries(new FormData(paymentForm).entries());
            const statementId = values.billing_statement_id;
            delete values.billing_statement_id;
            if (!values.reference_number) delete values.reference_number;
            if (!values.notes) delete values.notes;
            try {
                const response = await requestJson(`/api/billing-statements/${statementId}/payments`, { method: 'POST', body: JSON.stringify(values) });
                if (feedback) { feedback.hidden = false; feedback.classList.remove('is-error'); feedback.textContent = `${response.message} ${response.data.receipt_number}`; }
                showToast(response.message);
                await Promise.all([loadAdminBillingManagement(), loadAdminActionCenter()]);
                await downloadAuthenticatedFile(`/api/billing-payments/${response.data.id}/receipt`, `${response.data.receipt_number}.pdf`);
                closePaymentDialog();
            } catch (error) {
                if (feedback) { feedback.hidden = false; feedback.classList.add('is-error'); feedback.textContent = errorMessage(error, 'Could not record this payment.'); }
            }
        });
    }
    $('[data-payment-dialog-close]')?.addEventListener('click', closePaymentDialog, { once: true });
};

const bindBillingManagementExports = () => {
    $$('[data-billing-export]').forEach((button) => {
        if (button.dataset.bound === '1') return;
        button.dataset.bound = '1';
        button.addEventListener('click', async () => {
            if (button.disabled) return;
            const printWindow = window.open('', '_blank');
            try {
                const query = buildQuery({ from: billingManagementState.from, to: billingManagementState.to });
                const response = await fetch(`${button.dataset.billingExport}${query}`, { headers: authHeaders() });
                if (!response.ok) throw new Error('PDF export failed.');
                const url = URL.createObjectURL(await response.blob());
                if (printWindow) printWindow.location.href = url; else window.location.href = url;
                showToast('PDF export created successfully.');
                window.setTimeout(() => URL.revokeObjectURL(url), 60000);
            } catch (error) {
                printWindow?.close();
                if (!handleAuthFailure(error)) showToast('Could not create the PDF export.', 'error');
            }
        });
    });
};

const loadAdminBillingManagement = async () => {
    const container = $('[data-billing-management-records]');
    if (!container) return;
    setBillingManagementState('Loading billing records...', 'loading');
    container.innerHTML = '<div class="empty-state">Loading real billing records...</div>';
    try {
        const response = await requestJson(`/api/billing-management${buildQuery(billingManagementState)}`);
        renderBillingRecords(response);
        renderPager($('[data-billing-management-pager]'), responsePaginator(response), (page) => {
            billingManagementState.page = page;
            loadAdminBillingManagement();
        });
    } catch (error) {
        if (handleAuthFailure(error)) return;
        const message = errorMessage(error, 'Billing records could not be loaded.');
        const errorNode = $('[data-billing-management-error]');
        if (errorNode) {
            errorNode.hidden = false;
            errorNode.textContent = message;
        }
        container.innerHTML = '<div class="empty-state">Billing records are unavailable right now.</div>';
        $$('[data-billing-export]').forEach((button) => { button.hidden = true; button.disabled = true; });
        setBillingManagementState(message, 'error');
    }
};

const bindBillingManagement = () => {
    bindBillingManagementActions();
    bindBillingManagementExports();
    if (billingManagementFilterForm && billingManagementFilterForm.dataset.bound !== '1') {
        billingManagementFilterForm.dataset.bound = '1';
        const fields = serializeForm(billingManagementFilterForm);
        Object.assign(billingManagementState, fields, { page: 1, per_page: Number(fields.per_page ?? 10) });
        billingManagementFilterForm.addEventListener('submit', (event) => {
            event.preventDefault();
            Object.assign(billingManagementState, serializeForm(billingManagementFilterForm), { page: 1 });
            billingManagementState.per_page = Number(billingManagementState.per_page ?? 10);
            loadAdminBillingManagement();
        });
        billingManagementFilterForm.addEventListener('reset', () => {
            window.setTimeout(() => {
                Object.assign(billingManagementState, { page: 1, per_page: 10, search: '', bill_type: 'all', status: 'all', from: '', to: '' });
                loadAdminBillingManagement();
            }, 0);
        });
    }
};

const reportTypeLabels = {
    all: 'All operational reports',
    consumption: 'Consumption and meter readings',
    billing: 'Billing records',
    notifications: 'Notifications and announcements',
    leaks: 'Leak alerts',
    devices: 'Device and connection health',
    households: 'Household account summaries',
    audit: 'Administrative activity',
};

const reportStatusOptions = {
    all: [],
    consumption: [['threshold', 'Threshold exceeded'], ['leak', 'Possible leak']],
    billing: [['paid', 'Paid'], ['partial', 'Partially paid'], ['unpaid', 'Unpaid']],
    notifications: [['read', 'Read'], ['unread', 'Unread']],
    leaks: [['detected', 'Detected'], ['acknowledged', 'Acknowledged'], ['investigating', 'Investigating'], ['resolved', 'Resolved'], ['false_alarm', 'False alarm']],
    devices: [['pending', 'Pending'], ['active', 'Active'], ['suspended', 'Suspended'], ['maintenance', 'Maintenance'], ['decommissioned', 'Decommissioned']],
    households: [['active', 'Active'], ['inactive', 'Inactive'], ['suspended', 'Suspended'], ['archived', 'Archived']],
    audit: [['success', 'Success'], ['failed', 'Failed']],
};

const localDateValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const updateReportPeriodFields = () => {
    if (!reportManagementFilterForm) return;
    const period = $('select[name="period"]', reportManagementFilterForm)?.value ?? 'monthly';
    const from = $('[data-report-date-from]');
    const to = $('[data-report-date-to]');
    const description = $('[data-report-period-description]');
    const today = new Date();
    let start = today;
    let end = today;
    if (period === 'weekly') {
        start = new Date(today);
        start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        end = new Date(start);
        end.setDate(start.getDate() + 6);
    } else if (period === 'monthly') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    const custom = period === 'custom';
    if (from) from.disabled = !custom;
    if (to) to.disabled = !custom;
    if (!custom) {
        if (from) from.value = localDateValue(start);
        if (to) to.value = localDateValue(end);
    }
    if (description) {
        description.textContent = custom
            ? 'Choose a date range up to 366 days.'
            : `${period.charAt(0).toUpperCase()}${period.slice(1)} report period: ${localDateValue(start)} to ${localDateValue(end)}`;
    }
};

const updateReportStatusOptions = () => {
    if (!reportManagementFilterForm) return;
    const type = $('select[name="report_type"]', reportManagementFilterForm)?.value ?? 'all';
    const status = $('[data-report-status]');
    if (!status) return;
    const current = reportManagementState.status;
    status.innerHTML = '<option value="">Any status</option>' + (reportStatusOptions[type] ?? [])
        .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
    status.value = (reportStatusOptions[type] ?? []).some(([value]) => value === current) ? current : '';
};

const setReportManagementState = (message, tone = '') => {
    const state = $('[data-report-management-state]');
    if (!state) return;
    state.textContent = message;
    state.classList.remove('is-loading', 'is-error', 'is-empty', 'is-ready');
    if (tone) state.classList.add(`is-${tone}`);
};

const renderReportSummary = (summary = {}, reportType = 'all') => {
    const container = $('[data-report-summary]');
    if (!container) return;
    const consumption = Number(summary.total_cubic_meter ?? 0);
    const charges = Number(summary.estimated_bill ?? 0) + Number(summary.current_charge ?? 0);
    const attention = Number(summary.leak_count ?? 0) + Number(summary.threshold_count ?? 0)
        + Number(summary.unread_count ?? 0) + Number(summary.active_count ?? 0)
        + Number(summary.unnotified_count ?? 0);
    const consumptionLabel = reportType === 'billing' ? 'Billed volume' : 'Water volume';
    const chargeLabel = reportType === 'billing' ? 'Current charges' : 'Estimated charges';
    container.innerHTML = `
        <article class="stat-card"><span>Records</span><strong>${formatNumber(summary.total_records ?? 0, 0)}</strong><small>Real records in this period</small></article>
        <article class="stat-card"><span>${consumptionLabel}</span><strong>${formatCubicMeterValue(consumption)}</strong><small>${formatNumber(summary.total_liters ?? 0, 0)} L where available</small></article>
        <article class="stat-card"><span>${chargeLabel}</span><strong>${formatCurrency(charges)}</strong><small>Based on stored calculations</small></article>
        <article class="stat-card"><span>Attention</span><strong>${formatNumber(attention, 0)}</strong><small>Alerts, unread, or unresolved records</small></article>`;
};

const renderReportPreview = (report) => {
    const head = $('[data-report-preview-head]');
    const body = $('[data-report-preview-body]');
    const label = $('[data-report-preview-label]');
    const error = $('[data-report-error]');
    const records = Array.isArray(report?.items) ? report.items : [];
    const columns = Array.isArray(report?.columns) ? report.columns : [];
    if (label) label.textContent = `${reportTypeLabels[report?.report_type] ?? 'Operational report'} · ${report?.period?.label ?? ''}`;
    if (error) error.hidden = true;
    if (head) head.innerHTML = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
    if (body) body.innerHTML = records.length
        ? records.map((item) => `<tr>${columns.map((column) => `<td>${escapeHtml(item[column.key] ?? '—')}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${Math.max(columns.length, 1)}"><div class="empty-state table-empty-state"><strong>No report records found</strong><span>Try a wider period or different filters. No sample records are generated.</span></div></td></tr>`;
};

const setReportExports = (enabled, report = null) => {
    $$('[data-report-export]').forEach((button) => {
        button.hidden = !enabled;
        button.disabled = !enabled;
        if (enabled && report) button.textContent = `Export ${reportTypeLabels[report.report_type] ?? 'selected report'} · ${report.period?.label ?? 'selected period'}`;
    });
};

const loadAdminReports = async () => {
    if (!reportManagementFilterForm) return;
    const body = $('[data-report-preview-body]');
    setReportManagementState('Loading report data...', 'loading');
    setReportExports(false);
    if (body) body.innerHTML = '<tr><td>Loading real report data...</td></tr>';
    try {
        const response = await requestJson(`/api/report-management${buildQuery(reportManagementState)}`);
        const report = response?.data ?? {};
        renderReportSummary(report.summary, report.report_type);
        renderReportPreview(report);
        const total = Number(report.meta?.total ?? report.summary?.total_records ?? 0);
        setReportExports(total > 0, report);
        setReportManagementState(total > 0 ? `${formatNumber(total, 0)} real record${total === 1 ? '' : 's'} loaded.` : 'No records match the selected filters.', total > 0 ? 'ready' : 'empty');
        renderPager($('[data-report-pager]'), report.meta, (page) => {
            reportManagementState.page = page;
            loadAdminReports();
        });
        const pager = $('[data-report-pager]');
        if (pager) pager.hidden = !report.meta?.total;
    } catch (error) {
        if (handleAuthFailure(error)) return;
        const message = errorMessage(error, 'Reports could not be loaded.');
        const errorNode = $('[data-report-error]');
        if (errorNode) {
            errorNode.hidden = false;
            const messageNode = $('[data-report-error-message]', errorNode);
            if (messageNode) messageNode.textContent = message;
        }
        if (body) body.innerHTML = '';
        setReportExports(false);
        setReportManagementState(message, 'error');
    }
};

const bindAdminReports = () => {
    if (!reportManagementFilterForm || reportManagementFilterForm.dataset.bound === '1') return;
    reportManagementFilterForm.dataset.bound = '1';
    const period = $('select[name="period"]', reportManagementFilterForm);
    const type = $('select[name="report_type"]', reportManagementFilterForm);
    const pageSize = $('[data-report-page-size]');
    updateReportPeriodFields();
    updateReportStatusOptions();
    period?.addEventListener('change', updateReportPeriodFields);
    type?.addEventListener('change', updateReportStatusOptions);
    reportManagementFilterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const fields = serializeForm(reportManagementFilterForm);
        if (fields.period === 'custom' && (!fields.from || !fields.to)) {
            setReportManagementState('Choose both dates for a custom report period.', 'error');
            return;
        }
        Object.assign(reportManagementState, fields, { page: 1 });
        loadAdminReports();
    });
    $('[data-report-reset]')?.addEventListener('click', () => {
        reportManagementFilterForm.reset();
        if (pageSize) pageSize.value = '5';
        Object.assign(reportManagementState, { page: 1, per_page: 5, period: 'monthly', report_type: 'all', from: '', to: '', search: '', status: '' });
        updateReportPeriodFields();
        updateReportStatusOptions();
        loadAdminReports();
    });
    pageSize?.addEventListener('change', () => {
        reportManagementState.page = 1;
        reportManagementState.per_page = Number(pageSize.value || 5);
        loadAdminReports();
    });
    $('[data-report-retry]')?.addEventListener('click', loadAdminReports);
    $$('[data-report-export]').forEach((button) => button.addEventListener('click', async () => {
        if (button.disabled) return;
        const printWindow = window.open('', '_blank');
        try {
            const query = buildQuery({ ...reportManagementState, page: '', per_page: '' });
            const response = await fetch(`${button.dataset.reportExport}${query}`, { headers: authHeaders() });
            if (!response.ok) throw new Error(await response.text() || 'PDF export failed.');
            const url = URL.createObjectURL(await response.blob());
            if (printWindow) printWindow.location.href = url; else window.location.href = url;
            showToast('Report PDF export created successfully.');
            window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (error) {
            printWindow?.close();
            if (!handleAuthFailure(error)) showToast(errorMessage(error, 'Could not create the report export.'), 'error');
        }
    }));
};

const formatTelemetryDelay = (ageSeconds) => {
    const minutes = Math.max(0, Math.floor(Number(ageSeconds) / 60));
    if (minutes < 60) return `${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'}`;

    const hours = Math.floor(minutes / 60);
    if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'}`;
};

const renderAdminTelemetryAlert = (response) => {
    const alert = $('[data-admin-telemetry-alert]');
    if (!alert) return;

    const telemetry = response?.data?.telemetry;
    const isDelayed = telemetry?.status === 'stale' || telemetry?.status === 'waiting';
    alert.hidden = !isDelayed;
    if (!isDelayed) return;

    const message = telemetry?.latest_reading_at
        ? `Meter data has not been received for ${formatTelemetryDelay(telemetry.age_seconds)}. Review meter connections.`
        : 'No meter data has been received yet. Review meter connections.';
    setText('[data-admin-telemetry-alert-message]', message);
};

const renderConsumptionAlertComparison = (items = []) => {
    const container = $('[data-consumption-alert-comparison]');
    const chart = $('[data-consumption-alert-baseline-chart]');
    if (!container || !chart) return;
    const comparisons = Array.isArray(items) ? items : [];

    const changeBadge = $('[data-consumption-comparison-change]');
    if (changeBadge) {
        changeBadge.classList.remove('status-chip-muted', 'status-chip-soft', 'status-chip-alert', 'consumption-change-increase');
        const comparedCount = comparisons.filter((item) => !item.latest?.is_baseline).length;
        if (!comparisons.length) {
            changeBadge.textContent = 'No baseline data';
            changeBadge.classList.add('status-chip-muted');
        } else {
            changeBadge.textContent = `${comparedCount} of ${comparisons.length} compared`;
            changeBadge.classList.add(comparedCount ? 'status-chip-soft' : 'status-chip-muted');
        }
    }

    setText(
        '[data-consumption-comparison-summary]',
        comparisons.length
            ? 'Each bar compares a month’s recorded water use with that household’s July baseline. Percentages are shown above the bar, with the month and recorded liters below.'
            : 'A household appears after its meter records monthly water use.',
    );

    chart.innerHTML = comparisons.length ? comparisons.map((item) => {
        const household = item.household ?? {};
        const baseline = item.baseline ?? {};
        const months = Array.isArray(item.months) ? item.months : [];
        const largestPercentage = Math.max(100, ...months.map((month) => Math.max(0, Number(month.usage_percentage ?? 0))));
        const bars = months.map((month) => {
            const percentage = month.usage_percentage === null ? null : Number(month.usage_percentage ?? 0);
            const height = percentage === null ? 0 : Math.max(3, Math.min(100, (percentage / largestPercentage) * 100));
            const status = month.is_baseline ? ' is-baseline' : (percentage > 100 ? ' is-above' : (percentage < 100 ? ' is-below' : ''));
            return `<div class="consumption-month-bar${status}" title="${escapeHtml(formatMonthLabel(month.month))}: ${percentage === null ? 'percentage unavailable' : `${formatNumber(percentage)}%`} · ${formatNumber(month.liters ?? 0)} L">
                <strong>${percentage === null ? '--' : `${formatNumber(percentage)}%`}</strong>
                <div class="consumption-month-bar-column"><span style="height:${height}%"></span></div>
                <small>${escapeHtml(formatMonthLabel(month.month))}</small>
                <em>${formatNumber(month.liters ?? 0)} L</em>
            </div>`;
        }).join('');
        return `<article class="consumption-vertical-chart-card">
            <header><strong>${escapeHtml(household.name ?? 'Household')}</strong><small>July baseline: ${formatNumber(baseline.liters ?? 0)} L = 100%</small></header>
            <div class="consumption-vertical-months" role="img" aria-label="${escapeHtml(household.name ?? 'Household')} monthly water use compared with the July baseline">${bars}</div>
        </article>`;
    }).join('') : '<div class="empty-state">No household baseline data yet.</div>';
};

const refreshConsumptionBaselines = async () => {
    if (consumptionBaselineRefreshInFlight || document.visibilityState === 'hidden') return;
    consumptionBaselineRefreshInFlight = true;
    try {
        const response = await requestJson('/api/analytics/consumption-baselines', { forceNetwork: true });
        renderConsumptionAlertComparison(response.data ?? []);
    } catch (error) {
        if (!handleAuthFailure(error)) console.error('Could not refresh consumption baselines.', error);
    } finally {
        consumptionBaselineRefreshInFlight = false;
    }
};

const stopConsumptionBaselineRefresh = () => {
    if (consumptionBaselineRefreshTimer !== null) {
        window.clearInterval(consumptionBaselineRefreshTimer);
        consumptionBaselineRefreshTimer = null;
    }
};

const startConsumptionBaselineRefresh = () => {
    stopConsumptionBaselineRefresh();
    void refreshConsumptionBaselines();
    consumptionBaselineRefreshTimer = window.setInterval(refreshConsumptionBaselines, 3000);
};

const loadAdmin = async () => {
    if (!hasTokenOrReport()) {
        return;
    }

    const devicesContainer = $('[data-municipal-devices]');
    const billingSummaryContainer = $('[data-admin-billing-summary]');
    const deviceHouseholdSelect = $('[data-device-household-select]');
    const householdSelect = $('[data-household-select]');
    const userForm = $('[data-admin-user-form]');
    const billingRatesForm = $('[data-billing-rates-form]');
    const consumptionAlertForm = $('[data-consumption-alert-form]');
    const leakSettingsForm = $('[data-leak-settings-form]');
    const deviceRegisterForm = $('[data-device-register-form]');
    const activationResult = $('[data-activation-result]');
    const adminAlertsContainer = $('[data-admin-alerts]');

    bindAdminUserForm(userForm);
    bindAdminHouseholdEditForm();
    bindAdminDeviceRegistrationForm(deviceRegisterForm, activationResult);
    bindAdminDeviceActions(devicesContainer, activationResult);
    bindAdminLeakActions(adminAlertsContainer);
    bindAdminSettingsForm(billingRatesForm, '/api/billing-settings/rates', '[data-billing-rates-status]', 'Billing rates saved successfully.');
    bindAdminSettingsForm(consumptionAlertForm, '/api/billing-settings/consumption-alerts', '[data-consumption-alert-status]', 'Consumption alert settings saved successfully.');
    bindAdminSettingsForm(leakSettingsForm, '/api/billing-settings/leak-settings', '[data-leak-settings-status]', 'Leak monitoring settings saved successfully.');
    bindBillingManagement();
    loadAdminBillingManagement();
    bindAdminServiceRequests();
    void loadAdminActionCenter();

    if (consumptionFilterForm) {
        const fields = serializeForm(consumptionFilterForm);
        consumptionState.page = Number(fields.page ?? 1);
        consumptionState.per_page = Number(fields.per_page ?? 10);
        consumptionState.search = fields.search ?? '';
        consumptionState.account_status = fields.account_status ?? '';
        consumptionState.meter_status = fields.meter_status ?? '';
        consumptionState.usage_condition = fields.usage_condition ?? '';
        consumptionState.from = fields.from ?? '';
        consumptionState.to = fields.to ?? '';
    }

    if (householdUserFilterForm) {
        const fields = serializeForm(householdUserFilterForm);
        householdUserState.page = Number(fields.page ?? 1);
        householdUserState.per_page = Number(fields.per_page ?? 10);
        householdUserState.search = fields.search ?? '';
        householdUserState.account_status = fields.account_status ?? '';
    }

    try {
        const me = await requestJson('/api/me');
        if (redirectAwayFromWrongRole(me.data, 'admin')) {
            return;
        }

        setText('[data-account-role]', roleLabelForUser(me.data));

        // Customer management must remain usable if an unrelated dashboard
        // report or device endpoint is temporarily unavailable.
        await loadAdminUsers({ householdsOnly: true });
        bindConsumptionMonitoring();
        const consumptionPromise = loadAdminConsumption();
        const overviewHouseholdUsers = await loadEligibleHouseholds([deviceHouseholdSelect, householdSelect]);
        const municipalDevicesPromise = loadAdminDevices();
        const leakAlertsPromise = loadAdminLeakAlerts();
        const [summaryResponse, analyticsResponse, billingResponse, systemHealthResponse] = await Promise.all([
            requestJson('/api/summary'),
            requestJson(`/api/analytics/admin${analyticsQuery(adminAnalyticsRange, adminAnalyticsFrom, adminAnalyticsTo, 'last_12_months')}`),
            requestJson('/api/billing-settings', { forceNetwork: true }),
            requestJson('/api/system-health').catch((error) => {
                if (!handleAuthFailure(error)) console.error('System health request failed', error);
                return null;
            }),
        ]);

        const billingSettings = billingResponse.data ?? null;
        const billingFormSettings = billingResponse.scheduled ?? billingSettings;
        activeCurrency = billingSettings?.currency ?? 'PHP';
        $$('[data-rate-currency]').forEach((node) => { node.textContent = billingFormSettings?.currency ?? activeCurrency; });
        if (billingFormSettings) {
            const setValue = (form, field, value) => {
                const input = form?.elements?.namedItem(field);
                if (form?.dataset.dirty !== '1' && input && value !== undefined && value !== null) input.value = value;
            };
            setValue(billingRatesForm, 'water_rate', billingFormSettings.water_rate ?? 0);
            setValue(billingRatesForm, 'fixed_monthly_charge', billingFormSettings.fixed_monthly_charge ?? 0);
            setValue(billingRatesForm, 'subsidy_deduction', billingFormSettings.subsidy_deduction ?? 0);
            setValue(billingRatesForm, 'effective_date', billingFormSettings.effective_date ? String(billingFormSettings.effective_date).slice(0, 10) : '');
            setValue(billingRatesForm, 'currency', billingFormSettings.currency ?? 'PHP');

            setValue(consumptionAlertForm, 'notification_behavior', billingSettings?.consumption_alert_behavior ?? 'household');
            if (consumptionAlertForm?.dataset.dirty !== '1' && consumptionAlertForm?.elements?.consumption_alert_enabled) consumptionAlertForm.elements.consumption_alert_enabled.checked = billingSettings?.consumption_alert_enabled !== false;

            setValue(leakSettingsForm, 'leak_flow_rate_threshold', billingSettings?.leak_flow_rate_threshold ?? 0);
            setValue(leakSettingsForm, 'leak_continuous_duration_minutes', billingSettings?.leak_continuous_duration_minutes ?? 0);
            setValue(leakSettingsForm, 'quiet_hours_start', billingSettings?.quiet_hours_start ?? 22);
            setValue(leakSettingsForm, 'quiet_hours_end', billingSettings?.quiet_hours_end ?? 4);
            setValue(leakSettingsForm, 'leak_alert_behavior', billingSettings?.leak_alert_behavior ?? 'household');
            if (leakSettingsForm?.dataset.dirty !== '1' && leakSettingsForm?.elements?.leak_alert_enabled) leakSettingsForm.elements.leak_alert_enabled.checked = billingSettings?.leak_alert_enabled !== false;
        }
        const summary = summaryResponse.data ?? {};
        const analytics = analyticsResponse.data ?? {};
        renderConsumptionAlertComparison(analytics.alerts?.consumption_baselines ?? []);
        renderAdminTelemetryAlert(systemHealthResponse);
        const leakHouseholds = await leakAlertsPromise;
        const municipalDevices = await municipalDevicesPromise;
        await consumptionPromise;
        const onlineDevices = municipalDevices.filter((device) => device.is_online).length;
        const offlineDevices = municipalDevices.filter((device) => !device.is_online && device.status !== 'decommissioned').length;
        const totalConsumption = analytics.consumption?.has_data
            ? formatCubicMeters(analytics.consumption.total_liters)
            : 'No data yet';
        const estimatedBilling = analytics.consumption?.has_data
            ? formatCurrency(analytics.consumption.estimated_billing)
            : 'No data yet';

        setText('[data-admin-households]', analytics.households?.total ?? 0);
        setText('[data-admin-devices]', analytics.devices?.total ?? 0);
        setText('[data-admin-online-devices]', analytics.devices?.connected ?? 0);
        setText('[data-admin-unresolved-leaks]', analytics.alerts?.unresolved_leak_alerts ?? 0);
        setText('[data-admin-liters]', totalConsumption);
        setText('[data-admin-billing-total]', estimatedBilling);
        setText('[data-admin-active-households]', analytics.households?.active ?? 0);
        setText('[data-admin-pending-devices]', analytics.devices?.pending_activation ?? 0);
        renderAdminOverviewActivity(analytics);
        renderAdminConsumptionBaselines(
            analytics.alerts?.consumption_baselines ?? [],
            Number.NaN,
        );
        renderMonthlyChart($('[data-admin-monthly-chart]'), summary.monthly_usage ?? [], {
            dataAvailable: summary.monthly_usage?.some((row) => Number(row.reading_count ?? 0) > 0) === true,
            emptyMessage: '<div class="chart-empty-state"><strong>No analytics data available yet</strong><span>Analytics will appear after the system receives valid water-meter readings.</span></div>',
        });

        if (billingSummaryContainer) {
            billingSummaryContainer.innerHTML = `
                <div><dt>Water rate per m³</dt><dd>${billingSettings ? formatCurrency(billingSettings.water_rate) : '--'}</dd></div>
                <div><dt>Fixed monthly charge</dt><dd>${billingSettings ? formatCurrency(billingSettings.fixed_monthly_charge ?? 0) : '--'}</dd></div>
                <div><dt>Consumption baseline</dt><dd>July = 100%</dd></div>
                <div><dt>Monthly percentage report</dt><dd>${billingSettings?.consumption_alert_enabled === false ? 'Disabled' : 'Enabled'}</dd></div>
                <div><dt>Leak threshold</dt><dd>${billingSettings ? `${formatNumber(billingSettings.leak_flow_rate_threshold ?? 0)} L/min` : '--'}</dd></div>
                <div><dt>Quiet hours</dt><dd>${billingSettings ? `${billingSettings.quiet_hours_start}:00 - ${billingSettings.quiet_hours_end}:00` : '--'}</dd></div>
                <div><dt>Households</dt><dd>${overviewHouseholdUsers.length}</dd></div>
                <div><dt>Devices online</dt><dd>${onlineDevices}</dd></div>
            `;
        }

        const currentSummary = $('[data-water-rate-current-summary]');
        if (currentSummary) {
            currentSummary.innerHTML = billingSettings
                ? `<div><dt>Current water rate</dt><dd>${formatCurrency(billingSettings.water_rate)} / m³</dd></div><div><dt>Effective date</dt><dd>${escapeHtml(billingSettings.effective_date ? formatDateTime(billingSettings.effective_date) : 'Immediately')}</dd></div><div><dt>Leak monitoring</dt><dd>${billingSettings.leak_alert_enabled === false ? 'Disabled' : `${formatNumber(billingSettings.leak_flow_rate_threshold ?? 0)} L/min`}</dd></div>`
                : '<div><dt>Current water rate</dt><dd>Not configured</dd></div><div><dt>Effective date</dt><dd>--</dd></div><div><dt>Leak monitoring</dt><dd>Not configured</dd></div>';
        }

        renderAdminAlerts(leakHouseholds);

        if (consumptionFilterForm && !consumptionFilterForm.dataset.bound) {
            consumptionFilterForm.dataset.bound = '1';
            consumptionFilterForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const fields = serializeForm(consumptionFilterForm);
                consumptionState.page = 1;
                consumptionState.search = fields.search ?? '';
                consumptionState.account_status = fields.account_status ?? '';
                consumptionState.meter_status = fields.meter_status ?? '';
                consumptionState.usage_condition = fields.usage_condition ?? '';
                consumptionState.from = fields.from ?? '';
                consumptionState.to = fields.to ?? '';
                consumptionState.per_page = Number(fields.per_page ?? 10);
                loadAdminConsumption();
            });
            consumptionFilterForm.addEventListener('reset', () => {
                window.setTimeout(() => {
                    consumptionState.page = 1;
                    consumptionState.search = '';
                    consumptionState.account_status = '';
                    consumptionState.meter_status = '';
                    consumptionState.usage_condition = '';
                    consumptionState.from = '';
                    consumptionState.to = '';
                    consumptionState.per_page = 10;
                    loadAdminConsumption();
                }, 0);
            });
        }

        if (householdUserFilterForm && !householdUserFilterForm.dataset.bound) {
            householdUserFilterForm.dataset.bound = '1';
            householdUserFilterForm.addEventListener('submit', (event) => {
                event.preventDefault();
                householdUserState.page = 1;
                const fields = serializeForm(householdUserFilterForm);
                householdUserState.search = fields.search ?? '';
                householdUserState.account_status = fields.account_status ?? '';
                householdUserState.per_page = Number(fields.per_page ?? 10);
                loadAdminUsers({ householdsOnly: true });
            });
        }
    } catch (error) {
        if (handleAuthFailure(error)) {
            return;
        }

        console.error(error);
        setStatus('Admin load failed');
    }
};

const bootCommon = () => {
    bootResponsiveLayout();
    setTokenInput();
    bootLogout();
    let storedLocale = 'en';
    try { storedLocale = localStorage.getItem(localeKey) ?? 'en'; } catch { storedLocale = 'en'; }
    applyLocale(storedLocale);
    applyLowBandwidthMode(lowBandwidthMode, false);
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    $$('[data-visibility-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            const input = $(button.dataset.visibilityToggle);
            if (!input) return;

            const shouldReveal = input.type === 'password';
            input.type = shouldReveal ? 'text' : 'password';
            button.setAttribute('aria-pressed', String(shouldReveal));
            button.setAttribute('aria-label', shouldReveal ? 'Hide password' : 'Show password');
            button.setAttribute('title', shouldReveal ? 'Hide password' : 'Show password');
            const icon = $('i', button);
            icon?.classList.toggle('bi-eye', !shouldReveal);
            icon?.classList.toggle('bi-eye-slash', shouldReveal);
        });
    });

    const setHouseholdSidebarCollapsed = (isCollapsed, persist = false) => {
        document.body.classList.toggle('household-sidebar-collapsed', isCollapsed);
        if (householdSidebarCollapse) {
            householdSidebarCollapse.setAttribute('aria-expanded', String(!isCollapsed));
            householdSidebarCollapse.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
            householdSidebarCollapse.setAttribute('title', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
        }
        if (persist) {
            localStorage.setItem('smart-water-household-sidebar-collapsed', isCollapsed ? '1' : '0');
        }
    };

    if (page === 'household' && householdSidebarCollapse) {
        setHouseholdSidebarCollapsed(localStorage.getItem('smart-water-household-sidebar-collapsed') === '1');
        householdSidebarCollapse.addEventListener('click', () => {
            setHouseholdSidebarCollapsed(!document.body.classList.contains('household-sidebar-collapsed'), true);
        });
    }

    const setAdminSidebarCollapsed = (isCollapsed, persist = false) => {
        document.body.classList.toggle('admin-sidebar-collapsed', isCollapsed);
        if (adminSidebarCollapse) {
            adminSidebarCollapse.setAttribute('aria-expanded', String(!isCollapsed));
            adminSidebarCollapse.setAttribute('aria-label', isCollapsed ? 'Expand administrator sidebar' : 'Collapse administrator sidebar');
            adminSidebarCollapse.setAttribute('title', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
        }
        if (persist) {
            localStorage.setItem('smart-water-admin-sidebar-collapsed', isCollapsed ? '1' : '0');
        }
    };

    if (page === 'admin' && adminSidebarCollapse) {
        setAdminSidebarCollapsed(localStorage.getItem('smart-water-admin-sidebar-collapsed') === '1');
        adminSidebarCollapse.addEventListener('click', () => {
            setAdminSidebarCollapsed(!document.body.classList.contains('admin-sidebar-collapsed'), true);
        });
    }

    notificationToggle?.addEventListener('click', () => {
        const shouldOpen = notificationDropdown?.hidden !== false;
        setNotificationDropdownOpen(shouldOpen);
        if (shouldOpen) void loadNotifications();
    });
    notificationDropdown?.addEventListener('click', (event) => {
        const notificationItem = event.target.closest('[data-notification-dropdown-item]');
        if (notificationItem) markNotificationRead(notificationItem);
        if (event.target.closest('[data-household-nav="notifications"]')) {
            setNotificationDropdownOpen(false);
        }
    });
    document.addEventListener('click', (event) => {
        if (notificationDropdown?.hidden === false && !notificationControl?.contains(event.target)) {
            setNotificationDropdownOpen(false);
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && notificationDropdown?.hidden === false) {
            setNotificationDropdownOpen(false);
            notificationToggle?.focus();
        }
        if (event.key === 'Escape' && adminNotificationDropdown?.hidden === false) {
            setAdminNotificationDropdownOpen(false);
            adminNotificationToggle?.focus();
        }
    });

    document.addEventListener('click', async (event) => {
        const itemButton = event.target.closest('[data-delete-sent-notification]');
        const allButton = event.target.closest('[data-delete-all-sent-notifications]');
        if (!itemButton && !allButton) return;

        const title = itemButton?.dataset.notificationTitle ?? 'all sent notifications';
        if (!window.confirm(`Delete ${title}? This cannot be undone.`)) return;

        const url = itemButton
            ? `/api/notifications/sent/${itemButton.dataset.deleteSentNotification}`
            : '/api/notifications/sent/all';
        try {
            const response = await requestJson(url, { method: 'DELETE' });
            showToast(response?.message ?? 'Notification records deleted successfully.');
            loadAdmin();
        } catch (error) {
            if (!handleAuthFailure(error)) {
                console.error(error);
                showToast(errorMessage(error, 'Could not delete the notification records.'), 'error');
            }
        }
    });

    document.addEventListener('click', async (event) => {
        const archiveButton = event.target.closest('[data-archive-sent-notification]');
        const retryButton = event.target.closest('[data-retry-sent-notification]');
        if (!archiveButton && !retryButton) return;

        const notificationId = archiveButton?.dataset.archiveSentNotification ?? retryButton?.dataset.retrySentNotification;
        const action = archiveButton ? 'archive' : 'retry';
        const prompt = archiveButton
            ? 'Archive this notification batch from administrative history? Household inbox records will remain available.'
            : 'Retry failed deliveries for this notification batch?';
        if (!window.confirm(prompt)) return;

        try {
            const response = await requestJson(action === 'archive'
                ? `/api/notifications/${notificationId}/archive`
                : `/api/notifications/${notificationId}/retry`, { method: action === 'archive' ? 'PATCH' : 'POST' });
            showToast(response?.message ?? `Notification ${action} completed successfully.`);
            loadAdminNotificationHistory();
        } catch (error) {
            if (!handleAuthFailure(error)) showToast(errorMessage(error, `Could not ${action} the notification.`), 'error');
        }
    });

    $$('[data-pdf-export]').forEach((button) => {
        button.addEventListener('click', async () => {
            const printWindow = window.open('', '_blank');
            try {
                const response = await fetch(button.dataset.pdfExport, { headers: authHeaders() });
                if (!response.ok) throw new Error('PDF export failed.');
                const url = URL.createObjectURL(await response.blob());
                if (printWindow) printWindow.location.href = url;
                else window.location.href = url;
                showToast('PDF export created successfully.');
                window.setTimeout(() => URL.revokeObjectURL(url), 60000);
            } catch (error) {
                printWindow?.close();
                if (!handleAuthFailure(error)) {
                    console.error(error);
                    setStatus('PDF export failed');
                    showToast('Could not create the PDF export.', 'error');
                }
            }
        });
    });

    if (accountForm && !accountForm.dataset.bound) {
        accountForm.dataset.bound = '1';
        accountForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (accountForm.dataset.saving === '1') return;
            const submitButton = $('button[type="submit"]', accountForm);
            accountForm.dataset.saving = '1';
            if (submitButton) submitButton.disabled = true;
            setAccountFormFeedback(accountForm, 'Saving contact information...', 'loading');
            try {
                const submitted = serializeForm(accountForm);
                const response = await requestJson('/api/account', { method: 'PATCH', body: JSON.stringify(submitted) });
                if (['email', 'phone'].every((name) => accountForm.elements[name].value.trim() === String(submitted[name] ?? '').trim())) {
                    accountForm.dataset.dirty = '0';
                }
                householdProfile = response?.data ?? householdProfile;
                accountProfileLoaded = true;
                renderProfile(householdProfile);
                setAccountProfileState('Account details loaded', 'ready');
                setAccountFormFeedback(accountForm, 'Contact information saved successfully.');
                setStatus('Account updated');
                showToast('Contact details updated successfully.');
            } catch (error) {
                if (!handleAuthFailure(error)) {
                    const message = errorMessage(error, 'Could not update contact details.');
                    setAccountFormFeedback(accountForm, message, 'error');
                    showToast(message, 'error');
                }
            } finally {
                accountForm.dataset.saving = '0';
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = submitButton.dataset.originalText || submitButton.textContent;
                }
            }
        });
    }

    if (accountForm && !accountForm.dataset.validationBound) {
        accountForm.dataset.validationBound = '1';
        const emailField = accountForm.elements.email;
        const phoneField = accountForm.elements.phone;
        [emailField, phoneField].forEach((field) => {
            if (!field) return;
            field.addEventListener('input', updateAccountFormState);
            field.addEventListener('blur', () => updateAccountFormState());
        });
    }

    if (passwordForm && !passwordForm.dataset.validationBound) {
        passwordForm.dataset.validationBound = '1';
        const currentPasswordField = passwordForm.elements.current_password;
        const passwordField = passwordForm.elements.password;
        const confirmationField = passwordForm.elements.password_confirmation;
        [currentPasswordField, passwordField, confirmationField].forEach((field) => {
            if (!field) return;
            field.addEventListener('input', updatePasswordFormState);
            field.addEventListener('blur', updatePasswordFormState);
        });
        updatePasswordFormState();
    }

    passwordToggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const targetName = button.dataset.passwordToggle;
            const input = passwordForm?.elements[targetName];
            if (!input) return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            button.textContent = isPassword ? 'Hide' : 'Show';
            button.setAttribute('aria-pressed', String(isPassword));
        });
    });

    if (passwordForm && !passwordForm.dataset.bound) {
        passwordForm.dataset.bound = '1';
        passwordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (passwordForm.dataset.saving === '1') return;
            const submitButton = $('button[type="submit"]', passwordForm);
            passwordForm.dataset.saving = '1';
            if (submitButton) submitButton.disabled = true;
            setAccountFormFeedback(passwordForm, 'Updating password...', 'loading');
            try {
                await requestJson('/api/account/password', { method: 'PATCH', body: JSON.stringify(serializeForm(passwordForm)) });
                passwordForm.reset();
                setAccountFormFeedback(passwordForm, 'Password changed successfully.');
                setStatus('Password changed');
                showToast('Password changed successfully.');
            } catch (error) {
                if (!handleAuthFailure(error)) {
                    const message = errorMessage(error, 'Could not change the password.');
                    setAccountFormFeedback(passwordForm, message, 'error');
                    showToast(message, 'error');
                }
            } finally {
                passwordForm.dataset.saving = '0';
                updatePasswordFormState();
            }
        });
    }

    $$('[data-household-nav]').forEach((button) => {
        button.addEventListener('click', () => showHouseholdView(button.dataset.householdNav));
    });

    $$('[data-history-period]').forEach((button) => {
        button.addEventListener('click', () => {
            const nextPeriod = button.dataset.historyPeriod;
            if (!['daily', 'weekly', 'monthly'].includes(nextPeriod)) return;

            historyPeriod = nextPeriod;
            historyState.period = nextPeriod;
            historyState.page = 1;
            $$('[data-history-period]').forEach((tab) => {
                const isActive = tab === button;
                tab.classList.toggle('is-active', isActive);
                tab.setAttribute('aria-selected', String(isActive));
            });
            renderHistorySummary();
            loadConsumptionHistory();
        });
    });

    $$('[data-household-consumption-period]').forEach((button) => {
        button.addEventListener('click', () => {
            const period = button.dataset.householdConsumptionPeriod;
            if (householdConsumptionPeriods[period]) {
                loadHouseholdConsumption(period);
            }
        });
    });

    $$('[data-household-trend-period]').forEach((button) => {
        button.addEventListener('click', () => {
            const period = button.dataset.householdTrendPeriod;
            if (householdTrendPeriods[period]) loadHouseholdTrend(period);
        });
    });

    $$('[data-admin-nav]').forEach((button) => {
        button.addEventListener('click', () => showAdminView(button.dataset.adminNav));
    });

    if (adminSearch && page === 'admin') {
        adminSearch.addEventListener('input', () => {
            const query = adminSearch.value.trim().toLocaleLowerCase();
            const buttons = $$('[data-admin-nav]');

            buttons.forEach((button) => {
                const matches = !query || button.textContent.trim().toLocaleLowerCase().includes(query);
                button.hidden = !matches;
            });

            if (!query) {
                return;
            }

            const firstMatch = buttons.find((button) => !button.hidden);
            if (firstMatch) {
                showAdminView(firstMatch.dataset.adminNav);
            }
        });
    }

    saveTokenButton?.addEventListener('click', () => {
        persistToken(tokenInput?.value.trim() ?? '');
        setStatus('Token saved');
        showToast('API token saved successfully.');
    });

    if (dashboardFilterForm && !dashboardFilterForm.dataset.bound) {
        dashboardFilterForm.dataset.bound = '1';
        dashboardFilterForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const fields = serializeForm(dashboardFilterForm);
            dashboardState.page = 1;
            dashboardState.from = fields.from ?? '';
            dashboardState.to = fields.to ?? '';
            dashboardState.per_page = Number(fields.per_page ?? 10);

            if (page === 'household') {
                loadDashboard();
            }
        });
    }

    if (historyFilterForm && !historyFilterForm.dataset.bound) {
        historyFilterForm.dataset.bound = '1';
        historyFilterForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const fields = serializeForm(historyFilterForm);
            historyState.page = 1;
            historyState.period = historyPeriod;
            historyState.from = fields.from ?? '';
            historyState.to = fields.to ?? '';
            historyState.search = fields.search ?? '';
            historyState.per_page = Number(fields.per_page ?? 10);
            loadConsumptionHistory();
        });
    }

    $$('[data-history-export-csv]').forEach((button) => {
        button.addEventListener('click', () => {
            const items = consumptionHistory[historyPeriod] ?? [];
            exportHistoryCsv(items);
        });
    });

    $$('[data-history-export-pdf]').forEach((button) => {
        button.addEventListener('click', async () => {
            const pdfUrl = `/api/exports/readings${buildQuery({
                from: historyState.from,
                to: historyState.to,
            })}`;
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            try {
                await downloadAuthenticatedFile(pdfUrl, `consumption-history-${historyPeriod}.pdf`);
                showToast('Consumption history PDF exported successfully.');
            } catch (error) {
                if (!handleAuthFailure(error)) showToast('Could not export the consumption history PDF.', 'error');
            } finally {
                button.disabled = false;
                button.removeAttribute('aria-busy');
            }
        });
    });

    refreshButton?.addEventListener('click', () => {
        if (page === 'household') {
            dashboardCacheForceNetwork = true;
            loadDashboard({ manual: true });
        }

    });

    householdAnalyticsRange?.addEventListener('change', () => {
        setHouseholdCustomRangeOpen(householdAnalyticsRange.value === 'custom');
        householdAnalyticsLoadedRange = '';
        if (householdAnalyticsRange.value === 'custom'
            && (!householdAnalyticsFrom?.value || !householdAnalyticsTo?.value)) return;
        loadDashboard();
    });

    householdAnalyticsRange?.addEventListener('pointerdown', () => {
        setHouseholdCustomRangeOpen(false);
    });

    householdAnalyticsCustomToggle?.addEventListener('click', () => {
        if (householdAnalyticsRange.value !== 'custom') {
            householdAnalyticsRange.value = 'custom';
            householdAnalyticsLoadedRange = '';
        }
        setHouseholdCustomRangeOpen(householdAnalyticsCustom.hidden);
    });

    [householdAnalyticsFrom, householdAnalyticsTo].forEach((input) => input?.addEventListener('change', () => {
        householdAnalyticsLoadedRange = '';
        if (!householdAnalyticsFrom?.value || !householdAnalyticsTo?.value) return;
        if (householdAnalyticsFrom.value > householdAnalyticsTo.value) {
            setDashboardFeedback('The start date must be before the end date.', 'error');
            return;
        }
        loadDashboard();
    }));

    document.addEventListener('click', (event) => {
        const rangeControl = householdAnalyticsRange?.closest('.analytics-range-control');
        if (!rangeControl || rangeControl.contains(event.target) || householdAnalyticsRange?.value !== 'custom') return;
        setHouseholdCustomRangeOpen(false);
    });

    adminAnalyticsRange?.addEventListener('change', () => {
        updateCustomAnalyticsRange(adminAnalyticsRange, adminAnalyticsCustom);
        if (adminAnalyticsRange.value === 'custom' && (!adminAnalyticsFrom?.value || !adminAnalyticsTo?.value)) return;
        loadAdmin();
    });

    [adminAnalyticsFrom, adminAnalyticsTo].forEach((input) => input?.addEventListener('change', () => {
        if (adminAnalyticsRange?.value === 'custom' && (!adminAnalyticsFrom?.value || !adminAnalyticsTo?.value)) return;
        loadAdmin();
    }));

    consumptionGoalForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const feedback = $('[data-goal-feedback]');
        try {
            const values = Object.fromEntries(new FormData(consumptionGoalForm).entries());
            const response = await requestJson('/api/consumption-goal', { method: 'PUT', body: JSON.stringify(values) });
            renderGoalForecast(response.data);
            if (feedback) { feedback.hidden = false; feedback.textContent = response.message; }
            showToast(response.message);
        } catch (error) {
            if (feedback) { feedback.hidden = false; feedback.textContent = errorMessage(error, 'Could not save this goal.'); feedback.classList.add('is-error'); }
        }
    });
    consumptionGoalForm?.elements?.month?.addEventListener('change', loadConsumptionGoal);

    const syncServiceRequestBillingStatement = () => {
        if (!serviceRequestForm) return;
        const field = $('[data-request-statement-field]', serviceRequestForm);
        const category = serviceRequestForm.elements.category?.value;
        const isBillingRequest = category === 'billing_question' || category === 'billing_dispute';
        if (field) field.hidden = !isBillingRequest;
        if (!isBillingRequest && serviceRequestForm.elements.billing_statement_id) {
            serviceRequestForm.elements.billing_statement_id.value = '';
        }
    };

    syncServiceRequestBillingStatement();
    serviceRequestForm?.elements.category?.addEventListener('change', syncServiceRequestBillingStatement);

    serviceRequestForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const feedback = $('[data-service-request-feedback]');
        const submit = $('button[type="submit"]', serviceRequestForm);
        submit && (submit.disabled = true);
        try {
            const values = Object.fromEntries(new FormData(serviceRequestForm).entries());
            if (!values.billing_statement_id) delete values.billing_statement_id;
            const response = await requestJson('/api/service-requests', { method: 'POST', body: JSON.stringify(values) });
            serviceRequestForm.reset();
            syncServiceRequestBillingStatement();
            if (feedback) { feedback.hidden = false; feedback.classList.remove('is-error'); feedback.textContent = `${response.message} Reference: ${response.data.reference_number}`; }
            showToast(response.message);
            await loadHouseholdServiceRequests();
        } catch (error) {
            if (feedback) { feedback.hidden = false; feedback.classList.add('is-error'); feedback.textContent = errorMessage(error, 'Could not submit this request.'); }
        } finally {
            submit && (submit.disabled = false);
        }
    });
    const householdRequestList = $('[data-service-request-list]');
    householdRequestList?.addEventListener('click', async (event) => {
        if (event.target.closest('[data-request-back]')) return loadHouseholdServiceRequests();
        const button = event.target.closest('[data-request-open]');
        if (!button) return;
        try {
            const response = await requestJson(`/api/service-requests/${button.dataset.requestOpen}`);
            renderHouseholdServiceRequestDetail(response.data);
        } catch (error) {
            if (!handleAuthFailure(error)) showToast('Could not open this request.', 'error');
        }
    });
    householdRequestList?.addEventListener('submit', async (event) => {
        const form = event.target.closest('[data-household-request-reply]');
        if (!form) return;
        event.preventDefault();
        try {
            const response = await requestJson(`/api/service-requests/${form.dataset.householdRequestReply}/messages`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
            renderHouseholdServiceRequestDetail(response.data);
            showToast(response.message);
        } catch (error) {
            if (!handleAuthFailure(error)) showToast(errorMessage(error, 'Could not send your reply.'), 'error');
        }
    });
    $('[data-refresh-service-requests]')?.addEventListener('click', loadHouseholdServiceRequests);

    notificationPreferencesForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const feedback = $('[data-preferences-feedback]');
        const values = Object.fromEntries(new FormData(notificationPreferencesForm).entries());
        const regularNotifications = notificationPreferencesForm.elements.regular_notifications.checked;
        ['announcements', 'billing_updates', 'consumption_alerts', 'service_request_updates'].forEach((name) => { values[name] = regularNotifications; });
        ['leak_alerts', 'low_bandwidth_mode'].forEach((name) => { values[name] = notificationPreferencesForm.elements[name].checked; });
        try {
            const response = await requestJson('/api/notification-preferences', { method: 'PUT', body: JSON.stringify(values) });
            applyLocale(response.data.preferred_locale);
            applyLowBandwidthMode(response.data.low_bandwidth_mode === true);
            if (feedback) { feedback.hidden = false; feedback.classList.remove('is-error'); feedback.textContent = response.message; }
            showToast(response.message);
        } catch (error) {
            if (feedback) { feedback.hidden = false; feedback.classList.add('is-error'); feedback.textContent = errorMessage(error, 'Could not save preferences.'); }
        }
    });

    $('[data-download-latest-statement]')?.addEventListener('click', async (event) => {
        const id = event.currentTarget.dataset.statementId;
        if (!id) return;
        try { await downloadAuthenticatedFile(`/api/billing-statements/${id}/document`, 'billing-statement.pdf'); } catch { showToast('Could not download the statement.', 'error'); }
    });
    $('[data-install-app]')?.addEventListener('click', async (event) => {
        if (!installPromptEvent) return;
        await installPromptEvent.prompt();
        await installPromptEvent.userChoice;
        installPromptEvent = null;
        event.currentTarget.hidden = true;
    });
    $('[data-billing-history]')?.addEventListener('click', async (event) => {
        const statement = event.target.closest('[data-download-statement]');
        const receipt = event.target.closest('[data-download-receipt]');
        if (!statement && !receipt) return;
        try {
            if (statement) await downloadAuthenticatedFile(`/api/billing-statements/${statement.dataset.downloadStatement}/document`, 'billing-statement.pdf');
            if (receipt) await downloadAuthenticatedFile(`/api/billing-payments/${receipt.dataset.downloadReceipt}/receipt`, 'payment-receipt.pdf');
        } catch { showToast('Could not download this billing document.', 'error'); }
    });
    $('[data-household-payment-form]')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const statementId = form.elements.billing_statement_id.value;
        const feedback = $('[data-household-payment-feedback]');
        if (!statementId) return;
        try {
            const headers = authHeaders();
            delete headers['Content-Type'];
            const response = await fetch(`/api/billing-statements/${statementId}/payment-submissions`, { method: 'POST', headers, body: new FormData(form) });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message ?? 'Could not submit payment.');
            form.reset();
            if (feedback) { feedback.hidden = false; feedback.classList.remove('is-error'); feedback.textContent = payload.message; }
            showToast(payload.message);
            await loadHouseholdBilling({ force: true });
        } catch (error) {
            if (feedback) { feedback.hidden = false; feedback.classList.add('is-error'); feedback.textContent = errorMessage(error, 'Could not submit payment.'); }
        }
    });

    const clearNotificationsButton = $('[data-clear-notifications]');
    clearNotificationsButton?.addEventListener('click', async () => {
        if (notificationMutationInFlight) return;

        const previousNotifications = householdNotifications;
        notificationMutationInFlight = true;
        notificationMutationVersion++;
        applyHouseholdNotifications(previousNotifications.map((notification) => ({ ...notification, is_read: true })));

        try {
            const response = await requestJson('/api/notifications/read-all', { method: 'PATCH' });
            showToast(response.message ?? 'Notifications marked as read.');
        } catch (error) {
            applyHouseholdNotifications(previousNotifications);
            if (!handleAuthFailure(error)) showToast(errorMessage(error, 'Could not mark notifications as read.'), 'error');
        } finally {
            notificationMutationInFlight = false;
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    bootCommon();

    if (page === 'home') {
        bootHomeSessionActions();
    }

    if (page === 'login') {
        bootLoginPage();
        return;
    }

    if (page === 'household') {
        if (!readToken()) {
            safeRedirect('/login');
            return;
        }

        const initialHouseholdView = window.location.hash.replace('#', '') || 'dashboard';
        const householdViewExists = Boolean($(`[data-household-view="${initialHouseholdView}"]`));
        showHouseholdView(householdViewExists ? initialHouseholdView : 'dashboard');
        return;
    }

    if (page === 'admin') {
        if (!readToken()) {
            setStatus('Redirecting to login');
            safeRedirect('/login');
            return;
        }

        loadAdmin();
        const initialAdminView = window.location.hash.replace('#', '') || 'admin-dashboard';
        const adminViewExists = Boolean($(`[data-admin-view="${initialAdminView}"]`));
        showAdminView(adminViewExists ? initialAdminView : 'admin-dashboard', false);
        return;
    }

    if (page === 'landing' && readToken()) {
        redirectToRoleHome();
    }
});

window.addEventListener('pagehide', () => {
    stopDashboardPolling();
    stopAdminDevicePolling();
    stopAdminLeakPolling();
});
