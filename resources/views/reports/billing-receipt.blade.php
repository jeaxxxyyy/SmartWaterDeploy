<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #17324d; font-size: 12px; }
        .receipt { border: 2px solid #0ea5e9; padding: 24px; }
        h1 { margin: 0 0 4px; color: #075985; }
        .muted { color: #64748b; }
        table { width: 100%; margin-top: 24px; border-collapse: collapse; }
        td { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        td:last-child { text-align: right; font-weight: bold; }
        .amount { font-size: 20px; color: #075985; }
        .footer { margin-top: 28px; color: #64748b; }
    </style>
</head>
<body>
    <div class="receipt">
        <h1>Official Payment Receipt</h1>
        <div class="muted">SmartWater</div>
        <table>
            <tr><td>Receipt number</td><td>{{ $payment->receipt_number }}</td></tr>
            <tr><td>Household</td><td>{{ $payment->statement->user->name }}</td></tr>
            <tr><td>Account number</td><td>{{ $payment->statement->user->account_number }}</td></tr>
            <tr><td>Statement number</td><td>{{ $payment->statement->statement_number }}</td></tr>
            <tr><td>Date received</td><td>{{ optional($payment->received_at)->format('M j, Y g:i A') }}</td></tr>
            <tr><td>Payment method</td><td>{{ str($payment->payment_method)->replace('_', ' ')->title() }}</td></tr>
            @if($payment->reference_number)<tr><td>Reference</td><td>{{ $payment->reference_number }}</td></tr>@endif
            <tr class="amount"><td>Amount received</td><td>{{ $payment->statement->currency }} {{ number_format((float) $payment->amount, 2) }}</td></tr>
            <tr><td>Recorded by</td><td>{{ $payment->recorder?->name ?? 'Municipal staff' }}</td></tr>
        </table>
        <div class="footer">This receipt confirms an offline payment recorded by authorized municipal staff. No online payment was processed by this website.</div>
    </div>
</body>
</html>
