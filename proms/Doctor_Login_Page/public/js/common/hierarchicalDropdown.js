// // Function to populate the hierarchical dropdowns
// function populateHierarchicalDropdowns(selectedDepartment = '') {
//     return fetch(`${basePath}/api/get-hierarchical-options${selectedDepartment ? `?department=${selectedDepartment}` : ''}`)
//         .then(response => response.json())
//         .then(data => {
//             const diagnosisDropdown = document.getElementById("diagnosisDropdown");
//             const instrumentDropdown = document.getElementById("instrumentDropdown");
//             const scaleDropdown = document.getElementById("scaleDropdown");

//             // Clear all dropdowns
//             diagnosisDropdown.innerHTML = '<option value="">Select Diagnosis</option>';
//             instrumentDropdown.innerHTML = '<option value="">Select Instrument</option>';
//             scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

//             // Populate the diagnosis dropdown
//             data.forEach(item => {
//                 const option = document.createElement("option");
//                 option.value = item.diagnosisICD10;
//                 option.text = item.diagnosisICD10;
//                 diagnosisDropdown.appendChild(option);
//             });

//             // Set default values and return initial state
//             if (data.length > 0) {
//                 const defaultDiagnosis = data[0].diagnosisICD10;
//                 diagnosisDropdown.value = defaultDiagnosis;

//                 const defaultInstrument = updateInstrumentDropdown(data, defaultDiagnosis);
//                 if (defaultInstrument) {
//                     const defaultScale = updateScaleDropdown(data, defaultDiagnosis, defaultInstrument);
//                     if (defaultScale) {
//                         // Trigger the initial dashboard filter (or chart load) with all default values
//                         filterDashboard(defaultScale, selectedDepartment);
//                     }
//                 }

//                 return { data, diagnosis: defaultDiagnosis };
//             }

//             console.warn("No data available for dropdowns");
//             return null;
//         })
//         .catch(error => {
//             console.error("Error fetching hierarchical dropdown data:", error);
//             return null;
//         });
// }

// // Function to update the instrument dropdown based on selected diagnosis
// function updateInstrumentDropdown(data, selectedDiagnosis) {
//     const instrumentDropdown = document.getElementById("instrumentDropdown");
//     const scaleDropdown = document.getElementById("scaleDropdown");

//     instrumentDropdown.innerHTML = '<option value="">Select Instrument</option>';
//     scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

//     const selectedData = data.find(item => item.diagnosisICD10 === selectedDiagnosis);
//     if (selectedData) {
//         selectedData.promsInstruments.forEach((instrument, index) => {
//             const option = document.createElement("option");
//             option.value = instrument.promsInstrument;
//             option.text = instrument.promsInstrument;
//             instrumentDropdown.appendChild(option);

//             // Set the first instrument as default
//             if (index === 0) {
//                 instrumentDropdown.value = instrument.promsInstrument;
//             }
//         });

//         instrumentDropdown.disabled = false;
//         return instrumentDropdown.value; // Return the default selected instrument
//     } else {
//         console.warn("No instruments found for the selected diagnosis");
//         instrumentDropdown.disabled = true;
//         return null;
//     }
// }

// // Function to update the scale dropdown based on selected instrument
// function updateScaleDropdown(data, selectedDiagnosis, selectedInstrument) {
//     const scaleDropdown = document.getElementById("scaleDropdown");

//     scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

//     const selectedData = data.find(item => item.diagnosisICD10 === selectedDiagnosis);
//     const instrumentData = selectedData?.promsInstruments.find(inst => inst.promsInstrument === selectedInstrument);

//     if (instrumentData) {
//         instrumentData.scales.forEach((scale, index) => {
//             const option = document.createElement("option");
//             option.value = scale;
//             option.text = scale;
//             scaleDropdown.appendChild(option);

//             // Set the first scale as default
//             if (index === 0) {
//                 scaleDropdown.value = scale;
//             }
//         });

//         scaleDropdown.disabled = false;
//         return scaleDropdown.value; // Return the default selected scale
//     } else {
//         console.warn("No scales found for the selected instrument");
//         scaleDropdown.disabled = true;
//         return null;
//     }
// }

// // Event listeners for cascading behavior
// document.addEventListener("DOMContentLoaded", () => {
//     let hierarchicalData = [];

