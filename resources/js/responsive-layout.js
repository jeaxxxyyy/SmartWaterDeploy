let householdNavigation;
let chartObserver;
const chartLayouts = new WeakMap();

export const responsiveChartWidth = (container) => {
    const style = getComputedStyle(container);
    const width = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return Math.max(160, Math.round(width || 760));
};

export const observeChartWidth = (container, redraw) => {
    if (!chartObserver) {
        chartObserver = new ResizeObserver((entries) => {
            entries.forEach(({ target }) => {
                const layout = chartLayouts.get(target);
                const width = target.clientWidth;
                if (width > 0 && width !== layout.width) {
                    layout.width = width;
                    layout.redraw();
                }
            });
        });
    }
    const existing = chartLayouts.get(container);
    chartLayouts.set(container, { width: container.clientWidth, redraw });
    if (!existing) chartObserver.observe(container);
};

export const setHouseholdNavigationOpen = (open, restoreFocus = false) => {
    householdNavigation?.setOpen(open, restoreFocus);
};

export const bootResponsiveLayout = () => {
    const isWorkspace = ['household', 'admin'].includes(document.body.dataset.page);
    const header = document.querySelector('.topbar');
    if (isWorkspace && header) {
        const measureHeader = () => {
            document.documentElement.style.setProperty('--app-header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
        };
        measureHeader();
        new ResizeObserver(measureHeader).observe(header);
    }

    // Charts, records, and comparisons also receive keyboard scrolling after data loads.
    const scrollSelector = '.table:not(table), .table-wrap, .reports-table-wrap, .usage-chart, .consumption-vertical-months, .consumption-baseline-bar-item, [data-horizontal-section-scroll]';
    const syncScrollRegion = (target) => {
        const canScroll = target.clientWidth > 0 && target.scrollWidth > target.clientWidth + 1;
        target.tabIndex = canScroll ? 0 : -1;
        target.toggleAttribute('data-has-horizontal-scroll', canScroll);
        if (canScroll) {
            target.setAttribute('role', 'region');
            if (!target.hasAttribute('aria-label')) {
                const heading = target.closest('article, section')?.querySelector('h2, h3');
                target.setAttribute('aria-label', `${heading?.textContent.trim() || 'Scrollable content'} (scroll horizontally)`);
            }
        }
        const controlsList = target.id ? document.querySelectorAll(`[data-table-scroll-controls][data-scroll-target="${target.id}"]`) : [];
        controlsList.forEach((controls) => {
            controls.hidden = !canScroll;
            controls.querySelector('[data-scroll-direction="-1"]').disabled = !canScroll || target.scrollLeft <= 1;
            controls.querySelector('[data-scroll-direction="1"]').disabled = !canScroll || target.scrollLeft + target.clientWidth >= target.scrollWidth - 1;
        });
    };
    document.querySelectorAll('[data-table-scroll-controls]').forEach((controls) => {
        controls.addEventListener('click', (event) => {
            const button = event.target.closest('[data-scroll-direction]');
            const target = document.getElementById(controls.dataset.scrollTarget);
            if (!button || !target) return;
            target.scrollBy({ left: Number(button.dataset.scrollDirection) * Math.max(160, target.clientWidth * 0.8), behavior: 'smooth' });
        });
    });
    const scrollObserver = new ResizeObserver((entries) => {
        entries.forEach(({ target }) => syncScrollRegion(target));
    });
    const observedRegions = new WeakSet();
    const registerScrollRegions = () => {
        document.querySelectorAll(scrollSelector).forEach((region) => {
            if (observedRegions.has(region)) return;
            observedRegions.add(region);
            scrollObserver.observe(region);
            region.addEventListener('scroll', () => syncScrollRegion(region), { passive: true });
        });
        document.querySelectorAll(scrollSelector).forEach(syncScrollRegion);
    };
    registerScrollRegions();
    let scanScheduled = false;
    new MutationObserver(() => {
        if (scanScheduled) return;
        scanScheduled = true;
        requestAnimationFrame(() => {
            scanScheduled = false;
            registerScrollRegions();
        });
    }).observe(document.querySelector('#main-content') || document.body, { childList: true, subtree: true });

    const sidebar = document.querySelector('[data-household-sidebar]');
    const toggle = document.querySelector('[data-household-sidebar-toggle]');
    if (!sidebar || !toggle) return;

    const mobile = window.matchMedia('(max-width: 991.98px)');
    const main = document.querySelector('#main-content');
    const focusableItems = () => [...sidebar.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]')]
        .filter((item) => !item.disabled && item.getClientRects().length > 0);

    const setOpen = (requestedOpen, restoreFocus = false) => {
        const open = mobile.matches && requestedOpen;
        sidebar.classList.toggle('is-open', open);
        sidebar.inert = mobile.matches && !open;
        toggle.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('household-navigation-open', open);
        if (main) main.inert = open;

        if (mobile.matches) {
            sidebar.setAttribute('aria-hidden', String(!open));
            sidebar.setAttribute('role', 'dialog');
            if (open) sidebar.setAttribute('aria-modal', 'true');
            else sidebar.removeAttribute('aria-modal');
        } else {
            sidebar.removeAttribute('aria-hidden');
            sidebar.removeAttribute('role');
            sidebar.removeAttribute('aria-modal');
        }

        if (open) focusableItems()[0]?.focus();
        else if (restoreFocus && mobile.matches) toggle.focus();
    };

    householdNavigation = { setOpen };
    setOpen(false);
    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
    document.querySelectorAll('[data-household-sidebar-dismiss], [data-household-sidebar-close]').forEach((button) => {
        button.addEventListener('click', () => setOpen(false, true));
    });
    mobile.addEventListener('change', () => setOpen(false, sidebar.contains(document.activeElement)));
    document.addEventListener('keydown', (event) => {
        if (!sidebar.classList.contains('is-open')) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false, true);
        } else if (event.key === 'Tab') {
            const items = focusableItems();
            const first = items[0];
            const last = items.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        }
    });
};
