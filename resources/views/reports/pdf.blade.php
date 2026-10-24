<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        @page { margin: 28px; }
        body { color: #172033; font-family: DejaVu Sans, sans-serif; font-size: 10px; }
        h1 { color: #075985; font-size: 20px; margin: 0 0 4px; }
        .meta { color: #64748b; margin-bottom: 18px; }
        table { border-collapse: collapse; width: 100%; }
        th { background: #075985; color: white; padding: 7px; text-align: left; }
        td { border-bottom: 1px solid #cbd5e1; padding: 6px 7px; vertical-align: top; }
        tr:nth-child(even) td { background: #f0f9ff; }
        .empty { color: #64748b; padding: 18px; text-align: center; }
        footer { color: #64748b; margin-top: 14px; text-align: right; }
    </style>
</head>
<body>
    <h1>SmartWater</h1>
    <div class="meta">{{ $title }} - Generated {{ $generatedAt->format('F j, Y g:i A') }}</div>
    <table>
        <thead><tr>@foreach ($headers as $header)<th>{{ $header }}</th>@endforeach</tr></thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>@foreach ($row as $cell)<td>{{ $cell }}</td>@endforeach</tr>
            @empty
                <tr><td class="empty" colspan="{{ count($headers) }}">No records available.</td></tr>
            @endforelse
        </tbody>
    </table>
    <footer>Printable system-generated report</footer>
</body>
</html>
