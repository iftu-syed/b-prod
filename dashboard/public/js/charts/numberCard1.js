function createNumberCard1(value) {
    const container = document.getElementById('number-card-1');
    if (!container) {
        console.error("Number Card 1 container not found.");
        return;
    }

    container.innerHTML = `
        <h3>Total Patients Registered</h3>
        <p>${value}</p>
    `;
}
