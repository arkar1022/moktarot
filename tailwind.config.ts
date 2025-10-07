import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        mok: {
          gold: '#C5A24A',
          goldDeep: '#9C7B2B',
          goldLight: '#E5C76B',
          black: '#0B0B0B',
          smoke: '#161616'
        }
      },
      backgroundImage: {
        'gold-radial': 'radial-gradient(circle at 50% 0%, #E5C76B, #9C7B2B 60%, #0B0B0B 100%)',
        'gold-linear': 'linear-gradient(135deg, #E5C76B, #9C7B2B)'
      }
    }
  },
  plugins: []
}

export default config

