@extends('layouts.guest')

@section('title', 'SmartWater')
@section('page', 'splash')

@section('content')
    <section class="splash-screen" aria-labelledby="splash-title">
        <div class="splash-content">
            <div class="splash-logo" aria-hidden="true">
                <svg viewBox="0 0 88 108" role="presentation" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44 5S13 38 13 64a31 31 0 0 0 62 0C75 38 44 5 44 5Z" />
                    <path class="splash-logo-shine" d="M31 55c2-9 7-17 14-24" />
                </svg>
            </div>
            <p class="splash-kicker">Connected water intelligence</p>
            <h1 id="splash-title">SmartWater</h1>
            <p class="splash-subtitle">Real-Time Water Monitoring &amp; Analytics</p>

            <div class="splash-loader" role="status" aria-live="polite" aria-label="Loading system">
                <span class="splash-loader-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                <span>Loading system...</span>
            </div>
        </div>

        <svg class="splash-waves" viewBox="0 0 1440 260" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 119C186 32 331 218 534 133s302-83 453-16 270 66 453-18v161H0Z" />
            <path d="M0 177c180-75 328 49 508 2s298-103 466-25 282 78 466-7v113H0Z" />
        </svg>
    </section>
@endsection
