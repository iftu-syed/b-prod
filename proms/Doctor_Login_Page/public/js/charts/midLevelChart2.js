function createMidLevelChart2(data) {
    const container = document.getElementById("midLevelChart2");

    if (!container) {
        console.error("Error: #midLevelChart2 container not found.");
        return;
    }

    // Set dimensions and margins
    const width = 400;
    const height = 250;
    const margin = { top: 50, right: 30, bottom: 60, left: 50 };

    // Clear any existing SVG content
    d3.select("#midLevelChart2").selectAll("svg").remove();
    // Clear any existing tooltips
    d3.select("#midLevelChart2").selectAll(".tooltip").remove();

    // If data is empty, display a message
    if (data.length === 0) {
        container.innerHTML = "<p class='no-data-message'>No data available for the selected combination.</p>";
        return;
    } else {
        container.innerHTML = ""; // Clear any previous message
    }

    // Create tooltip div
    const tooltip = d3.select("#midLevelChart2")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("padding", "8px")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

    // Create SVG container
    const svg = d3.select("#midLevelChart2")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 1.6)
        .attr("class", "chart-title")
        .text("PROMs Score Trend");

    // Parse dates and set scales
    const parseDate = d3.timeParse("%Y-%m-%dT%H:%M:%S.%LZ");
    const formatDate = d3.timeFormat("%B %d, %Y");
    
    data.forEach(d => {
        d.surveyReceivedDate = parseDate(d.surveyReceivedDate);
    });

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.surveyReceivedDate))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    // Create x-axis and y-axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x)
            .ticks(5)
            .tickFormat(d3.timeFormat("%b %d")))
        .selectAll("text")
        .attr("class", "axis-label");

    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("class", "axis-label");

    // Function to handle mouseover
    const handleMouseOver = function(event, d) {
        const circle = d3.select(this);
        
        // Highlight the point
        circle.transition()
            .duration(300)
            .attr("r", 7)
            .attr("fill", "#1F8A70");

        // Show and position the tooltip
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);
        
        tooltip.html(`
            <strong>Score:</strong> ${d.score}<br/>
            <strong>Date:</strong> ${formatDate(d.surveyReceivedDate)}
        `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    };

    // Function to handle mouseout
    const handleMouseOut = function() {
        const circle = d3.select(this);
        
        // Reset the point
        circle.transition()
            .duration(300)
            .attr("r", 5)
            .attr("fill", "#2D9E69");

        // Hide the tooltip
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    };

    // Plot points with entry animation and hover effects
    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "score-bubble")
        .attr("cx", d => x(d.surveyReceivedDate))
        .attr("cy", d => y(d.score))
        .attr("r", 0)
        .attr("fill", "#2D9E69")
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut)
        .transition()
        .duration(800)
        .attr("r", 5);

    // Add x-axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 15)
        .text("Date Received");

    // Add y-axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 10)
        .attr("x", -height / 2)
        .text("PROMs Score");

    // Add the fade-in animation for the axis labels
    svg.selectAll(".axis-label")
        .style("opacity", 0)
        .transition()
        .duration(800)
        .style("opacity", 1);

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width / 2 + 130}, ${height + margin.bottom - 20})`);

    // Add legend circle
    legend.append("circle")
        .attr("class", "legend-bubble")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 6)
        .attr("fill", "#2D9E69");

    // Add legend text
    legend.append("text")
        .attr("class", "legend-text")
        .attr("x", 15)
        .attr("y", 5)
        .text("PROMs Score");
}

// Keep the existing fetch and initialization code
function fetchScatterPlotData(diagnosisICD10, promsInstrument, scale) {
    console.log("Fetching scatter plot data with:", { diagnosisICD10, promsInstrument, scale });
    const queryParams = `diagnosisICD10=${encodeURIComponent(diagnosisICD10)}&promsInstrument=${encodeURIComponent(promsInstrument)}&scale=${encodeURIComponent(scale)}`;

    fetch(basePath + `/api/proms-scores?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            console.log("Received data:", data);
            createMidLevelChart2(data);
        })
        .catch(error => console.error("Error fetching PROMs scores for scatter plot:", error));
}

// Keep the existing initialization and event listener code
document.addEventListener("DOMContentLoaded", () => {
    waitForDropdownsToLoad(() => {
        const diagnosisDropdown = document.getElementById("diagnosisDropdown");
        const instrumentDropdown = document.getElementById("instrumentDropdown");
        const scaleDropdown = document.getElementById("scaleDropdown");

        const initialDiagnosis = diagnosisDropdown.value;
        const initialInstrument = instrumentDropdown.value;
        const initialScale = scaleDropdown.value;

        if (initialDiagnosis && initialInstrument && initialScale) {
            fetchScatterPlotData(initialDiagnosis, initialInstrument, initialScale);
        }

        [diagnosisDropdown, instrumentDropdown, scaleDropdown].forEach(dropdown => {
            dropdown.addEventListener("change", () => {
                if (diagnosisDropdown.value && instrumentDropdown.value && scaleDropdown.value) {
                    fetchScatterPlotData(
                        diagnosisDropdown.value,
                        instrumentDropdown.value,
                        scaleDropdown.value
                    );
                }
            });
        });
    });
});