//     // Initialize the dropdowns
//     populateHierarchicalDropdowns().then(initialState => {
//         if (initialState && initialState.data) {
//             hierarchicalData = initialState.data; // Ensure data is properly assigned
//         }

//         const departmentDropdown = document.getElementById("departmentDropdown");
//         const diagnosisDropdown = document.getElementById("diagnosisDropdown");
//         const instrumentDropdown = document.getElementById("instrumentDropdown");
//         const scaleDropdown = document.getElementById("scaleDropdown");

//         // Department dropdown change event
//         departmentDropdown.addEventListener("change", (event) => {
//             const selectedDepartment = event.target.value;

//             // Fetch and repopulate hierarchical dropdowns based on department
//             populateHierarchicalDropdowns(selectedDepartment).then(newState => {
//                 if (newState && newState.data) {
//                     hierarchicalData = newState.data;
//                 }
//             });
//         });

//         // Diagnosis dropdown change event
//         diagnosisDropdown.addEventListener("change", event => {
//             const selectedDiagnosis = event.target.value;
//             const selectedInstrument = updateInstrumentDropdown(hierarchicalData, selectedDiagnosis);
//             if (selectedInstrument) {
//                 updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
//             }
//         });

//         // Instrument dropdown change event
//         instrumentDropdown.addEventListener("change", event => {
//             const selectedDiagnosis = diagnosisDropdown.value;
//             const selectedInstrument = event.target.value;
//             updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
//         });

//         // Scale dropdown change event
//         scaleDropdown.addEventListener("change", event => {
//             const selectedDiagnosis = diagnosisDropdown.value;
//             const selectedInstrument = instrumentDropdown.value;
//             const selectedScale = event.target.value;

//             if (selectedDiagnosis && selectedInstrument && selectedScale) {
//                 const selectedDepartment = departmentDropdown.value;
//                 filterDashboard(selectedScale, selectedDepartment);
//             }
//         });
//     });
// });

// // Function to filter the dashboard based on the selected scale and department
// function filterDashboard(scale, department) {
//     console.log("Filtering dashboard with scale:", scale, "and department:", department);
//     // Implement dashboard filtering logic or chart initialization here
// }





// // Function to fetch and populate the department dropdown
// function populateDepartmentDropdown() {
//     return fetch(basePath + '/api/get-department-options')
//         .then(response => response.json())
//         .then(departments => {
//             const departmentDropdown = document.getElementById("departmentDropdown");

//             // Clear existing options
//             departmentDropdown.innerHTML = '<option value="">Select Department</option>';

//             // Populate with fetched departments
//             departments.forEach(department => {
//                 const option = document.createElement("option");
//                 option.value = department;
//                 option.text = department;
//                 departmentDropdown.appendChild(option);
//             });

//             // Set default department if available
//             if (departments.length > 0) {
//                 departmentDropdown.value = departments[0]; // Select the first department as default
//                 populateHierarchicalDropdowns(departments[0]); // Populate other dropdowns with default department
//             }

//             departmentDropdown.disabled = false; // Enable the dropdown once populated
//         })
//         .catch(error => {
//             console.error("Error fetching department data:", error);
//         });
// }


// // Initialize the department dropdown
// document.addEventListener("DOMContentLoaded", () => {
//     populateDepartmentDropdown();
// });




// // Function to populate hierarchical dropdowns with siteName
// function populateHierarchicalDropdowns(selectedDepartment = '', selectedSite = '') {
//     return fetch(`${basePath}/api/get-hierarchical-options${selectedDepartment ? `?department=${selectedDepartment}` : ''}${selectedSite ? `&site=${selectedSite}` : ''}`)
//         .then(response => response.json())
//         .then(data => {
//             const diagnosisDropdown = document.getElementById("diagnosisDropdown");
//             const instrumentDropdown = document.getElementById("instrumentDropdown");
//             const scaleDropdown = document.getElementById("scaleDropdown");

//             // Clear all dropdowns
//             diagnosisDropdown.innerHTML = '<option value="">Select Diagnosis</option>';
//             instrumentDropdown.innerHTML = '<option value="">Select Instrument</option>';
//             scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

//             // Populate the diagnosis dropdown
//             data.forEach(item => {
//                 const option = document.createElement("option");
//                 option.value = item.diagnosisICD10;
//                 option.text = item.diagnosisICD10;
//                 diagnosisDropdown.appendChild(option);
//             });

