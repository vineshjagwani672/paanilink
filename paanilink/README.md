# PaaniLink Water Tanker Booking and Dispatch System

## Technologies used
- HTML
- CSS
- Vanilla JavaScript
- Fetch API
- JSON Server

## File structure
```text
paanilink/
├── index.html
├── style.css
├── app.js
├── db.json
└── README.md
```

## Install JSON Server
```bash
npm install -g json-server
```

## Run the mock API
```bash
db.json
```

Then start the server:
```bash
json-server --watch db.json --port 3000
```

## Run the frontend
Use VS Code Live Server and open the project in the browser.

## Demo accounts
- Customer: customer@paanilink.test / customer123
- Zone Officer: officer@paanilink.test / officer123
- Hydrant Operator: operator@paanilink.test / operator123
- Driver: driver@paanilink.test / driver123
- Administrator: admin@paanilink.test / admin123

## Short booking workflow
A customer logs in and creates a booking. Commercial bookings are approved right away. Subsidised bookings are reviewed by the Zone Officer. The Hydrant Operator then checks quota and assigns a tanker and driver. The driver updates the trip status from Assigned to Arrived, Delivered or Failed. The customer can confirm or dispute the delivery.

## Project note
This is a frontend mock project for learning and demonstration. It does not include real authentication, database rules or backend security.
