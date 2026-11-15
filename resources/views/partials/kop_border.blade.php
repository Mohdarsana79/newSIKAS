@php
    $kopBorder = $border ?? ($sekolah->kop_border ?? 'double');
@endphp
@if ($kopBorder === 'double')
    <div style="width: 100%; border-top: 3px solid #000; border-bottom: 1px solid #000; height: 2px; margin-top: 1px; margin-bottom: 8px;"></div>
@elseif ($kopBorder === 'single')
    <div style="width: 100%; border-top: 2px solid #000; margin-top: 1px; margin-bottom: 8px;"></div>
@endif