//             // Set default values and return initial state
//             if (data.length > 0) {
//                 const defaultDiagnosis = data[0].diagnosisICD10;
//                 diagnosisDropdown.value = defaultDiagnosis;

//                 const defaultInstrument = updateInstrumentDropdown(data, defaultDiagnosis);
//                 if (defaultInstrument) {
//                     const defaultScale = updateScaleDropdown(data, defaultDiagnosis, defaultInstrument);
//                     if (defaultScale) {
//                         // Trigger the initial dashboard filter (or chart load) with all default values
//                         filterDashboard(defaultScale, selectedDepartment, selectedSite);
//                     }
//                 }

//                 return { data, diagnosis: defaultDiagnosis };
//             }

//             console.warn("No data available for dropdowns");
//             return null;
//         })
//         .catch(error => {
//             console.error("Error fetching hierarchical dropdown data:", error);
//             return null;
//         });
// }

// // Function to fetch and populate the siteName dropdown
// function populateSiteNameDropdown(selectedDepartment = '') {
//     return fetch(`${basePath}/api/get-site-options${selectedDepartment ? `?department=${selectedDepartment}` : ''}`)
//         .then(response => response.json())
//         .then(sites => {
//             const siteNameDropdown = document.getElementById("siteNameDropdown");

//             // Clear existing options
//             siteNameDropdown.innerHTML = '<option value="">Select Site</option>';

//             // Populate with fetched sites
//             sites.forEach(site => {
//                 const option = document.createElement("option");
//                 option.value = site;
//                 option.text = site;
//                 siteNameDropdown.appendChild(option);
//             });

//             // Set default site if available
//             if (sites.length > 0) {
//                 siteNameDropdown.value = sites[0]; // Select the first site as default
//                 siteNameDropdown.disabled = false;
//                 console.log("Default site selected:", sites[0]);
//             } else {
//                 siteNameDropdown.disabled = true; // Disable dropdown if no sites available
//             }

//             return sites.length > 0 ? sites[0] : null; // Return default site
//         })
//         .catch(error => {
//             console.error("Error fetching site options:", error);
//         });
// }

// // Function to update the instrument dropdown based on selected diagnosis
// function updateInstrumentDropdown(data, selectedDiagnosis) {
//     const instrumentDropdown = document.getElementById("instrumentDropdown");
//     const scaleDropdown = document.getElementById("scaleDropdown");

//     instrumentDropdown.innerHTML = '<option value="">Select Instrument</option>';
//     scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

//     const selectedData = data.find(item => item.diagnosisICD10 === selectedDiagnosis);
//     if (selectedData) {
//         selectedData.promsInstruments.forEach((instrument, index) => {
//             const option = document.createElement("option");
//             option.value = instrument.promsInstrument;
//             option.text = instrument.promsInstrument;
//             instrumentDropdown.appendChild(option);

//             // Set the first instrument as default
//             if (index === 0) {
//                 instrumentDropdown.value = instrument.promsInstrument;
//             }
//         });

//         instrumentDropdown.disabled = false;
//         return instrumentDropdown.value; // Return the default selected instrument
//     } else {
//         console.warn("No instruments found for the selected diagnosis");
//         instrumentDropdown.disabled = true;
//         return null;
//     }
// }

// // Function to update the scale dropdown based on selected instrument
// function updateScaleDropdown(data, selectedDiagnosis, selectedInstrument) {
//     const scaleDropdown = document.getElementById("scaleDropdown");

//     scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

//     const selectedData = data.find(item => item.diagnosisICD10 === selectedDiagnosis);
//     const instrumentData = selectedData?.promsInstruments.find(inst => inst.promsInstrument === selectedInstrument);

//     if (instrumentData) {
//         instrumentData.scales.forEach((scale, index) => {
//             const option = document.createElement("option");
//             option.value = scale;
//             option.text = scale;
//             scaleDropdown.appendChild(option);

//             // Set the first scale as default
//             if (index === 0) {
//                 scaleDropdown.value = scale;
//             }
//         });

//         scaleDropdown.disabled = false;
//         return scaleDropdown.value; // Return the default selected scale
//     } else {
//         console.warn("No scales found for the selected instrument");
//         scaleDropdown.disabled = true;
//         return null;
//     }
// }

