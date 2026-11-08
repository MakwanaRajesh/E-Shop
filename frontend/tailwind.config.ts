import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAF8F5', // Warm Alabaster (60% background)
        surface: '#FFFFFF',    // Pure White (cards, sticky navbar)
        'surface-2': '#F5F2EB', // Warm Ivory secondary surface
        'surface-3': '#ECE7DE', // Subtle stone surface
        obsidian: '#111111',   // Rich Obsidian Black (30% brand & typography)
        charcoal: '#1C1917',   // Warm Charcoal
        slate: {
          DEFAULT: '#57534E',  // Warm Slate for secondary descriptions
          muted: '#78716C',
          light: '#A8A29E',
        },
        beige: '#111111',       // Maps primary text to Obsidian Black for high luxury contrast
        'beige-muted': '#57534E', // Maps secondary text to Warm Slate
        gold: '#C5A059',        // Antique Gold (10% luxury accent)
        'gold-light': '#D4AF37', // Champagne Gold highlight
        'gold-hover': '#B08D46', // Burnished hover state
        'gold-dark': '#9E7A36',
        bordeaux: {
          DEFAULT: '#991B1B',   // Deep Bordeaux for refined urgency
          blush: '#FEF2F2',     // Soft blush background
          border: '#FECACA',    // Soft blush border
        },
        border: '#E7E5E4',      // Soft warm stone border
        error: '#991B1B',       // Deep Bordeaux for error/alerts
        success: '#10B981',
        emerald: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        ruby: {
          DEFAULT: '#991B1B',
          light: '#F87171',
          dark: '#7F1D1D',
        },
        sapphire: {
          DEFAULT: '#0EA5E9',
          light: '#38BDF8',
          dark: '#0284C7',
        },
        amber: {
          DEFAULT: '#C5A059',
          light: '#D4AF37',
          dark: '#B08D46',
        },
        amethyst: {
          DEFAULT: '#8B5CF6',
          light: '#A78BFA',
          dark: '#7C3AED',
        },
      },
      boxShadow: {
        'glow-gold': '0 0 25px rgba(201, 168, 76, 0.25)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.25)',
        'glow-ruby': '0 0 25px rgba(239, 68, 68, 0.25)',
        'glow-sapphire': '0 0 25px rgba(14, 165, 233, 0.25)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
