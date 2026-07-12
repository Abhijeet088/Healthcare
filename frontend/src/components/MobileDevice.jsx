import React, { useState, useEffect } from 'react';

export default function MobileDevice({ children }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Outer Phone Shell — Medical White with Green accents */}
      <div
        style={{
          position: 'relative',
          width: 380,
          height: 780,
          background: 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)',
          border: '4px solid #15803d',
          borderRadius: 48,
          padding: 12,
          boxShadow: `
            0 30px 60px -10px rgba(20, 83, 45, 0.35),
            0 0 0 1px rgba(22,163,74,0.15),
            0 0 50px rgba(22, 163, 74, 0.12),
            inset 0 1px 0 rgba(255,255,255,0.9)
          `,
        }}
      >
        {/* Side buttons */}
        <div style={{ position: 'absolute', left: -6, top: 120, width: 4, height: 30, background: '#15803d', borderRadius: '3px 0 0 3px' }} />
        <div style={{ position: 'absolute', left: -6, top: 165, width: 4, height: 50, background: '#15803d', borderRadius: '3px 0 0 3px' }} />
        <div style={{ position: 'absolute', left: -6, top: 228, width: 4, height: 50, background: '#15803d', borderRadius: '3px 0 0 3px' }} />
        <div style={{ position: 'absolute', right: -6, top: 165, width: 4, height: 70, background: '#15803d', borderRadius: '0 3px 3px 0' }} />

        {/* Notch */}
        <div style={{
          width: 130, height: 26,
          background: 'linear-gradient(135deg, #14532d, #15803d)',
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          borderBottomLeftRadius: 18, borderBottomRightRadius: 18, zIndex: 100,
          boxShadow: '0 2px 8px rgba(20,83,45,0.4)'
        }}>
          <div style={{ width: 56, height: 5, background: 'rgba(255,255,255,0.25)', borderRadius: 4, margin: '10px auto 0' }} />
        </div>

        {/* Home Indicator */}
        <div style={{
          position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
          width: 120, height: 4, background: 'rgba(22,163,74,0.35)', borderRadius: 4, zIndex: 50
        }} />

        {/* Screen Area */}
        <div style={{
          height: '100%',
          overflowY: 'auto',
          borderRadius: 36,
          background: 'linear-gradient(170deg, #f0fdf4 0%, #fafffe 60%, #f0fdf4 100%)',
          padding: '30px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          scrollbarWidth: 'none',
        }}>
          {/* Status Bar */}
          <div style={{
            position: 'absolute', top: 8, left: 24, right: 24,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 11, fontWeight: 700, color: '#15803d', zIndex: 50
          }}>
            <div style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.01em' }}>{formatTime(time)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Signal bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 10 }}>
                {[3, 5, 7, 9].map((h, i) => (
                  <div key={i} style={{
                    width: 2.5, height: h,
                    background: i === 3 ? '#22c55e' : 'rgba(22,163,74,0.45)',
                    borderRadius: 2
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 10, letterSpacing: '0.04em' }}>5G</span>
              {/* Battery */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, border: '1.5px solid rgba(22,163,74,0.45)', borderRadius: 4, padding: '1px 2px', width: 22, height: 11 }}>
                <div style={{ height: '100%', background: '#22c55e', borderRadius: 2, width: '85%' }} />
              </div>
              <span style={{ fontSize: 10 }}>85%</span>
            </div>
          </div>

          {/* Screen Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 12, paddingBottom: 32, overflowY: 'auto' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
