<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name', 'Smart Water Monitoring') }}</title>
    @include('components.theme-init')
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    @endif
</head>
<body class="page antialiased bg-app-bg text-app-text dark:bg-app-bg dark:text-app-text">
    <div class="backdrop backdrop-a"></div>
    <div class="backdrop backdrop-b"></div>
    <div class="backdrop backdrop-c"></div>

    <main class="shell">
        <header class="panel panel-hero">
            <div class="hero-copy">
                <p class="eyebrow">Smart Water Consumption Monitoring</p>
                <h1>Household water, billing, and leak monitoring in one place.</h1>
                <p class="lede">Live readings from the M5Stack device, estimated billing, alerts, and administrative tracking aligned with the research document.</p>
            </div>

            <div class="hero-metrics">
                <div class="mini-card">
                    <span class="mini-label">Connection</span>
                    <strong data-status>Waiting for token</strong>
                    <small>Paste a Sanctum token to load dashboard data.</small>
                </div>
                <div class="mini-card">
                    <span class="mini-label">Today</span>
                    <strong class="mint" data-today-total>-- liters</strong>
                    <small>Latest current-month consumption snapshot.</small>
                </div>
            </div>
        </header>

        <section class="panel token-panel">
            <div>
                <p class="eyebrow">API Access</p>
                <h2>Connect to the live backend</h2>
                <p class="subtle">Household and administrator sessions use `/api/login`. Meter credentials are commissioned by the administrator and are never entered here.</p>
            </div>
            <div class="token-controls">
                <input
                    type="password"
                    data-token-input
                    placeholder="Paste bearer token"
                    class="token-input"
                >
                <button type="button" data-token-save class="button button-primary">Save token</button>
                <button type="button" data-refresh class="button button-ghost">Refresh</button>
            </div>
        </section>

        <section class="panel core-panel">
            <p class="eyebrow">Core Focus</p>
            <ul class="focus-list">
                <li>Real-time water usage monitoring</li>
                <li>Estimated billing and current balance</li>
                <li>Threshold and leak detection alerts</li>
                <li>Admin monitoring and reporting</li>
            </ul>
        </section>

        <section class="stat-grid">
            <article class="stat-card">
                <span class="stat-label">Readings</span>
                <strong data-stat-readings>--</strong>
                <small>Current month reading count.</small>
            </article>
            <article class="stat-card">
                <span class="stat-label">Liters</span>
                <strong class="mint" data-stat-liters>--</strong>
                <small>Total water used this month.</small>
            </article>
            <article class="stat-card">
                <span class="stat-label">Estimated Bill</span>
                <strong class="amber" data-stat-bill>--</strong>
                <small>Based on the configured rate and subsidy.</small>
            </article>
            <article class="stat-card">
                <span class="stat-label">Alerts</span>
                <strong class="rose" data-stat-alerts>--</strong>
                <small>Unread notifications and warning count.</small>
            </article>
        </section>

        <section class="content-grid">
            <article class="panel panel-table">
                <div class="panel-head">
                    <div>
                        <p class="eyebrow">Live Readings</p>
                        <h2>Recent consumption history</h2>
                    </div>
                    <span class="status-pill" data-live-label>Offline</span>
                </div>
                <div class="table">
                    <div class="table-head">
                        <span>Date</span>
                        <span>Flow</span>
                        <span>Liters</span>
                        <span>Bill</span>
                        <span>Status</span>
                    </div>
                    <div class="table-body" data-readings-list>
                        <div class="empty-state">Connect a token to load live readings.</div>
                    </div>
                </div>
            </article>

            <aside class="sidebar">
                <article class="panel side-card">
                    <p class="eyebrow">Billing Summary</p>
                    <dl class="summary-list">
                        <div>
                            <dt>Remaining balance</dt>
                            <dd data-balance>--</dd>
                        </div>
                        <div>
                            <dt>Water rate</dt>
                            <dd data-water-rate>--</dd>
                        </div>
                        <div>
                            <dt>Subsidy</dt>
                            <dd data-subsidy>--</dd>
                        </div>
                        <div>
                            <dt>Billing month</dt>
                            <dd data-billing-month>--</dd>
                        </div>
                    </dl>
                </article>

                <article class="panel side-card">
                    <p class="eyebrow">Alerts</p>
                    <div class="notification-list" data-notifications-list>
                        <div class="empty-state">No alerts loaded yet.</div>
                    </div>
                </article>
            </aside>
        </section>

        <section class="info-grid">
            <article class="panel info-card">
                <p class="eyebrow">How It Works</p>
                <h3>Device to cloud flow</h3>
                <p>The YF-S201 sensor measures flow, the ESP32 transmits readings to Laravel, and the dashboard turns those readings into billing and alerts.</p>
            </article>
            <article class="panel info-card">
                <p class="eyebrow">Admin Tools</p>
                <h3>Monitoring and control</h3>
                <p>Billing settings, user accounts, reports, and exports are exposed in the backend so utility staff can manage households centrally.</p>
            </article>
            <article class="panel info-card">
                <p class="eyebrow">API Ready</p>
                <h3>Token-based access</h3>
                <p>The dashboard uses bearer tokens, so it can support household users, admin staff, and device credentials cleanly.</p>
            </article>
        </section>
    </main>
</body>
</html>
