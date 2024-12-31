function createNumberCard3(value) {
    const container = document.getElementById('number-card-3');
    if (!container) {
        console.error("Number Card 3 container not found.");
        return;
    }

    container.innerHTML = `
        <h3>Total Surveys Completed</h3>
        <p>${value}</p>
    `;
}
