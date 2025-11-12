'use client'

import React from 'react'

export type PlanetGlyph = {
  key: string
  glyph: string
  label: string
  degree: number
}

export type HouseLine = {
  number: number
  degree: number
}

const COLORS = ['#f7c948','#f0b429','#e5a437','#d7863a','#c87253','#b2557a','#9c3ba9','#784bd1','#4f63f2','#3aa9ff','#2ac4d4','#2ecc9a']

function degToRad(deg: number) {
  return ((deg - 90) * Math.PI) / 180
}

export default function NatalChartWheel({ planets, houses, ascDegree }: { planets: PlanetGlyph[]; houses: HouseLine[]; ascDegree?: number | null }) {
  const size = 320
  const center = size / 2
  const outer = center - 6
  const inner = outer - 24
  const planetRadius = inner - 18

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
      <circle cx={center} cy={center} r={outer} fill="#050505" stroke="#c4a15a" strokeWidth={1.5} />
      <circle cx={center} cy={center} r={inner} fill="#111" stroke="#d6b97c" strokeWidth={0.6} strokeDasharray="4 4" />
      {houses.map((house, idx) => {
        const angle = degToRad(house.degree)
        const x = center + inner * Math.cos(angle)
        const y = center + inner * Math.sin(angle)
        const x2 = center + outer * Math.cos(angle)
        const y2 = center + outer * Math.sin(angle)
        const color = COLORS[idx % COLORS.length]
        return (
          <g key={house.number}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="#1f1f1f" strokeWidth={1} />
            <line x1={x} y1={y} x2={x2} y2={y2} stroke={color} strokeWidth={1.4} />
            <text x={center + (inner + 10) * Math.cos(angle)} y={center + (inner + 10) * Math.sin(angle)} textAnchor="middle" alignmentBaseline="middle" fill="#fdf5d7" fontSize="9" fontWeight="600">
              {house.number}
            </text>
          </g>
        )
      })}
      {typeof ascDegree === 'number' && (
        <g>
          {(() => {
            const angle = degToRad(ascDegree)
            const x1 = center + inner * Math.cos(angle)
            const y1 = center + inner * Math.sin(angle)
            const x2 = center + outer * Math.cos(angle)
            const y2 = center + outer * Math.sin(angle)
            return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffed6b" strokeWidth={2} />
          })()}
          <text x={center} y={center - inner + 18} textAnchor="middle" fill="#ffed6b" fontSize="11" fontWeight="700">ASC</text>
        </g>
      )}
      {planets.map((planet) => {
        const angle = degToRad(planet.degree)
        const x = center + planetRadius * Math.cos(angle)
        const y = center + planetRadius * Math.sin(angle)
        return (
          <g key={planet.key}>
            <circle cx={x} cy={y} r={11} fill="#181818" stroke="#f6c96f" strokeWidth={0.9} />
            <text x={x} y={y + 2} textAnchor="middle" fontSize={planet.glyph.length > 1 ? 9 : 12} fill="#fef4d8">
              {planet.glyph}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