// // Event listeners for cascading behavior
// document.addEventListener("DOMContentLoaded", () => {
//     let hierarchicalData = [];

//     // Initialize the dropdowns
//     populateHierarchicalDropdowns().then(initialState => {
//         if (initialState && initialState.data) {
//             hierarchicalData = initialState.data; // Ensure data is properly assigned
//         }

//         const departmentDropdown = document.getElementById("departmentDropdown");
//         const siteNameDropdown = document.getElementById("siteNameDropdown");
//         const diagnosisDropdown = document.getElementById("diagnosisDropdown");
//         const instrumentDropdown = document.getElementById("instrumentDropdown");
//         const scaleDropdown = document.getElementById("scaleDropdown");

//         // Department dropdown change event
//         departmentDropdown.addEventListener("change", (event) => {
//             const selectedDepartment = event.target.value;

//             // Fetch and repopulate siteName dropdown
//             populateSiteNameDropdown(selectedDepartment).then(defaultSite => {
//                 console.log("Default site after department change:", defaultSite);
//                 // Repopulate hierarchical dropdowns based on department and default site
//                 populateHierarchicalDropdowns(selectedDepartment, defaultSite).then(newState => {
//                     if (newState && newState.data) {
//                         hierarchicalData = newState.data;
//                     }
//                 });
//             });
//         });

//         // SiteName dropdown change event
//         siteNameDropdown.addEventListener("change", (event) => {
//             const selectedSite = event.target.value;
//             const selectedDepartment = departmentDropdown.value;

//             // Repopulate hierarchical dropdowns based on site
//             populateHierarchicalDropdowns(selectedDepartment, selectedSite).then(newState => {
//                 if (newState && newState.data) {
//                     hierarchicalData = newState.data;
//                 }
//             });
//         });

//         // Diagnosis dropdown change event
//         diagnosisDropdown.addEventListener("change", event => {
//             const selectedDiagnosis = event.target.value;
//             const selectedInstrument = updateInstrumentDropdown(hierarchicalData, selectedDiagnosis);
//             if (selectedInstrument) {
//                 updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
//             }
//         });

//         // Instrument dropdown change event
//         instrumentDropdown.addEventListener("change", event => {
//             const selectedDiagnosis = diagnosisDropdown.value;
//             const selectedInstrument = event.target.value;
//             updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
//         });

//         // Scale dropdown change event
//         scaleDropdown.addEventListener("change", event => {
//             const selectedDiagnosis = diagnosisDropdown.value;
//             const selectedInstrument = instrumentDropdown.value;
//             const selectedScale = event.target.value;
//             const selectedDepartment = departmentDropdown.value;
//             const selectedSite = siteNameDropdown.value;

//             if (selectedDiagnosis && selectedInstrument && selectedScale) {
//                 filterDashboard(selectedScale, selectedDepartment, selectedSite);
//             }
//         });
//     });
// });

// // Function to filter the dashboard based on the selected scale, department, and site
// function filterDashboard(scale, department, site) {
//     console.log("Filtering dashboard with scale:", scale, "department:", department, "site:", site);
//     // Implement dashboard filtering logic here
// }

// // Function to fetch and populate the department dropdown
// function populateDepartmentDropdown() {
//     return fetch(basePath + '/api/get-department-options')
//         .then(response => response.json())
//         .then(departments => {
//             const departmentDropdown = document.getElementById("departmentDropdown");

//             // Clear existing options
//             departmentDropdown.innerHTML = '<option value="">Select Department</option>';

//             // Populate with fetched departments
//             departments.forEach(department => {
//                 const option = document.createElement("option");
//                 option.value = department;
//                 option.text = department;
//                 departmentDropdown.appendChild(option);
//             });

//             // Set default department if available
//             if (departments.length > 0) {
//                 departmentDropdown.value = departments[0]; // Select the first department as default
//                 populateSiteNameDropdown(departments[0]); // Populate site dropdown with default department
//             }

//             departmentDropdown.disabled = false; // Enable the dropdown once populated
//         })
//         .catch(error => {
//             console.error("Error fetching department data:", error);
//         });
// }

// // Initialize the department dropdown
// document.addEventListener("DOMContentLoaded", () => {
//     populateDepartmentDropdown();
// });






