@extends('layouts.app')

@section('title', 'Household | SmartWater')
@section('page', 'household')
@section('app-header-actions')
    <div class="household-header-actions" aria-label="Household account actions">
        <button class="household-menu-button" type="button" data-household-sidebar-toggle aria-expanded="false" aria-controls="household-sidebar">Menu</button>
        <div class="household-notification-control" data-notification-control>
            <button class="header-action-button household-notification-button" type="button" data-notification-toggle aria-haspopup="dialog" aria-expanded="false" aria-controls="household-notification-dropdown" aria-label="Open notifications">
                <i class="bi bi-bell" aria-hidden="true"></i>
                <span>Notifications</span>
                <span class="header-action-count" data-household-alert-count aria-hidden="true" hidden></span>
            </button>
            <section class="household-notification-dropdown" id="household-notification-dropdown" data-notification-dropdown role="dialog" aria-label="Recent notifications" hidden>
                <header class="notification-dropdown-header">
                    <div>
                        <strong>Notifications</strong>
                        <small data-notification-dropdown-summary>No unread messages</small>
                    </div>
                    <span class="notification-live-dot" aria-hidden="true"></span>
                </header>
                <div class="notification-dropdown-list" data-notification-dropdown-list>
                    <div class="notification-dropdown-empty">Loading notifications...</div>
                </div>
                <button class="notification-dropdown-footer" type="button" data-household-nav="notifications">View all notifications</button>
            </section>
        </div>
        <button class="household-account-menu" type="button" data-household-nav="settings" aria-label="Open account settings">
            <i class="bi bi-person-circle" aria-hidden="true"></i>
            <span data-account-role>Household User</span>
        </button>
        @include('components.theme-toggle', ['class' => 'site-theme-toggle'])
    </div>
@endsection

@section('household-sidebar')
    <div class="household-sidebar-brand">
        <span class="household-sidebar-mark" aria-hidden="true"></span>
        <div class="household-sidebar-brand-copy">
            <strong data-profile-name>Household account</strong>
            <small>Household workspace</small>
        </div>
        <button class="household-sidebar-collapse" type="button" data-household-sidebar-collapse aria-controls="household-sidebar" aria-expanded="true" aria-label="Collapse sidebar" title="Collapse sidebar">@include('components.ui-icon', ['name' => 'sidebar-collapse'])</button>
    </div>
    <nav class="sidebar-nav household-sidebar-nav" aria-label="Household sections">
        <span class="sidebar-section-title">Workspace</span>
        <button type="button" class="is-active" data-household-nav="dashboard" aria-current="page" title="Dashboard"><span>@include('components.ui-icon', ['name' => 'dashboard']) <span class="sidebar-nav-label">Dashboard</span></span></button>
        <button type="button" data-household-nav="live-monitoring" title="Live Monitoring"><span>@include('components.ui-icon', ['name' => 'monitoring']) <span class="sidebar-nav-label">Live Monitoring</span></span></button>
        <button type="button" data-household-nav="history" title="Consumption History"><span>@include('components.ui-icon', ['name' => 'history']) <span class="sidebar-nav-label">Consumption History</span></span></button>
        <button type="button" data-household-nav="billing" title="My Bill"><span>@include('components.ui-icon', ['name' => 'billing']) <span class="sidebar-nav-label">My Bill</span></span></button>
        <button type="button" data-household-nav="requests" title="Messages"><span><i class="bi bi-chat-square-text" aria-hidden="true"></i> <span class="sidebar-nav-label">Messages</span></span></button>
        <button type="button" data-household-nav="leak" title="Leak Detection"><span>@include('components.ui-icon', ['name' => 'leak']) <span class="sidebar-nav-label">Leak Detection</span></span></button>
        <button type="button" data-household-nav="notifications" title="Notifications"><span>@include('components.ui-icon', ['name' => 'notifications']) <span class="sidebar-nav-label">Notifications</span></span><span class="sidebar-count" data-household-alert-count aria-hidden="true" hidden></span></button>
    </nav>
    <div class="household-sidebar-account">
        <span class="subtle" data-profile-email>Signed-in household</span>
        <button class="household-sidebar-account-settings" type="button" data-household-nav="settings" title="Account Settings">
            @include('components.ui-icon', ['name' => 'settings'])
            <span>Account Settings</span>
        </button>
        <button class="household-sidebar-logout" type="button" data-logout>Logout</button>
    </div>
@endsection

