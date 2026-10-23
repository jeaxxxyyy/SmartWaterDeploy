<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Console\Events\ScheduledTaskFailed;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;

class SchedulerController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $secret = config('deployment.cron_secret');
        abort_unless(is_string($secret) && strlen($secret) >= 32, 503, 'Scheduler is not configured.');
        abort_unless(hash_equals($secret, (string) $request->bearerToken()), 401);

        $result = Cache::lock('smartwater:scheduler', 70)->get(function (): JsonResponse {
            $failed = false;
            Event::listen(ScheduledTaskFailed::class, function () use (&$failed): void {
                $failed = true;
            });

            $exitCode = Artisan::call('schedule:run', ['--no-interaction' => true]);

            return response()->json(['ok' => $exitCode === 0 && ! $failed], $exitCode === 0 && ! $failed ? 200 : 500);
        });

        return $result ?: response()->json(['message' => 'Scheduler is already running.'], 409, ['Retry-After' => '10']);
    }
}
