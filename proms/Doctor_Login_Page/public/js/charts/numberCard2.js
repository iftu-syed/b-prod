function createNumberCard2(totalSurveysSent) {
    // Define dimensions for the SVG
    const width = 200;
    const height = 100;

    // Clear previous content
    d3.select('#numberCard2').selectAll('*').remove();

    // Create an SVG container
    const svg = d3.select('#numberCard2')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add text for the total surveys sent
    const valueText = svg.append('text')
        .attr('x', width / 2)  // Center the text horizontally
        .attr('y', height / 2 - 10)  // Position vertically
        .attr('text-anchor', 'middle')  // Align text to the center
        .attr('class', 'number-card-value-2')
        .text('0'); // Start with 0

    // Add text for the description
    svg.append('text')
        .attr('x', width / 2)  // Center the text horizontally
        .attr('y', height / 2 + 20)  // Position below the number
        .attr('text-anchor', 'middle')  // Align text to the center
        .attr('class', 'number-card-description')
        .text('Surveys Sent');

    // Count-Up Animation using D3.js
    let currentValue = 0;
    const duration = 1000; // Adjust the total animation duration
    let countUpInterval; // Store the interval reference

    countUpInterval = d3.interval(() => {
        currentValue += 1;
        if (currentValue > totalSurveysSent) {
            currentValue = totalSurveysSent;
            valueText.transition()
                .duration(duration)
                .tween('text', function() {
                    const i = d3.interpolate(this.textContent, currentValue);
                    return function(t) {
                        this.textContent = Math.floor(i(t)).toLocaleString();
                    };
                });
            countUpInterval.stop(); // Stop the interval
        } else {
            valueText.text(currentValue.toLocaleString());
        }
    }, duration / (totalSurveysSent * 2)); // Update value twice as fast
}

function waitForDropdownsToLoad(callback) {
    const departmentDropdown = document.getElementById("departmentDropdown");

    const interval = setInterval(() => {
        if (departmentDropdown.value) {
            clearInterval(interval);
            callback();
        }
    }, 50);
}

document.addEventListener("DOMContentLoaded", () => {
    waitForDropdownsToLoad(() => {
        const departmentDropdown = document.getElementById("departmentDropdown");

        const fetchNumberCard2Data = (department) => {
            const queryParams = new URLSearchParams({
                ...(department && { department })
            }).toString();

            fetch(`${basePath}/api/summary?${queryParams}`)
                .then(response => response.json())
                .then(data => {
                    createNumberCard2(data.totalSurveysSent);
                })
                .catch(error => console.error("Error fetching number card 2 data:", error));
        };

        // Initial fetch with the selected department
        fetchNumberCard2Data(departmentDropdown.value);

        // Add event listener to update number card 2 on department change
        departmentDropdown.addEventListener("change", () => {
            fetchNumberCard2Data(departmentDropdown.value);
        });
    });
});
