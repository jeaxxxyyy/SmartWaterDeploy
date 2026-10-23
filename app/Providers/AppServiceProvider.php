<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        if (config('deployment.vercel')) {
            URL::forceScheme('https');
            config([
                'dompdf.options.font_dir' => storage_path('fonts'),
                'dompdf.options.font_cache' => storage_path('fonts'),
                'dompdf.options.temp_dir' => storage_path('app/private'),
            ]);
        }
    }
}
