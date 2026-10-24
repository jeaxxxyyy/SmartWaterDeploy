<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Billing;
use App\Models\Device;
use App\Models\User;
use App\Models\WaterReading;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ConsumptionMonitoringController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'account_status' => ['nullable', 'in:active,inactive,suspended,archived'],
            'meter_status' => ['nullable', 'in:unassigned,pending,active,suspended,maintenance,decommissioned'],
            'usage_condition' => ['nullable', 'in:normal,high,leak,threshold,no_data'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        [$from, $to] = $this->resolveDateRange($validated);

        $query = $this->householdQuery($validated, $from, $to);
        $matchingHouseholdIds = (clone $query)->pluck('users.id');
        $matchingReadings = WaterReading::query()->whereIn('user_id', $matchingHouseholdIds)->whereBetween('recorded_at', [$from, $to]);
        $readingTotals = (clone $matchingReadings)
            ->selectRaw('COUNT(*) as reading_count')
            ->selectRaw('COALESCE(SUM(liters_used), 0) as total_liters')
            ->selectRaw('COALESCE(SUM(cubic_meter), 0) as total_cubic_meter')
            ->selectRaw('COALESCE(SUM(estimated_bill), 0) as estimated_bill')
            ->selectRaw('COUNT(DISTINCT CASE WHEN is_possible_leak = TRUE OR is_threshold_exceeded = TRUE THEN user_id END) as abnormal_count')
            ->first();
        $meta = [
            'household_count' => $matchingHouseholdIds->count(),
            'reading_count' => (int) ($readingTotals?->reading_count ?? 0),
            'total_liters' => (float) ($readingTotals?->total_liters ?? 0),
            'total_cubic_meter' => (float) ($readingTotals?->total_cubic_meter ?? 0),
            'estimated_bill' => (float) ($readingTotals?->estimated_bill ?? 0),
            'abnormal_count' => (int) ($readingTotals?->abnormal_count ?? 0),
            'period' => $this->period($from, $to),
        ];

        $paginator = $query
            ->with(['devices' => fn ($builder) => $builder->where('status', '!=', 'decommissioned')->latest('id')])
            ->orderBy('users.name')
            ->paginate($validated['per_page'] ?? 10);

        $pageUserIds = $paginator->getCollection()->pluck('id');
        $householdTotals = WaterReading::query()
            ->whereIn('user_id', $pageUserIds)
            ->whereBetween('recorded_at', [$from, $to])
            ->select('user_id')
            ->selectRaw('COUNT(*) as reading_count')
            ->selectRaw('COALESCE(SUM(liters_used), 0) as total_liters')
            ->selectRaw('COALESCE(SUM(cubic_meter), 0) as total_cubic_meter')
            ->selectRaw('COALESCE(SUM(estimated_bill), 0) as estimated_bill')
            ->selectRaw('COALESCE(SUM(CASE WHEN is_possible_leak = TRUE THEN 1 ELSE 0 END), 0) as possible_leak_count')
            ->selectRaw('COALESCE(SUM(CASE WHEN is_threshold_exceeded = TRUE THEN 1 ELSE 0 END), 0) as threshold_exceeded_count')
            ->groupBy('user_id')
            ->get()
            ->keyBy('user_id');

        $paginator->getCollection()->transform(
            fn (User $user): array => $this->householdItem($user, $from, $to, $householdTotals->get($user->id)),
        );

        return response()->json([
            'data' => $paginator,
            'meta' => $meta,
        ]);
    }

    public function history(Request $request, User $user)
    {
        abort_unless($user->isHousehold(), 404);

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);
        [$from, $to] = $this->resolveDateRange($validated);
        $readings = WaterReading::query()
            ->with('device:id,name,asset_number,serial_number')
            ->where('user_id', $user->id)
            ->whereBetween('recorded_at', [$from, $to])
            ->latest('recorded_at')
            ->latest('id')
            ->get();
        $latest = $readings->first() ?? $user->waterReadings()->with('device:id,name,asset_number,serial_number')->latest('recorded_at')->latest('id')->first();
        $billing = $this->activeBilling($user->id);
        $summary = $this->readingSummary($readings, $billing);

        return response()->json([
            'data' => [
                'household' => $this->householdIdentity($user),
                'period' => $this->period($from, $to),
                'summary' => $summary,
                'active_billing' => $billing ? [
                    'water_rate' => (float) $billing->water_rate,
                    'subsidy_deduction' => (float) $billing->subsidy_deduction,
                    'threshold_liters' => (float) $billing->threshold_liters,
                ] : null,
                'latest_reading' => $this->readingItem($latest),
                'devices' => $user->devices()->where('status', '!=', 'decommissioned')->latest('id')->get()->map(fn (Device $device): array => $this->deviceItem($device))->values(),
                'daily' => $this->daily($readings),
                'weekly' => $this->groupedTotals($this->daily($readings), 'week'),
                'monthly' => $this->groupedTotals($this->daily($readings), 'month'),
            ],
        ]);
    }

    private function householdQuery(array $validated, Carbon $from, Carbon $to): Builder
    {
        $query = User::query()->where('users.role', 'user');
        $search = trim((string) ($validated['search'] ?? ''));

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function (Builder $builder) use ($like): void {
                $builder->where('users.name', 'like', $like)
                    ->orWhere('users.email', 'like', $like)
                    ->orWhere('users.account_number', 'like', $like)
                    ->orWhere('users.address', 'like', $like)
                    ->orWhereHas('devices', function (Builder $deviceQuery) use ($like): void {
                        $deviceQuery->where(function (Builder $deviceSearch) use ($like): void {
                            $deviceSearch->where('name', 'like', $like)
                                ->orWhere('asset_number', 'like', $like)
                                ->orWhere('serial_number', 'like', $like)
                                ->orWhere('hardware_id', 'like', $like);
                        });
                    });
            });
        }

        match ($validated['account_status'] ?? null) {
            'active' => $query->where('users.is_active', true)->where(function (Builder $builder): void {
                $builder->whereNull('users.account_status')->orWhere('users.account_status', User::ACCOUNT_STATUS_ACTIVE);
            }),
            'inactive' => $query->where('users.is_active', false),
            'suspended', 'archived' => $query->where('users.account_status', $validated['account_status']),
            default => null,
        };

        match ($validated['meter_status'] ?? null) {
            'unassigned' => $query->whereDoesntHave('devices', fn (Builder $builder) => $builder->where('status', '!=', 'decommissioned')),
            default => isset($validated['meter_status']) && $validated['meter_status'] !== ''
                ? $query->whereHas('devices', fn (Builder $builder) => $builder->where('status', $validated['meter_status']))
                : null,
        };

        $condition = $validated['usage_condition'] ?? null;
        if ($condition === 'no_data') {
            $query->whereDoesntHave('waterReadings', fn (Builder $builder) => $builder->whereBetween('recorded_at', [$from, $to]));
        } elseif ($condition === 'leak') {
            $query->whereHas('waterReadings', fn (Builder $builder) => $builder->whereBetween('recorded_at', [$from, $to])->where('is_possible_leak', true));
        } elseif ($condition === 'threshold') {
            $query->whereHas('waterReadings', fn (Builder $builder) => $builder->whereBetween('recorded_at', [$from, $to])->where('is_threshold_exceeded', true));
        } elseif ($condition === 'high') {
            $query->whereHas('waterReadings', fn (Builder $builder) => $builder->whereBetween('recorded_at', [$from, $to])->where(function (Builder $alert): void {
                $alert->where('is_possible_leak', true)->orWhere('is_threshold_exceeded', true);
            }));
        } elseif ($condition === 'normal') {
            $query->whereHas('waterReadings', fn (Builder $builder) => $builder->whereBetween('recorded_at', [$from, $to]))
                ->whereDoesntHave('waterReadings', fn (Builder $builder) => $builder->whereBetween('recorded_at', [$from, $to])->where(function (Builder $alert): void {
                    $alert->where('is_possible_leak', true)->orWhere('is_threshold_exceeded', true);
                }));
        }

        return $query;
    }

    private function householdItem(User $user, Carbon $from, Carbon $to, mixed $totals): array
    {
        $device = $user->devices->first();
        $billing = $this->activeBilling($user->id);
        $latestQuery = $user->waterReadings()->with('device:id,name,asset_number,serial_number');
        if ((int) ($totals?->reading_count ?? 0) > 0) {
            $latestQuery->whereBetween('recorded_at', [$from, $to]);
        }
        $latest = $latestQuery->latest('recorded_at')->latest('id')->first();

        return [
            'household' => $this->householdIdentity($user),
            'device' => $device ? $this->deviceItem($device) : null,
            'summary' => [...$this->aggregateReadingSummary($totals, $billing), 'period' => $this->period($from, $to)],
            'active_billing' => $billing ? [
                'water_rate' => (float) $billing->water_rate,
                'subsidy_deduction' => (float) $billing->subsidy_deduction,
            ] : null,
            'latest_reading' => $this->readingItem($latest),
        ];
    }

    private function aggregateReadingSummary(mixed $totals, ?Billing $billing = null): array
    {
        $readingCount = (int) ($totals?->reading_count ?? 0);
        $possibleLeaks = (int) ($totals?->possible_leak_count ?? 0);
        $thresholds = (int) ($totals?->threshold_exceeded_count ?? 0);
        $totalCubicMeter = (float) ($totals?->total_cubic_meter ?? 0);
        $estimatedBill = (float) ($totals?->estimated_bill ?? 0);

        if ($readingCount > 0 && $billing) {
            $estimatedBill = max(($totalCubicMeter * (float) $billing->water_rate) - (float) $billing->subsidy_deduction, 0);
        }

        return [
            'has_data' => $readingCount > 0,
            'reading_count' => $readingCount,
            'total_liters' => (float) ($totals?->total_liters ?? 0),
            'total_cubic_meter' => $totalCubicMeter,
            'estimated_bill' => $estimatedBill,
            'threshold_exceeded_count' => $thresholds,
            'possible_leak_count' => $possibleLeaks,
            'condition' => $readingCount === 0 ? 'no_data' : ($possibleLeaks > 0 ? 'leak' : ($thresholds > 0 ? 'high' : 'normal')),
        ];
    }

    private function householdIdentity(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'account_number' => $user->account_number,
            'address' => $user->address,
            'is_active' => (bool) $user->is_active,
            'account_status' => $user->account_status ?? User::ACCOUNT_STATUS_ACTIVE,
        ];
    }

    private function deviceItem(Device $device): array
    {
        return [
            'id' => $device->id,
            'name' => $device->name,
            'asset_number' => $device->asset_number,
            'serial_number' => $device->serial_number,
            'hardware_id' => $device->hardware_id,
            'status' => $device->status,
            'is_online' => $device->is_online,
            'last_seen_at' => $device->last_seen_at,
        ];
    }

    private function readingItem(?WaterReading $reading): ?array
    {
        if (! $reading) {
            return null;
        }

        return [
            'id' => $reading->id,
            'device_id' => $reading->device_id,
            'device_name' => $reading->device?->name ?? $reading->device_name,
            'flow_rate' => $reading->flow_rate === null ? null : (float) $reading->flow_rate,
            'liters_used' => (float) $reading->liters_used,
            'cubic_meter' => (float) $reading->cubic_meter,
            'estimated_bill' => (float) $reading->estimated_bill,
            'rate_per_cubic_meter' => (float) $reading->rate_per_cubic_meter,
            'is_threshold_exceeded' => (bool) $reading->is_threshold_exceeded,
            'is_possible_leak' => (bool) $reading->is_possible_leak,
            'leak_detection_status' => $reading->leak_detection_status,
            'recorded_at' => $reading->recorded_at,
        ];
    }

    private function readingSummary(Collection $readings, ?Billing $billing = null): array
    {
        $hasData = $readings->isNotEmpty();
        $possibleLeaks = $readings->where('is_possible_leak', true)->count();
        $thresholds = $readings->where('is_threshold_exceeded', true)->count();
        $estimatedBill = $hasData ? (float) $readings->sum('estimated_bill') : 0;
        if ($hasData && $billing) {
            $estimatedBill = max(((float) $readings->sum('cubic_meter') * (float) $billing->water_rate) - (float) $billing->subsidy_deduction, 0);
        }

        return [
            'has_data' => $hasData,
            'reading_count' => $hasData ? $readings->count() : 0,
            'total_liters' => $hasData ? (float) $readings->sum('liters_used') : 0,
            'total_cubic_meter' => $hasData ? (float) $readings->sum('cubic_meter') : 0,
            'estimated_bill' => $estimatedBill,
            'threshold_exceeded_count' => $thresholds,
            'possible_leak_count' => $possibleLeaks,
            'condition' => ! $hasData ? 'no_data' : ($possibleLeaks > 0 ? 'leak' : ($thresholds > 0 ? 'high' : 'normal')),
        ];
    }

    private function daily(Collection $readings): Collection
    {
        return $readings->groupBy(fn (WaterReading $reading): string => $reading->recorded_at?->toDateString() ?? 'unknown')
            ->reject(fn (Collection $rows, string $period): bool => $period === 'unknown')
            ->map(fn (Collection $rows, string $period): array => [
                'period' => $period,
                'total_liters' => (float) $rows->sum('liters_used'),
                'total_cubic_meter' => (float) $rows->sum('cubic_meter'),
                'estimated_bill' => (float) $rows->sum('estimated_bill'),
            ])->sortBy('period')->values();
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
        ])->sortBy('period')->values();
    }

    private function activeBilling(int $userId): ?Billing
    {
        return Billing::query()
            ->where('is_active', true)
            ->where(function ($query): void {
                $query->whereNull('effective_date')
                    ->orWhereDate('effective_date', '<=', now()->toDateString());
            })
            ->where(function ($query) use ($userId): void {
                $query->whereNull('user_id')->orWhere('user_id', $userId);
            })
            ->orderByRaw('CASE WHEN user_id IS NULL THEN 1 ELSE 0 END')
            ->orderByRaw('CASE WHEN effective_date IS NULL THEN 0 ELSE 1 END DESC')
            ->orderByDesc('effective_date')
            ->latest('id')
            ->first();
    }

    private function resolveDateRange(array $validated): array
    {
        $timezone = config('app.timezone');
        $from = isset($validated['from']) ? Carbon::parse($validated['from'], $timezone)->startOfDay() : now($timezone)->startOfMonth();
        $to = isset($validated['to']) ? Carbon::parse($validated['to'], $timezone)->endOfDay() : now($timezone)->endOfDay();

        if ($from->greaterThan($to) || $from->diffInDays($to) > 366) {
            throw ValidationException::withMessages(['to' => 'The selected consumption period must be valid and cannot exceed 366 days.']);
        }

        return [$from, $to];
    }

    private function period(Carbon $from, Carbon $to): array
    {
        return ['from' => $from->toIso8601String(), 'to' => $to->toIso8601String(), 'timezone' => config('app.timezone')];
    }
}
