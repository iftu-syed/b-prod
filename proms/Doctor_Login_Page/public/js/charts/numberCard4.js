function createNumberCard4(responseRate) {
    // Define dimensions for the SVG
    const width = 200;
    const height = 100;

    // Clear previous content
    d3.select('#numberCard4').selectAll('*').remove();

    // Create an SVG container
    const svg = d3.select('#numberCard4')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add text for the response rate
    const valueText = svg.append('text')
        .attr('x', width / 2)  // Center the text horizontally
        .attr('y', height / 2 - 10)  // Position vertically
        .attr('text-anchor', 'middle')  // Align text to the center
        .attr('class', 'number-card-value-4')
        .text('0%'); // Start with 0%

    // Add text for the description
    svg.append('text')
        .attr('x', width / 2)  // Center the text horizontally
        .attr('y', height / 2 + 20)  // Position below the number
        .attr('text-anchor', 'middle')  // Align text to the center
        .attr('class', 'number-card-description')
        .text('Response Rate');

    // Count-Up Animation using D3's interval
    let currentValue = 0; // Starting value
    const targetValue = Math.round(responseRate); // Convert fraction to whole percentage and round
    const step = Math.max(1, Math.ceil(targetValue / 50)); // Dynamic step size
    const intervalDuration = 30; // Interval time in ms

    const countUpInterval = d3.interval(() => {
        currentValue += step;

        // Ensure the value doesn't overshoot the target
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            valueText.text(`${currentValue}%`);
            countUpInterval.stop(); // Stop the animation
        } else {
            valueText.text(`${currentValue}%`);
        }
    }, intervalDuration);
}