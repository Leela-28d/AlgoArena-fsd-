from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)

DB_PATH = "algoarena.db"
MAX_ITEMS = 20

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS run_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                algorithm TEXT NOT NULL,
                input_values TEXT NOT NULL,
                target INTEGER,
                result TEXT NOT NULL,
                steps_count INTEGER NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

def validate_payload(data):
    if not isinstance(data, dict):
        return None, "Request body must be a JSON object."

    algorithm = data.get("algorithm")
    if algorithm not in ("bubble_sort", "selection_sort", "linear_search", "binary_search"):
        return None, "Choose a supported algorithm."

    values = data.get("values")
    if not isinstance(values, list) or len(values) == 0:
        return None, "Enter at least one number."
    if len(values) > MAX_ITEMS:
        return None, f"Enter no more than {MAX_ITEMS} numbers."

    parsed = []
    for value in values:
        if isinstance(value, bool) or not isinstance(value, int):
            return None, "Every array value must be an integer."
        if value < -9999 or value > 9999:
            return None, "Numbers must be between -9999 and 9999."
        parsed.append(value)

    target = data.get("target")
    if algorithm in ("linear_search", "binary_search"):
        if isinstance(target, bool) or not isinstance(target, int):
            return None, "Enter a valid integer search target."
        if target < -9999 or target > 9999:
            return None, "Search target must be between -9999 and 9999."
    else:
        target = None

    return {"algorithm": algorithm, "values": parsed, "target": target}, None

def build_steps(algorithm, values, target):
    arr = list(values)
    steps = []
    result_text = ""
    display_values = list(arr)

    if algorithm == "bubble_sort":
        steps.append({"array": arr[:], "active": [], "message": "Starting Bubble Sort.", "found": False})
        n = len(arr)
        for i in range(n):
            swapped = False
            for j in range(0, n - i - 1):
                steps.append({"array": arr[:], "active": [j, j + 1], "message": f"Compare {arr[j]} and {arr[j + 1]}.", "found": False})
                if arr[j] > arr[j + 1]:
                    arr[j], arr[j + 1] = arr[j + 1], arr[j]
                    swapped = True
                    steps.append({"array": arr[:], "active": [j, j + 1], "message": "They are out of order, so swap them.", "found": False})
            if not swapped:
                break
        steps.append({"array": arr[:], "active": [], "message": "Sorting completed.", "found": False})
        result_text = f"Sorted array: {arr}"
        display_values = arr

    elif algorithm == "selection_sort":
        steps.append({"array": arr[:], "active": [], "message": "Starting Selection Sort.", "found": False})
        n = len(arr)
        for i in range(n):
            min_idx = i
            for j in range(i + 1, n):
                steps.append({"array": arr[:], "active": [min_idx, j], "message": f"Compare current minimum {arr[min_idx]} with {arr[j]}.", "found": False})
                if arr[j] < arr[min_idx]:
                    min_idx = j
                    steps.append({"array": arr[:], "active": [i, min_idx], "message": f"New minimum found: {arr[min_idx]}.", "found": False})
            if min_idx != i:
                arr[i], arr[min_idx] = arr[min_idx], arr[i]
                steps.append({"array": arr[:], "active": [i, min_idx], "message": "Place the minimum value in its correct position.", "found": False})
        steps.append({"array": arr[:], "active": [], "message": "Sorting completed.", "found": False})
        result_text = f"Sorted array: {arr}"
        display_values = arr

    elif algorithm == "linear_search":
        steps.append({"array": arr[:], "active": [], "message": f"Search for {target} from left to right.", "found": False})
        found_index = -1
        for i, value in enumerate(arr):
            is_found = value == target
            steps.append({"array": arr[:], "active": [i], "message": f"Check index {i}: {value}" + (" — target found!" if is_found else " — not a match."), "found": is_found})
            if is_found:
                found_index = i
                break
        if found_index >= 0:
            result_text = f"Target {target} found at index {found_index}."
            steps.append({"array": arr[:], "active": [found_index], "message": result_text, "found": True})
        else:
            result_text = f"Target {target} was not found."
            steps.append({"array": arr[:], "active": [], "message": result_text, "found": False})
        display_values = arr

    elif algorithm == "binary_search":
        arr = sorted(arr)
        display_values = arr[:]
        steps.append({"array": arr[:], "active": [], "message": f"Binary Search works on sorted data. Sorted input: {arr}", "found": False})
        left, right = 0, len(arr) - 1
        found_index = -1
        while left <= right:
            mid = (left + right) // 2
            steps.append({"array": arr[:], "active": [left, mid, right], "message": f"Check middle index {mid}: {arr[mid]}.", "found": arr[mid] == target})
            if arr[mid] == target:
                found_index = mid
                break
            if arr[mid] < target:
                left = mid + 1
                steps.append({"array": arr[:], "active": [left] if left < len(arr) else [], "message": "Target is larger. Search the right half.", "found": False})
            else:
                right = mid - 1
                steps.append({"array": arr[:], "active": [right] if right >= 0 else [], "message": "Target is smaller. Search the left half.", "found": False})
        if found_index >= 0:
            result_text = f"Target {target} found at sorted index {found_index}."
            steps.append({"array": arr[:], "active": [found_index], "message": result_text, "found": True})
        else:
            result_text = f"Target {target} was not found."
            steps.append({"array": arr[:], "active": [], "message": result_text, "found": False})

    return steps, result_text, display_values

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "message": "AlgoArena API is running."})

@app.post("/api/run")
def run_algorithm():
    data = request.get_json(silent=True)
    validated, error = validate_payload(data)
    if error:
        return jsonify({"error": error}), 400

    algorithm = validated["algorithm"]
    values = validated["values"]
    target = validated["target"]
    steps, result_text, final_values = build_steps(algorithm, values, target)

    created_at = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO run_history (algorithm, input_values, target, result, steps_count, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (algorithm, json.dumps(values), target, result_text, len(steps), created_at)
        )
        run_id = cursor.lastrowid

    return jsonify({
        "id": run_id,
        "algorithm": algorithm,
        "input": values,
        "target": target,
        "steps": steps,
        "result": result_text,
        "final_values": final_values,
        "complexity": {
            "bubble_sort": {"time": "O(n²)", "space": "O(1)"},
            "selection_sort": {"time": "O(n²)", "space": "O(1)"},
            "linear_search": {"time": "O(n)", "space": "O(1)"},
            "binary_search": {"time": "O(log n)", "space": "O(1)"}
        }[algorithm]
    })

@app.get("/api/history")
def get_history():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM run_history ORDER BY id DESC LIMIT 20").fetchall()
    return jsonify([{
        "id": row["id"],
        "algorithm": row["algorithm"],
        "input_values": json.loads(row["input_values"]),
        "target": row["target"],
        "result": row["result"],
        "steps_count": row["steps_count"],
        "created_at": row["created_at"]
    } for row in rows])

@app.delete("/api/history")
def clear_history():
    with get_db() as conn:
        conn.execute("DELETE FROM run_history")
    return jsonify({"message": "Run history cleared."})

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
