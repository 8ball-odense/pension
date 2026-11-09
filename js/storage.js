const STORAGE_KEY = "pension_planner_dk_data";
const SCENARIO_KEY = "pension_planner_dk_scenario_a";

function saveInputsToStorage() {
    const inputs = document.querySelectorAll("input");
    const data = {};
    inputs.forEach(input => {
        if (input.type === "checkbox") {
            data[input.id] = input.checked;
        } else if (input.id) {
            data[input.id] = input.value;
        }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadInputsFromStorage() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            for (const id in data) {
                const field = document.getElementById(id);
                if (field) {
                    if (field.type === "checkbox") {
                        field.checked = !!data[id];
                    } else if (data[id] !== undefined && data[id] !== "") {
                        field.value = data[id];
                    }
                }
            }
        } catch (e) {
            console.warn("Kunne ikke indlæse gemte data:", e);
        }
    }
}

function saveScenarioA(timeline) {
    localStorage.setItem(SCENARIO_KEY, JSON.stringify(timeline));
}

function loadScenarioA() {
    const saved = localStorage.getItem(SCENARIO_KEY);
    return saved ? JSON.parse(saved) : null;
}

function clearScenarioA() {
    localStorage.removeItem(SCENARIO_KEY);
}

function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SCENARIO_KEY);
    location.reload();
}