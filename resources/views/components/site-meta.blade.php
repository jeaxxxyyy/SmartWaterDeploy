<meta property="og:site_name" content="SmartWater">
@if (request()->routeIs('home'))
    <meta name="description" content="SmartWater helps households and municipal teams monitor water usage, detect leaks, and manage billing with live meter readings.">
    <link rel="canonical" href="{{ route('home') }}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="SmartWater">
    <meta property="og:url" content="{{ route('home') }}">
    <meta property="og:description" content="Live water monitoring, leak alerts, and billing for households and municipal teams.">
    <script type="application/ld+json">{!! json_encode([
        '@context' => 'https://schema.org',
        '@type' => 'WebSite',
        'name' => 'SmartWater',
        'url' => route('home'),
    ], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!}</script>
@endif
