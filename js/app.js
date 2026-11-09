function getNumber(id) {
    const el = document.getElementById(id);
    const cleanString = el.value.toString().replace(/\./g, "").replace(",", ".");
    return parseFloat(cleanString);
}

function formatDKR(amount) {
    return Math.round(amount).toLocaleString("da-DK") + " kr.";
}

function updateTable(timeline) {
    const tbody = document.querySelector("#annualBreakdownTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    timeline.forEach(row => {
        const tr = document.createElement("tr");
        let statusBadge = row.isRetired 
            ? `<span class="status-badge status-retire">Pensioneret</span>`
            : `<span class="status-badge status-work">Arbejdende</span>`;

        tr.innerHTML = `
            <td><strong>${row.age} år</strong> (K: ${row.kevAge} / K: ${row.katAge})</td>
            <td>${statusBadge}</td>
            <td><strong>${formatDKR(row.totalWealth)}</strong></td>
            <td>${formatDKR(row.grossRequired)}</td>
            <td>${formatDKR(row.publicNet)}</td>
            <td>${formatDKR(row.withdrawnAsk)}</td>
            <td>${formatDKR(row.withdrawnFree)}</td>
            <td>${formatDKR(row.withdrawnAop)}</td>
            <td>${formatDKR(row.withdrawnWork)}</td>
            <td>${formatDKR(row.withdrawnHome)}</td>
            <td>${formatDKR(row.taxPaid)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateBalanceTable(timeline) {
    const tbody = document.querySelector("#balanceTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    timeline.forEach(row => {
        const tr = document.createElement("tr");
        let statusBadge = row.isRetired 
            ? `<span class="status-badge status-retire">Pensioneret</span>`
            : `<span class="status-badge status-work">Arbejdende</span>`;

        tr.innerHTML = `
            <td><strong>${row.age} år</strong> (K: ${row.kevAge} / K: ${row.katAge})</td>
            <td>${statusBadge}</td>
            <td>${formatDKR(row.freeBalance)}</td>
            <td>${formatDKR(row.askBalance)}</td>
            <td>${formatDKR(row.aopBalance)}</td>
            <td>${formatDKR(row.workBalance)}</td>
            <td>${formatDKR(row.homeBalance)}</td>
            <td><strong>${formatDKR(row.totalWealth)}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

function evaluateSavingsGoal(timeline, targetAge, targetAmount) {
    const goalBox = document.getElementById("goalResultBox");
    if (!goalBox) return;

    const rowAtGoal = timeline.find(r => r.age === targetAge);
    if (!rowAtGoal) {
        goalBox.innerHTML = `Mål-alder (${targetAge} år) er uden for tidslinjen.`;
        return;
    }

    const diff = rowAtGoal.totalWealth - targetAmount;
    if (diff >= 0) {
        goalBox.innerHTML = `✅ Mål opnået! Ved ${targetAge} år forventes din samlede formue at være ${formatDKR(rowAtGoal.totalWealth)}, hvilket er ${formatDKR(diff)} over målet.`;
        goalBox.style.color = "var(--success-color, #4ade80)";
    } else {
        goalBox.innerHTML = `⚠️ Mangler ${formatDKR(Math.abs(diff))} for at nå målet ved ${targetAge} år (Forventet formue: ${formatDKR(rowAtGoal.totalWealth)}).`;
        goalBox.style.color = "var(--warning-color, #facc15)";
    }
}

function updateDashboard() {
    if (typeof runFullSimulation !== "function") return;

    const realValuesSwitch = document.getElementById("realValuesToggleSwitch");
    const useReal = realValuesSwitch ? realValuesSwitch.checked : false;

    const targetGoalAge = getNumber('targetGoalAge');
    const targetGoalAmount = getNumber('targetGoalAmount');
    const simResult = runFullSimulation(0, useReal);
    const timeline = simResult.timeline;

    if (!timeline || timeline.length === 0) return;

    const currentWealthElem = document.getElementById("currentWealth");
    if (currentWealthElem) currentWealthElem.innerText = formatDKR(timeline[0].totalWealth);

    const monthlyNetElem = document.getElementById("monthlyNetPayout");
    if (monthlyNetElem) monthlyNetElem.innerText = formatDKR(getNumber("targetIncomeGoGo"));

    const depletionElem = document.getElementById("depletionAge");
    if (depletionElem) {
        if (simResult.depletionAge) {
            depletionElem.innerText = simResult.depletionAge + " år";
            depletionElem.style.color = "#dc2626";
        } else {
            depletionElem.innerText = "95+ år";
            depletionElem.style.color = "#16a34a";
        }
    }

    // FIX: Genberegn extraSavings hver gang updateDashboard køres
    const extraElem = document.getElementById("extraSavingsRequired");
    if (extraElem && typeof calculateRequiredExtraSavings === "function") {
        try {
            const extraSavings = calculateRequiredExtraSavings();
            if (extraSavings === 0) {
                extraElem.innerText = "0 kr.";
                extraElem.style.color = "#16a34a";
            } else if (extraSavings === -1) {
                extraElem.innerText = "Mål urealistisk";
                extraElem.style.color = "#dc2626";
            } else if (extraSavings < 0) {
                extraElem.innerText = formatDKR(Math.abs(extraSavings)) + " (overskud)";
                extraElem.style.color = "#16a34a";
            } else {
                extraElem.innerText = formatDKR(extraSavings);
                extraElem.style.color = "#d97706";
            }
        } catch (e) {
            console.error("Error calculating extra savings:", e);
            extraElem.innerText = "Fejl i beregning";
            extraElem.style.color = "#dc2626";
        }
    }

    updateTable(timeline);
    updateBalanceTable(timeline);
    evaluateSavingsGoal(timeline, targetGoalAge, targetGoalAmount);

    if (typeof updateChart === "function") {
        const scenarioA = loadScenarioA();
        updateChart(timeline, scenarioA);
    }
}

function setupCurrencyFormatting() {
    const currencyInputs = document.querySelectorAll("input.currency");

    currencyInputs.forEach(input => {
        if (input.value) {
            let digits = input.value.toString().replace(/\D/g, "");
            if (digits) input.value = Number(digits).toLocaleString("da-DK");
        }

        input.addEventListener("input", (e) => {
            let digitsOnly = e.target.value.replace(/\D/g, "");
            if (digitsOnly) {
                e.target.value = Number(digitsOnly).toLocaleString("da-DK");
            } else {
                e.target.value = "";
            }
        });
    });
}

function initCardCollapse() {
    document.querySelectorAll("section.card").forEach(card => {
        if (card.classList.contains("card-collapse-initialized")) return;

        const heading = card.querySelector("h2, h3, h4, h1");
        if (!heading) return;

        const headerContainer = heading.parentElement === card ? heading : heading.parentElement;
        headerContainer.classList.add("card-header");

        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "card-toggle-btn";
        toggleBtn.setAttribute("aria-expanded", "true");
        toggleBtn.title = "Vis/skjul dette card";
        toggleBtn.innerHTML = "▾";

        headerContainer.appendChild(toggleBtn);

        const cardContent = document.createElement("div");
        cardContent.className = "card-content";
        Array.from(card.children).forEach(child => {
            if (child !== headerContainer) {
                cardContent.appendChild(child);
            }
        });
        card.appendChild(cardContent);

        toggleBtn.addEventListener("click", () => {
            const isCollapsed = card.classList.toggle("collapsed");
            toggleBtn.setAttribute("aria-expanded", String(!isCollapsed));
        });

        card.classList.add("card-collapse-initialized");
    });
}

function initThemeToggle() {
    const themeSwitch = document.getElementById("themeToggleSwitch");
    if (!themeSwitch) return;

    const savedTheme = localStorage.getItem("pension_planner_theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
        themeSwitch.checked = true;
    }

    themeSwitch.addEventListener("change", () => {
        if (themeSwitch.checked) {
            document.body.classList.add("dark-theme");
            localStorage.setItem("pension_planner_theme", "dark");
        } else {
            document.body.classList.remove("dark-theme");
            localStorage.setItem("pension_planner_theme", "light");
        }
    });
}

function initRealValuesToggle() {
    const realSwitch = document.getElementById("realValuesToggleSwitch");
    if (!realSwitch) return;

    const savedReal = localStorage.getItem("pension_planner_real_values");
    if (savedReal === "true") {
        realSwitch.checked = true;
    }

    realSwitch.addEventListener("change", () => {
        localStorage.setItem("pension_planner_real_values", realSwitch.checked);
        updateDashboard();
    });
}

function initApp() {
    loadInputsFromStorage();
    setupCurrencyFormatting();
    initThemeToggle();
    initRealValuesToggle();
    initCardCollapse();

    document.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", () => {
            saveInputsToStorage();
            updateDashboard();
        });
        input.addEventListener("change", () => {
            saveInputsToStorage();
            updateDashboard();
        });
    });

    const saveStorageBtn = document.getElementById("saveStorageBtn");
    if (saveStorageBtn) {
        saveStorageBtn.addEventListener("click", () => {
            saveInputsToStorage();
            updateDashboard();

            const originalText = saveStorageBtn.innerText;
            saveStorageBtn.innerText = "✓ Gemt!";
            saveStorageBtn.style.backgroundColor = "#16a34a";
            
            setTimeout(() => {
                saveStorageBtn.innerText = originalText;
                saveStorageBtn.style.backgroundColor = "";
            }, 1500);
        });
    }

    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", clearStorage);
    }
    
    updateDashboard();
}

document.addEventListener("DOMContentLoaded", initApp);