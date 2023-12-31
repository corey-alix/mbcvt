# mbcvt
Millbrook Campground in Westfield Vermont

# Summary

This is a reservation system for Millbrook Campground in Westfield Vermont.  It is written in typescript.  The backend runs on Netlify and the database is FaunaDB.

# Requirements

The user must be able to reserve sites online and the experience must be better then https://www.reserveamerica.com/.

- User should be able to see a map of the campground and see which sites are available for which dates.
- User should be able to reserve a site for a given date range.
- User should be able to see a list of all reservations.
- User should be able to see a list of all sites.
- User should be able to cancel a reservation.
- User should be able to receive notifications about their reservation.

# Architecture

## Backend

The backend is written in typescript and runs on Netlify.  The database is FaunaDB.  The backend is a REST API.  The backend is deployed to Netlify using the netlify cli.

## Frontend

The frontend is written in typescript, no frameworks, no build tools, no compression, minimal logic, minimal UI.  The frontend is deployed to Netlify using the netlify cli.

# Development

- Create a mock Front End using TSC only
- Install the Netlify CLI
- Install the FaunaDB CLI
- Setup a FaunaDB database