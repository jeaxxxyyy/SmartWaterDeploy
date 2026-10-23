<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AdminActionCenterController;
use App\Http\Controllers\Api\AdminReportController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\BillingDocumentController;
use App\Http\Controllers\Api\BillingManagementController;
use App\Http\Controllers\Api\BillingPaymentController;
use App\Http\Controllers\Api\BillingStatementController;
use App\Http\Controllers\Api\ConsumptionGoalController;
use App\Http\Controllers\Api\ConsumptionMonitoringController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\HouseholdBillingController;
use App\Http\Controllers\Api\HouseholdConsumptionController;
use App\Http\Controllers\Api\LeakAlertController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NotificationPreferenceController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SchedulerController;
use App\Http\Controllers\Api\ServiceRequestController;
use App\Http\Controllers\Api\SystemHealthController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\WaterController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], '/internal/schedule', SchedulerController::class)->name('scheduler.run');

// Health check -------------------------------------------------
Route::get('/ping', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Server is running',
        'timestamp' => now(),
    ]);
});

// Public authentication and device commissioning -------------
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/device-activate', [DeviceController::class, 'activate'])->middleware('throttle:6,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');

// Authenticated household and device endpoints ----------------
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/email/verification-notification', [AuthController::class, 'sendVerificationEmail']);
    Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware('signed')
        ->name('verification.verify');
    Route::get('/readings', [WaterController::class, 'index']);
    Route::get('/live-readings', [WaterController::class, 'liveReadings']);
    Route::get('/consumption-history', [WaterController::class, 'history']);
    Route::get('/exports/readings', [ExportController::class, 'readings']);
    Route::get('/summary', [ReportController::class, 'summary']);
    Route::get('/analytics/household', [AnalyticsController::class, 'household']);
    Route::get('/live-state', [WaterController::class, 'liveState']);
    Route::get('/account', [AccountController::class, 'show']);
    Route::patch('/account', [AccountController::class, 'update']);
    Route::patch('/account/password', [AccountController::class, 'password'])->middleware('throttle:6,1');

    Route::get('/billing-settings', [BillingController::class, 'index']);
    Route::get('/household-billing', [HouseholdBillingController::class, 'index']);
    Route::get('/household-consumption', [HouseholdConsumptionController::class, 'show']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/received/all', [NotificationController::class, 'destroyAllReceived']);
    Route::delete('/notifications/received/{notification}', [NotificationController::class, 'destroyReceived']);
    Route::get('/billing-statements', [BillingStatementController::class, 'index']);
    Route::get('/billing-statements/{billingStatement}', [BillingStatementController::class, 'show']);
    Route::get('/billing-statements/{billingStatement}/document', [BillingDocumentController::class, 'statement']);
    Route::get('/billing-payments/{billingPayment}/receipt', [BillingDocumentController::class, 'receipt']);
    Route::get('/service-requests', [ServiceRequestController::class, 'index']);
    Route::post('/service-requests', [ServiceRequestController::class, 'store']);
    Route::get('/service-requests/{serviceRequest}', [ServiceRequestController::class, 'show']);
    Route::patch('/service-requests/{serviceRequest}', [ServiceRequestController::class, 'update']);
    Route::post('/service-requests/{serviceRequest}/messages', [ServiceRequestController::class, 'reply']);
    Route::get('/notification-preferences', [NotificationPreferenceController::class, 'show']);
    Route::put('/notification-preferences', [NotificationPreferenceController::class, 'update']);
    Route::get('/consumption-goal', [ConsumptionGoalController::class, 'show']);
    Route::put('/consumption-goal', [ConsumptionGoalController::class, 'update']);
});

Route::middleware(['auth:sanctum', 'throttle:120,1'])->post('/water-data', [WaterController::class, 'store']);

// Administrator endpoints --------------------------------------
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/system-health', SystemHealthController::class);
    Route::get('/analytics/admin', [AnalyticsController::class, 'admin']);
    Route::get('/analytics/consumption-baselines', [AnalyticsController::class, 'consumptionBaselines']);
    Route::post('/billing-settings', [BillingController::class, 'store']);
    Route::post('/billing-settings/rates', [BillingController::class, 'storeRates']);
    Route::post('/billing-settings/consumption-alerts', [BillingController::class, 'storeConsumptionAlerts']);
    Route::post('/billing-settings/leak-settings', [BillingController::class, 'storeLeakSettings']);
    Route::post('/billing-statements/generate', [BillingStatementController::class, 'generate']);
    Route::patch('/billing-statements/{billingStatement}/paid', [BillingStatementController::class, 'markAsPaid']);
    Route::post('/billing-statements/{billingStatement}/payments', [BillingPaymentController::class, 'store']);
    Route::patch('/billing-payments/{billingPayment}/void', [BillingPaymentController::class, 'void']);
    Route::get('/admin/action-center', AdminActionCenterController::class);
    Route::get('/billing-management', [BillingManagementController::class, 'index']);
    Route::get('/billing-management/{billingStatement}', [BillingManagementController::class, 'show']);
    Route::get('/users', [UserManagementController::class, 'index']);
    Route::post('/users', [UserManagementController::class, 'store']);
    Route::get('/household-users', [UserManagementController::class, 'indexHouseholds']);
    Route::post('/household-users', [UserManagementController::class, 'storeHousehold']);
    Route::get('/users/{user}', [UserManagementController::class, 'show']);
    Route::put('/users/{user}', [UserManagementController::class, 'update']);
    Route::delete('/users/{user}', [UserManagementController::class, 'destroy']);
    Route::get('/reports/consumption', [ReportController::class, 'consumption']);
    Route::get('/consumption-monitoring', [ConsumptionMonitoringController::class, 'index']);
    Route::get('/consumption-monitoring/{user}/history', [ConsumptionMonitoringController::class, 'history']);
    Route::get('/reports/notifications', [ReportController::class, 'notifications']);
    Route::get('/notification-management', [NotificationController::class, 'adminIndex']);
    Route::post('/notifications/{notification}/retry', [NotificationController::class, 'retry']);
    Route::patch('/notifications/{notification}/archive', [NotificationController::class, 'archive']);
    Route::get('/reports/leaks', [ReportController::class, 'leaks']);
    Route::get('/leak-alerts', [LeakAlertController::class, 'index']);
    Route::patch('/leak-alerts/{leakAlert}', [LeakAlertController::class, 'update']);
    Route::post('/leak-alerts/{leakAlert}/notify', [LeakAlertController::class, 'notify']);
    Route::get('/audit-logs', [AuditLogController::class, 'index']);
    Route::post('/notifications', [NotificationController::class, 'store']);
    Route::get('/municipal-devices', [DeviceController::class, 'index']);
    Route::post('/municipal-devices', [DeviceController::class, 'store']);
    Route::patch('/municipal-devices/{device}', [DeviceController::class, 'update']);
    Route::post('/municipal-devices/{device}/activation-code', [DeviceController::class, 'activationCode']);
    Route::delete('/municipal-devices/{device}', [DeviceController::class, 'decommission']);
    Route::delete('/notifications/sent/all', [NotificationController::class, 'destroyAllSent']);
    Route::delete('/notifications/sent/{notification}', [NotificationController::class, 'destroy']);
    Route::get('/exports/billing-statements', [ExportController::class, 'billingStatements']);
    Route::get('/exports/notifications', [ExportController::class, 'notifications']);
    Route::get('/report-management', [AdminReportController::class, 'index']);
    Route::get('/exports/reports', [AdminReportController::class, 'export']);
});
