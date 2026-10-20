# AlgoArena — Interactive Algorithm Visualizer

AlgoArena is a lightweight full-stack web application built with React, Flask, and SQLite. It demonstrates algorithm visualization, client-side and server-side validation, JSON API communication, and database-backed run history.

## Features

- Bubble Sort and Selection Sort step-by-step visualizations
- Linear Search and Binary Search visualizations
- Play, pause, previous, next, reset, and replay controls
- Client-side validation in React and server-side validation in Flask
- Automatic sorting before Binary Search, clearly shown in the steps
- Time and space complexity information
- SQLite run history with a clear-history action
- Responsive interface

## Requirements

- Python 3.10 or later
- Node.js 18 or later (Node.js 20+ recommended)
- npm

## Run on Windows

Open two terminals. Keep both terminals running while you use the application.

### Terminal 1 — Flask backend

```bat
cd AlgoArena\backend
py -m venv venv
venv\Scripts\activate
py -m pip install -r requirements.txt
py app.py
```

If `py` is not recognized, try `python` instead. The backend runs at `http://127.0.0.1:5000`.

The SQLite database file `algoarena.db` is created automatically when the backend starts.

### Terminal 2 — React frontend

```bat
cd AlgoArena\frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Validation rules

- Array input is required.
- Values must be comma-separated integers.
- Empty entries and non-integer values are rejected.
- A maximum of 20 values is accepted.
- Each number and search target must be between -9999 and 9999.
- Searching algorithms require a valid target.
- The Flask backend validates the JSON request again, so validation does not depend only on the browser.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend status |
| POST | `/api/run` | Validate input, execute an algorithm, return visualization steps, and save run history |
| GET | `/api/history` | Return the latest 20 runs |
| DELETE | `/api/history` | Clear saved run history |

### Example POST body

```json
{
  "algorithm": "bubble_sort",
  "values": [8, 3, 6, 1, 5]
}
```

For search algorithms, include a target:

```json
{
  "algorithm": "linear_search",
  "values": [8, 3, 6, 1, 5],
  "target": 6
}
```

## Project structure

```text
AlgoArena/
├── README.md
├── backend/
│   ├── app.py
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── App.jsx
        ├── main.jsx
        └── styles.css
```

## Troubleshooting

- If the frontend shows an API error, confirm that the Flask terminal is running at port 5000.
- If `npm` is not recognized, install Node.js and reopen the terminal.
- If the frontend reports dependency errors, run `npm install` from the `frontend` directory.
- If the database is locked, stop duplicate Flask processes and restart the backend.
- The first `npm install` requires internet access to download packages.
