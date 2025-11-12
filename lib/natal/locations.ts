export type NatalLocationEntry = {
  country: string
  state: string
  city: string
  latitude: number
  longitude: number
  tzOffsetHours: number
}

export const NATAL_LOCATIONS: NatalLocationEntry[] = [
  { country: 'Myanmar', state: 'Yangon Region', city: 'Yangon', latitude: 16.8409, longitude: 96.1735, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Mandalay Region', city: 'Mandalay', latitude: 21.9588, longitude: 96.0891, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Sagaing Region', city: 'Sagaing', latitude: 21.8787, longitude: 95.9793, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Shan State', city: 'Taunggyi', latitude: 20.7829, longitude: 97.0370, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Ayeyarwady Region', city: 'Pathein', latitude: 16.7792, longitude: 94.7321, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Rakhine State', city: 'Sittwe', latitude: 20.1462, longitude: 92.8984, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Bago Region', city: 'Bago', latitude: 17.3315, longitude: 96.4797, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Magway Region', city: 'Magway', latitude: 20.1543, longitude: 94.9325, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Mon State', city: 'Mawlamyine', latitude: 16.4910, longitude: 97.6283, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Tanintharyi Region', city: 'Dawei', latitude: 14.0731, longitude: 98.1940, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Kachin State', city: 'Myitkyina', latitude: 25.3833, longitude: 97.4000, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Kayah State', city: 'Loikaw', latitude: 19.6770, longitude: 97.2095, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Kayin State', city: 'Hpa-An', latitude: 16.8895, longitude: 97.6348, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Chin State', city: 'Hakha', latitude: 22.6445, longitude: 93.6114, tzOffsetHours: 6.5 },
  { country: 'Myanmar', state: 'Naypyidaw Union Territory', city: 'Naypyidaw', latitude: 19.7633, longitude: 96.0785, tzOffsetHours: 6.5 },
  { country: 'Thailand', state: 'Bangkok', city: 'Bangkok', latitude: 13.7563, longitude: 100.5018, tzOffsetHours: 7 },
  { country: 'Thailand', state: 'Chiang Mai', city: 'Chiang Mai', latitude: 18.7883, longitude: 98.9853, tzOffsetHours: 7 },
  { country: 'Thailand', state: 'Phuket', city: 'Phuket', latitude: 7.8804, longitude: 98.3923, tzOffsetHours: 7 },
  { country: 'Thailand', state: 'Khon Kaen', city: 'Khon Kaen', latitude: 16.4419, longitude: 102.8350, tzOffsetHours: 7 },
  { country: 'Thailand', state: 'Hat Yai', city: 'Hat Yai', latitude: 7.0086, longitude: 100.4747, tzOffsetHours: 7 },
  { country: 'Thailand', state: 'Udon Thani', city: 'Udon Thani', latitude: 17.4138, longitude: 102.7872, tzOffsetHours: 7 },
  { country: 'Thailand', state: 'Chiang Rai', city: 'Chiang Rai', latitude: 19.9105, longitude: 99.8406, tzOffsetHours: 7 },
  { country: 'Singapore', state: 'Singapore', city: 'Singapore', latitude: 1.3521, longitude: 103.8198, tzOffsetHours: 8 },
  { country: 'Malaysia', state: 'Kuala Lumpur', city: 'Kuala Lumpur', latitude: 3.1390, longitude: 101.6869, tzOffsetHours: 8 },
  { country: 'Malaysia', state: 'Penang', city: 'George Town', latitude: 5.4141, longitude: 100.3288, tzOffsetHours: 8 },
  { country: 'India', state: 'West Bengal', city: 'Kolkata', latitude: 22.5726, longitude: 88.3639, tzOffsetHours: 5.5 },
  { country: 'India', state: 'Delhi', city: 'New Delhi', latitude: 28.6139, longitude: 77.2090, tzOffsetHours: 5.5 },
  { country: 'India', state: 'Karnataka', city: 'Bengaluru', latitude: 12.9716, longitude: 77.5946, tzOffsetHours: 5.5 },
  { country: 'India', state: 'Maharashtra', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777, tzOffsetHours: 5.5 },
  { country: 'Bangladesh', state: 'Dhaka Division', city: 'Dhaka', latitude: 23.8103, longitude: 90.4125, tzOffsetHours: 6 },
  { country: 'Bangladesh', state: 'Chattogram Division', city: 'Chattogram', latitude: 22.3569, longitude: 91.7832, tzOffsetHours: 6 },
  { country: 'Philippines', state: 'Metro Manila', city: 'Manila', latitude: 14.5995, longitude: 120.9842, tzOffsetHours: 8 },
  { country: 'Philippines', state: 'Cebu', city: 'Cebu City', latitude: 10.3157, longitude: 123.8854, tzOffsetHours: 8 },
  { country: 'Indonesia', state: 'Jakarta', city: 'Jakarta', latitude: -6.2088, longitude: 106.8456, tzOffsetHours: 7 },
  { country: 'Indonesia', state: 'Bali', city: 'Denpasar', latitude: -8.6500, longitude: 115.2167, tzOffsetHours: 8 },
  { country: 'United States', state: 'California', city: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, tzOffsetHours: -8 },
  { country: 'United States', state: 'New York', city: 'New York City', latitude: 40.7128, longitude: -74.0060, tzOffsetHours: -5 },
  { country: 'United States', state: 'Texas', city: 'Austin', latitude: 30.2672, longitude: -97.7431, tzOffsetHours: -6 },
  { country: 'Australia', state: 'New South Wales', city: 'Sydney', latitude: -33.8688, longitude: 151.2093, tzOffsetHours: 10 },
  { country: 'Australia', state: 'Victoria', city: 'Melbourne', latitude: -37.8136, longitude: 144.9631, tzOffsetHours: 10 },
  { country: 'Japan', state: 'Kantō', city: 'Tokyo', latitude: 35.6762, longitude: 139.6503, tzOffsetHours: 9 },
  { country: 'Japan', state: 'Kansai', city: 'Osaka', latitude: 34.6937, longitude: 135.5022, tzOffsetHours: 9 },
  { country: 'United Kingdom', state: 'England', city: 'London', latitude: 51.5072, longitude: -0.1276, tzOffsetHours: 0 },
  { country: 'Canada', state: 'Ontario', city: 'Toronto', latitude: 43.6532, longitude: -79.3832, tzOffsetHours: -5 },
  { country: 'Canada', state: 'British Columbia', city: 'Vancouver', latitude: 49.2827, longitude: -123.1207, tzOffsetHours: -8 }
]