//siteName -> DepatmentName


// Function to populate hierarchical dropdowns with siteName first, then department
function populateHierarchicalDropdowns(selectedSite = '', selectedDepartment = '') {
    return fetch(`${basePath}/api/get-hierarchical-options${selectedSite ? `?site=${selectedSite}` : ''}${selectedDepartment ? `&department=${selectedDepartment}` : ''}`)
        .then(response => response.json())
        .then(data => {
            const diagnosisDropdown = document.getElementById("diagnosisDropdown");
            const instrumentDropdown = document.getElementById("instrumentDropdown");
            const scaleDropdown = document.getElementById("scaleDropdown");

            // Clear all dropdowns
            diagnosisDropdown.innerHTML = '<option value="">Select Diagnosis</option>';
            instrumentDropdown.innerHTML = '<option value="">Select Instrument</option>';
            scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

            // Populate the diagnosis dropdown
            data.forEach(item => {
                const option = document.createElement("option");
                option.value = item.diagnosisICD10;
                option.text = item.diagnosisICD10;
                diagnosisDropdown.appendChild(option);
            });

            // Set default values and return initial state
            if (data.length > 0) {
                const defaultDiagnosis = data[0].diagnosisICD10;
                diagnosisDropdown.value = defaultDiagnosis;

                const defaultInstrument = updateInstrumentDropdown(data, defaultDiagnosis);
                if (defaultInstrument) {
                    const defaultScale = updateScaleDropdown(data, defaultDiagnosis, defaultInstrument);
                    if (defaultScale) {
                        // Trigger the initial dashboard filter (or chart load) with all default values
                        filterDashboard(defaultScale, selectedDepartment, selectedSite);
                    }
                }

                return { data, diagnosis: defaultDiagnosis };
            }

            console.warn("No data available for dropdowns");
            return null;
        })
        .catch(error => {
            console.error("Error fetching hierarchical dropdown data:", error);
            return null;
        });
}

// Function to fetch and populate the siteName dropdown
// function populateSiteNameDropdown() {
//     return fetch(`${basePath}/api/get-site-options`)
//         .then(response => response.json())
//         .then(sites => {
//             const siteNameDropdown = document.getElementById("siteNameDropdown");

//             // Clear existing options
//             siteNameDropdown.innerHTML = '<option value="">Select Site</option>';

//             // Populate with fetched sites
//             sites.forEach(site => {
//                 const option = document.createElement("option");
//                 option.value = site;
//                 option.text = site;
//                 siteNameDropdown.appendChild(option);
//             });

//             // Set default site if available
//             if (sites.length > 0) {
//                 const defaultSite = sites[1]; // Automatically select the first site
//                 siteNameDropdown.value = defaultSite;
//                 siteNameDropdown.disabled = false;
//                 console.log("Default site selected:", defaultSite);
//                 return defaultSite; // Return the default site
//             } else {
//                 siteNameDropdown.disabled = true; // Disable dropdown if no sites available
//                 return null;
//             }


//             return sites.length > 0 ? sites[0] : null; // Return default site
//         })
//         .catch(error => {
//             console.error("Error fetching site options:", error);
//         });
// }

//forcing to have only the orthopedic site only

// Function to fetch and populate the siteName dropdown
function populateSiteNameDropdown() {
    return fetch(`${basePath}/api/get-site-options`)
        .then(response => response.json())
        .then(sites => {
            const siteNameDropdown = document.getElementById("siteNameDropdown");

            // Clear existing options
            siteNameDropdown.innerHTML = '<option value="">Select Site</option>';

            // Populate with fetched sites
            sites.forEach(site => {
                const option = document.createElement("option");
                option.value = site;
                option.text = site;
                siteNameDropdown.appendChild(option);
            });

            // Set "Orthopedic Health Facility" as default value
            const defaultSite = "Orthopedic Health Facility";
            const siteExists = sites.includes(defaultSite);

            if (siteExists) {
                siteNameDropdown.value = defaultSite;
                siteNameDropdown.disabled = false; // Enable dropdown
                console.log("Default site selected:", defaultSite);
                return defaultSite; // Return the default site
            } else {
                console.warn(`Default site "${defaultSite}" not found in options`);
                siteNameDropdown.disabled = true; // Disable dropdown if default site not found
                return null;
            }
        })
        .catch(error => {
            console.error("Error fetching site options:", error);
        });
}


