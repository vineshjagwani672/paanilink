# PaaniLink Water Tanker Booking and Dispatch System

A vanilla HTML, CSS and JavaScript frontend demonstration.

## Local mode

1. Install JSON Server if needed:
   ```bash
   npm install -g json-server
   ```
2. Start the mock API from the `paanilink` folder:
   ```bash
   json-server --watch db.json --port 3000
   ```
3. Run `index.html` with VS Code Live Server.

Local mode reads and modifies `db.json` through JSON Server using `http://localhost:3000`.

## GitHub Pages mode

Open the deployed `index.html` through GitHub Pages. The app fetches `./db.json` only once, copies it into browser `localStorage`, and uses it for login and create/update/delete operations. Demo changes are temporary and browser-specific; they do not permanently modify `db.json`. Run `resetDemoData()` in the browser console to restore fresh demo data.

GitHub Pages configuration must publish the folder that contains `index.html`.

## Demo accounts

- Customer: `customer@paanilink.test` / `customer123`
- Zone Officer: `officer@paanilink.test` / `officer123`
- Hydrant Operator: `operator@paanilink.test` / `operator123`
- Driver: `driver@paanilink.test` / `driver123`
- Administrator: `admin@paanilink.test` / `admin123`

## Security note

The mock passwords are for a frontend class demonstration only. They are not secure authentication and must not be used for real users or sensitive data.
