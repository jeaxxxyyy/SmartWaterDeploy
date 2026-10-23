<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Console\Events\ScheduledTaskFailed;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class SchedulerEndpointTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'test-scheduler-secret-at-least-32-characters';

    protected function setUp(): void
    {
        parent::setUp();
        config(['deployment.cron_secret' => self::SECRET]);
    }

    public function test_scheduler_is_disabled_without_a_strong_secret(): void
    {
        Artisan::shouldReceive('call')->never();

        foreach ([null, '', 'short'] as $secret) {
            config(['deployment.cron_secret' => $secret]);
            $this->getJson('/api/internal/schedule')->assertStatus(503);
        }
    }

    public function test_scheduler_requires_the_bearer_secret_including_for_post_requests(): void
    {
        Artisan::shouldReceive('call')->never();

        $this->getJson('/api/internal/schedule')->assertUnauthorized();
        $this->withToken('wrong-secret')->getJson('/api/internal/schedule')->assertUnauthorized();
        $this->withToken('')->postJson('/api/internal/schedule', ['secret' => self::SECRET])->assertUnauthorized();
        $this->getJson('/api/internal/schedule?secret='.self::SECRET)->assertUnauthorized();
    }

    public function test_authorized_runs_release_the_lock_for_the_next_request(): void
    {
        Artisan::shouldReceive('call')->twice()->with('schedule:run', ['--no-interaction' => true])->andReturn(0);

        $this->withToken(self::SECRET)->getJson('/api/internal/schedule')->assertOk()->assertJsonPath('ok', true);
        $this->withToken(self::SECRET)->postJson('/api/internal/schedule')->assertOk()->assertJsonPath('ok', true);
    }

    public function test_the_real_serverless_scheduler_delivers_only_due_notifications(): void
    {
        config(['deployment.vercel' => true]);
        $this->travelTo(now()->startOfDay()->addHours(12));
        $user = User::factory()->create();
        $data = ['user_id' => $user->id, 'type' => 'announcement', 'title' => 'Water advisory', 'message' => 'Scheduled advisory', 'delivery_status' => 'scheduled'];
        $due = Notification::create([...$data, 'scheduled_at' => now()->subMinute()]);
        $future = Notification::create([...$data, 'scheduled_at' => now()->addHour()]);
        $archived = Notification::create([...$data, 'scheduled_at' => now()->subMinute(), 'archived_at' => now()]);

        $this->withToken(self::SECRET)->getJson('/api/internal/schedule')->assertOk()->assertJsonPath('ok', true);
        $this->assertSame('delivered', $due->fresh()->delivery_status);
        $this->assertSame('scheduled', $future->fresh()->delivery_status);
        $this->assertSame('scheduled', $archived->fresh()->delivery_status);

        $this->withToken(self::SECRET)->getJson('/api/internal/schedule')->assertOk();
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_an_overlapping_scheduler_request_does_not_start_another_run(): void
    {
        Artisan::shouldReceive('call')->never();
        $lock = Cache::lock('smartwater:scheduler', 70);
        $this->assertTrue($lock->get());

        try {
            $this->withToken(self::SECRET)->getJson('/api/internal/schedule')
                ->assertStatus(409)->assertHeader('Retry-After', '10');
        } finally {
            $lock->release();
        }
    }

    public function test_command_failures_are_reported_to_the_scheduler(): void
    {
        Artisan::shouldReceive('call')->once()->andReturn(1);

        $this->withToken(self::SECRET)->getJson('/api/internal/schedule')->assertStatus(500)->assertJsonPath('ok', false);
        $this->assertTrue(Cache::lock('smartwater:scheduler', 70)->get());
        Cache::lock('smartwater:scheduler')->forceRelease();
    }

    public function test_failed_scheduled_tasks_are_reported_even_when_schedule_run_returns_zero(): void
    {
        Artisan::shouldReceive('call')->once()->andReturnUsing(function (): int {
            Event::dispatch(new ScheduledTaskFailed(app(Schedule::class)->command('inspire'), new \RuntimeException('Task failed')));

            return 0;
        });

        $this->withToken(self::SECRET)->getJson('/api/internal/schedule')->assertStatus(500)->assertJsonPath('ok', false);
    }
}