// Function to update the instrument dropdown based on selected diagnosis
// function updateInstrumentDropdown(data, selectedDiagnosis) {
//     const instrumentDropdown = document.getElementById("instrumentDropdown");
//     const scaleDropdown = document.getElementById("scaleDropdown");

//     instrumentDropdown.innerHTML = '<option value="">Select Instrument</option>';
//     scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

//     const selectedData = data.find(item => item.diagnosisICD10 === selectedDiagnosis);
//     if (selectedData) {
//         selectedData.promsInstruments.forEach((instrument, index) => {
//             const option = document.createElement("option");
//             option.value = instrument.promsInstrument;
//             option.text = instrument.promsInstrument;
//             instrumentDropdown.appendChild(option);

//             // Set the first instrument as default
//             if (index === 0) {
//                 instrumentDropdown.value = instrument.promsInstrument;
//             }
//         });

//         instrumentDropdown.disabled = false;
//         return instrumentDropdown.value; // Return the default selected instrument
//     } else {
//         console.warn("No instruments found for the selected diagnosis");
//         instrumentDropdown.disabled = true;
//         return null;
//     }
// }

//forcing to have instrument to the Global Health

// Function to update the instrument dropdown based on selected diagnosis
function updateInstrumentDropdown(data, selectedDiagnosis) {
    const instrumentDropdown = document.getElementById("instrumentDropdown");
    const scaleDropdown = document.getElementById("scaleDropdown");

    instrumentDropdown.innerHTML = '<option value="">Select Instrument</option>';
    scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

    const selectedData = data.find(item => item.diagnosisICD10 === selectedDiagnosis);
    if (selectedData) {
        const defaultInstrument = "Global Health"; // Set default instrument
        let defaultInstrumentExists = false;

        selectedData.promsInstruments.forEach(instrument => {
            const option = document.createElement("option");
            option.value = instrument.promsInstrument;
            option.text = instrument.promsInstrument;
            instrumentDropdown.appendChild(option);

            // Check if default instrument exists
            if (instrument.promsInstrument === defaultInstrument) {
                defaultInstrumentExists = true;
            }
        });

        if (defaultInstrumentExists) {
            instrumentDropdown.value = defaultInstrument; // Set default instrument
        } else if (selectedData.promsInstruments.length > 0) {
            instrumentDropdown.value = selectedData.promsInstruments[0].promsInstrument; // Fallback to first instrument
        }

        instrumentDropdown.disabled = false;
        return instrumentDropdown.value; // Return the selected instrument
    } else {
        console.warn("No instruments found for the selected diagnosis");
        instrumentDropdown.disabled = true;
        return null;
    }
}


// Function to update the scale dropdown based on selected instrument
function updateScaleDropdown(data, selectedDiagnosis, selectedInstrument) {
    const scaleDropdown = document.getElementById("scaleDropdown");

    scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

    const selectedData = data.find(item => item.diagnosisICD10 === selectedDiagnosis);
    const instrumentData = selectedData?.promsInstruments.find(inst => inst.promsInstrument === selectedInstrument);

    if (instrumentData) {
        instrumentData.scales.forEach((scale, index) => {
            const option = document.createElement("option");
            option.value = scale;
            option.text = scale;
            scaleDropdown.appendChild(option);

            // Set the first scale as default
            if (index === 0) {
                scaleDropdown.value = scale;
            }
        });

        scaleDropdown.disabled = false;
        return scaleDropdown.value; // Return the default selected scale
    } else {
        console.warn("No scales found for the selected instrument");
        scaleDropdown.disabled = true;
        return null;
    }
}

