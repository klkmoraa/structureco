import type { StructuralAssetDetail, StructuralAssetFamily, StructuralAssetVariantName } from './types';

const lineColor = 'var(--structural-asset-line, currentColor)';
const primaryColor = 'var(--structural-asset-primary, currentColor)';
const secondaryColor = 'var(--structural-asset-secondary, currentColor)';
const accentColor = 'var(--structural-asset-accent, currentColor)';

const Members = ({ paths, accent = false }: { paths: readonly string[]; accent?: boolean }) => (
  <>
    {paths.map((d) => (
      <path
        key={d}
        className="structural-illustration__member"
        data-element="member"
        d={d}
        fill="none"
        stroke={accent ? accentColor : lineColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
        vectorEffect="non-scaling-stroke"
      />
    ))}
  </>
);

const Web = ({ paths }: { paths: readonly string[] }) => (
  <>
    {paths.map((d) => (
      <path
        key={d}
        className="structural-illustration__web"
        data-element="web"
        d={d}
        fill="none"
        stroke={secondaryColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.5"
        vectorEffect="non-scaling-stroke"
      />
    ))}
  </>
);

const Face = ({ d, accent = false, opacity = 0.14 }: { d: string; accent?: boolean; opacity?: number }) => (
  <path
    className="structural-illustration__face"
    data-element="surface"
    d={d}
    fill={accent ? accentColor : primaryColor}
    fillOpacity={opacity}
    stroke={lineColor}
    strokeLinejoin="round"
    strokeWidth="2"
    vectorEffect="non-scaling-stroke"
  />
);

const Nodes = ({ points }: { points: ReadonlyArray<readonly [number, number]> }) => (
  <>
    {points.map(([cx, cy]) => (
      <circle
        key={`${cx}:${cy}`}
        className="structural-illustration__node"
        data-element="node"
        cx={cx}
        cy={cy}
        r="4.2"
        fill={primaryColor}
        stroke={lineColor}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    ))}
  </>
);

const Ground = ({ x1 = 30, x2 = 210, y = 132 }: { x1?: number; x2?: number; y?: number }) => (
  <g className="structural-illustration__ground" data-element="ground">
    <path d={`M${x1} ${y}H${x2}`} fill="none" stroke={secondaryColor} strokeWidth="2" />
    <path
      d={`M${x1 + 8} ${y}l-7 8m27-8-7 8m27-8-7 8m27-8-7 8m27-8-7 8m27-8-7 8m27-8-7 8`}
      fill="none"
      stroke={secondaryColor}
      strokeWidth="1.5"
    />
  </g>
);

type SupportKind = 'pin' | 'roller' | 'fixed' | 'spring';

const SupportGlyph = ({ kind, x, y, scale = 1 }: { kind: SupportKind; x: number; y: number; scale?: number }) => (
  <g
    className={`structural-illustration__support structural-illustration__support--${kind}`}
    data-element="support"
    transform={`translate(${x} ${y}) scale(${scale})`}
  >
    {kind === 'pin' ? (
      <>
        <path d="M0 0-13 22H13Z" fill={primaryColor} fillOpacity="0.12" stroke={lineColor} strokeWidth="2.2" />
        <path d="M-18 24H18M-14 24l-6 7m18-7-6 7m18-7-6 7" fill="none" stroke={lineColor} strokeWidth="2" />
      </>
    ) : null}
    {kind === 'roller' ? (
      <>
        <path d="M0 0-13 18H13Z" fill={primaryColor} fillOpacity="0.12" stroke={lineColor} strokeWidth="2.2" />
        <circle cx="-7" cy="23" r="4" fill="none" stroke={lineColor} strokeWidth="2" />
        <circle cx="7" cy="23" r="4" fill="none" stroke={lineColor} strokeWidth="2" />
        <path d="M-18 29H18" fill="none" stroke={lineColor} strokeWidth="2" />
      </>
    ) : null}
    {kind === 'fixed' ? (
      <>
        <path d="M0-24V26" fill="none" stroke={lineColor} strokeWidth="5" />
        <path d="M0-22 12-31M0-9 12-18M0 4l12-9M0 17l12-9M0 30l12-9" fill="none" stroke={secondaryColor} strokeWidth="2" />
      </>
    ) : null}
    {kind === 'spring' ? (
      <>
        <path d="M0 0v8l-10 6 20 8-20 8 20 8-10 6v7" fill="none" stroke={lineColor} strokeWidth="2.8" />
        <path d="M-18 51H18M-14 51l-6 7m18-7-6 7m18-7-6 7" fill="none" stroke={secondaryColor} strokeWidth="2" />
      </>
    ) : null}
  </g>
);

const PortalGeometry = ({ variant }: { variant: StructuralAssetVariantName }) => {
  if (variant === 'single-bay') {
    return <><Members paths={['M55 126V48H185V126']} /><Face d="M43 126h24l8 9H35Z" /><Face d="M173 126h24l8 9h-40Z" /><Nodes points={[[55, 48], [185, 48]]} /></>;
  }
  if (variant === 'two-bay') {
    return <><Members paths={['M36 126V54H120V126', 'M120 54H204V126']} /><Face d="M24 126h24l8 9H16Z" /><Face d="M108 126h24l8 9h-40Z" /><Face d="M192 126h24l8 9h-40Z" /><Nodes points={[[36, 54], [120, 54], [204, 54]]} /></>;
  }
  if (variant === 'two-story') {
    return <><Members paths={['M55 132V28', 'M185 132V28', 'M55 80H185', 'M55 28H185']} /><Web paths={['M55 80l130-52', 'M185 80 55 28']} /><Face d="M43 132h24l8 8H35Z" /><Face d="M173 132h24l8 8h-40Z" /><Nodes points={[[55, 28], [185, 28], [55, 80], [185, 80]]} /></>;
  }
  return <><Members paths={['M42 130V74L120 30l78 44v56', 'M42 74h156']} accent /><Web paths={['M65 61v69', 'M175 61v69', 'M82 52l38 22 38-22']} /><Face d="M30 130h24l8 9H22Z" /><Face d="M186 130h24l8 9h-40Z" /><Nodes points={[[42, 74], [120, 30], [198, 74]]} /></>;
};

const BeamGeometry = ({ variant }: { variant: StructuralAssetVariantName }) => {
  const supports: Array<{ kind: SupportKind; x: number }> = [];
  let beamPath = 'M35 70H205';
  if (variant === 'simply-supported') supports.push({ kind: 'pin', x: 45 }, { kind: 'roller', x: 195 });
  if (variant === 'two-span') supports.push({ kind: 'pin', x: 35 }, { kind: 'roller', x: 120 }, { kind: 'roller', x: 205 });
  if (variant === 'three-span') supports.push({ kind: 'pin', x: 25 }, { kind: 'roller', x: 88 }, { kind: 'roller', x: 152 }, { kind: 'roller', x: 215 });
  if (variant === 'overhang') {
    beamPath = 'M20 70H220';
    supports.push({ kind: 'pin', x: 65 }, { kind: 'roller', x: 170 });
  }
  return <><Members paths={[beamPath]} accent={variant === 'overhang'} />{supports.map((support) => <SupportGlyph key={`${support.kind}:${support.x}`} kind={support.kind} x={support.x} y={74} scale={0.72} />)}<Nodes points={supports.map(({ x }) => [x, 70] as const)} /></>;
};

const CantileverGeometry = ({ variant }: { variant: StructuralAssetVariantName }) => {
  if (variant === 'wall') {
    return <><SupportGlyph kind="fixed" x={46} y={78} scale={1.3} /><Members paths={['M46 78H205']} /><Nodes points={[[205, 78]]} /></>;
  }
  if (variant === 'double') {
    return <><Members paths={['M24 76H216', 'M120 76V128']} /><Face d="M107 128h26l10 9H97Z" /><Nodes points={[[24, 76], [120, 76], [216, 76]]} /></>;
  }
  if (variant === 'stepped') {
    return <><SupportGlyph kind="fixed" x={38} y={92} scale={1.15} /><Members paths={['M38 92H104V68H164V46H214']} /><Nodes points={[[104, 92], [104, 68], [164, 68], [164, 46], [214, 46]]} /></>;
  }
  return <><SupportGlyph kind="fixed" x={42} y={92} scale={1.15} /><Face d="M42 70 205 50l20 18L58 92Z" opacity={0.2} /><Web paths={['M58 92 42 70', 'M205 50l20 18', 'M95 65l17 18', 'M153 58l18 18']} /><Nodes points={[[42, 70], [58, 92], [205, 50], [225, 68]]} /></>;
};

const TrussGeometry = ({ variant }: { variant: StructuralAssetVariantName }) => {
  const bottom = 'M25 118H215';
  if (variant === 'pratt') {
    return <><Members paths={[bottom, 'M25 118 60 58h120l35 60']} /><Web paths={['M60 58v60M100 58v60M140 58v60M180 58v60M60 58l40 60m0-60 40 60m0-60 40 60']} /><Nodes points={[[25, 118], [60, 58], [100, 58], [140, 58], [180, 58], [215, 118]]} /></>;
  }
  if (variant === 'howe') {
    return <><Members paths={[bottom, 'M25 118 60 58h120l35 60']} /><Web paths={['M60 58v60M100 58v60M140 58v60M180 58v60M100 58l-40 60m80-60-40 60m80-60-40 60']} /><Nodes points={[[25, 118], [60, 58], [100, 58], [140, 58], [180, 58], [215, 118]]} /></>;
  }
  if (variant === 'warren') {
    return <><Members paths={[bottom, 'M25 118 55 62h130l30 56']} /><Web paths={['M25 118 55 62l32 56 33-56 33 56 32-56 30 56']} /><Nodes points={[[25, 118], [55, 62], [87, 118], [120, 62], [153, 118], [185, 62], [215, 118]]} /></>;
  }
  return <><Members paths={[bottom, 'M25 118 120 40l95 78']} /><Web paths={['M120 40v78', 'M72 79l48 39m48-39-48 39']} /><Nodes points={[[25, 118], [72, 79], [120, 40], [168, 79], [215, 118]]} /></>;
};

const SlabGeometry = ({ variant }: { variant: StructuralAssetVariantName }) => {
  const outline = <Face d="M35 58 166 35l42 55-132 28Z" opacity={0.18} />;
  if (variant === 'one-way') {
    return <>{outline}<Web paths={['M55 55l42 55', 'M82 50l42 54', 'M109 45l42 54', 'M136 40l42 53']} /><Members paths={['M76 118v20', 'M208 90v20']} /></>;
  }
  if (variant === 'two-way') {
    return <>{outline}<Web paths={['M55 55l42 55', 'M82 50l42 54', 'M109 45l42 54', 'M136 40l42 53', 'M46 72l132-25', 'M58 88l132-26', 'M69 103l132-26']} /></>;
  }
  if (variant === 'waffle') {
    return <>{outline}<Web paths={['M50 55l42 55', 'M74 51l42 54', 'M98 47l42 53', 'M122 43l42 52', 'M146 39l42 51', 'M42 68l132-24', 'M51 80l132-25', 'M61 92l132-25', 'M70 104l132-26']} /><Face d="M75 118 207 90v10L77 130Z" opacity={0.1} /></>;
  }
  return <>{outline}<Members paths={['M64 105v32', 'M184 80v32', 'M52 74v31', 'M170 49v31']} /><Face d="M56 132h17l6 5H50Z" /><Face d="M176 107h17l6 5h-29Z" /><Face d="M44 100h17l6 5H38Z" /><Face d="M162 75h17l6 5h-29Z" /></>;
};

const SpaceFrameGeometry = ({ variant }: { variant: StructuralAssetVariantName }) => {
  if (variant === 'single-module') {
    return <><Members paths={['M48 126V62L118 42l68 34v62', 'M48 62l68 34 70-20', 'M116 96v42', 'M48 126l68 18 70-6']} /><Nodes points={[[48, 62], [118, 42], [186, 76], [116, 96]]} /></>;
  }
  if (variant === 'multi-bay') {
    return <><Members paths={['M24 128V72L94 52l70 30v56', 'M94 52l48-16 72 28v56', 'M24 72l70 28 70-18 50 20', 'M94 100v38', 'M164 82v56', 'M142 36v102', 'M24 128l70 18 70-8 50-18']} /><Web paths={['M58 62v75', 'M129 66v76', 'M178 50v79']} /><Nodes points={[[24, 72], [94, 52], [142, 36], [164, 82], [214, 64]]} /></>;
  }
  if (variant === 'two-story') {
    return <><Members paths={['M42 138V45', 'M116 22v120', 'M194 57v82', 'M42 45l74-23 78 35', 'M42 87l74-21 78 31', 'M42 138l74-17 78 18', 'M116 66v76']} /><Web paths={['M42 45l74 21 78-9', 'M42 87l74 34 78-24']} /><Nodes points={[[42, 45], [116, 22], [194, 57], [42, 87], [116, 66], [194, 97]]} /></>;
  }
  return <><Members paths={['M30 136V78L80 44l44 20 42-31 48 30v73', 'M30 78l50 18 44-32 42 28 48-29', 'M80 96v40', 'M124 64v72', 'M166 92v44']} accent /><Web paths={['M50 64l30 32', 'M102 54l22 10', 'M145 48l21 44', 'M190 48l24 15']} /><Nodes points={[[30, 78], [80, 44], [124, 64], [166, 33], [214, 63]]} /></>;
};

const SupportGeometry = ({ variant }: { variant: StructuralAssetVariantName }) => {
  if (variant === 'pin') return <><Members paths={['M48 55H192']} /><SupportGlyph kind="pin" x={120} y={55} scale={1.6} /></>;
  if (variant === 'roller') return <><Members paths={['M48 48H192']} /><SupportGlyph kind="roller" x={120} y={48} scale={1.55} /></>;
  if (variant === 'fixed') return <><SupportGlyph kind="fixed" x={68} y={82} scale={1.7} /><Members paths={['M68 82H205']} /><Nodes points={[[205, 82]]} /></>;
  return <><Members paths={['M55 38H185']} /><SupportGlyph kind="spring" x={120} y={38} scale={1.55} /></>;
};

const Arrow = ({ x, y1, y2 }: { x: number; y1: number; y2: number }) => (
  <g className="structural-illustration__load" data-element="load">
    <path d={`M${x} ${y1}V${y2}`} fill="none" stroke={accentColor} strokeLinecap="round" strokeWidth="3.5" />
    <path d={`m${x - 7} ${y2 - 9} 7 9 7-9`} fill="none" stroke={accentColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
  </g>
);

const LoadGeometry = ({ variant }: { variant: StructuralAssetVariantName }) => {
  if (variant === 'point') return <><Members paths={['M32 112H208']} /><Arrow x={120} y1={25} y2={103} /><Nodes points={[[120, 112]]} /></>;
  if (variant === 'distributed') return <><Members paths={['M26 118H214']} /><Web paths={['M42 36H198']} />{[42, 81, 120, 159, 198].map((x) => <Arrow key={x} x={x} y1={36} y2={109} />)}</>;
  if (variant === 'varying') return <><Members paths={['M26 122H214']} /><path d="M38 105 198 30" fill="none" stroke={accentColor} strokeWidth="3" />{[[38, 105], [78, 86], [118, 68], [158, 49], [198, 30]].map(([x, y]) => <Arrow key={x} x={x} y1={y} y2={113} />)}</>;
  return <><Members paths={['M42 118H198']} /><path className="structural-illustration__load" data-element="load" d="M167 78a54 54 0 1 0-52 39" fill="none" stroke={accentColor} strokeLinecap="round" strokeWidth="5" /><path d="m105 105 10 12 14-8" fill="none" stroke={accentColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" /><Nodes points={[[120, 118]]} /></>;
};

const SectionGeometry = ({ variant }: { variant: StructuralAssetVariantName }) => {
  if (variant === 'rectangular') return <><Face d="M66 28H174V132H66Z" opacity={0.22} /><Web paths={['M82 44h76v72H82Z']} /></>;
  if (variant === 'circular') return <><circle className="structural-illustration__face" data-element="section" cx="120" cy="80" r="55" fill={primaryColor} fillOpacity="0.18" stroke={lineColor} strokeWidth="3" /><circle cx="120" cy="80" r="39" fill="none" stroke={secondaryColor} strokeWidth="2" /></>;
  if (variant === 'i-profile') return <><Face d="M52 30H188V54H137V106H188V130H52V106H103V54H52Z" opacity={0.2} /><Web paths={['M103 54h34', 'M103 106h34']} /></>;
  return <><Face d="M54 27H186V133H54ZM80 52V108H160V52Z" opacity={0.2} /><Nodes points={[[54, 27], [186, 27], [186, 133], [54, 133]]} /></>;
};

const Bolt = ({ cx, cy }: { cx: number; cy: number }) => <circle className="structural-illustration__bolt" data-element="fastener" cx={cx} cy={cy} r="4" fill={accentColor} stroke={lineColor} strokeWidth="1.5" />;

const ConnectionGeometry = ({ variant }: { variant: StructuralAssetVariantName }) => {
  if (variant === 'rigid') return <><Members paths={['M76 136V25', 'M76 75H210']} /><Face d="M66 57h30v37H66Z" accent opacity={0.22} /><Bolt cx={74} cy={66} /><Bolt cx={88} cy={66} /><Bolt cx={74} cy={84} /><Bolt cx={88} cy={84} /></>;
  if (variant === 'pinned') return <><Members paths={['M72 136V25', 'M72 76H210']} /><Face d="M68 61h24v30H68Z" accent opacity={0.18} /><Bolt cx={80} cy={76} /><path d="M92 62v28" fill="none" stroke={accentColor} strokeWidth="3" /></>;
  if (variant === 'base-plate') return <><Members paths={['M120 25V112']} /><Face d="M76 108H164L181 125H59Z" accent opacity={0.22} /><Bolt cx={78} cy={117} /><Bolt cx={162} cy={117} /><Ground x1={45} x2={195} y={132} /></>;
  return <><Members paths={['M28 80H212']} /><Face d="M92 56h56v48H92Z" accent opacity={0.18} /><Bolt cx={104} cy={68} /><Bolt cx={136} cy={68} /><Bolt cx={104} cy={92} /><Bolt cx={136} cy={92} /><path d="M120 52v56" fill="none" stroke={secondaryColor} strokeDasharray="5 4" strokeWidth="2" /></>;
};

const DetailOverlay = ({ detail }: { detail: StructuralAssetDetail }) => (
  <>
    {detail !== 'compact' ? (
      <g className="structural-illustration__detail" data-asset-detail="card" opacity="0.55">
        <path d="M24 145H216" fill="none" stroke={secondaryColor} strokeDasharray="3 5" strokeWidth="1.5" />
      </g>
    ) : null}
    {detail === 'hero' ? (
      <g className="structural-illustration__detail" data-asset-detail="hero" opacity="0.7">
        <path d="M25 137V119M25 137h18" fill="none" stroke={accentColor} strokeWidth="2" />
        <circle cx="25" cy="137" r="3" fill={accentColor} stroke="none" />
      </g>
    ) : null}
  </>
);

export const StructuralAssetGeometry = ({
  family,
  variant,
  detail,
}: {
  family: StructuralAssetFamily;
  variant: StructuralAssetVariantName;
  detail: StructuralAssetDetail;
}) => (
  <>
    <g
      className={`structural-illustration__geometry structural-illustration__geometry--${family}`}
      data-structural-geometry={`${family}:${variant}`}
    >
      {family === 'portal' ? <PortalGeometry variant={variant} /> : null}
      {family === 'beam' ? <BeamGeometry variant={variant} /> : null}
      {family === 'cantilever' ? <CantileverGeometry variant={variant} /> : null}
      {family === 'truss' ? <TrussGeometry variant={variant} /> : null}
      {family === 'slab' ? <SlabGeometry variant={variant} /> : null}
      {family === 'space-frame' ? <SpaceFrameGeometry variant={variant} /> : null}
      {family === 'support' ? <SupportGeometry variant={variant} /> : null}
      {family === 'load' ? <LoadGeometry variant={variant} /> : null}
      {family === 'section' ? <SectionGeometry variant={variant} /> : null}
      {family === 'connection' ? <ConnectionGeometry variant={variant} /> : null}
    </g>
    <DetailOverlay detail={detail} />
  </>
);
