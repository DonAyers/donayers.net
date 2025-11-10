/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0e27',
          darker: '#050810',
          blue: '#00d9ff',
          pink: '#ff006e',
          purple: '#8b5cf6',
          green: '#00ff88',
          yellow: '#ffd000',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'neon-blue': '0 0 5px theme("colors.cyber.blue"), 0 0 20px theme("colors.cyber.blue")',
        'neon-pink': '0 0 5px theme("colors.cyber.pink"), 0 0 20px theme("colors.cyber.pink")',
        'neon-purple': '0 0 5px theme("colors.cyber.purple"), 0 0 20px theme("colors.cyber.purple")',
        'neon-green': '0 0 5px theme("colors.cyber.green"), 0 0 20px theme("colors.cyber.green")',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { textShadow: '0 0 5px #00d9ff, 0 0 10px #00d9ff' },
          '100%': { textShadow: '0 0 10px #00d9ff, 0 0 20px #00d9ff, 0 0 30px #00d9ff' },
        },
      },
    },
  },
  plugins: [],
};
