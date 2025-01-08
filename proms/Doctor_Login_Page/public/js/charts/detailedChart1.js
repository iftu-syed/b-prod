function createDetailedChart1(data) {
    const container = document.getElementById("detailedChart1");

    if (!container) {
        console.error("Error: #detailedChart1 container not found.");
        return;
    }

    const width = 460;
    const height = 210;
    const margin = { top: 65, right: 60, bottom: 95, left: 120 };

    // Clear any existing content and tooltips
    d3.select("#detailedChart1").selectAll("*").remove();

    // Create tooltip div
    const tooltip = d3.select("#detailedChart1")
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

    const treatmentPlans = Array.from(new Set(data.map(d => d.treatmentPlan)));
    const diagnoses = Array.from(new Set(data.map(d => d.diagnosisICD10)));

    const x = d3.scaleBand()
        .domain(diagnoses)
        .range([0, width])
        .padding(0.05);

    const y = d3.scaleBand()
        .domain(treatmentPlans)
        .range([height, 0])
        .padding(0.05);

    const color = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range(["#e0e0e0", "#4B57F9"]);

    const svg = d3.select("#detailedChart1")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2 + 15)
        .style("font-family", "Urbanist")
        .attr("class", "chart-title")
        .text("Treatment Plan vs. Diagnosis Heatmap");

    // Function to handle cell mouseover
    const handleMouseOver = function(event, d) {
        const cell = d3.select(this);
        
        // Highlight the cell
        cell.transition()
            .duration(300)
            .attr("transform", "scale(1.05)")
            .attr("fill", "#2942C6");

        // Show tooltip
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);

        tooltip.html(`
            <strong>Diagnosis:</strong> ${d.diagnosisICD10}<br/>
            <strong>Treatment Plan:</strong> ${d.treatmentPlan}<br/>
            <strong>Count:</strong> ${d.count} patients
        `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");

        // Highlight the corresponding text
        svg.selectAll(".cell-text")
            .filter(textD => textD === d)
            .style("font-weight", "bold")
            .style("fill", "white");
    };

    const handleMouseMove = function(event) {
        // Update tooltip position to be closer to the cursor
        tooltip
            .style("left", (event.pageX - 35) + "px")  // Adjusted X position (closer)
            .style("top", (event.pageY - 5) + "px"); // Adjusted Y position (closer)
    };

    // Function to handle cell mouseout
    const handleMouseOut = function(event, d) {
        const cell = d3.select(this);
        
        // Reset the cell
        cell.transition()
            .duration(300)
            .attr("transform", "scale(1)")
            .attr("fill", d => color(d.count));

        // Hide tooltip
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);

        // Reset the text
        svg.selectAll(".cell-text")
            .filter(textD => textD === d)
            .style("font-weight", "normal")
            .style("fill", "black");
    };

    // Add axes
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll("text")
        .attr("class", "axis-label axis-text-end")
        .attr("transform", "rotate(-15)")
        .attr("dy", "0.5em");

    svg.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll("text")
        .attr("class", "axis-label axis-text-end")
        .attr("transform", "rotate(-15)")
        .attr("dx", "-0.5em");

    // Add heatmap cells with tooltips
    svg.selectAll("rect.heatmap-cell")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", d => x(d.diagnosisICD10))
        .attr("y", d => y(d.treatmentPlan))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.count))
        .attr("rx", 5) // Horizontal corner radius
        .attr("ry", 5) // Vertical corner radius
        .attr("opacity", 0)
        .on("mouseover", handleMouseOver)
        .on("mousemove", handleMouseMove)
        .on("mouseout", handleMouseOut)
        .transition()
        .duration(800)
        .attr("opacity", 1);

    // Add cell labels
    svg.selectAll("text.count")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "cell-text")
        .attr("x", d => x(d.diagnosisICD10) + x.bandwidth() / 2)
        .attr("y", d => y(d.treatmentPlan) + y.bandwidth() / 2)
        .style("pointer-events", "none")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .text(d => d.count);

    // Add axis labels with animation
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 40)
        .style("opacity", 0)
        .text("Diagnosis")
        .style("font-family", "Urbanist")
        .style("font-size", "14px")
        .transition()
        .duration(800)
        .style("opacity", 1);

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 12)
        .attr("x", -height / 2)
        .style("opacity", 0)
        .text("Treatment Plan")
        .style("font-family", "Urbanist")
        .style("font-size", "14px")
        .transition()
        .duration(800)
        .style("opacity", 1);

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 10}, 0)`);

    const legendHeight = 100;
    const legendScale = d3.scaleLinear()
        .domain([20, 90])
        .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale).ticks(5);

    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "heatmapGradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("class", "start-color");

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("class", "end-color");

    legend.append("rect")
        .attr("class", "legend-gradient")
        .attr("width", 10)
        .attr("height", legendHeight)
        .style("fill", "url(#heatmapGradient)");

    legend.append("g")
        .attr("transform", "translate(12, 0)")
        .call(legendAxis)
        .selectAll("text")
        .attr("class", "legend-text");
}

// Keep the existing fetch and initialization code
// function fetchHeatmapData() {
//     fetch(basePath + '/api/treatment-diagnosis-heatmap')
//         .then(response => response.json())
//         .then(data => {
//             createDetailedChart1(data);
//         })
//         .catch(error => console.error("Error fetching heatmap data:", error));
// }

// document.addEventListener("DOMContentLoaded", fetchHeatmapData);


// function fetchHeatmapData(department, diagnosisICD10, promsInstrument, scale) {
//     const queryParams = new URLSearchParams({
//         ...(department && { department }),
//         ...(diagnosisICD10 && { diagnosisICD10 }),
//         ...(promsInstrument && { promsInstrument }),
//         ...(scale && { scale })
//     }).toString();

//     fetch(`${basePath}/api/treatment-diagnosis-heatmap?${queryParams}`)
//         .then(response => response.json())
//         .then(data => {
//             createDetailedChart1(data);
//         })
//         .catch(error => console.error("Error fetching heatmap data:", error));
// }


function fetchHeatmapData(department, siteName, diagnosisICD10, promsInstrument, scale) {
    const queryParams = new URLSearchParams({
        ...(department && { department }),
        ...(siteName && { siteName }),
        ...(diagnosisICD10 && { diagnosisICD10 }),
        ...(promsInstrument && { promsInstrument }),
        ...(scale && { scale })
    }).toString();

    fetch(`${basePath}/api/treatment-diagnosis-heatmap?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            createDetailedChart1(data);
        })
        .catch(error => console.error("Error fetching heatmap data:", error));
}


