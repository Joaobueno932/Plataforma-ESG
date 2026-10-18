/**
 * Tema recuperado do CSS compilado do original (variáveis em :root de
 * src/styles/original-tailwind.css). O preflight fica desligado porque o CSS
 * original — incluído integralmente — já o contém.
 */
const c = (v) => `rgb(var(--color-${v}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  corePlugins: { preflight: false },
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        primary: { DEFAULT: c('primary-04'), main: c('primary-main'), '01': c('primary-01'), '02': c('primary-02'), '03': c('primary-03'), '04': c('primary-04') },
        secondary: { '01': c('secondary-01'), '02': c('secondary-02'), '03': c('secondary-03'), '04': c('secondary-04') },
        neutral: { DEFAULT: c('neutral-04'), '01': c('neutral-01'), '02': c('neutral-02'), '03': c('neutral-03'), '04': c('neutral-04') },
        semantic: {
          link: c('semantic-color-link'),
          alert: c('semantic-color-alert'),
          error: c('semantic-color-error'),
          success: c('semantic-color-success'),
          'success-2': c('semantic-color-success-2'),
        },
        card: {
          DEFAULT: c('card'),
          'not-compliant': c('card-non-compliant'),
          sensitized: c('card-sensitized'),
          beginner: c('card-beginner'),
          conscious: c('card-conscious'),
          according: c('card-according'),
        },
        background: 'var(--color-background)',
        border: c('border'),
        input: c('input'),
        ring: c('ring'),
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      keyframes: {
        'accordion-down': { from: { height: 0 }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: 0 } },
      },
      animation: { 'accordion-down': 'accordion-down 0.2s ease-out', 'accordion-up': 'accordion-up 0.2s ease-out' },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
