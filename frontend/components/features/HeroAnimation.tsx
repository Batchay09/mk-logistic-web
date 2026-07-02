"use client"

import { useEffect, useRef } from "react"

export function HeroAnimation() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: "340px" }}>
      <style>{`
        @keyframes truckDrive {
          0%   { transform: translateX(-320px); }
          40%  { transform: translateX(calc(50vw - 160px)); }
          60%  { transform: translateX(calc(50vw - 160px)); }
          100% { transform: translateX(calc(50vw - 160px)); }
        }
        @keyframes truckWheelSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes boxFlyWB {
          0%   { opacity: 0; transform: translate(0px, 0px) scale(0.5) rotate(-10deg); }
          15%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-220px, -90px) scale(0.8) rotate(10deg); }
        }
        @keyframes boxFlyOzon {
          0%   { opacity: 0; transform: translate(0px, 0px) scale(0.5) rotate(10deg); }
          15%  { opacity: 1; }
          100% { opacity: 0; transform: translate(220px, -90px) scale(0.8) rotate(-10deg); }
        }
        @keyframes warehousePulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(212,81,43,0)); }
          50%       { filter: drop-shadow(0 0 18px rgba(212,81,43,0.6)); }
        }
        @keyframes roadDash {
          from { stroke-dashoffset: 60; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes cloudFloat {
          0%, 100% { transform: translateX(0px); }
          50%       { transform: translateX(18px); }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 1; }
        }
        @keyframes exhaustPuff {
          0%   { opacity: 0.7; transform: translateX(0) scaleX(1); }
          100% { opacity: 0;   transform: translateX(-30px) scaleX(2); }
        }
        @keyframes wbGlow {
          0%, 100% { fill: #9333EA; }
          50%       { fill: #A855F7; }
        }
        @keyframes ozonGlow {
          0%, 100% { fill: #2563EB; }
          50%       { fill: #3B82F6; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }

        .truck-group {
          animation: truckDrive 6s ease-in-out infinite;
        }
        .wheel {
          animation: truckWheelSpin 0.6s linear infinite;
        }
        .box-wb-1 { animation: boxFlyWB 6s 3.5s ease-out infinite; }
        .box-wb-2 { animation: boxFlyWB 6s 4.1s ease-out infinite; }
        .box-ozon-1 { animation: boxFlyOzon 6s 3.8s ease-out infinite; }
        .box-ozon-2 { animation: boxFlyOzon 6s 4.4s ease-out infinite; }
        .road-dash { animation: roadDash 1s linear infinite; }
        .cloud-1 { animation: cloudFloat 8s ease-in-out infinite; }
        .cloud-2 { animation: cloudFloat 10s ease-in-out infinite reverse; }
        .cloud-3 { animation: cloudFloat 12s ease-in-out infinite; }
        .exhaust { animation: exhaustPuff 0.5s ease-out infinite; }
        .exhaust-2 { animation: exhaustPuff 0.5s 0.25s ease-out infinite; }
        .wh-wb { animation: warehousePulse 3s ease-in-out 3.5s infinite; }
        .wh-ozon { animation: warehousePulse 3s ease-in-out 3.8s infinite; }
        .wb-label { animation: wbGlow 2s ease-in-out 3.5s infinite; }
        .ozon-label { animation: ozonGlow 2s ease-in-out 3.8s infinite; }
        .bounce-wb { animation: bounce 2s ease-in-out 4s infinite; }
        .bounce-ozon { animation: bounce 2s ease-in-out 4.3s infinite; }
      `}</style>

      <svg
        viewBox="0 0 1000 340"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sky gradient */}
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A0A00" />
            <stop offset="45%" stopColor="#8B2500" />
            <stop offset="75%" stopColor="#D4512B" />
            <stop offset="100%" stopColor="#E8763A" />
          </linearGradient>
          <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A2A2A" />
            <stop offset="100%" stopColor="#1A1A1A" />
          </linearGradient>
          <linearGradient id="truckBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5F5F0" />
            <stop offset="100%" stopColor="#E0E0D8" />
          </linearGradient>
          <linearGradient id="cabGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D4512B" />
            <stop offset="100%" stopColor="#B33D1A" />
          </linearGradient>
          <linearGradient id="wbGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7E22CE" />
            <stop offset="100%" stopColor="#6B21A8" />
          </linearGradient>
          <linearGradient id="ozonGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="mountainGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5C1500" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#8B2500" stopOpacity="0.3"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        {/* Background */}
        <rect width="1000" height="340" fill="url(#skyGrad)" />

        {/* Stars */}
        {[
          [80, 30], [150, 50], [220, 20], [320, 40], [420, 15],
          [500, 45], [580, 25], [680, 35], [770, 20], [870, 40],
          [930, 60], [50, 65], [260, 70], [640, 55], [750, 65],
        ].map(([x, y], i) => (
          <circle
            key={i}
            cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1}
            fill="white"
            opacity={0.6}
            style={{ animation: `starTwinkle ${1.5 + (i * 0.3)}s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}

        {/* Moon */}
        <circle cx={880} cy={45} r={28} fill="#FFD580" opacity={0.9} />
        <circle cx={892} cy={38} r={22} fill="#8B2500" opacity={0.85} />

        {/* Mountains silhouette */}
        <polygon points="0,230 80,120 160,180 240,100 340,175 420,115 500,180 580,90 660,170 740,110 820,165 900,95 1000,160 1000,240 0,240" fill="url(#mountainGrad)" />
        <polygon points="0,240 60,170 140,210 240,145 360,205 480,150 560,200 680,140 780,195 900,145 1000,180 1000,240 0,240" fill="#4A1000" opacity={0.6} />

        {/* City silhouette far */}
        <rect x={620} y={195} width={18} height={45} fill="#2D0A00" opacity={0.5} />
        <rect x={644} y={185} width={22} height={55} fill="#2D0A00" opacity={0.5} />
        <rect x={672} y={200} width={14} height={40} fill="#2D0A00" opacity={0.5} />
        <rect x={692} y={190} width={20} height={50} fill="#2D0A00" opacity={0.5} />
        <rect x={718} y={205} width={12} height={35} fill="#2D0A00" opacity={0.5} />
        {/* Tiny lit windows */}
        {[[625,210],[625,225],[649,200],[649,215],[649,230],[677,210],[697,205],[697,220],[722,215]].map(([wx,wy],i) => (
          <rect key={i} x={wx} y={wy} width={3} height={3} fill="#FFD580" opacity={0.7} />
        ))}

        {/* Clouds */}
        <g className="cloud-1" opacity={0.2}>
          <ellipse cx={120} cy={80} rx={55} ry={18} fill="white" />
          <ellipse cx={100} cy={72} rx={30} ry={16} fill="white" />
          <ellipse cx={145} cy={70} rx={35} ry={15} fill="white" />
        </g>
        <g className="cloud-2" opacity={0.15}>
          <ellipse cx={780} cy={60} rx={60} ry={20} fill="white" />
          <ellipse cx={760} cy={52} rx={32} ry={17} fill="white" />
          <ellipse cx={808} cy={50} rx={38} ry={16} fill="white" />
        </g>
        <g className="cloud-3" opacity={0.12}>
          <ellipse cx={460} cy={55} rx={45} ry={15} fill="white" />
          <ellipse cx={440} cy={48} rx={25} ry={13} fill="white" />
          <ellipse cx={482} cy={46} rx={30} ry={13} fill="white" />
        </g>

        {/* Road */}
        <rect x={0} y={255} width={1000} height={85} fill="url(#roadGrad)" />
        {/* Road edge lines */}
        <line x1={0} y1={258} x2={1000} y2={258} stroke="#EAC9B0" strokeWidth={2} opacity={0.5} />
        <line x1={0} y1={337} x2={1000} y2={337} stroke="#EAC9B0" strokeWidth={2} opacity={0.3} />
        {/* Road center dashes */}
        <line
          x1={0} y1={298} x2={1000} y2={298}
          stroke="#EAC9B0" strokeWidth={3} strokeDasharray="40 30"
          className="road-dash" opacity={0.6}
          style={{ strokeDashoffset: 0 }}
        />
        {/* Road texture */}
        <rect x={0} y={255} width={1000} height={4} fill="#D4512B" opacity={0.3} />

        {/* Warehouse WB — left */}
        <g className="wh-wb bounce-wb" transform="translate(120, 155)">
          {/* Building */}
          <rect x={0} y={0} width={120} height={85} rx={4} fill="url(#wbGrad)" />
          <rect x={0} y={0} width={120} height={12} rx={4} fill="#5B21B6" />
          {/* WB Logo text */}
          <text x={60} y={52} textAnchor="middle" fill="white" fontSize={28} fontWeight="bold" fontFamily="Arial">WB</text>
          {/* Door */}
          <rect x={42} y={55} width={36} height={30} rx={2} fill="#4C1D95" />
          <rect x={58} y={55} width={4} height={30} fill="#5B21B6" />
          {/* Windows */}
          <rect x={10} y={20} width={20} height={16} rx={2} fill="#A78BFA" opacity={0.5} />
          <rect x={38} y={20} width={20} height={16} rx={2} fill="#A78BFA" opacity={0.5} />
          <rect x={90} y={20} width={20} height={16} rx={2} fill="#A78BFA" opacity={0.5} />
          {/* Roof */}
          <polygon points="-8,-10 60,-35 128,-10" fill="#6D28D9" />
          {/* Label */}
          <text x={60} y={108} textAnchor="middle" fill="white" fontSize={11} fontFamily="Arial" fontWeight="600" opacity={0.9}>Wildberries</text>
        </g>

        {/* Warehouse OZON — right */}
        <g className="wh-ozon bounce-ozon" transform="translate(760, 155)">
          {/* Building */}
          <rect x={0} y={0} width={120} height={85} rx={4} fill="url(#ozonGrad)" />
          <rect x={0} y={0} width={120} height={12} rx={4} fill="#1E3A8A" />
          {/* OZON text */}
          <text x={60} y={52} textAnchor="middle" fill="white" fontSize={22} fontWeight="bold" fontFamily="Arial">OZON</text>
          {/* Door */}
          <rect x={42} y={55} width={36} height={30} rx={2} fill="#1E40AF" />
          <rect x={58} y={55} width={4} height={30} fill="#1D4ED8" />
          {/* Windows */}
          <rect x={10} y={20} width={20} height={16} rx={2} fill="#93C5FD" opacity={0.5} />
          <rect x={38} y={20} width={20} height={16} rx={2} fill="#93C5FD" opacity={0.5} />
          <rect x={90} y={20} width={20} height={16} rx={2} fill="#93C5FD" opacity={0.5} />
          {/* Roof */}
          <polygon points="-8,-10 60,-35 128,-10" fill="#1E40AF" />
          {/* Label */}
          <text x={60} y={108} textAnchor="middle" fill="white" fontSize={11} fontFamily="Arial" fontWeight="600" opacity={0.9}>Ozon</text>
        </g>

        {/* Flying boxes WB */}
        <g className="box-wb-1" transform="translate(490, 215)">
          <rect x={0} y={0} width={22} height={22} rx={3} fill="#EAC9B0" stroke="#D4512B" strokeWidth={1.5} />
          <line x1={0} y1={11} x2={22} y2={11} stroke="#D4512B" strokeWidth={1} opacity={0.5} />
          <line x1={11} y1={0} x2={11} y2={22} stroke="#D4512B" strokeWidth={1} opacity={0.5} />
        </g>
        <g className="box-wb-2" transform="translate(510, 220)">
          <rect x={0} y={0} width={16} height={16} rx={2} fill="#FBF0EA" stroke="#D4512B" strokeWidth={1.5} />
          <line x1={0} y1={8} x2={16} y2={8} stroke="#D4512B" strokeWidth={1} opacity={0.5} />
          <line x1={8} y1={0} x2={8} y2={16} stroke="#D4512B" strokeWidth={1} opacity={0.5} />
        </g>

        {/* Flying boxes OZON */}
        <g className="box-ozon-1" transform="translate(490, 220)">
          <rect x={0} y={0} width={22} height={22} rx={3} fill="#EAC9B0" stroke="#D4512B" strokeWidth={1.5} />
          <line x1={0} y1={11} x2={22} y2={11} stroke="#D4512B" strokeWidth={1} opacity={0.5} />
          <line x1={11} y1={0} x2={11} y2={22} stroke="#D4512B" strokeWidth={1} opacity={0.5} />
        </g>
        <g className="box-ozon-2" transform="translate(470, 215)">
          <rect x={0} y={0} width={18} height={18} rx={2} fill="#FBF0EA" stroke="#D4512B" strokeWidth={1.5} />
          <line x1={0} y1={9} x2={18} y2={9} stroke="#D4512B" strokeWidth={1} opacity={0.5} />
          <line x1={9} y1={0} x2={9} y2={18} stroke="#D4512B" strokeWidth={1} opacity={0.5} />
        </g>

        {/* Truck group */}
        <g className="truck-group">
          {/* Exhaust smoke */}
          <g transform="translate(-15, 195)">
            <ellipse className="exhaust" cx={0} cy={0} rx={8} ry={6} fill="#888" opacity={0.4} />
            <ellipse className="exhaust-2" cx={0} cy={-8} rx={10} ry={7} fill="#999" opacity={0.3} />
          </g>

          {/* Trailer / Body */}
          <rect x={0} y={170} width={230} height={80} rx={4} fill="url(#truckBody)" />
          {/* Brand stripe on trailer */}
          <rect x={0} y={170} width={230} height={12} rx={2} fill="#D4512B" />
          {/* МК ЛОГИСТИК text on trailer */}
          <text x={115} y={220} textAnchor="middle" fill="#1A1A1A" fontSize={16} fontWeight="bold" fontFamily="Arial" letterSpacing={2}>МК ЛОГИСТИК</text>
          {/* Trailer ribs */}
          {[40, 80, 120, 160, 200].map((x) => (
            <line key={x} x1={x} y1={182} x2={x} y2={248} stroke="#CCC" strokeWidth={1} opacity={0.5} />
          ))}
          {/* Trailer rear door */}
          <rect x={220} y={175} width={10} height={75} rx={2} fill="#CCC" />

          {/* Cab */}
          <rect x={230} y={185} width={90} height={65} rx={6} fill="url(#cabGrad)" />
          {/* Cab roof */}
          <rect x={232} y={178} width={86} height={18} rx={4} fill="#B33D1A" />
          {/* Air deflector */}
          <polygon points="232,178 318,178 318,165 248,165" fill="#C44020" />

          {/* Windshield */}
          <rect x={270} y={192} width={44} height={32} rx={3} fill="#87CEEB" opacity={0.7} />
          {/* Windshield reflection */}
          <line x1={274} y1={196} x2={284} y2={218} stroke="white" strokeWidth={2} opacity={0.4} />

          {/* Headlight */}
          <rect x={315} y={215} width={8} height={12} rx={2} fill="#FFD580" opacity={0.9} />
          {/* Light beam */}
          <polygon points="323,215 360,205 360,235 323,227" fill="#FFD580" opacity={0.15} />

          {/* Door */}
          <rect x={235} y={195} width={32} height={48} rx={2} fill="#C44020" />
          <circle cx={264} cy={220} r={2.5} fill="#FFD580" />
          {/* Step */}
          <rect x={235} y={242} width={25} height={6} rx={2} fill="#993000" />

          {/* Bumper */}
          <rect x={310} y={240} width={12} height={10} rx={2} fill="#888" />
          <rect x={312} y={238} width={8} height={4} rx={1} fill="#AAA" />

          {/* Wheels - trailer */}
          {[35, 75, 155, 195].map((x) => (
            <g key={x} transform={`translate(${x}, 250)`}>
              <circle cx={0} cy={0} r={20} fill="#222" />
              <circle cx={0} cy={0} r={14} fill="#444" />
              <circle cx={0} cy={0} r={7} fill="#666" />
              <g className="wheel">
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <line
                    key={angle}
                    x1={0} y1={0}
                    x2={Math.cos((angle * Math.PI) / 180) * 13}
                    y2={Math.sin((angle * Math.PI) / 180) * 13}
                    stroke="#888" strokeWidth={2}
                  />
                ))}
              </g>
            </g>
          ))}
          {/* Wheels - cab */}
          {[255, 295].map((x) => (
            <g key={x} transform={`translate(${x}, 250)`}>
              <circle cx={0} cy={0} r={20} fill="#222" />
              <circle cx={0} cy={0} r={14} fill="#444" />
              <circle cx={0} cy={0} r={7} fill="#666" />
              <g className="wheel">
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <line
                    key={angle}
                    x1={0} y1={0}
                    x2={Math.cos((angle * Math.PI) / 180) * 13}
                    y2={Math.sin((angle * Math.PI) / 180) * 13}
                    stroke="#888" strokeWidth={2}
                  />
                ))}
              </g>
            </g>
          ))}
        </g>

        {/* Foreground road shine */}
        <rect x={0} y={255} width={1000} height={3} fill="white" opacity={0.04} />

        {/* Distant lamp posts */}
        {[200, 400, 600, 800].map((x) => (
          <g key={x}>
            <line x1={x} y1={255} x2={x} y2={190} stroke="#555" strokeWidth={2} />
            <line x1={x - 10} y1={190} x2={x + 10} y2={190} stroke="#555" strokeWidth={2} />
            <ellipse cx={x} cy={188} rx={14} ry={5} fill="#FFD580" opacity={0.25} />
          </g>
        ))}
      </svg>
    </div>
  )
}
