import { getStops } from '../../../utils/mapUtils';
import { useSelector } from 'react-redux';
import { useState } from 'react';

const drapStops = [
  { val: 0, color: '#000000' },
  { val: 5, color: '#7700ff' },
  { val: 10, color: '#0000ff' },
  { val: 15, color: '#00ffff' },
  { val: 20, color: '#55ff00' },
  { val: 25, color: '#ffff00' },
  { val: 30, color: '#ff8000' },
  { val: 35, color: '#ff0000' },
];

const DetailLabels = ({ stops, formatter, unit, visible }) => (
  <div style={{
    maxHeight: visible ? '20px' : '0px',
    overflow: 'hidden',
    opacity: visible ? 1 : 0,
    transition: 'max-height 0.3s ease, opacity 0.3s ease',
    marginTop: visible ? '-4px' : '0px',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    paddingLeft: '80px',
    paddingRight: '6px',
    fontSize: '12px',
    fontWeight: 500,
    boxSizing: 'border-box',
  }}>
    {stops.map((s, idx) => (
      <span key={idx}>{formatter ? formatter(s.val) : s.val}{unit}</span>
    ))}
  </div>
);

const GradientSection = ({ title, gradientCSS, minLabel, maxLabel, hovered }) => (
  <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '6px' }}>
    <div style={{
      fontWeight: 600,
      fontSize: '13px',
      whiteSpace: 'nowrap',
      width: '70px',
      flexShrink: 0,
      textAlign: 'right',
    }}>
      {title}
    </div>
    <span style={{
      fontSize: '13px', fontWeight: 500, width: '8%', flexShrink: 0, textAlign: 'right',
      opacity: hovered ? 0 : 1, maxWidth: hovered ? '0px' : '8%', overflow: 'hidden',
      transition: 'opacity 0.3s ease, max-width 0.3s ease',
    }}>{minLabel}</span>
    <div style={{
      flex: 1,
      height: '14px',
      border: 'var(--ui-border)',
      borderRadius: '2px',
      background: gradientCSS,
    }} />
    <span style={{
      fontSize: '14px', fontWeight: 500, width: '8%', flexShrink: 0, textAlign: 'left',
      opacity: hovered ? 0 : 1, maxWidth: hovered ? '0px' : '8%', overflow: 'hidden',
      transition: 'opacity 0.3s ease, max-width 0.3s ease',
    }}>{maxLabel}</span>
  </div>
);

const AltitudeLegend = () => {
  const useImperial = useSelector((state) => state.ui.useImperial);
  const [hovered, setHovered] = useState(false);
  const altStops = getStops(useImperial);

  const altGradient = `linear-gradient(to right, ${
    altStops.map((s, idx, arr) =>
      `rgb(${s.color.join(',')}) ${(idx / (arr.length - 1)) * 100}%`
    ).join(', ')
  })`;

  const drapGradient = `linear-gradient(to right, ${
    drapStops.map((s, idx, arr) =>
      `${s.color} ${(idx / (arr.length - 1)) * 100}%`
    ).join(', ')
  })`;

  const formatAlt = (val) => val >= 1000 ? `${val / 1000}k` : `${val}`;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: '40%',
        pointerEvents: 'none',
      }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '10px 14px 6px 14px',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          boxSizing: 'border-box',
          transition: 'all 0.3s ease',
          backgroundColor: 'var(--ui-bg)',
          color: 'var(--ui-text)',
          boxShadow: 'var(--ui-shadow)',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'auto',
      }}>
      <GradientSection
        title="DRAP"
        gradientCSS={drapGradient}
        minLabel={`${drapStops[0].val} dB`}
        maxLabel={`${drapStops[drapStops.length - 1].val} dB`}
        hovered={hovered}
      />
      <DetailLabels stops={drapStops} unit=" dB" visible={hovered} />
      <GradientSection
        title="ALTITUDE"
        gradientCSS={altGradient}
        minLabel={`${formatAlt(altStops[0].val)} ${useImperial ? 'ft' : 'm'}`}
        maxLabel={`${formatAlt(altStops[altStops.length - 1].val)}+ ${useImperial ? 'ft' : 'm'}`}
        hovered={hovered}
      />
      <DetailLabels stops={altStops} formatter={formatAlt} unit={useImperial ? ' ft' : ' m'} visible={hovered} />
      </div>
    </div>
  );
};
export default AltitudeLegend;