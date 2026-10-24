<meta property="og:site_name" content="Smart Water Monitoring System">
@if (request()->routeIs('home'))
    @php($homeUrl = rtrim(config('app.url'), '/'))
    <meta name="description" content="Smart Water Monitoring System helps households and municipal teams monitor water usage, detect leaks, and manage billing with live meter readings.">
    <link rel="canonical" href="{{ $homeUrl }}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="Smart Water Monitoring System">
    <meta property="og:url" content="{{ $homeUrl }}">
    <meta property="og:description" content="Live water monitoring, leak alerts, and billing for households and municipal teams.">
    <script type="application/ld+json">{!! json_encode([
        '@context' => 'https://schema.org',
        '@type' => 'WebSite',
        'name' => 'Smart Water Monitoring System',
        'url' => $homeUrl,
    ], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!}</script>
@endif
