# Kino XII


**Live site:** https://coruscating-froyo-5b8dba.netlify.app
A cinema website built for the Redberry Bootcamp XII assignment. Browse films and showtimes across Tbilisi and Batumi venues, pick seats, pay, and manage your tickets.

The frontend talks to the official Kino XII API at `https://api.kinoxii.redberryinternship.ge/api`. The design follows the provided Figma file.

## Features

- **Home page:** a rotating hero slider of featured films, Now Playing and Coming Soon rows, and a Recently viewed row kept in the browser.
- **Search:** live search in the header for films and live events, with prices and "Coming Soon" labels.
- **Sign up and log in:** modal forms with field-by-field validation and an optional avatar upload.
- **Sessions page:** filter showtimes by venue, date, format, language and time of day, sort them, and page through results. Filters, sort and page are kept in the URL, so a filtered view can be shared or refreshed.
- **Film page:** synopsis, details, rating note and showtimes for the next 7 days, grouped by venue and hall. Coming-soon films offer a "Notify me" button.
- **Buying tickets:** a two-step modal.
  - Seats: choose up to the maximum number of seats and set a ticket type (Child, Student or Adult) for each seat. Child tickets are hidden for age-restricted films.
  - Checkout: seats are held with a countdown timer while you enter contact and card details, then you get a confirmation with the order number.
  - Login and a complete profile are required before booking.
- **Profile:** edit personal information and preferred venue, and see upcoming and past tickets. Orders can be refunded until 2 hours before the screening.

## Tech stack

- React 19 with TypeScript
- Vite 8
- React Router 7
- Plain CSS (no UI library)

## Running locally

You need Node.js 20.19 or newer (Node 22 recommended).

```bash
npm install
npm run dev
```

Then open the address Vite prints, usually http://localhost:5173.

Other scripts:

```bash
npm run build     # typecheck and build into dist/
npm run preview   # serve the built dist/ folder locally
npm run lint      # run oxlint
```

## Project structure

```
src/
  api.ts            API calls and error handling
  auth.tsx          login state and "log in first" handling
  session.ts        stored login token
  types.ts          API response types
  format.ts         price, date and duration formatting
  recent.ts         Recently viewed films (localStorage)
  sessionQuery.ts   reading and writing Sessions page filters in the URL
  components/       header, hero, cards, auth and booking modals, icons
  pages/            Home, Sessions, Film, Booking and Profile pages
  index.css         all styles and design tokens
```

## Deployment

The site is set up for Netlify. `netlify.toml` contains the build command, the output folder and a redirect so that refreshing any page (for example `/sessions` or `/movies/...`) loads the app instead of a 404.
