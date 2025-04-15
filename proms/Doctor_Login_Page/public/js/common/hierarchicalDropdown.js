function populateHierarchicalDropdowns(selectedSite = '', selectedDepartment = '') {
    return fetch(`${basePath}/api/get-hierarchical-options${selectedSite ? `?siteName=${selectedSite}` : ''}${selectedDepartment ? `&department=${selectedDepartment}` : ''}`)
      .then(response => response.json())
      .then(data => {
        const diagnosisDropdown = document.getElementById("diagnosisDropdown");
        const instrumentDropdown = document.getElementById("instrumentDropdown");
        const scaleDropdown = document.getElementById("scaleDropdown");
  
        // 1) Add "All Diagnoses" and "Unassigned / No Diagnosis"
        diagnosisDropdown.innerHTML = `
          <option value="all">All Diagnoses</option>
          <option value="null">Unassigned / No Diagnosis</option>
        `;
  
        // Clear instruments & scales
        instrumentDropdown.innerHTML = '';
        scaleDropdown.innerHTML = '';
  
        // 2) Populate real diagnoses from data
        let firstAvailableDiagnosis = null;
        data.forEach((item) => {
          if (item.diagnosisICD10 && item.diagnosisICD10 !== 'null') {
            const option = document.createElement("option");
            option.value = item.diagnosisICD10;
            option.text = item.diagnosisICD10;
            diagnosisDropdown.appendChild(option);
  
            if (firstAvailableDiagnosis === null) {
              firstAvailableDiagnosis = item.diagnosisICD10;
            }
          }
        });
  
        // 3) Always default to "All Diagnoses"
        diagnosisDropdown.value = "all";
        console.log("Default diagnosis selected: All Diagnoses");
  
        // Auto-populate instruments & scales for "all"
        const defaultInstrument = updateInstrumentDropdown(data, "all");
        if (defaultInstrument) {
          const defaultScale = updateScaleDropdown(data, "all", defaultInstrument);
          if (defaultScale) {
            // Trigger a "change" so charts pick up the defaults
            scaleDropdown.dispatchEvent(new Event('change'));
          }
        }
  
        return { data };
      })
      .catch(error => {
        console.error("Error fetching hierarchical dropdown data:", error);
        return null;
      });
  }
  
  function populateInterventionDropdown(selectedDepartment = '', selectedSite = '') {
    let url = `${basePath}/api/get-intervention-options`;
    const params = [];
    if (selectedDepartment) params.push(`department=${encodeURIComponent(selectedDepartment)}`);
    if (selectedSite) params.push(`siteName=${encodeURIComponent(selectedSite)}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
  
    return fetch(url)
      .then(response => response.json())
      .then(interventions => {
        const interventionDropdown = document.getElementById("interventionDropdown");
        if (!interventionDropdown) {
          console.warn("No interventionDropdown element found!");
          return null;
        }
  
        // Clear existing options
        interventionDropdown.innerHTML = '';
  
        // Always add "All Interventions" on top
        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.text = "All Interventions";
        interventionDropdown.appendChild(allOption);
  
        // Populate options from the DB
        interventions.forEach(interv => {
          const option = document.createElement("option");
          option.value = interv;
          option.text = interv;
          interventionDropdown.appendChild(option);
        });
  
        // Default to "all"
        interventionDropdown.value = "all";
        interventionDropdown.disabled = false;
        console.log("Intervention dropdown populated with default 'all'");
        return interventions;
      })
      .catch(error => {
        console.error("Error fetching intervention options:", error);
        return null;
      });
  }
  
  function populateSiteNameDropdown() {
    return fetch(`${basePath}/api/get-site-options`)
      .then(response => response.json())
      .then(sites => {
        const siteNameDropdown = document.getElementById("siteNameDropdown");
  
        // Clear existing options
        siteNameDropdown.innerHTML = '';
  
        // Populate with fetched sites
        sites.forEach(site => {
          const option = document.createElement("option");
          option.value = site;
          option.text = site;
          siteNameDropdown.appendChild(option);
        });
  
        // Set default site to the first item, if available
        if (sites.length > 0) {
          const defaultSite = sites[0];
          siteNameDropdown.value = defaultSite;
          siteNameDropdown.disabled = false;
          console.log("Default site selected:", defaultSite);
          return defaultSite;
        } else {
          siteNameDropdown.disabled = true;
          return null;
        }
      })
      .catch(error => {
        console.error("Error fetching site options:", error);
      });
  }
  
  function updateInstrumentDropdown(data, selectedDiagnosis) {
    const instrumentDropdown = document.getElementById("instrumentDropdown");
    const scaleDropdown = document.getElementById("scaleDropdown");
  
    instrumentDropdown.innerHTML = '';
    scaleDropdown.innerHTML = '';
  
    // 1) Always add "All Instruments"
    const allInstrumentsOption = document.createElement("option");
    allInstrumentsOption.value = "all";
    allInstrumentsOption.text = "All Instruments";
    instrumentDropdown.appendChild(allInstrumentsOption);
  
    if (selectedDiagnosis === 'all') {
      const allInstrumentsSet = new Set();
      data.forEach(item => {
        item.promsInstruments.forEach(instObj => {
          if (instObj.promsInstrument) {
            allInstrumentsSet.add(instObj.promsInstrument);
          }
        });
      });
  
      allInstrumentsSet.forEach(instrumentName => {
        const option = document.createElement("option");
        option.value = instrumentName;
        option.text = instrumentName;
        instrumentDropdown.appendChild(option);
      });
  
      instrumentDropdown.value = "all";
      instrumentDropdown.disabled = false;
      return instrumentDropdown.value;
    }
  
    // Otherwise, single or "null" diagnosis
    const selectedData = data.find(item => {
      if (selectedDiagnosis === 'null') {
        return item.diagnosisICD10 == null || item.diagnosisICD10 === 'null';
      }
      return item.diagnosisICD10 === selectedDiagnosis;
    });
  
    if (!selectedData) {
      console.warn("No instruments found for diagnosis:", selectedDiagnosis);
      instrumentDropdown.value = "all";
      instrumentDropdown.disabled = false;
      return "all";
    }
  
    selectedData.promsInstruments.forEach(instObj => {
      const option = document.createElement("option");
      option.value = instObj.promsInstrument;
      option.text = instObj.promsInstrument;
      instrumentDropdown.appendChild(option);
    });
  
    instrumentDropdown.value = "all";
    instrumentDropdown.disabled = false;
    return instrumentDropdown.value;
  }
  
  function updateScaleDropdown(data, selectedDiagnosis, selectedInstrument) {
    const scaleDropdown = document.getElementById("scaleDropdown");
    scaleDropdown.innerHTML = '';
  
    // Always add "All Scales"
    const allScalesOption = document.createElement("option");
    allScalesOption.value = "all";
    allScalesOption.text = "All Scales";
    scaleDropdown.appendChild(allScalesOption);
  
    // If user picks "All Instruments"
    if (selectedInstrument === 'all') {
      const allScalesSet = new Set();
      if (selectedDiagnosis === 'all') {
        // Gather from entire dataset
        data.forEach(item => {
          item.promsInstruments.forEach(instObj => {
            instObj.scales.forEach(s => allScalesSet.add(s));
          });
        });
      } else {
        const selData = data.find(item => {
          if (selectedDiagnosis === 'null') {
            return !item.diagnosisICD10 || item.diagnosisICD10 === 'null';
          }
          return item.diagnosisICD10 === selectedDiagnosis;
        });
        if (selData) {
          selData.promsInstruments.forEach(instObj => {
            instObj.scales.forEach(s => allScalesSet.add(s));
          });
        }
      }
  
      if (allScalesSet.size > 0) {
        allScalesSet.forEach(scaleName => {
          const option = document.createElement("option");
          option.value = scaleName;
          option.text = scaleName;
          scaleDropdown.appendChild(option);
        });
      }
      scaleDropdown.value = "all";
      scaleDropdown.disabled = false;
      return scaleDropdown.value;
    }
  
    // If user picks a specific instrument + "All Diagnoses"
    if (selectedDiagnosis === 'all') {
      const matchingScales = new Set();
      data.forEach(item => {
        item.promsInstruments.forEach(instObj => {
          if (instObj.promsInstrument === selectedInstrument) {
            instObj.scales.forEach(s => matchingScales.add(s));
          }
        });
      });
  
      if (matchingScales.size > 0) {
        matchingScales.forEach(scaleName => {
          const option = document.createElement("option");
          option.value = scaleName;
          option.text = scaleName;
          scaleDropdown.appendChild(option);
        });
      }
      scaleDropdown.value = "all";
      scaleDropdown.disabled = false;
      return scaleDropdown.value;
    }
  
    // Otherwise, single/"null" diagnosis + specific instrument
    const selData = data.find(item => {
      if (selectedDiagnosis === 'null') {
        return !item.diagnosisICD10 || item.diagnosisICD10 === 'null';
      }
      return item.diagnosisICD10 === selectedDiagnosis;
    });
  
    if (!selData) {
      console.warn("No data found for that diagnosis:", selectedDiagnosis);
      scaleDropdown.value = "all";
      scaleDropdown.disabled = false;
      return "all";
    }
  
    const instrumentData = selData.promsInstruments.find(
      inst => inst.promsInstrument === selectedInstrument
    );
  
    if (instrumentData) {
      instrumentData.scales.forEach(scaleName => {
        const option = document.createElement("option");
        option.value = scaleName;
        option.text = scaleName;
        scaleDropdown.appendChild(option);
      });
      scaleDropdown.value = "all";
      scaleDropdown.disabled = false;
      return scaleDropdown.value;
    } else {
      console.warn("No scales found for instrument:", selectedInstrument);
      scaleDropdown.value = "all";
      scaleDropdown.disabled = false;
      return "all";
    }
  }
  
  function populateDepartmentDropdown(selectedSite = '') {
    return fetch(`${basePath}/api/get-department-options${selectedSite ? `?site=${selectedSite}` : ''}`)
      .then(response => response.json())
      .then(departments => {
        const departmentDropdown = document.getElementById("departmentDropdown");
  
        // Clear existing options
        departmentDropdown.innerHTML = '';
  
        // Populate with fetched departments
        departments.forEach(dept => {
          const option = document.createElement("option");
          option.value = dept;
          option.text = dept;
          departmentDropdown.appendChild(option);
        });
  
        if (departments.length > 0) {
          const defaultDepartment = departments[0];
          departmentDropdown.value = defaultDepartment;
          departmentDropdown.disabled = false;
          console.log("Default department selected:", defaultDepartment);
          return defaultDepartment;
        } else {
          departmentDropdown.disabled = true;
          return null;
        }
      })
      .catch(error => {
        console.error("Error fetching department data:", error);
      });
  }
  
  // NEW: Function to populate Doctor ID dropdown
  function populateDoctorIdDropdown(selectedSite = '', selectedDepartment = '') {
    let url = `${basePath}/api/get-doctorid-options`;
    const params = [];
    if (selectedSite) params.push(`siteName=${encodeURIComponent(selectedSite)}`);
    if (selectedDepartment) params.push(`department=${encodeURIComponent(selectedDepartment)}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
  
    return fetch(url)
      .then(response => response.json())
      .then(doctorIds => {
        const doctorIdDropdown = document.getElementById("doctorIdDropdown");
        // Clear existing options
        doctorIdDropdown.innerHTML = '';
        // Add default "All" option
        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.text = "All";
        doctorIdDropdown.appendChild(allOption);
        // Populate dropdown with fetched doctor IDs
        doctorIds.forEach(docId => {
          const option = document.createElement("option");
          option.value = docId;
          option.text = docId;
          doctorIdDropdown.appendChild(option);
        });
        // doctorIdDropdown.value = "all";

             if (doctorIds.includes(defaultDoctorId)) {
               doctorIdDropdown.value = defaultDoctorId;
             } else {
               doctorIdDropdown.value = "all";
             }
        doctorIdDropdown.disabled = false;
        console.log("Doctor ID dropdown populated.");
        return doctorIds;
      })
      .catch(error => {
        console.error("Error fetching doctor ID options:", error);
        return null;
      });
  }
  
  // Filter function to refresh charts (updated to include doctorId)
  function filterDashboard(scale, department, site) {
    const doctorId = document.getElementById("doctorIdDropdown").value;
    console.log("Filtering dashboard with scale:", scale, "department:", department, "site:", site, "doctorId:", doctorId);
    // Implement the logic to refresh charts with the selected filters, including doctorId.
    // For example: fetchMeanScoreData(..., doctorId);
  }
  

  document.addEventListener("DOMContentLoaded", () => {
    let hierarchicalData = [];
  
    // 1) Read the siteName & departmentName from the DOM 
    //    (these were set by EJS defaults)
    const siteNameDropdown = document.getElementById("siteNameDropdown");
    const departmentDropdown = document.getElementById("departmentDropdown");
    const siteName = siteNameDropdown.value.trim();
    const deptName = departmentDropdown.value.trim();
  
    // 2) Now populate other dropdowns (Doctor ID, Intervention, etc.) 
    //    using the known siteName/departmentName from EJS
    populateDoctorIdDropdown(siteName, deptName); 
    populateInterventionDropdown(deptName, siteName)
      .then(() => {
        // Then fetch hierarchical data
        populateHierarchicalDropdowns(siteName, deptName).then(initialState => {
          if (initialState && initialState.data) {
            hierarchicalData = initialState.data;
          }
  
          // 3) Set up event listeners once everything’s loaded
  
          // --- DO NOT call 'populateSiteNameDropdown' or 'populateDepartmentDropdown'
          //     here, because we already have them from EJS. Instead, if you want to
          //     let the user pick a new site/department, you can keep the old code 
          //     but be aware it might overwrite your EJS values.
          
          // SiteName dropdown change
          siteNameDropdown.addEventListener("change", event => {
            const selectedSite = event.target.value;
            // If you still want the user to *manually* change site, 
            // you can re-populate department, intervention, etc. 
            populateDepartmentDropdown(selectedSite).then(defaultDepartment => {
              populateHierarchicalDropdowns(selectedSite, defaultDepartment).then(newState => {
                if (newState && newState.data) {
                  hierarchicalData = newState.data;
                  // Force the scaleDropdown to fire a change 
                  document.getElementById('scaleDropdown').dispatchEvent(new Event('change'));
                }
              });
              populateInterventionDropdown(defaultDepartment, selectedSite);
              populateDoctorIdDropdown(selectedSite, defaultDepartment);
            });
          });
  
          // Department dropdown change
          departmentDropdown.addEventListener("change", event => {
            const selectedDepartment = event.target.value;
            const selectedSite = siteNameDropdown.value;
            populateHierarchicalDropdowns(selectedSite, selectedDepartment).then(newState => {
              if (newState && newState.data) {
                hierarchicalData = newState.data;
                document.getElementById('scaleDropdown').dispatchEvent(new Event('change'));
              }
            });
            populateInterventionDropdown(selectedDepartment, selectedSite);
            populateDoctorIdDropdown(selectedSite, selectedDepartment);
          });
  
          // Doctor ID dropdown change
          const doctorIdDropdown = document.getElementById("doctorIdDropdown");
          doctorIdDropdown.addEventListener("change", () => {
            console.log("Doctor ID changed to:", doctorIdDropdown.value);
            filterDashboard(
              document.getElementById("scaleDropdown").value,
              departmentDropdown.value,
              siteNameDropdown.value
            );
          });
  
          // Intervention dropdown change
          const interventionDropdown = document.getElementById("interventionDropdown");
          if (interventionDropdown) {
            interventionDropdown.addEventListener("change", () => {
              console.log("Intervention changed => re‐fetch data if needed");
            });
          }
  
          // Diagnosis dropdown change
          const diagnosisDropdown = document.getElementById("diagnosisDropdown");
          diagnosisDropdown.addEventListener("change", event => {
            const selectedDiagnosis = event.target.value;
            const selectedInstrument = updateInstrumentDropdown(hierarchicalData, selectedDiagnosis);
            if (selectedInstrument) {
              updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
            }
          });
  
          // Instrument dropdown change
          const instrumentDropdown = document.getElementById("instrumentDropdown");
          instrumentDropdown.addEventListener("change", event => {
            const selectedDiagnosis = diagnosisDropdown.value;
            const selectedInstrument = event.target.value;
            updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
          });
  
          // Scale dropdown change
          const scaleDropdown = document.getElementById("scaleDropdown");
          scaleDropdown.addEventListener("change", event => {
            const selectedDiagnosis = diagnosisDropdown.value;
            const selectedInstrument = instrumentDropdown.value;
            const selectedScale = event.target.value;
            filterDashboard(
              selectedScale,
              departmentDropdown.value,
              siteNameDropdown.value
            );
          });
        });
      });
  });
  



  