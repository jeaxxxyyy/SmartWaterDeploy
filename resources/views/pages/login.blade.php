@extends('layouts.guest')

@push('head')
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
@endpush

@section('title', 'Sign in | SmartWater')
@section('page', 'login')

@section('content')
    <section class="login-page container-fluid px-0" aria-label="SmartWater account sign in">
        <div class="login-layout row g-0">
            <section class="login-brand-panel col-lg-5" aria-labelledby="login-brand-title">
                <div class="login-brand-content">
                    <div class="login-brand-lockup">
                        @include('components.brand-mark')
                        <span>
                            <strong>SmartWater</strong>
                            <small>Monitoring System</small>
                        </span>
                    </div>

                    <div class="login-brand-copy">
                        <span class="login-overline">Connected water intelligence</span>
                        <h1 id="login-brand-title">SmartWater</h1>
                        <p>Real-time monitoring and analytics for household and municipal water consumption.</p>
                    </div>

                    <ul class="login-feature-list">
                        <li><i class="bi bi-check-circle-fill" aria-hidden="true"></i><span>Live Water Usage Monitoring</span></li>
                        <li><i class="bi bi-check-circle-fill" aria-hidden="true"></i><span>Leak Detection Alerts</span></li>
                        <li><i class="bi bi-check-circle-fill" aria-hidden="true"></i><span>Billing Analytics</span></li>
                        <li><i class="bi bi-check-circle-fill" aria-hidden="true"></i><span>Device Management</span></li>
                        <li><i class="bi bi-check-circle-fill" aria-hidden="true"></i><span>Secure Administrator Access</span></li>
                    </ul>

                    <svg class="login-illustration" viewBox="0 0 460 220" role="img" aria-label="Water monitoring analytics illustration" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="water-fill" x1="0" x2="1" y1="0" y2="1">
                                <stop offset="0" stop-color="#7DD3FC" stop-opacity=".8" />
                                <stop offset="1" stop-color="#38BDF8" stop-opacity=".12" />
                            </linearGradient>
                        </defs>
                        <path class="illustration-wave" d="M12 177C63 134 103 200 151 160S241 135 286 167s80 24 162-32" />
                        <path class="illustration-wave illustration-wave-soft" d="M12 201c52-43 89 19 138-14s90-35 136-2 87 19 164-31" />
                        <path class="illustration-line" d="M72 132 137 96l55 22 70-58 56 32 55-45" />
                        <circle class="illustration-node" cx="72" cy="132" r="6" />
                        <circle class="illustration-node" cx="137" cy="96" r="6" />
                        <circle class="illustration-node" cx="192" cy="118" r="6" />
                        <circle class="illustration-node" cx="262" cy="60" r="6" />
                        <circle class="illustration-node" cx="318" cy="92" r="6" />
                        <circle class="illustration-node" cx="373" cy="47" r="6" />
                        <path class="illustration-drop" d="M397 135c0-20 26-42 26-42s26 22 26 42a26 26 0 1 1-52 0Z" />
                        <path class="illustration-drop-shine" d="M410 126c3-8 7-13 12-18" />
                    </svg>
                </div>
            </section>

            <section class="login-form-area col-lg-7" aria-labelledby="login-title">
                <div class="login-card">
                    <div class="login-card-header">
                        <a class="login-home-link" href="{{ route('home') }}" data-home-navigation>
                            <i class="bi bi-arrow-left" aria-hidden="true"></i> Home
                        </a>
                        <span class="login-card-kicker">Secure account access</span>
                        <h2 id="login-title">Welcome Back</h2>
                        <p>Sign in to your account</p>
                    </div>

                    @if (session('status'))
                        <div class="alert alert-success login-alert" role="status">
                            <i class="bi bi-check-circle me-2" aria-hidden="true"></i>{{ session('status') }}
                        </div>
                    @endif

                    @if ($errors->any())
                        <div class="alert alert-danger login-alert" role="alert">
                            <i class="bi bi-exclamation-circle me-2" aria-hidden="true"></i>
                            <span>Please review the highlighted information.</span>
                            <ul class="mb-0 mt-2 ps-3">
                                @foreach ($errors->all() as $error)
                                    <li>{{ $error }}</li>
                                @endforeach
                            </ul>
                        </div>
                    @endif

                    <div class="login-status" data-auth-status role="status" aria-live="polite" hidden></div>

                    <form class="login-form" data-auth-form="login" novalidate>
                        @csrf

                        <div class="login-field">
                            <label class="login-field-label" for="email">Email Address</label>
                            <i class="bi bi-envelope login-field-icon" aria-hidden="true"></i>
                            <input id="email" class="form-control" type="email" name="email" value="{{ old('email') }}" autocomplete="email" placeholder="Email Address" required>
                        </div>

                        <div class="login-field">
                            <label class="login-field-label" for="password">Password</label>
                            <i class="bi bi-lock login-field-icon" aria-hidden="true"></i>
                            <input id="password" class="form-control" type="password" name="password" autocomplete="current-password" placeholder="Password" required>
                            <button class="login-password-toggle" type="button" data-visibility-toggle="#password" aria-controls="password" aria-pressed="false" aria-label="Show password" title="Show password">
                                <i class="bi bi-eye" aria-hidden="true"></i>
                            </button>
                        </div>

                        <div class="login-options">
                            <div class="form-check">
                                <input id="remember" class="form-check-input" type="checkbox" name="remember" value="1" @checked(old('remember'))>
                                <label class="form-check-label" for="remember">Remember me</label>
                            </div>

                            @if (Route::has('password.request'))
                                <a class="login-forgot" href="{{ route('password.request') }}">Forgot password?</a>
                            @endif
                        </div>

                        <button class="button button-primary login-submit w-100" type="submit">
                            <span>Sign In</span><i class="bi bi-arrow-right" aria-hidden="true"></i>
                        </button>
                    </form>

                    <div class="login-help">
                        <i class="bi bi-info-circle" aria-hidden="true"></i>
                        <p><strong>Need access?</strong><br>Contact your system administrator.</p>
                    </div>
                </div>
            </section>
        </div>

        <footer class="login-footer text-center" aria-label="Application information">
            <span>&copy; {{ now()->year }} SmartWater <b aria-hidden="true">&bull;</b> Version 1.0</span>
        </footer>

        <div class="login-transition" data-login-transition role="status" aria-live="polite" hidden>
            <div class="login-transition-card">
                <span class="login-transition-mark" aria-hidden="true"><i class="bi bi-check-lg"></i></span>
                <span class="login-transition-copy">
                    <strong>Welcome back</strong>
                    <small>Opening your dashboard&hellip;</small>
                </span>
            </div>
        </div>
    </section>
@endsection
