'use client'

import { useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type Props = {
  latitude: number
  longitude: number
  onChange: (lat: number, lon: number) => void
}

const markerIcon = L.divIcon({
  className: 'natal-marker',
  html: '<div style=\"width:16px;height:16px;background:#f5d67b;border:2px solid #111;border-radius:50%;box-shadow:0 0 12px rgba(0,0,0,0.45);\"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
})

function ClickHandler({ onChange }: { onChange: Props['onChange'] }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng)
    }
  })
  return null
}

export default function LocationPickerMap({ latitude, longitude, onChange }: Props) {
  const center = useMemo(() => {
    const lat = Number.isFinite(latitude) ? latitude : 16.8409
    const lon = Number.isFinite(longitude) ? longitude : 96.1735
    return [lat, lon] as [number, number]
  }, [latitude, longitude])

  return (
    <MapContainer center={center} zoom={5} scrollWheelZoom className="h-64 w-full rounded-xl border border-mok-goldDeep/40">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>'
      />
      <Marker position={center} icon={markerIcon} />
      <ClickHandler onChange={onChange} />
    </MapContainer>
  )
}
