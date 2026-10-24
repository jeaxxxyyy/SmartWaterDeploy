<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#075985">
    @include('components.site-meta')
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="icon" href="/smart-water-icon.svg" type="image/svg+xml">
    <title>@yield('title', config('app.name', 'SmartWater'))</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    @include('components.theme-init')
    @stack('head')
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.js', 'resources/js/boot.js'])
    @endif
</head>
<body class="page antialiased bg-app-bg text-app-text dark:bg-app-bg dark:text-app-text" data-page="@yield('page', 'default')" data-app-version="2.1">
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div class="toast-stack" data-toast-stack aria-live="polite" aria-atomic="true"></div>
    <div class="backdrop backdrop-a"></div>
    <div class="backdrop backdrop-b"></div>
    <div class="backdrop backdrop-c"></div>
    <div class="login-transition logout-transition" data-logout-transition role="status" aria-live="polite" hidden>
        <div class="login-transition-card logout-transition-card">
            <span class="login-transition-mark logout-transition-mark" aria-hidden="true"><i class="bi bi-box-arrow-right"></i></span>
            <span class="login-transition-copy">
                <strong>Signing you out</strong>
                <small>Securing your session&hellip;</small>
            </span>
        </div>
    </div>

    <header class="topbar">
        <div class="container site-header-container">
            @hasSection('admin-topbar')
                @yield('admin-topbar')
            @else
                <a href="{{ route('home') }}" class="brand" aria-label="SmartWater home">
                    @include('components.brand-mark')
                    <span>
                        <strong>SmartWater</strong>
                        <small>Monitoring System</small>
                    </span>
                </a>
            @endif

            @hasSection('app-header-actions')
                @yield('app-header-actions')
            @else
                @unless($__env->hasSection('admin-topbar'))
                    @include('components.theme-toggle', ['class' => 'site-theme-toggle'])
                @endunless
            @endif

            @hasSection('home-nav')
                <button class="site-nav-toggle navbar-toggler d-lg-none" type="button" data-bs-toggle="offcanvas" data-bs-target="#home-navigation" aria-controls="home-navigation" aria-label="Open navigation">
                    <i class="bi bi-list" aria-hidden="true"></i>
                </button>

                <nav class="topnav public-nav site-nav-desktop d-none d-lg-flex" aria-label="Primary navigation">
                    @yield('home-nav')
                </nav>

                <div class="offcanvas offcanvas-end home-offcanvas d-lg-none" tabindex="-1" id="home-navigation" aria-labelledby="home-navigation-title">
                    <div class="offcanvas-header">
                        <h2 class="offcanvas-title" id="home-navigation-title">SmartWater</h2>
                        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close navigation"></button>
                    </div>
                    <div class="offcanvas-body">
                        <nav class="home-offcanvas-nav" aria-label="Mobile navigation">
                            @yield('home-nav')
                        </nav>
                    </div>
                </div>
            @elseif (trim($__env->yieldContent('public-nav')) !== '')
                <nav class="topnav public-nav" aria-label="Public navigation">
                    @yield('public-nav')
                </nav>
            @elseif (! $__env->hasSection('admin-topbar') && ! $__env->hasSection('nav') && ! $__env->hasSection('household-sidebar'))
                <nav class="topnav" aria-label="Account navigation">
                    <a href="{{ route('login') }}">Login</a>
                </nav>
            @endif
        </div>
    </header>

    @if($__env->hasSection('nav') || trim($__env->yieldContent('household-sidebar')) !== '')
        <div class="app-shell">
            @hasSection('admin-sidebar')
                <aside id="admin-sidebar" class="dashboard-sidebar admin-sidebar offcanvas-lg offcanvas-start panel" tabindex="-1" aria-label="Administrator navigation">
                    @yield('admin-sidebar')
                </aside>
            @elseif (trim($__env->yieldContent('household-sidebar')) !== '')
                <aside id="household-sidebar" class="dashboard-sidebar household-sidebar panel" data-household-sidebar aria-label="Household navigation">
                    @yield('household-sidebar')
                </aside>
                <button class="household-sidebar-scrim" type="button" data-household-sidebar-dismiss aria-label="Close navigation" tabindex="-1"></button>
            @else
                <aside class="dashboard-sidebar panel">
                    <div class="sidebar-brand">
                        <p class="eyebrow">@yield('title', config('app.name', 'SmartWater'))</p>
                        <h2>Navigation</h2>
                        <p class="subtle">Use the sections on the left to switch between dashboard views.</p>
                    </div>
                    <nav class="sidebar-nav">
                        @yield('nav')
                    </nav>
                </aside>
            @endif

            <main id="main-content" class="shell shell-app shell-dashboard">
                @yield('content')
            </main>
        </div>
    @else
        <main id="main-content" class="shell shell-app">
            @yield('content')
        </main>
    @endif
</body>
</html>