// function waitForDropdownsToLoad(callback) {
//     const departmentDropdown = document.getElementById("departmentDropdown");
//     const diagnosisDropdown = document.getElementById("diagnosisDropdown");
//     const instrumentDropdown = document.getElementById("instrumentDropdown");
//     const scaleDropdown = document.getElementById("scaleDropdown");

//     const interval = setInterval(() => {
//         if (
//             departmentDropdown.value &&
//             diagnosisDropdown.value &&
//             instrumentDropdown.value &&
//             scaleDropdown.value
//         ) {
//             clearInterval(interval);
//             callback();
//         }
//     }, 50);
// }


// document.addEventListener("DOMContentLoaded", () => {
//     const departmentDropdown = document.getElementById("departmentDropdown");
//     const diagnosisDropdown = document.getElementById("diagnosisDropdown");
//     const instrumentDropdown = document.getElementById("instrumentDropdown");
//     const scaleDropdown = document.getElementById("scaleDropdown");

//     [departmentDropdown, diagnosisDropdown, instrumentDropdown, scaleDropdown].forEach(dropdown => {
//         dropdown.addEventListener("change", () => {
//             const selectedDepartment = departmentDropdown.value;
//             const selectedDiagnosis = diagnosisDropdown.value;
//             const selectedInstrument = instrumentDropdown.value;
//             const selectedScale = scaleDropdown.value;

