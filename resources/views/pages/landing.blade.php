@extends('layouts.app')

@section('title', 'Smart Water Monitoring')
@section('page', 'landing')
@section('public-nav')
    <a href="#features">Platform</a>
    <a href="#how-it-works">How it works</a>
    <a class="nav-cta" href="{{ route('login') }}">Sign in</a>
@endsection

@section('content')
    <section class="landing-hero" aria-labelledby="landing-title">
        <div class="landing-hero-copy">
            <p class="eyebrow">Smart water, clearly managed</p>
            <h1 id="landing-title">Know your water. <span>Protect every drop.</span></h1>
            <p class="landing-lede">One calm, connected workspace for live household readings, accurate billing, and municipal oversight.</p>

            <div class="hero-actions">
                <a class="button button-primary" href="{{ route('login') }}">Open your workspace <span aria-hidden="true">→</span></a>
                <a class="button button-quiet" href="#features">Explore the platform</a>
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

    <section class="landing-strip" id="how-it-works" aria-label="How Smart Water works">
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
                <span class="feature-icon feature-icon-blue" aria-hidden="true">⌁</span>
                <p class="eyebrow">Households</p>
                <h3>Your daily water, at a glance.</h3>
                <p>Track consumption, understand your estimated bill, and receive useful alerts before small issues become expensive ones.</p>
                <a href="{{ route('login') }}">View household workspace <span aria-hidden="true">↗</span></a>
            </article>
            <article class="feature-card feature-card-accent">
                <span class="feature-icon feature-icon-mint" aria-hidden="true">◌</span>
                <p class="eyebrow">Municipal teams</p>
                <h3>A clearer view of every meter.</h3>
                <p>Manage devices, users, billing settings, reports, and potential leaks from one organized administrative workspace.</p>
                <a href="{{ route('login') }}">Explore admin tools <span aria-hidden="true">↗</span></a>
            </article>
            <article class="feature-card">
                <span class="feature-icon feature-icon-amber" aria-hidden="true">✓</span>
                <p class="eyebrow">Built-in confidence</p>
                <h3>Useful data, securely delivered.</h3>
                <p>Scoped device credentials, role-based access, and audit history keep every reading accountable from meter to dashboard.</p>
                <a href="#how-it-works">See how it works <span aria-hidden="true">↗</span></a>
            </article>
        </div>
    </section>

    <section class="landing-bottom-cta" aria-labelledby="cta-title">
        <div>
            <p class="eyebrow">Ready when you are</p>
            <h2 id="cta-title">Ready When You Are, Make Everything Count</h2>
            <p>Sign in to see the workspace built for your role.</p>
        </div>
        <a class="button button-light" href="{{ route('login') }}">Sign in to Smart Water <span aria-hidden="true">→</span></a>
    </section>
@endsection
