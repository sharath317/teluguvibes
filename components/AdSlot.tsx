'use client';

interface AdSlotProps {
  slot: 'header' | 'sidebar' | 'mid-article';
  className?: string;
}

const slotConfig = {
  header: {
    width: 728,
    height: 90,
    label: 'Header Ad (728x90)',
  },
  sidebar: {
    width: 300,
    height: 600,
    label: 'Sidebar Ad (300x600)',
  },
  'mid-article': {
    width: 300,
    height: 250,
    label: 'In-Article Ad (300x250)',
  },
};

export function AdSlot({ slot, className = '' }: AdSlotProps) {
  const config = slotConfig[slot];

  return (
    <div
      className={`flex items-center justify-center bg-[#141414] border border-dashed border-[#262626] rounded-lg ${className}`}
      style={{
        width: '100%',
        maxWidth: config.width,
        height: config.height,
      }}
      data-ad-slot={slot}
      data-ad-format="auto"
    >
      {/* Placeholder - Replace with actual AdSense code */}
      <div className="text-center text-[#737373] text-xs">
        <div className="mb-1">📢</div>
        <div>{config.label}</div>
        <div className="text-[10px] mt-1 opacity-50">
          Replace with AdSense code
        </div>
      </div>
    </div>
  );
}

// For actual AdSense integration, use this component:
export function GoogleAdSlot({
  client,
  slot,
  format = 'auto',
  responsive = true,
}: {
  client: string;
  slot: string;
  format?: string;
  responsive?: boolean;
}) {
  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
