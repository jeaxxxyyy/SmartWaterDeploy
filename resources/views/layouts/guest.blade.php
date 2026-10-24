<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#075985">
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="icon" href="/smart-water-icon.svg" type="image/svg+xml">
    <title>@yield('title', config('app.name', 'Smart Water Monitoring'))</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    @include('components.theme-init')
    @stack('head')
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.js', 'resources/js/boot.js'])
    @endif
</head>
<body class="page antialiased bg-app-bg text-app-text dark:bg-app-bg dark:text-app-text" data-page="@yield('page', 'guest')">
    <a class="skip-link" href="#main-content">Skip to main content</a>

    <div class="toast-stack" data-toast-stack aria-live="polite" aria-atomic="true"></div>

    <header class="topbar">
        <a href="{{ route('home') }}" class="brand" aria-label="Smart Water Monitoring home">
                    @include('components.brand-mark')
            <span>
                <strong>Smart Water</strong>
                <small>Monitoring System</small>
            </span>
        </a>

        @include('components.theme-toggle', ['class' => 'site-theme-toggle'])

        @hasSection('public-nav')
            <nav class="topnav public-nav" aria-label="Public navigation">
                @yield('public-nav')
            </nav>
        @endif
    </header>

    <main id="main-content" class="shell shell-app">
        @yield('content')
    </main>
</body>
</html>
