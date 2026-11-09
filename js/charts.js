let myWealthChart = null;

function updateChart(timeline, scenarioA = null) {
    const ctx = document.getElementById('wealthChart');
    if (!ctx) return;
    
    const labels = timeline.map(row => `${row.age} år`);
    const totalData = timeline.map(row => row.totalWealth);
    const freeData = timeline.map(row => row.freeBalance);
    const askData = timeline.map(row => row.askBalance);
    const aopData = timeline.map(row => row.aopBalance);
    const workData = timeline.map(row => row.workBalance);
    const homeData = timeline.map(row => row.homeBalance);

    let datasets = [
        {
            label: 'Samlet Formue',
            data: totalData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.05)',
            borderWidth: 3,
            pointRadius: 0,
            fill: true
        },
        {
            label: 'Frie Midler',
            data: freeData,
            borderColor: '#10b981',
            borderWidth: 2,
            pointRadius: 0
        },
        {
            label: 'Aktiesparekonto (ASK)',
            data: askData,
            borderColor: '#f59e0b',
            borderWidth: 2,
            pointRadius: 0
        },
        {
            label: 'Aldersopsparing (AOP)',
            data: aopData,
            borderColor: '#8b5cf6',
            borderWidth: 2,
            pointRadius: 0
        },
        {
            label: 'Pensionsselskab (Arbejdsgiver)',
            data: workData,
            borderColor: '#ec4899',
            borderWidth: 2,
            pointRadius: 0
        },
        {
            label: 'Friværdi i Bolig',
            data: homeData,
            borderColor: '#64748b',
            borderWidth: 2,
            pointRadius: 0,
            hidden: true // Skjult som standard for ikke at overvælde grafen
        }
    ];

    if (scenarioA) {
        const scenarioData = scenarioA.map(row => row.totalWealth);
        datasets.push({
            label: 'Scenarie A (Samlet)',
            data: scenarioData,
            borderColor: '#94a3b8',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
        });
    }

    if (myWealthChart) {
        myWealthChart.destroy();
    }

    myWealthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return (value / 1000).toLocaleString('da-DK') + ' t.kr.';
                        }
                    }
                }
            }
        }
    });
}