//             if (selectedDepartment || selectedDiagnosis || selectedInstrument || selectedScale) {
//                 fetchHeatmapData(selectedDepartment, selectedDiagnosis, selectedInstrument, selectedScale);
//             }
//         });
//     });

//     // Fetch initial data with default or empty filters
//     fetchHeatmapData();
// });


// document.addEventListener("DOMContentLoaded", () => {
//     waitForDropdownsToLoad(() => {
//         const departmentDropdown = document.getElementById("departmentDropdown");
//         const diagnosisDropdown = document.getElementById("diagnosisDropdown");
//         const instrumentDropdown = document.getElementById("instrumentDropdown");
//         const scaleDropdown = document.getElementById("scaleDropdown");

//         const selectedDepartment = departmentDropdown.value;
//         const selectedDiagnosis = diagnosisDropdown.value;
//         const selectedInstrument = instrumentDropdown.value;
//         const selectedScale = scaleDropdown.value;

//         // Fetch initial data with the default dropdown values
//         fetchHeatmapData(selectedDepartment, selectedDiagnosis, selectedInstrument, selectedScale);

//         // Add event listeners to update the heatmap based on dropdown changes
//         [departmentDropdown, diagnosisDropdown, instrumentDropdown, scaleDropdown].forEach(
//             dropdown => {
//                 dropdown.addEventListener("change", () => {
//                     const updatedDepartment = departmentDropdown.value;
//                     const updatedDiagnosis = diagnosisDropdown.value;
//                     const updatedInstrument = instrumentDropdown.value;
//                     const updatedScale = scaleDropdown.value;

//                     fetchHeatmapData(updatedDepartment, updatedDiagnosis, updatedInstrument, updatedScale);
//                 });
//             }
//         );
//     });
// });


function waitForDropdownsToLoad(callback) {
    const departmentDropdown = document.getElementById("departmentDropdown");
    const siteNameDropdown = document.getElementById("siteNameDropdown");
    const diagnosisDropdown = document.getElementById("diagnosisDropdown");
    const instrumentDropdown = document.getElementById("instrumentDropdown");
    const scaleDropdown = document.getElementById("scaleDropdown");

    const interval = setInterval(() => {
        if (
            departmentDropdown.value &&
            siteNameDropdown.value &&
            diagnosisDropdown.value &&
            instrumentDropdown.value &&
            scaleDropdown.value
        ) {
            clearInterval(interval);
            callback();
        }
    }, 50);
}


document.addEventListener("DOMContentLoaded", () => {
    waitForDropdownsToLoad(() => {
        const departmentDropdown = document.getElementById("departmentDropdown");
        const siteNameDropdown = document.getElementById("siteNameDropdown");
        const diagnosisDropdown = document.getElementById("diagnosisDropdown");
        const instrumentDropdown = document.getElementById("instrumentDropdown");
        const scaleDropdown = document.getElementById("scaleDropdown");

        const selectedDepartment = departmentDropdown.value;
        const selectedSiteName = siteNameDropdown.value;
        const selectedDiagnosis = diagnosisDropdown.value;
        const selectedInstrument = instrumentDropdown.value;
        const selectedScale = scaleDropdown.value;

        // Fetch initial data with the default dropdown values
        fetchHeatmapData(selectedDepartment, selectedSiteName, selectedDiagnosis, selectedInstrument, selectedScale);

        // Add event listeners to update the heatmap based on dropdown changes
        [departmentDropdown, siteNameDropdown, diagnosisDropdown, instrumentDropdown, scaleDropdown].forEach(
            dropdown => {
                dropdown.addEventListener("change", () => {
                    const updatedDepartment = departmentDropdown.value;
                    const updatedSiteName = siteNameDropdown.value;
                    const updatedDiagnosis = diagnosisDropdown.value;
                    const updatedInstrument = instrumentDropdown.value;
                    const updatedScale = scaleDropdown.value;

                    fetchHeatmapData(updatedDepartment, updatedSiteName, updatedDiagnosis, updatedInstrument, updatedScale);
                });
            }
        );
    });
});