@section('content')
    <section class="dashboard-view is-active" data-household-view="dashboard">
        <header class="household-dashboard-hero">
            <div class="household-dashboard-hero-copy">
                <div class="household-dashboard-eyebrow">
                    <span class="household-dashboard-pulse" aria-hidden="true"></span>
                    <span>Household workspace</span>
                </div>
                <h1>Household Dashboard</h1>
                <p>Track current water use, estimated billing, alerts, and meter status in one place.</p>
            </div>
            <div class="household-dashboard-hero-actions">
                <div class="household-dashboard-meta">
                    <span class="dashboard-feedback" data-dashboard-feedback role="status" aria-live="polite" hidden></span>
                    <span class="status-pill" data-dashboard-live-state>Checking meter</span>
                    <span class="dashboard-updated" data-last-updated-label>Last updated: Waiting for data</span>
                </div>
            </div>
        </header>

        <section class="household-start-panel" aria-labelledby="household-start-title">
            <div class="household-start-copy">
                <span class="household-start-icon" aria-hidden="true">@include('components.ui-icon', ['name' => 'dashboard'])</span>
                <div>
                    <p class="eyebrow">Start here</p>
                    <h2 id="household-start-title">What would you like to do?</h2>
                    <p>Jump to the most common household tasks without searching through the workspace.</p>
                </div>
            </div>
            <div class="household-start-actions" aria-label="Common household actions">
                <button class="household-start-action is-primary" type="button" data-household-nav="live-monitoring">
                    @include('components.ui-icon', ['name' => 'monitoring'])
                    <span><strong>Check live usage</strong><small>See current flow and readings</small></span>
                </button>
                <button class="household-start-action" type="button" data-household-nav="billing">
                    @include('components.ui-icon', ['name' => 'billing'])
                    <span><strong>Review my bill</strong><small>View estimate and statements</small></span>
                </button>
                <button class="household-start-action is-attention" type="button" data-household-nav="requests">
                    <i class="bi bi-chat-square-text" aria-hidden="true"></i>
                    <span><strong>Get help or report an issue</strong><small>Message the municipal team</small></span>
                </button>
            </div>
        </section>

        <section class="household-kpi-grid household-kpi-overview metric-overview-grid" aria-label="Household summary">
            <article class="metric-card metric-card-primary">
                <div class="metric-card-top">
                    <div class="metric-card-heading">
                        <span class="metric-card-icon" aria-hidden="true">@include('components.ui-icon', ['name' => 'flow'])</span>
                        <h3 class="metric-card-label">Current flow rate</h3>
                    </div>
                    <span class="metric-card-badge" data-flow-badge>Checking</span>
                </div>
                <strong data-current-flow>Loading latest reading…</strong>
                <small data-flow-state>Reading the connected meter.</small>
            </article>
            @include('components.household.consumption-card')
            <article class="metric-card metric-card-primary">
                <div class="metric-card-top">
                    <div class="metric-card-heading">
                        <span class="metric-card-icon" aria-hidden="true">@include('components.ui-icon', ['name' => 'billing'])</span>
                        <h3 class="metric-card-label">Estimated bill</h3>
                    </div>
                    <span class="metric-card-badge" data-billing-badge>Estimated</span>
                </div>
                <strong class="amber" data-estimated-bill>Loading…</strong>
                <small data-billing-state>Using the active water rate.</small>
            </article>
            <article class="metric-card">
                <div class="metric-card-top">
                    <div class="metric-card-heading">
                        <span class="metric-card-icon" aria-hidden="true">@include('components.ui-icon', ['name' => 'safety'])</span>
                        <h3 class="metric-card-label">Leak status</h3>
                    </div>
                </div>
                <strong class="mint" data-leak-summary>Loading…</strong>
                <small data-leak-state>Checking the latest reading.</small>
            </article>
        </section>

        <section class="household-dashboard-grid">
            @include('components.household.consumption-trend')

            <article class="panel system-status-panel">
                <div class="panel-head">
                    <div>
                        <p class="eyebrow">System status</p>
                        <h2>Meter and service health</h2>
                    </div>
                </div>
                <div class="system-status-list">
                    <div class="system-status-item"><span>Water meter</span><strong data-system-water-meter>Loading…</strong></div>
                    <div class="system-status-item"><span>Monitoring</span><strong data-system-monitoring>Loading…</strong></div>
                    <div class="system-status-item"><span>Wi-Fi</span><strong data-system-wifi>Loading…</strong></div>
                    <div class="system-status-item"><span>Server</span><strong data-system-server>Loading…</strong></div>
                    <div class="system-status-item"><span>Leak status</span><strong data-system-leak>Loading…</strong></div>
                    <div class="system-status-item"><span>Last updated</span><strong data-last-updated>Waiting for data</strong></div>
                </div>
            </article>
        </section>

        <details class="household-dashboard-details">
            <summary>
                <span>
                    <strong>More dashboard details</strong>
                    <small>Usage comparison, meter activity, and recent readings</small>
                </span>
                <span class="household-dashboard-details-toggle" aria-hidden="true">Show</span>
            </summary>

            <article class="panel household-goal-card">
                <div class="panel-head">
                    <div>
                        <p class="eyebrow">Monthly water-use goal</p>
                        <h2>Set a target and stay on track</h2>
                        <p class="field-hint">We estimate your end-of-month usage from your current meter readings.</p>
                    </div>
                    <span class="status-pill" data-goal-status>Goal not set</span>
                </div>
                <form class="household-goal-form" data-consumption-goal-form>
                    <input type="hidden" name="month">
                    <label>
                        <span>Monthly target (liters)</span>
                        <input type="number" name="target_liters" min="1" step="1" inputmode="numeric" placeholder="Example: 10000" required>
                    </label>
                    <button class="button button-primary" type="submit">Save goal</button>
                    <div class="form-feedback" data-goal-feedback role="status" aria-live="polite" hidden></div>
                </form>
                <div class="household-goal-progress" data-goal-progress>
                    <div class="dashboard-empty-state"><strong>Loading goal...</strong></div>
                </div>
            </article>

            <section class="household-secondary-metrics" aria-label="Additional household status">
                <article class="metric-card">
                    <div class="metric-card-top">
                        <div class="metric-card-heading">
                            <span class="metric-card-icon" aria-hidden="true">@include('components.ui-icon', ['name' => 'connection'])</span>
                            <h3 class="metric-card-label">Meter connection</h3>
                        </div>
                        <span class="metric-card-badge metric-card-badge-neutral" data-connection-badge>Checking</span>
                    </div>
                    <strong data-connection-summary>Loading…</strong>
                    <small data-connection-state>Checking meter and server connectivity.</small>
                </article>
                <article class="metric-card">
                    <div class="metric-card-top">
                        <div class="metric-card-heading">
                            <span class="metric-card-icon" aria-hidden="true">@include('components.ui-icon', ['name' => 'notifications'])</span>
                            <h3 class="metric-card-label">Notifications</h3>
                        </div>
                    </div>
                    <strong class="rose" data-stat-alerts>Loading…</strong>
                    <small data-notification-state>Checking your notification inbox.</small>
                </article>
            </section>

        <article class="panel side-card household-analytics-card">
            <div class="panel-head household-analytics-head">
                <div>
                    <p class="eyebrow">Selected-period analytics</p>
                    <h2>Usage comparison and meter history</h2>
                </div>
                <span class="analytics-timezone"><span>Timezone</span><strong data-household-analytics-timezone>UTC</strong></span>
            </div>

            <dl class="analytics-period-summary">
                <div class="analytics-period-icon">@include('components.ui-icon', ['name' => 'calendar'])</div>
                <div class="analytics-period-copy">
                    <dt>Selected period</dt>
                    <dd data-household-analytics-period>Waiting for data</dd>
                </div>
            </dl>

            <div class="analytics-summary-groups">
                <section class="analytics-summary-group" aria-labelledby="analytics-usage-title">
                    <div class="analytics-group-heading">
                        <span class="analytics-group-icon">@include('components.ui-icon', ['name' => 'usage'])</span>
                        <div><h3 id="analytics-usage-title">Usage snapshot</h3><p>Consumption and cost for this range</p></div>
                    </div>
                    <dl class="analytics-metric-list">
                        <div><dt>Latest day</dt><dd data-household-daily-consumption>--</dd></div>
                        <div><dt>Latest week</dt><dd data-household-weekly-consumption>--</dd></div>
                        <div><dt>Latest month</dt><dd data-household-monthly-consumption>--</dd></div>
                        <div><dt>Estimated bill</dt><dd data-household-analytics-bill>--</dd></div>
                    </dl>
                </section>
                <section class="analytics-summary-group" aria-labelledby="analytics-comparison-title">
                    <div class="analytics-group-heading">
                        <span class="analytics-group-icon">@include('components.ui-icon', ['name' => 'history'])</span>
                        <div><h3 id="analytics-comparison-title">Period comparison</h3><p>How this range compares over time</p></div>
                    </div>
                    <dl class="analytics-metric-list">
                        <div><dt>Previous period usage</dt><dd data-household-previous-period>--</dd></div>
                        <div><dt>Change from previous</dt><dd data-household-period-comparison>--</dd></div>
                        <div><dt>Highest usage day</dt><dd data-household-highest-usage>--</dd></div>
                    </dl>
                </section>
                <section class="analytics-summary-group" aria-labelledby="analytics-meter-title">
                    <div class="analytics-group-heading">
                        <span class="analytics-group-icon">@include('components.ui-icon', ['name' => 'safety'])</span>
                        <div><h3 id="analytics-meter-title">Meter activity</h3><p>Reading health and leak signals</p></div>
                    </div>
                    <dl class="analytics-metric-list">
                        <div><dt>Leak warnings</dt><dd data-household-leak-warning-count>--</dd></div>
                        <div><dt>Last successful reading</dt><dd data-household-last-reading>--</dd></div>
                    </dl>
                </section>
            </div>
        </article>

        <section class="household-activity-grid">
            <article class="panel activity-panel">
                <div class="panel-head">
                    <div>
                        <p class="eyebrow">Recent readings</p>
                        <h2>Latest meter activity</h2>
                    </div>
                    <button class="activity-view-all" type="button" data-household-nav="live-monitoring" aria-label="View all recent readings">View all <span aria-hidden="true">→</span></button>
                </div>
                <div class="recent-readings-list" data-recent-readings-list>
                    <div class="dashboard-empty-state is-loading">
                        <div class="loading-skeleton-card loading-skeleton-card-inline" aria-hidden="true">
                            <span class="loading-skeleton-line loading-skeleton-line-lg"></span>
                            <span class="loading-skeleton-line"></span>
                        </div>
                        <strong>Loading recent readings...</strong>
                        <span>Checking the connected meter feed and preparing the latest activity.</span>
                    </div>
                </div>
            </article>
            <article class="panel activity-panel">
                <div class="panel-head">
                    <div>
                        <p class="eyebrow">Notifications</p>
                        <h2>Recent alerts and updates</h2>
                    </div>
                    <button class="activity-view-all" type="button" data-household-nav="notifications" aria-label="View all notifications">View all <span aria-hidden="true">→</span></button>
                </div>
                <div class="notification-list dashboard-notification-list" data-dashboard-notifications-list>
                    <div class="dashboard-empty-state is-loading">
                        <div class="loading-skeleton-card loading-skeleton-card-inline" aria-hidden="true">
                            <span class="loading-skeleton-line loading-skeleton-line-lg"></span>
                            <span class="loading-skeleton-line"></span>
                        </div>
                        <strong>Loading notifications...</strong>
                        <span>Checking your latest alerts and updates before they appear here.</span>
                    </div>
                </div>
            </article>
        </section>
        </details>
    </section>

    <section class="dashboard-view" data-household-view="live-monitoring">
        <section class="panel filter-panel">
            <div>
                <p class="eyebrow">Live Water Monitoring</p>
                <h2>Real-time flow rate and consumption</h2>
            </div>
        </section>

        <article class="panel panel-table household-data-panel">
            <div class="panel-head">
                <div>
                    <p class="eyebrow">Live Feed</p>
                    <h2>Recent readings from the M5Stack device</h2>
                </div>
                <span class="status-pill" data-live-label>Offline</span>
            </div>
            <div class="table">
                <div class="table-head">
                    <span>Date</span>
                    <span>Flow rate</span>
                    <span>Consumed</span>
                    <span>Estimated bill</span>
                    <span>Status</span>
                </div>
                <div class="table-body" data-live-readings-list>
                    <div class="table-empty-state">
                        <i class="bi bi-broadcast" aria-hidden="true"></i>
                        <strong>Waiting for meter readings</strong>
                        <span>New readings will appear here when the connected meter reports.</span>
                    </div>
                </div>
            </div>
            <div class="pager" data-readings-pager></div>
        </article>

        <article class="panel chart-panel">
            <div class="panel-head">
                <div>
                    <p class="eyebrow">Monitoring Graph</p>
                    <h2>Real-time consumption trend</h2>
                </div>
                <span class="status-pill" data-live-chart-status>Offline</span>
            </div>
            <div class="live-chart-summary" aria-label="Latest live reading information">
                <div><span>Latest flow rate</span><strong data-live-latest-flow>--</strong></div>
                <div><span>Latest interval consumption</span><strong data-live-latest-interval>--</strong></div>
                <div><span>All recorded usage</span><strong data-live-total-consumption>--</strong></div>
                <div><span>Last reading</span><strong data-live-last-reading>--</strong></div>
            </div>
            <p class="live-chart-feedback" data-live-chart-feedback role="status" aria-live="polite" hidden></p>
            <div class="chart-legend" data-live-chart-legend>
                <span><i class="legend-dot usage-dot"></i>Interval consumption (L)</span>
            </div>
            <div class="usage-chart live-consumption-chart" data-live-consumption-chart>
                <div class="empty-state">No live consumption data received yet.</div>
            </div>
        </article>
    </section>

    <section class="dashboard-view" data-household-view="history">
        <div class="auth-tabs" data-history-tabs role="tablist" aria-label="Consumption history period">
            <button type="button" class="tab-button is-active" data-history-period="daily" role="tab" aria-selected="true">Daily</button>
            <button type="button" class="tab-button" data-history-period="weekly" role="tab" aria-selected="false">Weekly</button>
            <button type="button" class="tab-button" data-history-period="monthly" role="tab" aria-selected="false">Monthly</button>
        </div>

        <section class="panel filter-panel history-filter-panel">
            <header class="history-filter-header">
                <div class="history-filter-heading">
                    <span class="history-filter-heading-icon" aria-hidden="true"><i class="bi bi-graph-up-arrow"></i></span>
                    <div>
                        <p class="eyebrow">Consumption History</p>
                        <h2>Track usage, trends, and billing estimates</h2>
                        <p>Refine your records by date, then export the current view.</p>
                    </div>
                </div>
                <div class="history-export-actions" aria-label="Export consumption history">
                    <button class="button button-secondary" type="button" data-history-export-csv><i class="bi bi-filetype-csv" aria-hidden="true"></i><span>Export CSV</span></button>
                    <button class="button button-secondary" type="button" data-history-export-pdf><i class="bi bi-file-earmark-pdf" aria-hidden="true"></i><span>Export PDF</span></button>
                </div>
            </header>
            <form class="history-filter-form" data-history-filters>
                <label class="history-filter-field">
                    <span>From date</span>
                    <span class="history-filter-control"><i class="bi bi-calendar3" aria-hidden="true"></i><input type="date" name="from"></span>
                </label>
                <label class="history-filter-field">
                    <span>To date</span>
                    <span class="history-filter-control"><i class="bi bi-calendar-check" aria-hidden="true"></i><input type="date" name="to"></span>
                </label>
                <label class="history-filter-field history-filter-rows">
                    <span>Rows</span>
                    <span class="history-filter-control"><i class="bi bi-list-ul" aria-hidden="true"></i><select name="per_page"><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></span>
                </label>
                <div class="history-filter-buttons">
                    <button class="button button-primary" type="submit"><i class="bi bi-funnel" aria-hidden="true"></i><span>Apply filters</span></button>
                </div>
            </form>
        </section>

        <section class="household-kpi-grid history-summary-grid metric-overview-grid" aria-label="Consumption summary">
            <article class="metric-card">
                <div class="metric-card-top"><span class="metric-card-icon" aria-hidden="true"><i class="bi bi-clock-history"></i></span><span class="metric-card-badge metric-card-badge-neutral">24 hours</span></div>
                <span class="metric-card-label">Today’s usage</span>
                <strong data-history-today-usage>Loading…</strong>
                <small>Consumption in the last 24 hours</small>
            </article>
            <article class="metric-card">
                <div class="metric-card-top"><span class="metric-card-icon" aria-hidden="true"><i class="bi bi-calendar-week"></i></span><span class="metric-card-badge metric-card-badge-neutral">Week</span></div>
                <span class="metric-card-label">This week</span>
                <strong data-history-week-usage>Loading…</strong>
                <small>Usage since the week started</small>
            </article>
            <article class="metric-card">
                <div class="metric-card-top"><span class="metric-card-icon" aria-hidden="true"><i class="bi bi-calendar3"></i></span><span class="metric-card-badge metric-card-badge-neutral">Month</span></div>
                <span class="metric-card-label">This month</span>
                <strong data-history-month-usage>Loading…</strong>
                <small>Usage since the month started</small>
            </article>
            <article class="metric-card metric-card-primary">
                <div class="metric-card-top"><span class="metric-card-icon" aria-hidden="true"><i class="bi bi-receipt"></i></span><span class="metric-card-badge">Estimate</span></div>
                <span class="metric-card-label">Estimated bill</span>
                <strong class="amber" data-history-estimated-bill>Loading…</strong>
                <small>Based on the active billing rate</small>
            </article>
            <article class="metric-card">
                <div class="metric-card-top"><span class="metric-card-icon" aria-hidden="true"><i class="bi bi-speedometer2"></i></span><span class="metric-card-badge metric-card-badge-neutral">Average</span></div>
                <span class="metric-card-label">Average daily usage</span>
                <strong data-history-average-usage>Loading…</strong>
                <small>Across the selected range</small>
            </article>
        </section>

        <article class="panel chart-panel">
            <div class="panel-head">
                <div>
                    <p class="eyebrow">Trend</p>
                    <h2>Consumption over time</h2>
                </div>
                <span class="panel-context" data-history-period-label>Daily trend</span>
            </div>
            <div class="usage-chart" data-history-chart>
                <div class="chart-empty-state">Loading consumption trend…</div>
            </div>
        </article>

        <article class="panel panel-table household-data-panel">
            <div class="panel-head">
                <div>
                    <p class="eyebrow">Usage records</p>
                    <h2>Meter readings and aggregated totals</h2>
                </div>
            </div>
            <div class="table">
                <div class="table-head" data-history-table-head>
                    <span>Period</span>
                    <span>Total liters</span>
                    <span>Total m³</span>
                    <span>Estimated bill</span>
                    <span>Status</span>
                </div>
                <div class="table-body" data-history-list>
                    <div class="table-empty-state">
                        <i class="bi bi-bar-chart-line" aria-hidden="true"></i>
                        <strong>No usage records yet</strong>
                        <span>Aggregated totals will appear after the meter submits readings.</span>
                    </div>
                </div>
            </div>
            <div class="pager" data-history-pager></div>
        </article>
    </section>

    <section class="dashboard-view household-billing-view" data-household-view="billing">
        <section class="panel household-billing-header">
            <div class="household-billing-heading">
                <span class="history-filter-heading-icon" aria-hidden="true"><i class="bi bi-receipt-cutoff"></i></span>
                <div>
                    <p class="eyebrow">Estimated Billing</p>
                    <h1>Current Billing Estimate</h1>
                    <p>Review your current estimate based on the latest recorded water usage and active rate.</p>
                </div>
            </div>
            <div class="household-billing-header-meta">
                <span class="status-chip status-chip-muted" data-household-billing-state>Loading billing details...</span>
                <span class="billing-period-label" data-household-billing-period>Current billing period</span>
            </div>
        </section>

        <section class="household-billing-summary billing-summary-grid metric-overview-grid" data-household-billing-summary aria-label="Current billing summary">
            <article class="metric-card metric-card-primary">
                <div class="metric-card-top"><span class="metric-card-icon" aria-hidden="true"><i class="bi bi-receipt"></i></span><span class="metric-card-badge">Estimate</span></div>
                <span class="metric-card-label">Current charge</span>
                <strong data-billing-current-charge>--</strong>
                <small data-billing-record-type>Estimate pending</small>
            </article>
            <article class="metric-card">
                <div class="metric-card-top"><span class="metric-card-icon" aria-hidden="true"><i class="bi bi-droplet-half"></i></span><span class="metric-card-badge metric-card-badge-neutral">Usage</span></div>
                <span class="metric-card-label">Consumption</span>
                <strong data-billing-consumption>--</strong>
                <small data-billing-reading-count>Readings pending</small>
            </article>
            <article class="metric-card">
                <div class="metric-card-top"><span class="metric-card-icon" aria-hidden="true"><i class="bi bi-speedometer2"></i></span><span class="metric-card-badge metric-card-badge-neutral">Rate</span></div>
                <span class="metric-card-label">Applicable rate</span>
                <strong class="amber" data-billing-rate>--</strong>
                <small data-billing-rate-effective>Effective rate</small>
            </article>
            <article class="metric-card">
                <div class="metric-card-top"><span class="metric-card-icon" aria-hidden="true"><i class="bi bi-wallet2"></i></span><span class="metric-card-badge metric-card-badge-neutral">Balance</span></div>
                <span class="metric-card-label">Current balance</span>
                <strong data-billing-balance>--</strong>
                <small>Finalized balance when available</small>
            </article>
            <article class="metric-card" data-payment-status-card>
                <div class="metric-card-top"><span class="metric-card-icon" aria-hidden="true"><i class="bi bi-check2-circle"></i></span><span class="metric-card-badge metric-card-badge-neutral" data-payment-status-badge>Payment</span></div>
                <span class="metric-card-label">Payment status</span>
                <strong data-payment-status>--</strong>
                <small data-payment-status-detail>Official status appears after verification.</small>
            </article>
        </section>

        <section class="panel household-billing-calculation">
            <div class="panel-head"><div><p class="eyebrow">Payment instructions</p><h2>Pay at the municipal water office</h2></div></div>
            <p class="field-hint">Bring your statement number to the municipal water office. Authorized staff will accept your cash payment, issue an official receipt, and update this page immediately.</p>
        </section>

        <section class="household-billing-grid">
            <article class="panel household-billing-calculation">
                <div class="panel-head">
                    <div><p class="eyebrow">Billing breakdown</p><h2>How your estimated bill is calculated</h2></div>
                    <span class="status-chip status-chip-muted" data-billing-type-chip>Estimated</span>
                </div>
                <div class="billing-calculation-list" data-billing-calculation>
                    <div class="billing-empty-state">
                        <span class="billing-empty-icon" aria-hidden="true"><i class="bi bi-calculator"></i></span>
                        <div><strong>Preparing your estimate</strong><span>Billing details will appear when the calculation is ready.</span></div>
                    </div>
                </div>
                <div class="billing-explanation">
                    <i class="bi bi-info-circle" aria-hidden="true"></i>
                    <span data-billing-explanation>Billing details will appear when the account has a valid rate and billable reading.</span>
                </div>
            </article>

            <article class="panel household-billing-reading">
                <div class="panel-head">
                    <div><p class="eyebrow">Meter information</p><h2>Assigned water meter</h2></div>
                    <span class="panel-context"><i class="bi bi-cpu" aria-hidden="true"></i></span>
                </div>
                <div class="billing-meter-summary" data-billing-meter>
                    <div class="billing-empty-state">
                        <span class="billing-empty-icon" aria-hidden="true"><i class="bi bi-cpu"></i></span>
                        <div><strong>Loading meter details</strong><span>Checking the device assigned to this account.</span></div>
                    </div>
                </div>
                <dl class="summary-list billing-latest-reading" data-billing-latest-reading>
                    <div class="billing-reading-empty">
                        <i class="bi bi-activity" aria-hidden="true"></i>
                        <div><strong>Waiting for the latest reading</strong><span>Live meter details will appear here automatically.</span></div>
                    </div>
                </dl>
            </article>
        </section>

        <section class="panel app-table-card household-billing-history">
            <div class="panel-head app-table-card-header">
                <div>
                    <p class="eyebrow">Billing History</p>
                    <h2>Finalized statements</h2>
                </div>
                <button type="button" class="button button-ghost" data-download-latest-statement disabled aria-label="Download latest billing statement">
                    Download Statements
                </button>
            </div>

            <div class="table-wrap">
                <table class="data-table billing-history-table">
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>Consumption</th>
                            <th>Charge</th>
                            <th>Balance</th>
                            <th>Status</th>
                            <th>Documents</th>
                        </tr>
                    </thead>
                    <tbody data-billing-history>
                        <tr>
                            <td colspan="6">
                                <div class="empty-state table-empty-state">
                                    <i class="bi bi-receipt-cutoff" aria-hidden="true"></i>
                                    <strong>No finalized bills yet</strong>
                                    <span>We’ll automatically display your official monthly billing statements here.</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

    </section>

    <section class="dashboard-view" data-household-view="leak">
        <article class="panel side-card household-status-panel">
            <div class="household-section-heading">
                <span class="household-section-icon" aria-hidden="true"><i class="bi bi-shield-check"></i></span>
                <div><p class="eyebrow">Leak detection</p><h2>Status and response</h2><p>Review the latest meter signal and configured safety threshold.</p></div>
            </div>
            <div class="leak-banner">
                <span class="status-chip status-chip-soft" data-leak-status>Normal</span>
                <span class="subtle" data-leak-details>No leak has been detected yet.</span>
            </div>
            <dl class="summary-list">
                <div>
                    <dt>Current flow rate</dt>
                    <dd data-current-flow>-- L/min</dd>
                </div>
                <div>
                    <dt>Leak threshold</dt>
                    <dd data-leak-threshold>--</dd>
                </div>
                <div>
                    <dt>Last updated</dt>
                    <dd data-last-updated>--</dd>
                </div>
            </dl>
        </article>
    </section>

    <section class="dashboard-view" data-household-view="notifications">
        <article class="panel side-card household-notifications-panel">
            <div class="notification-head">
                <div class="household-section-heading">
                    <span class="household-section-icon" aria-hidden="true"><i class="bi bi-bell"></i></span>
                    <div><p class="eyebrow">Notifications</p><h2>Inbox and service updates</h2><p>Important account, billing, and meter alerts appear here.</p></div>
                </div>
                <button type="button" class="button button-secondary" data-clear-notifications disabled>Mark all as read</button>
            </div>
            <div class="notification-list" data-notifications-list>
                <div class="notification-page-empty">
                    <i class="bi bi-bell-slash" aria-hidden="true"></i>
                    <strong>No notifications yet</strong>
                    <span>New alerts and service updates will appear here automatically.</span>
                </div>
            </div>
        </article>
    </section>

    <section class="dashboard-view" data-household-view="requests">
        <header class="feature-page-header">
            <div><p class="eyebrow">Household communication</p><h1>Messages</h1><p>Send a billing, account, water-service, or inspection concern to the administrator and follow the response.</p></div>
            <span class="status-chip status-chip-muted" data-request-summary>Loading messages</span>
        </header>
        <div class="resident-feature-grid service-request-grid">
            <article class="panel resident-feature-card">
                <div class="panel-head"><div><p class="eyebrow">New message</p><h2>How can we help?</h2></div><i class="bi bi-send" aria-hidden="true"></i></div>
                <form class="stack-form" data-service-request-form>
                    <label>Category<select name="category" required><option value="billing_question">Billing question</option><option value="billing_dispute">Billing dispute</option><option value="suspected_leak">Suspected leak</option><option value="account_update">Account update</option><option value="service_interruption">Service interruption</option><option value="meter_inspection">Meter inspection request</option><option value="general_inquiry">General inquiry</option></select></label>
                    <label>Describe your concern<textarea name="description" maxlength="5000" rows="5" placeholder="Tell us what happened or what help you need." required></textarea></label>
                    <label data-request-statement-field>Related statement <span class="subtle">(optional)</span><select name="billing_statement_id" data-request-statement><option value="">Choose a statement</option></select></label>
                    <div class="form-feedback" data-service-request-feedback role="status" aria-live="polite" hidden></div>
                    <button class="button button-primary" type="submit">Send message</button>
                </form>
            </article>
            <article class="panel resident-feature-card service-request-list-card">
                <div class="panel-head"><div><p class="eyebrow">Message history</p><h2>Status and responses</h2></div><button class="link-button" type="button" data-refresh-service-requests>Refresh</button></div>
                <div class="service-request-list" data-service-request-list aria-live="polite"><div class="dashboard-empty-state is-loading"><strong>Loading messages...</strong></div></div>
            </article>
        </div>
    </section>

    <section class="dashboard-view" data-household-view="settings">
        <header class="account-settings-intro">
            <span class="account-settings-intro-icon" aria-hidden="true">@include('components.ui-icon', ['name' => 'settings'])</span>
            <div>
                <p class="eyebrow">Account settings</p>
                <h1>Manage your account</h1>
                <p>Keep your contact details current and protect your household workspace.</p>
            </div>
            <span class="status-chip status-chip-muted" data-account-profile-state>Loading account details</span>
        </header>

        <div class="account-settings-grid">
            <article class="panel account-settings-card">
                <div class="account-settings-card-head">
                    <span class="account-settings-card-icon" aria-hidden="true"><i class="bi bi-person-lines-fill"></i></span>
                    <div>
                        <p class="eyebrow">Profile</p>
                        <h2>Contact details</h2>
                        <p>Used for account notices and household support.</p>
                    </div>
                </div>

                <form class="stack-form compact-settings-form" data-account-form novalidate>
                    <label>Email address
                        <input id="account-email" type="email" name="email" autocomplete="email" placeholder="you@example.com" required>
                    </label>
                    <label>Phone number
                        <input id="account-phone" type="tel" name="phone" autocomplete="tel" placeholder="e.g. +1 607-992-7137" maxlength="50">
                    </label>
                    <div class="account-settings-form-footer">
                        <div class="form-feedback" data-account-feedback hidden role="status" aria-live="polite"></div>
                        <button class="button button-primary" type="submit" data-account-submit disabled>Save contact details</button>
                    </div>
                </form>
            </article>

            <article class="panel account-settings-card">
                <div class="account-settings-card-head">
                    <span class="account-settings-card-icon" aria-hidden="true"><i class="bi bi-shield-lock"></i></span>
                    <div>
                        <p class="eyebrow">Security</p>
                        <h2>Change password</h2>
                        <p>Use at least eight characters for a secure password.</p>
                    </div>
                </div>

                <form class="stack-form compact-settings-form" data-password-form novalidate>
                    <label>Current password
                        <input type="password" name="current_password" autocomplete="current-password" placeholder="Current password" required>
                    </label>
                    <label>New password
                        <input type="password" name="password" autocomplete="new-password" placeholder="New password" minlength="8" required>
                    </label>
                    <label>Confirm new password
                        <input type="password" name="password_confirmation" autocomplete="new-password" placeholder="Confirm new password" minlength="8" required>
                    </label>
                    <div class="account-settings-form-footer">
                        <div class="form-feedback" data-password-feedback hidden role="status" aria-live="polite"></div>
                        <button class="button button-secondary" type="submit" data-password-submit>Update password</button>
                    </div>
                </form>
            </article>

            <article class="panel account-settings-card notification-preferences-card">
                <div class="account-settings-card-head">
                    <span class="account-settings-card-icon" aria-hidden="true"><i class="bi bi-bell-slash"></i></span>
                    <div><p class="eyebrow">Household preferences</p><h2>Notifications &amp; display</h2><p>Choose regular updates, manage leak alerts, and adjust how the workspace works for you.</p></div>
                </div>
                <form class="stack-form compact-settings-form" data-notification-preferences-form>
                    <label class="preference-toggle"><input type="checkbox" name="regular_notifications"><span><strong>Regular updates</strong><small>Announcements, billing, water use, and messages</small></span></label>
                    <label class="preference-toggle preference-toggle-alert"><input type="checkbox" name="leak_alerts"><span><strong>Leak alerts</strong><small>Potential leaks and urgent meter warnings</small></span></label>
                    <div class="form-grid-two"><label>Quiet hours start<input type="time" name="quiet_hours_start"></label><label>Quiet hours end<input type="time" name="quiet_hours_end"></label></div>
                    <label>Language<select name="preferred_locale"><option value="en">English</option><option value="fil">Filipino</option></select></label>
                    <label class="admin-checkbox-field"><span>Low-bandwidth mode</span><span><input type="checkbox" name="low_bandwidth_mode"> Reduce polling and motion</span></label>
                    <button class="link-button account-install-link" type="button" data-install-app hidden>Install SmartWater on this device</button>
                    <div class="form-feedback" data-preferences-feedback role="status" aria-live="polite" hidden></div>
                    <button class="button button-primary" type="submit">Save preferences</button>
                </form>
            </article>
        </div>
    </section>
@endsection