// Event listeners for cascading behavior
document.addEventListener("DOMContentLoaded", () => {
    let hierarchicalData = [];

    // Initialize the dropdowns
    populateSiteNameDropdown().then(defaultSite => {

        if (defaultSite) {
            populateDepartmentDropdown(defaultSite).then(defaultDepartment => {
                populateHierarchicalDropdowns(defaultSite, defaultDepartment).then(initialState => {
                    if (initialState && initialState.data) {
                        hierarchicalData = initialState.data;
                    }
                });
            });
        }
        console.log("Default site loaded:", defaultSite);

        populateHierarchicalDropdowns(defaultSite).then(initialState => {
            if (initialState && initialState.data) {
                hierarchicalData = initialState.data; // Ensure data is properly assigned
            }

            const siteNameDropdown = document.getElementById("siteNameDropdown");
            const departmentDropdown = document.getElementById("departmentDropdown");
            const diagnosisDropdown = document.getElementById("diagnosisDropdown");
            const instrumentDropdown = document.getElementById("instrumentDropdown");
            const scaleDropdown = document.getElementById("scaleDropdown");

            // SiteName dropdown change event
            siteNameDropdown.addEventListener("change", event => {
                const selectedSite = event.target.value;

                // Fetch and repopulate department dropdown
                populateDepartmentDropdown(selectedSite).then(defaultDepartment => {
                    console.log("Default department after site change:", defaultDepartment);
                    // Repopulate hierarchical dropdowns based on site and department
                    populateHierarchicalDropdowns(selectedSite, defaultDepartment).then(newState => {
                        if (newState && newState.data) {
                            hierarchicalData = newState.data;
                        }
                    });
                });
            });

            // Department dropdown change event
            departmentDropdown.addEventListener("change", event => {
                const selectedDepartment = event.target.value;
                const selectedSite = siteNameDropdown.value;

                // Repopulate hierarchical dropdowns based on department and site
                populateHierarchicalDropdowns(selectedSite, selectedDepartment).then(newState => {
                    if (newState && newState.data) {
                        hierarchicalData = newState.data;
                    }
                });
            });

            // Diagnosis dropdown change event
            diagnosisDropdown.addEventListener("change", event => {
                const selectedDiagnosis = event.target.value;
                const selectedInstrument = updateInstrumentDropdown(hierarchicalData, selectedDiagnosis);
                if (selectedInstrument) {
                    updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
                }
            });

            // Instrument dropdown change event
            instrumentDropdown.addEventListener("change", event => {
                const selectedDiagnosis = diagnosisDropdown.value;
                const selectedInstrument = event.target.value;
                updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
            });

            // Scale dropdown change event
            scaleDropdown.addEventListener("change", event => {
                const selectedDiagnosis = diagnosisDropdown.value;
                const selectedInstrument = instrumentDropdown.value;
                const selectedScale = event.target.value;
                const selectedSite = siteNameDropdown.value;
                const selectedDepartment = departmentDropdown.value;

                if (selectedDiagnosis && selectedInstrument && selectedScale) {
                    filterDashboard(selectedScale, selectedDepartment, selectedSite);
                }
            });
        });
    });
});

// Function to filter the dashboard based on the selected scale, department, and site
function filterDashboard(scale, department, site) {
    console.log("Filtering dashboard with scale:", scale, "department:", department, "site:", site);
    // Implement dashboard filtering logic here
}

// Function to fetch and populate the department dropdown
function populateDepartmentDropdown(selectedSite = '') {
    return fetch(`${basePath}/api/get-department-options${selectedSite ? `?site=${selectedSite}` : ''}`)
        .then(response => response.json())
        .then(departments => {
            const departmentDropdown = document.getElementById("departmentDropdown");

            // Clear existing options
            departmentDropdown.innerHTML = '<option value="">Select Department</option>';

            // Populate with fetched departments
            departments.forEach(department => {
                const option = document.createElement("option");
                option.value = department;
                option.text = department;
                departmentDropdown.appendChild(option);
            });

            // // Set default department if available
            // if (departments.length > 0) {
            //     departmentDropdown.value = departments[0]; // Select the first department as default
            // } else {
            //     departmentDropdown.disabled = true; // Disable dropdown if no departments available
            // }
            // Set default department if available
if (departments.length > 0) {
    const defaultDepartment = departments[0]; // Automatically select the first department
    departmentDropdown.value = defaultDepartment;
    departmentDropdown.disabled = false; // Enable the dropdown once populated
    console.log("Default department selected:", defaultDepartment);
    return defaultDepartment; // Return the default department
} else {
    departmentDropdown.disabled = true; // Disable dropdown if no departments available
    return null;
}


            return departments.length > 0 ? departments[0] : null; // Return default department
        })
        .catch(error => {
            console.error("Error fetching department data:", error);
        });
}
