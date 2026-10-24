@extends('layouts.app')

@section('title', 'Smart Water Monitoring System')
@section('page', 'home')
@push('head')
    @include('components.site-meta')
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" defer></script>
@endpush
@section('home-nav')
    <a href="#home">Home</a>
    <a href="#features">Features</a>
    <a href="#about">About</a>
    <a href="#contact">Contact</a>
    <a class="nav-cta" href="{{ route('login') }}" data-home-session-action data-authenticated-label="Dashboard">
        <span data-home-session-label>Sign In</span>
        <span class="nav-cta-icon" aria-hidden="true"><i class="bi bi-arrow-right-short"></i></span>
    </a>
@endsection

@section('content')
    <section class="landing-hero" id="home" aria-labelledby="home-title">
        <div class="landing-hero-copy">
            <p class="eyebrow">Smart water, clearly managed</p>
            <h1 id="home-title">Make every drop <span>count.</span></h1>
            <p class="landing-lede">Smart Water brings live household readings, reliable billing analytics, and municipal oversight into one clear, connected platform.</p>

            <div class="hero-actions">
                <a class="button button-primary" href="{{ route('login') }}" data-home-session-action data-authenticated-label="Open Dashboard">
                    <span data-home-session-label>Sign In</span> <i class="bi bi-arrow-right" aria-hidden="true"></i>
                </a>
                <a class="button button-quiet" href="#about">Learn More</a>
            </div>

            <div class="landing-proof" aria-label="Platform highlights">
                <span><i class="proof-dot proof-dot-live"></i> Live telemetry</span>
                <span><i class="proof-dot proof-dot-safe"></i> Secure access</span>
                <span><i class="proof-dot proof-dot-clear"></i> Clear billing</span>
            </div>
        </div>

        <div class="landing-preview" aria-label="Smart Water dashboard preview">
            <div class="preview-glow"></div>
            <div class="preview-card">
                <div class="preview-header">
                    <div>
                        <span class="preview-kicker">Household overview</span>
                        <strong>Good morning, Alex</strong>
                    </div>
                    <span class="preview-live"><i></i> Live</span>
                </div>

                <div class="preview-main-stat">
                    <span>Today’s consumption</span>
                    <strong>284 <small>L</small></strong>
                    <em>↓ 12% from yesterday</em>
                </div>

                <div class="preview-chart" aria-hidden="true">
                    <span style="--bar-height: 38%"></span>
                    <span style="--bar-height: 56%"></span>
                    <span style="--bar-height: 42%"></span>
                    <span style="--bar-height: 72%"></span>
                    <span style="--bar-height: 64%"></span>
                    <span style="--bar-height: 48%"></span>
                    <span class="is-current" style="--bar-height: 82%"></span>
                </div>
                <div class="preview-days" aria-hidden="true"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>

                <div class="preview-summary">
                    <div><span>Estimated bill</span><strong>₱486.20</strong></div>
                    <div><span>Meter status</span><strong class="summary-online"><i></i> Connected</strong></div>
                </div>
            </div>
        </div>
    </section>

    <section class="landing-strip" aria-label="How Smart Water works">
        <div><strong>From sensor to insight</strong><span>Everything you need to make better water decisions.</span></div>
        <div class="strip-step"><b>01</b><span>Connect your meter</span></div>
        <div class="strip-step"><b>02</b><span>See live readings</span></div>
        <div class="strip-step"><b>03</b><span>Act with confidence</span></div>
    </section>

    <section class="landing-features" id="features" aria-labelledby="features-title">
        <div class="section-heading">
            <p class="eyebrow">One platform, two perspectives</p>
            <h2 id="features-title">Designed for the people who keep water moving.</h2>
            <p>Simple enough for every household. Powerful enough for municipal teams.</p>
        </div>

        <div class="feature-grid">
            <article class="feature-card">
                <span class="feature-icon feature-icon-blue" aria-hidden="true"><i class="bi bi-house-heart"></i></span>
                <p class="eyebrow">Households</p>
                <h3>Your daily water, at a glance.</h3>
                <p>Track consumption, understand your estimated bill, and receive useful alerts before small issues become expensive ones.</p>
                <a href="{{ route('login') }}">View household workspace <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>
            </article>
            <article class="feature-card feature-card-accent">
                <span class="feature-icon feature-icon-mint" aria-hidden="true"><i class="bi bi-buildings"></i></span>
                <p class="eyebrow">Municipal teams</p>
                <h3>A clearer view of every meter.</h3>
                <p>Manage devices, users, billing settings, reports, and potential leaks from one organized administrative workspace.</p>
                <a href="{{ route('login') }}">Explore admin tools <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>
            </article>
            <article class="feature-card">
                <span class="feature-icon feature-icon-amber" aria-hidden="true"><i class="bi bi-shield-check"></i></span>
                <p class="eyebrow">Built-in confidence</p>
                <h3>Useful data, securely delivered.</h3>
                <p>Scoped device credentials, role-based access, and audit history keep every reading accountable from meter to dashboard.</p>
                <a href="#about">Learn about Smart Water <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>
            </article>
        </div>
    </section>

    <section class="home-about" id="about" aria-labelledby="about-title">
        <div class="home-about-copy">
            <p class="eyebrow">About Smart Water</p>
            <h2 id="about-title">A better operating picture for every drop.</h2>
            <p>Smart Water connects trusted meter data with practical tools for the people who use, manage, and protect water every day.</p>
        </div>
        <div class="home-about-stats" aria-label="Smart Water capabilities">
            <div><strong>Near real-time</strong><span>Usage updates</span></div>
            <div><strong>24/7</strong><span>Alert visibility</span></div>
            <div><strong>1 view</strong><span>For every role</span></div>
        </div>
    </section>

    <section class="landing-bottom-cta" id="contact" aria-labelledby="contact-title">
        <div>
            <p class="eyebrow">Ready when you are</p>
            <h2 id="contact-title">Your water data, in one clear workspace.</h2>
            <p>Sign in to open the tools and insights configured for your account.</p>
        </div>
        <a class="button button-light" href="{{ route('login') }}" data-home-session-action data-authenticated-label="Open Your Dashboard">
            <span data-home-session-label>Sign In to Smart Water</span> <i class="bi bi-arrow-right" aria-hidden="true"></i>
        </a>
    </section>

    <footer class="home-footer">
        <span>&copy; {{ now()->year }} Smart Water Monitoring System</span>
        <span>Secure water intelligence for every community</span>
    </footer>
@endsection
