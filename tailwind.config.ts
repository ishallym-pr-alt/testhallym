import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f0f8',
          100: '#b3d1e8',
          200: '#80b3d8',
          300: '#4d94c8',
          400: '#2680ba',
          500: '#004b8d',
          600: '#00437f',
          700: '#003a6e',
          800: '#00315d',
          900: '#00213f',
        },
        accent: {
          50: '#fff5eb',
          100: '#ffe0c2',
          200: '#ffcc99',
          300: '#ffb770',
          400: '#ff9938',
          500: '#ff7a00',
          600: '#e66e00',
          700: '#cc6200',
          800: '#b35600',
          900: '#804000',
        },
      },
      fontFamily: {
        sans: ['"Pretendard"', '"Noto Sans KR"', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
export default config;
