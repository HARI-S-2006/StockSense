import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: '#f8f9ff',
        foreground: '#0b1c30',
        "secondary-fixed-dim": "#bec6e0",
        "primary-fixed-dim": "#b7c4ff",
        "primary-fixed": "#dce1ff",
        "secondary-container": "#dae2fd",
        "on-secondary-fixed": "#131b2e",
        "outline-variant": "#c4c5d7",
        "on-error": "#ffffff",
        "surface-container-low": "#eff4ff",
        "on-error-container": "#93000a",
        "surface-container": "#e5eeff",
        "tertiary": "#004f35",
        "on-primary-fixed-variant": "#0039b5",
        "inverse-primary": "#b7c4ff",
        "surface-dim": "#cbdbf5",
        "surface-bright": "#f8f9ff",
        "on-tertiary": "#ffffff",
        "primary-container": "#1d4ed8",
        "surface-container-high": "#dce9ff",
        "on-secondary-fixed-variant": "#3f465c",
        "error-container": "#ffdad6",
        "surface-container-highest": "#d3e4fe",
        "surface-container-lowest": "#ffffff",
        "on-tertiary-fixed": "#002114",
        "secondary-fixed": "#dae2fd",
        "on-primary-container": "#cad3ff",
        "on-surface": "#0b1c30",
        "error": "#ba1a1a",
        "on-primary": "#ffffff",
        "on-primary-fixed": "#001551",
        "on-secondary-container": "#5c647a",
        "tertiary-container": "#006948",
        "inverse-on-surface": "#eaf1ff",
        "surface-tint": "#2151da",
        "inverse-surface": "#213145",
        "outline": "#747686",
        "on-secondary": "#ffffff",
        "on-background": "#0b1c30",
        "on-surface-variant": "#434655",
        "tertiary-fixed": "#85f8c4",
        "on-tertiary-fixed-variant": "#005137",
        "surface": "#f8f9ff",
        "surface-variant": "#d3e4fe",
        "on-tertiary-container": "#76eab6",
        "tertiary-fixed-dim": "#68dba9",
        primary: {
          DEFAULT: '#0037b0',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: '#565e74',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config