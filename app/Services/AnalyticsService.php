<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Device;
use App\Models\LeakAlert;
use App\Models\Notification;
use App\Models\User;
use App\Models\WaterReading;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    public function admin(Carbon $from, Carbon $to): array
    {
        $registeredDevices = Device::query()->where('status', '!=', 'decommissioned');
        $households = User::query()->where('role', 'user');
        $readingQuery = WaterReading::query()->whereBetween('recorded_at', [$from, $to]);
        $hasReadings = (clone $readingQuery)->exists();
        $householdTotals = (clone $readingQuery)
            ->select('user_id')
            ->selectRaw('SUM(liters_used) as total_liters')
            ->groupBy('user_id')
            ->pluck('total_liters');

        $daily = $this->daily($readingQuery);
        $activity = AuditLog::query()
            ->with('user:id,name')
            ->whereBetween('created_at', [$from, $to])
            ->latest()
            ->limit(15)
            ->get(['id', 'user_id', 'action', 'description', 'outcome', 'created_at'])
            ->map(fn (AuditLog $log): array => $this->activityItem($log))
            ->values();
        $trackedLeakNotificationIds = LeakAlert::query()->whereNotNull('notification_id')->pluck('notification_id');
        $unresolvedLeakAlerts = LeakAlert::query()
            ->whereIn('status', LeakAlert::ACTIVE_STATUSES)
            ->whereHas('user', fn ($query) => $query->where('role', 'user'))
            ->count();
        $legacyLeakAlerts = Notification::query()
            ->where('type', 'possible_leak')
            ->whereNotNull('user_id')
            ->whereHas('user', fn ($query) => $query->where('role', 'user'))
            ->when($trackedLeakNotificationIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $trackedLeakNotificationIds))
            ->distinct()
            ->count('user_id');

        return [
            'period' => $this->period($from, $to),
            'households' => [
                'total' => (clone $households)->count(),
                'active' => (clone $households)->where('is_active', true)->where(function ($query): void {
                    $query->whereNull('account_status')->orWhere('account_status', User::ACCOUNT_STATUS_ACTIVE);
                })->count(),
                'inactive' => (clone $households)->where('is_active', false)->where(function ($query): void {
                    $query->whereNull('account_status')->orWhereNotIn('account_status', [User::ACCOUNT_STATUS_SUSPENDED, User::ACCOUNT_STATUS_ARCHIVED]);
                })->count(),
                'suspended' => (clone $households)->where('account_status', User::ACCOUNT_STATUS_SUSPENDED)->count(),
                'archived' => (clone $households)->where('account_status', User::ACCOUNT_STATUS_ARCHIVED)->count(),
                'inactive_or_suspended' => (clone $households)->where(function ($query): void {
                    $query->where('is_active', false)->orWhere(function ($statusQuery): void {
                        $statusQuery->whereNotNull('account_status')->where('account_status', '!=', User::ACCOUNT_STATUS_ACTIVE);
                    });
                })->count(),
            ],
            'devices' => [
                'total' => (clone $registeredDevices)->count(),
                'assigned' => (clone $registeredDevices)->whereNotNull('household_id')->count(),
                'unassigned' => (clone $registeredDevices)->whereNull('household_id')->count(),
                'connected' => (clone $registeredDevices)->where('status', 'active')->where('last_seen_at', '>=', now()->subSeconds(config('devices.offline_seconds')))->count(),
                'offline' => (clone $registeredDevices)->where('status', 'active')->where(function ($query): void {
                    $query->whereNull('last_seen_at')->orWhere('last_seen_at', '<', now()->subSeconds(config('devices.offline_seconds')));
                })->count(),
                'pending_activation' => (clone $registeredDevices)->where('status', 'pending')->count(),
                'disconnected' => (clone $registeredDevices)->where(function ($query): void {
                    $query->where('status', '!=', 'active')->orWhereNull('last_seen_at')->orWhere('last_seen_at', '<', now()->subSeconds(config('devices.offline_seconds')));
                })->count(),
                'waiting_for_first_reading' => (clone $registeredDevices)->whereDoesntHave('readings')->count(),
                'decommissioned' => Device::query()->where('status', 'decommissioned')->count(),
            ],
            'consumption' => [
                'has_data' => $hasReadings,
                'reading_count' => $hasReadings ? (clone $readingQuery)->count() : null,
                'total_liters' => $hasReadings ? (float) (clone $readingQuery)->sum('liters_used') : null,
                'total_cubic_meter' => $hasReadings ? (float) (clone $readingQuery)->sum('cubic_meter') : null,
                'estimated_billing' => $hasReadings ? (float) (clone $readingQuery)->sum('estimated_bill') : null,
                'average_household_liters' => $householdTotals->isNotEmpty() ? (float) $householdTotals->avg() : null,
                'daily' => $daily,
            ],
            'alerts' => [
                'possible_leak_count' => Notification::query()
                    ->where('type', 'possible_leak')
                    ->whereBetween('created_at', [$from, $to])
                    ->count(),
                'unread_notifications' => Notification::query()
                    ->delivered()
                    ->whereNull('user_deleted_at')
                    ->where('is_read', false)
                    ->whereHas('user', fn ($query) => $query->where('role', 'user'))
                    ->count(),
                'unresolved_leak_alerts' => $unresolvedLeakAlerts + $legacyLeakAlerts,
                'consumption_change_count' => Notification::query()
                    ->where('type', 'consumption_change')
                    ->whereBetween('created_at', [$from, $to])
                    ->count(),
                'consumption_baselines' => $this->consumptionBaselineComparisons(),
            ],
            'device_sync' => [
                'failed_attempts' => AuditLog::query()->where('action', 'device_sync_failed')->whereBetween('created_at', [$from, $to])->count(),
            ],
            'recent' => [
                'account_registrations' => $this->recentActions('user_created', $from, $to),
                'account_deactivations' => $this->recentActions(['user_deactivated', 'user_suspended'], $from, $to),
                'device_assignments' => $this->recentActions('device_assigned', $from, $to),
                'administrative_actions' => $activity,
            ],
        ];
    }

    public function household(User $user, Carbon $from, Carbon $to): array
    {
        $readingQuery = WaterReading::query()
            ->where('user_id', $user->id)
            ->whereBetween('recorded_at', [$from, $to]);
        $previousTo = $from->copy()->subSecond();
        $previousFrom = $previousTo->copy()->subSeconds($to->diffInSeconds($from));
        $previousQuery = WaterReading::query()
            ->where('user_id', $user->id)
            ->whereBetween('recorded_at', [$previousFrom, $previousTo]);
        $hasReadings = (clone $readingQuery)->exists();
        $hasPreviousReadings = (clone $previousQuery)->exists();
        $daily = $this->daily($readingQuery);
        $currentLiters = $hasReadings ? (float) (clone $readingQuery)->sum('liters_used') : null;
        $previousLiters = $hasPreviousReadings ? (float) (clone $previousQuery)->sum('liters_used') : null;
        $latestReading = WaterReading::query()->where('user_id', $user->id)->latest('recorded_at')->latest('id')->first();
        $lastSuccessfulReading = WaterReading::query()
            ->where('user_id', $user->id)
            ->where('server_connection_status', 'connected')
            ->latest('recorded_at')->latest('id')->first();
        $devices = Device::query()
            ->where('household_id', $user->id)
            ->where('status', '!=', 'decommissioned')
            ->latest('id')
            ->get(['id', 'name', 'status', 'last_seen_at', 'last_telemetry_at'])
            ->map(fn (Device $device): array => [
                'id' => $device->id,
                'name' => $device->name,
                'status' => $device->status,
                'is_online' => $device->is_online,
                'last_seen_at' => $device->last_seen_at,
                'last_telemetry_at' => $device->last_telemetry_at,
            ])->values();

        return [
            'period' => $this->period($from, $to),
            'has_data' => $hasReadings,
            'timezone' => config('app.timezone'),
            'current_flow_rate' => $latestReading?->flow_rate === null ? null : (float) $latestReading->flow_rate,
            'daily_consumption' => $daily->last()['total_liters'] ?? null,
            'weekly_consumption' => $this->groupedTotals($daily, 'week'),
            'monthly_consumption' => $this->groupedTotals($daily, 'month'),
            'consumption_trend' => $daily,
            'current_period' => [
                'reading_count' => $hasReadings ? (clone $readingQuery)->count() : null,
                'total_liters' => $currentLiters,
                'total_cubic_meter' => $hasReadings ? (float) (clone $readingQuery)->sum('cubic_meter') : null,
                'estimated_bill' => $hasReadings ? (float) (clone $readingQuery)->sum('estimated_bill') : null,
            ],
            'previous_period' => [
                'total_liters' => $previousLiters,
                'estimated_bill' => $hasPreviousReadings ? (float) (clone $previousQuery)->sum('estimated_bill') : null,
            ],
            'comparison' => [
                'change_percent' => $previousLiters !== null && $previousLiters > 0 && $currentLiters !== null
                    ? round((($currentLiters - $previousLiters) / $previousLiters) * 100, 2)
                    : null,
                'direction' => $previousLiters === null || $currentLiters === null ? null : ($currentLiters > $previousLiters ? 'up' : ($currentLiters < $previousLiters ? 'down' : 'unchanged')),
            ],
            'highest_usage_period' => $daily->sortByDesc('total_liters')->first(),
            'leak_warning_history' => Notification::query()
                ->delivered()
                ->where('user_id', $user->id)
                ->where('type', 'possible_leak')
                ->whereNull('user_deleted_at')
                ->whereBetween('created_at', [$from, $to])
                ->latest('created_at')->limit(10)->get(['id', 'title', 'message', 'is_read', 'sent_at', 'created_at']),
            'devices' => $devices,
            'last_successful_meter_reading' => $lastSuccessfulReading,
            'recent_notifications' => Notification::query()
                ->delivered()
                ->where('user_id', $user->id)
                ->whereNull('user_deleted_at')
                ->latest('created_at')->limit(5)->get(['id', 'type', 'title', 'message', 'is_read', 'sent_at', 'created_at']),
        ];
    }

    private function daily($query): Collection
    {
        return $query
            ->selectRaw('date(recorded_at) as period, sum(liters_used) as total_liters, sum(cubic_meter) as total_cubic_meter, sum(estimated_bill) as estimated_bill')
            ->groupBy(DB::raw('date(recorded_at)'))
            ->get()
            ->map(fn ($row): array => [
                'period' => $row->period,
                'total_liters' => (float) $row->total_liters,
                'total_cubic_meter' => (float) $row->total_cubic_meter,
                'estimated_bill' => (float) $row->estimated_bill,
            ])
            ->sortBy('period')
            ->values();
    }

    private function groupedTotals(Collection $daily, string $period): Collection
    {
        return $daily->groupBy(function (array $row) use ($period): string {
            $date = Carbon::parse($row['period'], config('app.timezone'));

            return $period === 'week' ? $date->startOfWeek()->toDateString() : $date->format('Y-m');
        })->map(fn (Collection $rows, string $label): array => [
            'period' => $label,
            'total_liters' => (float) $rows->sum('total_liters'),
            'total_cubic_meter' => (float) $rows->sum('total_cubic_meter'),
            'estimated_bill' => (float) $rows->sum('estimated_bill'),
        ])->values();
    }

    private function period(Carbon $from, Carbon $to): array
    {
        return [
            'from' => $from->toIso8601String(),
            'to' => $to->toIso8601String(),
            'timezone' => config('app.timezone'),
        ];
    }

    private function recentActions(array|string $actions, Carbon $from, Carbon $to): Collection
    {
        return AuditLog::query()
            ->with('user:id,name')
            ->whereIn('action', (array) $actions)
            ->whereBetween('created_at', [$from, $to])
            ->latest()
            ->limit(5)
            ->get(['id', 'user_id', 'action', 'description', 'outcome', 'created_at'])
            ->map(fn (AuditLog $log): array => $this->activityItem($log))
            ->values();
    }

    public function consumptionBaselineComparisons(): Collection
    {
        $driver = DB::connection()->getDriverName();
        $monthExpression = match ($driver) {
            'pgsql' => "TO_CHAR(water_readings.recorded_at, 'YYYY-MM')",
            'mysql', 'mariadb' => "DATE_FORMAT(water_readings.recorded_at, '%Y-%m')",
            default => "strftime('%Y-%m', water_readings.recorded_at)",
        };
        $monthlyRows = WaterReading::query()
            ->join('users', 'users.id', '=', 'water_readings.user_id')
            ->where('users.role', 'user')
            ->select('water_readings.user_id')
            ->selectRaw($monthExpression.' as month')
            ->selectRaw('SUM(water_readings.liters_used) as total_liters')
            ->selectRaw('COUNT(*) as reading_count')
            ->groupBy('water_readings.user_id')
            ->groupBy(DB::raw($monthExpression))
            ->orderBy('water_readings.user_id')
            ->orderBy('month')
            ->get();
        $users = User::query()
            ->whereIn('id', $monthlyRows->pluck('user_id')->unique())
            ->get(['id', 'name', 'account_number'])
            ->keyBy('id');

        return $monthlyRows->groupBy('user_id')->map(function (Collection $rows, int|string $userId) use ($users): ?array {
            $user = $users->get((int) $userId);
            if (! $user || $rows->isEmpty()) {
                return null;
            }

            // July is the municipality's reporting baseline when readings
            // exist for that household. Older/newer accounts fall back to
            // their first available month.
            $julyMonth = Carbon::now(config('app.timezone'))->format('Y').'-07';
            $baseline = $rows->firstWhere('month', $julyMonth) ?? $rows->first();
            $baselineLiters = (float) $baseline->total_liters;
            $comparisons = $rows->map(function ($row) use ($baseline, $baselineLiters): array {
                $liters = (float) $row->total_liters;
                $isBaseline = $row->month === $baseline->month;
                $percentage = $isBaseline ? 100.0 : ($baselineLiters > 0 ? ($liters / $baselineLiters) * 100 : null);
                $change = $percentage === null ? null : $percentage - 100;

                return [
                    'month' => $row->month,
                    'liters' => round($liters, 4),
                    'reading_count' => (int) $row->reading_count,
                    'usage_percentage' => $percentage === null ? null : round($percentage, 2),
                    'change_percent' => $change === null ? null : round($change, 2),
                    'direction' => $isBaseline ? 'baseline' : ($change > 0 ? 'increase' : ($change < 0 ? 'decrease' : 'unchanged')),
                    'is_baseline' => $isBaseline,
                ];
            })->values();
            $baselineComparison = $comparisons->firstWhere('is_baseline');
            $visibleComparisons = $comparisons->count() > 12
                ? collect([$baselineComparison])->concat($comparisons->slice(-11))->unique('month')->values()
                : $comparisons;

            return [
                'household' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'account_number' => $user->account_number,
                ],
                'baseline' => $baselineComparison,
                'latest' => $comparisons->last(),
                'months' => $visibleComparisons,
            ];
        })->filter()->sortBy(fn (array $item): string => strtolower($item['household']['name']))->values();
    }

    private function activityItem(AuditLog $log): array
    {
        return [
            'id' => $log->id,
            'action' => $log->action,
            'description' => $log->description,
            'outcome' => $log->outcome,
            'actor' => $log->user?->name,
            'created_at' => $log->created_at,
        ];
    }
}
