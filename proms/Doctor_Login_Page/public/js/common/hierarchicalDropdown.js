// // function populateHierarchicalDropdowns(selectedSite = '', selectedDepartment = '') {
// //     return fetch(`${basePath}/api/get-hierarchical-options${selectedSite ? `?siteName=${selectedSite}` : ''}${selectedDepartment ? `&department=${selectedDepartment}` : ''}`)
// //       .then(response => response.json())
// //       .then(data => {
// //         const diagnosisDropdown = document.getElementById("diagnosisDropdown");
// //         const instrumentDropdown = document.getElementById("instrumentDropdown");
// //         const scaleDropdown = document.getElementById("scaleDropdown");
  
// //         // 1) Add "All Diagnoses" and "Unassigned / No Diagnosis"
// //         diagnosisDropdown.innerHTML = `
// //           <option value="all">All Diagnoses</option>
// //           <option value="null">Unassigned / No Diagnosis</option>
// //         `;
  
// //         // Clear instruments & scales
// //         instrumentDropdown.innerHTML = '';
// //         scaleDropdown.innerHTML = '';
  
// //         // 2) Populate real diagnoses from data
// //         let firstAvailableDiagnosis = null;
// //         data.forEach((item) => {
// //           if (item.diagnosisICD10 && item.diagnosisICD10 !== 'null') {
// //             const option = document.createElement("option");
// //             option.value = item.diagnosisICD10;
// //             option.text = item.diagnosisICD10;
// //             diagnosisDropdown.appendChild(option);
  
// //             if (firstAvailableDiagnosis === null) {
// //               firstAvailableDiagnosis = item.diagnosisICD10;
// //             }
// //           }
// //         });
  
// //         // 3) Always default to "All Diagnoses"
// //         diagnosisDropdown.value = "all";
// //         console.log("Default diagnosis selected: All Diagnoses");
  
// //         // Auto-populate instruments & scales for "all"
// //         const defaultInstrument = updateInstrumentDropdown(data, "all");
// //         if (defaultInstrument) {
// //           const defaultScale = updateScaleDropdown(data, "all", defaultInstrument);
// //           if (defaultScale) {
// //             // Trigger a "change" so charts pick up the defaults
// //             scaleDropdown.dispatchEvent(new Event('change'));
// //           }
// //         }
  
// //         return { data };
// //       })
// //       .catch(error => {
// //         console.error("Error fetching hierarchical dropdown data:", error);
// //         return null;
// //       });
// //   }
  
// //   function populateInterventionDropdown(selectedDepartment = '', selectedSite = '') {
// //     let url = `${basePath}/api/get-intervention-options`;
// //     const params = [];
// //     if (selectedDepartment) params.push(`department=${encodeURIComponent(selectedDepartment)}`);
// //     if (selectedSite) params.push(`siteName=${encodeURIComponent(selectedSite)}`);
// //     if (params.length > 0) {
// //       url += '?' + params.join('&');
// //     }
  
// //     return fetch(url)
// //       .then(response => response.json())
// //       .then(interventions => {
// //         const interventionDropdown = document.getElementById("interventionDropdown");
// //         if (!interventionDropdown) {
// //           console.warn("No interventionDropdown element found!");
// //           return null;
// //         }
  
// //         // Clear existing options
// //         interventionDropdown.innerHTML = '';
  
// //         // Always add "All Interventions" on top
// //         const allOption = document.createElement("option");
// //         allOption.value = "all";
// //         allOption.text = "All Interventions";
// //         interventionDropdown.appendChild(allOption);
  
// //         // Populate options from the DB
// //         interventions.forEach(interv => {
// //           const option = document.createElement("option");
// //           option.value = interv;
// //           option.text = interv;
// //           interventionDropdown.appendChild(option);
// //         });
  
// //         // Default to "all"
// //         interventionDropdown.value = "all";
// //         interventionDropdown.disabled = false;
// //         console.log("Intervention dropdown populated with default 'all'");
// //         return interventions;
// //       })
// //       .catch(error => {
// //         console.error("Error fetching intervention options:", error);
// //         return null;
// //       });
// //   }
  
// //   function populateSiteNameDropdown() {
// //     return fetch(`${basePath}/api/get-site-options`)
// //       .then(response => response.json())
// //       .then(sites => {
// //         const siteNameDropdown = document.getElementById("siteNameDropdown");
  
// //         // Clear existing options
// //         siteNameDropdown.innerHTML = '';
  
// //         // Populate with fetched sites
// //         sites.forEach(site => {
// //           const option = document.createElement("option");
// //           option.value = site;
// //           option.text = site;
// //           siteNameDropdown.appendChild(option);
// //         });
  
// //         // Set default site to the first item, if available
// //         if (sites.length > 0) {
// //           const defaultSite = sites[0];
// //           siteNameDropdown.value = defaultSite;
// //           siteNameDropdown.disabled = false;
// //           console.log("Default site selected:", defaultSite);
// //           return defaultSite;
// //         } else {
// //           siteNameDropdown.disabled = true;
// //           return null;
// //         }
// //       })
// //       .catch(error => {
// //         console.error("Error fetching site options:", error);
// //       });
// //   }
  
// //   function updateInstrumentDropdown(data, selectedDiagnosis) {
// //     const instrumentDropdown = document.getElementById("instrumentDropdown");
// //     const scaleDropdown = document.getElementById("scaleDropdown");
  
// //     instrumentDropdown.innerHTML = '';
// //     scaleDropdown.innerHTML = '';
  
// //     // 1) Always add "All Instruments"
// //     const allInstrumentsOption = document.createElement("option");
// //     allInstrumentsOption.value = "all";
// //     allInstrumentsOption.text = "All Instruments";
// //     instrumentDropdown.appendChild(allInstrumentsOption);
  
// //     if (selectedDiagnosis === 'all') {
// //       const allInstrumentsSet = new Set();
// //       data.forEach(item => {
// //         item.promsInstruments.forEach(instObj => {
// //           if (instObj.promsInstrument) {
// //             allInstrumentsSet.add(instObj.promsInstrument);
// //           }
// //         });
// //       });
  
// //       allInstrumentsSet.forEach(instrumentName => {
// //         const option = document.createElement("option");
// //         option.value = instrumentName;
// //         option.text = instrumentName;
// //         instrumentDropdown.appendChild(option);
// //       });
  
// //       instrumentDropdown.value = "all";
// //       instrumentDropdown.disabled = false;
// //       return instrumentDropdown.value;
// //     }
  
// //     // Otherwise, single or "null" diagnosis
// //     const selectedData = data.find(item => {
// //       if (selectedDiagnosis === 'null') {
// //         return item.diagnosisICD10 == null || item.diagnosisICD10 === 'null';
// //       }
// //       return item.diagnosisICD10 === selectedDiagnosis;
// //     });
  
// //     if (!selectedData) {
// //       console.warn("No instruments found for diagnosis:", selectedDiagnosis);
// //       instrumentDropdown.value = "all";
// //       instrumentDropdown.disabled = false;
// //       return "all";
// //     }
  
// //     selectedData.promsInstruments.forEach(instObj => {
// //       const option = document.createElement("option");
// //       option.value = instObj.promsInstrument;
// //       option.text = instObj.promsInstrument;
// //       instrumentDropdown.appendChild(option);
// //     });
  
// //     instrumentDropdown.value = "all";
// //     instrumentDropdown.disabled = false;
// //     return instrumentDropdown.value;
// //   }
  
// //   function updateScaleDropdown(data, selectedDiagnosis, selectedInstrument) {
// //     const scaleDropdown = document.getElementById("scaleDropdown");
// //     scaleDropdown.innerHTML = '';
  
// //     // Always add "All Scales"
// //     const allScalesOption = document.createElement("option");
// //     allScalesOption.value = "all";
// //     allScalesOption.text = "All Scales";
// //     scaleDropdown.appendChild(allScalesOption);
  
// //     // If user picks "All Instruments"
// //     if (selectedInstrument === 'all') {
// //       const allScalesSet = new Set();
// //       if (selectedDiagnosis === 'all') {
// //         // Gather from entire dataset
// //         data.forEach(item => {
// //           item.promsInstruments.forEach(instObj => {
// //             instObj.scales.forEach(s => allScalesSet.add(s));
// //           });
// //         });
// //       } else {
// //         const selData = data.find(item => {
// //           if (selectedDiagnosis === 'null') {
// //             return !item.diagnosisICD10 || item.diagnosisICD10 === 'null';
// //           }
// //           return item.diagnosisICD10 === selectedDiagnosis;
// //         });
// //         if (selData) {
// //           selData.promsInstruments.forEach(instObj => {
// //             instObj.scales.forEach(s => allScalesSet.add(s));
// //           });
// //         }
// //       }
  
// //       if (allScalesSet.size > 0) {
// //         allScalesSet.forEach(scaleName => {
// //           const option = document.createElement("option");
// //           option.value = scaleName;
// //           option.text = scaleName;
// //           scaleDropdown.appendChild(option);
// //         });
// //       }
// //       scaleDropdown.value = "all";
// //       scaleDropdown.disabled = false;
// //       return scaleDropdown.value;
// //     }
  
// //     // If user picks a specific instrument + "All Diagnoses"
// //     if (selectedDiagnosis === 'all') {
// //       const matchingScales = new Set();
// //       data.forEach(item => {
// //         item.promsInstruments.forEach(instObj => {
// //           if (instObj.promsInstrument === selectedInstrument) {
// //             instObj.scales.forEach(s => matchingScales.add(s));
// //           }
// //         });
// //       });
  
// //       if (matchingScales.size > 0) {
// //         matchingScales.forEach(scaleName => {
// //           const option = document.createElement("option");
// //           option.value = scaleName;
// //           option.text = scaleName;
// //           scaleDropdown.appendChild(option);
// //         });
// //       }
// //       scaleDropdown.value = "all";
// //       scaleDropdown.disabled = false;
// //       return scaleDropdown.value;
// //     }
  
// //     // Otherwise, single/"null" diagnosis + specific instrument
// //     const selData = data.find(item => {
// //       if (selectedDiagnosis === 'null') {
// //         return !item.diagnosisICD10 || item.diagnosisICD10 === 'null';
// //       }
// //       return item.diagnosisICD10 === selectedDiagnosis;
// //     });
  
// //     if (!selData) {
// //       console.warn("No data found for that diagnosis:", selectedDiagnosis);
// //       scaleDropdown.value = "all";
// //       scaleDropdown.disabled = false;
// //       return "all";
// //     }
  
// //     const instrumentData = selData.promsInstruments.find(
// //       inst => inst.promsInstrument === selectedInstrument
// //     );
  
// //     if (instrumentData) {
// //       instrumentData.scales.forEach(scaleName => {
// //         const option = document.createElement("option");
// //         option.value = scaleName;
// //         option.text = scaleName;
// //         scaleDropdown.appendChild(option);
// //       });
// //       scaleDropdown.value = "all";
// //       scaleDropdown.disabled = false;
// //       return scaleDropdown.value;
// //     } else {
// //       console.warn("No scales found for instrument:", selectedInstrument);
// //       scaleDropdown.value = "all";
// //       scaleDropdown.disabled = false;
// //       return "all";
// //     }
// //   }
  
// //   function populateDepartmentDropdown(selectedSite = '') {
// //     return fetch(`${basePath}/api/get-department-options${selectedSite ? `?site=${selectedSite}` : ''}`)
// //       .then(response => response.json())
// //       .then(departments => {
// //         const departmentDropdown = document.getElementById("departmentDropdown");
  
// //         // Clear existing options
// //         departmentDropdown.innerHTML = '';
  
// //         // Populate with fetched departments
// //         departments.forEach(dept => {
// //           const option = document.createElement("option");
// //           option.value = dept;
// //           option.text = dept;
// //           departmentDropdown.appendChild(option);
// //         });
  
// //         if (departments.length > 0) {
// //           const defaultDepartment = departments[0];
// //           departmentDropdown.value = defaultDepartment;
// //           departmentDropdown.disabled = false;
// //           console.log("Default department selected:", defaultDepartment);
// //           return defaultDepartment;
// //         } else {
// //           departmentDropdown.disabled = true;
// //           return null;
// //         }
// //       })
// //       .catch(error => {
// //         console.error("Error fetching department data:", error);
// //       });
// //   }
  
// //   // NEW: Function to populate Doctor ID dropdown
// //   function populateDoctorIdDropdown(selectedSite = '', selectedDepartment = '') {
// //     let url = `${basePath}/api/get-doctorid-options`;
// //     const params = [];
// //     if (selectedSite) params.push(`siteName=${encodeURIComponent(selectedSite)}`);
// //     if (selectedDepartment) params.push(`department=${encodeURIComponent(selectedDepartment)}`);
// //     if (params.length > 0) {
// //       url += '?' + params.join('&');
// //     }
  
// //     return fetch(url)
// //       .then(response => response.json())
// //       .then(doctorIds => {
// //         const doctorIdDropdown = document.getElementById("doctorIdDropdown");
// //         // Clear existing options
// //         doctorIdDropdown.innerHTML = '';
// //         // Add default "All" option
// //         const allOption = document.createElement("option");
// //         allOption.value = "all";
// //         allOption.text = "All";
// //         doctorIdDropdown.appendChild(allOption);
// //         // Populate dropdown with fetched doctor IDs
// //         doctorIds.forEach(docId => {
// //           const option = document.createElement("option");
// //           option.value = docId;
// //           option.text = docId;
// //           doctorIdDropdown.appendChild(option);
// //         });
// //         // doctorIdDropdown.value = "all";

// //              if (doctorIds.includes(defaultDoctorId)) {
// //                doctorIdDropdown.value = defaultDoctorId;
// //              } else {
// //                doctorIdDropdown.value = "all";
// //              }
// //         doctorIdDropdown.disabled = false;
// //         console.log("Doctor ID dropdown populated.");
// //         return doctorIds;
// //       })
// //       .catch(error => {
// //         console.error("Error fetching doctor ID options:", error);
// //         return null;
// //       });
// //   }
  
// //   // Filter function to refresh charts (updated to include doctorId)
// //   function filterDashboard(scale, department, site) {
// //     const doctorId = document.getElementById("doctorIdDropdown").value;
// //     console.log("Filtering dashboard with scale:", scale, "department:", department, "site:", site, "doctorId:", doctorId);
// //     // Implement the logic to refresh charts with the selected filters, including doctorId.
// //     // For example: fetchMeanScoreData(..., doctorId);
// //   }
  

// //   document.addEventListener("DOMContentLoaded", () => {
// //     let hierarchicalData = [];
  
// //     // 1) Read the siteName & departmentName from the DOM 
// //     //    (these were set by EJS defaults)
// //     const siteNameDropdown = document.getElementById("siteNameDropdown");
// //     const departmentDropdown = document.getElementById("departmentDropdown");
// //     const siteName = siteNameDropdown.value.trim();
// //     const deptName = departmentDropdown.value.trim();
  
// //     // 2) Now populate other dropdowns (Doctor ID, Intervention, etc.) 
// //     //    using the known siteName/departmentName from EJS
// //     populateDoctorIdDropdown(siteName, deptName); 
// //     populateInterventionDropdown(deptName, siteName)
// //       .then(() => {
// //         // Then fetch hierarchical data
// //         populateHierarchicalDropdowns(siteName, deptName).then(initialState => {
// //           if (initialState && initialState.data) {
// //             hierarchicalData = initialState.data;
// //           }
  
// //           // 3) Set up event listeners once everything’s loaded
  
// //           // --- DO NOT call 'populateSiteNameDropdown' or 'populateDepartmentDropdown'
// //           //     here, because we already have them from EJS. Instead, if you want to
// //           //     let the user pick a new site/department, you can keep the old code 
// //           //     but be aware it might overwrite your EJS values.
          
// //           // SiteName dropdown change
// //           siteNameDropdown.addEventListener("change", event => {
// //             const selectedSite = event.target.value;
// //             // If you still want the user to *manually* change site, 
// //             // you can re-populate department, intervention, etc. 
// //             populateDepartmentDropdown(selectedSite).then(defaultDepartment => {
// //               populateHierarchicalDropdowns(selectedSite, defaultDepartment).then(newState => {
// //                 if (newState && newState.data) {
// //                   hierarchicalData = newState.data;
// //                   // Force the scaleDropdown to fire a change 
// //                   document.getElementById('scaleDropdown').dispatchEvent(new Event('change'));
// //                 }
// //               });
// //               populateInterventionDropdown(defaultDepartment, selectedSite);
// //               populateDoctorIdDropdown(selectedSite, defaultDepartment);
// //             });
// //           });
  
// //           // Department dropdown change
// //           departmentDropdown.addEventListener("change", event => {
// //             const selectedDepartment = event.target.value;
// //             const selectedSite = siteNameDropdown.value;
// //             populateHierarchicalDropdowns(selectedSite, selectedDepartment).then(newState => {
// //               if (newState && newState.data) {
// //                 hierarchicalData = newState.data;
// //                 document.getElementById('scaleDropdown').dispatchEvent(new Event('change'));
// //               }
// //             });
// //             populateInterventionDropdown(selectedDepartment, selectedSite);
// //             populateDoctorIdDropdown(selectedSite, selectedDepartment);
// //           });
  
// //           // Doctor ID dropdown change
// //           const doctorIdDropdown = document.getElementById("doctorIdDropdown");
// //           doctorIdDropdown.addEventListener("change", () => {
// //             console.log("Doctor ID changed to:", doctorIdDropdown.value);
// //             filterDashboard(
// //               document.getElementById("scaleDropdown").value,
// //               departmentDropdown.value,
// //               siteNameDropdown.value
// //             );
// //           });
  
// //           // Intervention dropdown change
// //           const interventionDropdown = document.getElementById("interventionDropdown");
// //           if (interventionDropdown) {
// //             interventionDropdown.addEventListener("change", () => {
// //               console.log("Intervention changed => re‐fetch data if needed");
// //             });
// //           }
  
// //           // Diagnosis dropdown change
// //           const diagnosisDropdown = document.getElementById("diagnosisDropdown");
// //           diagnosisDropdown.addEventListener("change", event => {
// //             const selectedDiagnosis = event.target.value;
// //             const selectedInstrument = updateInstrumentDropdown(hierarchicalData, selectedDiagnosis);
// //             if (selectedInstrument) {
// //               updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
// //             }
// //           });
  
// //           // Instrument dropdown change
// //           const instrumentDropdown = document.getElementById("instrumentDropdown");
// //           instrumentDropdown.addEventListener("change", event => {
// //             const selectedDiagnosis = diagnosisDropdown.value;
// //             const selectedInstrument = event.target.value;
// //             updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
// //           });
  
// //           // Scale dropdown change
// //           const scaleDropdown = document.getElementById("scaleDropdown");
// //           scaleDropdown.addEventListener("change", event => {
// //             const selectedDiagnosis = diagnosisDropdown.value;
// //             const selectedInstrument = instrumentDropdown.value;
// //             const selectedScale = event.target.value;
// //             filterDashboard(
// //               selectedScale,
// //               departmentDropdown.value,
// //               siteNameDropdown.value
// //             );
// //           });
// //         });
// //       });
// //   });
  



  




// function populateHospitalIdDropdown() {
//   const hospitalIdDropdown = document.getElementById("hospitalIdDropdown");
//   if (!hospitalIdDropdown) {
//       console.warn("No hospitalIdDropdown element found!");
//       return Promise.resolve(null); // Return resolved promise
//   }

//   return fetch(`${basePath}/api/get-hospitalid-options`)
//       .then(response => response.json())
//       .then(hospitalIds => {
//           // Clear existing options except the initial one set by EJS
//           // Keep the first option if it matches the default, otherwise clear all
//           const firstOption = hospitalIdDropdown.options[0];
//           if (!firstOption || firstOption.value !== defaultHospitalId) {
//               hospitalIdDropdown.innerHTML = ''; // Clear if default isn't there
//               // Add the default option first if it wasn't the initial one
//               if (defaultHospitalId) {
//                    const defaultOpt = document.createElement("option");
//                    defaultOpt.value = defaultHospitalId;
//                    defaultOpt.text = defaultHospitalId;
//                    hospitalIdDropdown.appendChild(defaultOpt);
//               }
//           }


//           // Add "All" option
//            const allOption = document.createElement("option");
//            allOption.value = "all";
//            allOption.text = "All Hospitals"; // Or just "All"
//            // Add "All" only if it's not already the default/first option
//            if(hospitalIdDropdown.options.length === 0 || hospitalIdDropdown.options[0].value !== 'all') {
//               // Prepending might be better if desired
//                hospitalIdDropdown.insertBefore(allOption, hospitalIdDropdown.firstChild);
//            }


//           // Populate with other fetched IDs, avoiding duplicates of default/all
//           hospitalIds.forEach(id => {
//               if (id && id !== defaultHospitalId && id !== 'all') { // Check if ID exists and is not the default/all
//                   // Check if this ID is already in the dropdown
//                    let exists = false;
//                    for (let i = 0; i < hospitalIdDropdown.options.length; i++) {
//                        if (hospitalIdDropdown.options[i].value === id) {
//                            exists = true;
//                            break;
//                        }
//                    }
//                    if (!exists) {
//                        const option = document.createElement("option");
//                        option.value = id;
//                        option.text = id;
//                        hospitalIdDropdown.appendChild(option);
//                    }
//               }
//           });

//           // Set the value to the default passed from EJS, or 'all' if default is empty/invalid
//           hospitalIdDropdown.value = defaultHospitalId || "all";
//           // hospitalIdDropdown.disabled = false; // Assuming it should be interactive
//           console.log("Hospital ID dropdown populated. Default:", hospitalIdDropdown.value);
//           return hospitalIdDropdown.value; // Return the initially selected value
//       })
//       .catch(error => {
//           console.error("Error fetching hospital ID options:", error);
//           hospitalIdDropdown.value = "all"; // Fallback
//           // hospitalIdDropdown.disabled = true;
//           return "all";
//       });
// }

// /**
// * Populates the Hospital Name dropdown based on the selected Hospital ID.
// * Uses the global `defaultHospitalName` (set in EJS) for the initial value.
// * @param {string} selectedHospitalId - The currently selected Hospital ID to filter by.
// */
// function populateHospitalNameDropdown(selectedHospitalId = '') {
//   const hospitalNameDropdown = document.getElementById("hospitalNameDropdown");
//   if (!hospitalNameDropdown) {
//       console.warn("No hospitalNameDropdown element found!");
//       return Promise.resolve(null);
//   }

//   let url = `${basePath}/api/get-hospitalname-options`;
//   if (selectedHospitalId && selectedHospitalId !== 'all') {
//       url += `?hospitalId=${encodeURIComponent(selectedHospitalId)}`;
//   }

//   return fetch(url)
//       .then(response => response.json())
//       .then(hospitalNames => {
//            // Keep the first option if it matches the default, otherwise clear all
//           const firstOption = hospitalNameDropdown.options[0];
//            if (!firstOption || firstOption.value !== defaultHospitalName) {
//                hospitalNameDropdown.innerHTML = ''; // Clear if default isn't there
//               // Add the default option first if it wasn't the initial one
//                if (defaultHospitalName) {
//                     const defaultOpt = document.createElement("option");
//                     defaultOpt.value = defaultHospitalName; // Use name as value? Or ID? Let's use Name for now.
//                     defaultOpt.text = defaultHospitalName;
//                     hospitalNameDropdown.appendChild(defaultOpt);
//                }
//            }


//           // Add "All" option
//            const allOption = document.createElement("option");
//            allOption.value = "all";
//            allOption.text = "All Hospital Names"; // Or just "All"
//            if(hospitalNameDropdown.options.length === 0 || hospitalNameDropdown.options[0].value !== 'all') {
//                hospitalNameDropdown.insertBefore(allOption, hospitalNameDropdown.firstChild);
//            }


//           // Populate with other fetched names
//           hospitalNames.forEach(name => {
//                if (name && name !== defaultHospitalName && name !== 'all') {
//                    let exists = false;
//                    for (let i = 0; i < hospitalNameDropdown.options.length; i++) {
//                        if (hospitalNameDropdown.options[i].value === name) {
//                            exists = true;
//                            break;
//                        }
//                    }
//                    if (!exists) {
//                        const option = document.createElement("option");
//                        option.value = name; // Using name as value
//                        option.text = name;
//                        hospitalNameDropdown.appendChild(option);
//                    }
//                }
//           });

//           // Set the value to the default passed from EJS, or 'all'
//           hospitalNameDropdown.value = defaultHospitalName || "all";
//           // hospitalNameDropdown.disabled = false;
//           console.log("Hospital Name dropdown populated. Default:", hospitalNameDropdown.value);
//           return hospitalNameDropdown.value;
//       })
//       .catch(error => {
//           console.error("Error fetching hospital Name options:", error);
//           hospitalNameDropdown.value = "all";
//           // hospitalNameDropdown.disabled = true;
//           return "all";
//       });
// }


// /**
// * Populates Diagnosis, Instrument, and Scale dropdowns based on filters.
// * @param {string} selectedSite
// * @param {string} selectedDepartment
// * @param {string} selectedHospitalId // ADDED
// * @param {string} selectedHospitalName // ADDED
// */
// function populateHierarchicalDropdowns(selectedSite = '', selectedDepartment = '', selectedHospitalId = '', selectedHospitalName = '') { // ADDED params
//   const params = new URLSearchParams();
//   if (selectedSite) params.append('siteName', selectedSite);
//   if (selectedDepartment) params.append('department', selectedDepartment);
//   // ADDED params to API call
//   if (selectedHospitalId && selectedHospitalId !== 'all') params.append('hospitalId', selectedHospitalId);
//   if (selectedHospitalName && selectedHospitalName !== 'all') params.append('hospitalName', selectedHospitalName);

//   const queryString = params.toString();

//   return fetch(`${basePath}/api/get-hierarchical-options${queryString ? `?${queryString}` : ''}`)
//       .then(response => response.json())
//       .then(data => {
//           const diagnosisDropdown = document.getElementById("diagnosisDropdown");
//           const instrumentDropdown = document.getElementById("instrumentDropdown");
//           const scaleDropdown = document.getElementById("scaleDropdown");

//           // Save current values before clearing
//           const currentDiagnosis = diagnosisDropdown.value;
//           const currentInstrument = instrumentDropdown.value;
//           const currentScale = scaleDropdown.value;


//           diagnosisDropdown.innerHTML = `
//               <option value="all">All Diagnoses</option>
//               <option value="null">Unassigned / No Diagnosis</option>
//           `;
//           instrumentDropdown.innerHTML = '';
//           scaleDropdown.innerHTML = '';

//           let firstAvailableDiagnosis = null;
//           data.forEach((item) => {
//               if (item.diagnosisICD10 && item.diagnosisICD10 !== 'null') {
//                   const option = document.createElement("option");
//                   option.value = item.diagnosisICD10;
//                   option.text = item.diagnosisICD10;
//                   diagnosisDropdown.appendChild(option);
//                   if (firstAvailableDiagnosis === null) firstAvailableDiagnosis = item.diagnosisICD10;
//               }
//           });

//           // Try to restore previous selection, otherwise default to "all"
//           if (Array.from(diagnosisDropdown.options).some(opt => opt.value === currentDiagnosis)) {
//                diagnosisDropdown.value = currentDiagnosis;
//           } else {
//                diagnosisDropdown.value = "all";
//           }

//           console.log("Diagnosis dropdown updated. Selected:", diagnosisDropdown.value);

//           // Repopulate instruments based on potentially restored diagnosis
//            const defaultInstrument = updateInstrumentDropdown(data, diagnosisDropdown.value, currentInstrument); // Pass currentInstrument
//           if (defaultInstrument) {
//                const defaultScale = updateScaleDropdown(data, diagnosisDropdown.value, defaultInstrument, currentScale); // Pass currentScale
//               // No need to dispatch 'change' here, let the actual user change trigger updates
//           }

//           return { data }; // Return the new hierarchical data structure
//       })
//       .catch(error => {
//           console.error("Error fetching hierarchical dropdown data:", error);
//           return null;
//       });
// }

// /**
// * Populates the Intervention dropdown based on filters.
// * @param {string} selectedDepartment
// * @param {string} selectedSite
// * @param {string} selectedHospitalId // ADDED
// * @param {string} selectedHospitalName // ADDED
// */
// function populateInterventionDropdown(selectedDepartment = '', selectedSite = '', selectedHospitalId = '', selectedHospitalName = '') { // ADDED params
//   const interventionDropdown = document.getElementById("interventionDropdown");
//    if (!interventionDropdown) {
//        console.warn("No interventionDropdown element found!");
//        return Promise.resolve(null);
//    }
//   const currentIntervention = interventionDropdown.value; // Save current


//   const params = new URLSearchParams();
//   if (selectedDepartment) params.append('department', selectedDepartment);
//   if (selectedSite) params.append('siteName', selectedSite);
//   // ADDED params to API call
//   if (selectedHospitalId && selectedHospitalId !== 'all') params.append('hospitalId', selectedHospitalId);
//   if (selectedHospitalName && selectedHospitalName !== 'all') params.append('hospitalName', selectedHospitalName);

//   const queryString = params.toString();
//   let url = `${basePath}/api/get-intervention-options${queryString ? `?${queryString}` : ''}`;


//   return fetch(url)
//       .then(response => response.json())
//       .then(interventions => {
//           interventionDropdown.innerHTML = ''; // Clear existing

//           const allOption = document.createElement("option");
//           allOption.value = "all";
//           allOption.text = "All Interventions";
//           interventionDropdown.appendChild(allOption);

//           interventions.forEach(interv => {
//               if (interv) { // Ensure intervention is not null/empty
//                   const option = document.createElement("option");
//                   option.value = interv;
//                   option.text = interv;
//                   interventionDropdown.appendChild(option);
//               }
//           });

//            // Try to restore previous selection, otherwise default to "all"
//            if (Array.from(interventionDropdown.options).some(opt => opt.value === currentIntervention)) {
//                interventionDropdown.value = currentIntervention;
//            } else {
//                interventionDropdown.value = "all";
//            }
//           interventionDropdown.disabled = false;
//           console.log("Intervention dropdown populated. Selected:", interventionDropdown.value);
//           return interventions;
//       })
//       .catch(error => {
//           console.error("Error fetching intervention options:", error);
//           interventionDropdown.value = "all"; // Fallback
//            interventionDropdown.disabled = true;
//           return null;
//       });
// }


// // Removed populateSiteNameDropdown and populateDepartmentDropdown as they are set by EJS


// /**
// * Updates Instrument dropdown based on selected diagnosis.
// * @param {Array} data - Hierarchical data.
// * @param {string} selectedDiagnosis - Value from diagnosis dropdown.
// * @param {string} [preferredInstrument='all'] - Attempt to restore this value if possible.
// */
// function updateInstrumentDropdown(data, selectedDiagnosis, preferredInstrument = 'all') { // Added preferredInstrument
//   const instrumentDropdown = document.getElementById("instrumentDropdown");
//   const scaleDropdown = document.getElementById("scaleDropdown");

//   instrumentDropdown.innerHTML = '';
//   scaleDropdown.innerHTML = ''; // Also clear scale when instrument changes

//   const allInstrumentsOption = document.createElement("option");
//   allInstrumentsOption.value = "all";
//   allInstrumentsOption.text = "All Instruments";
//   instrumentDropdown.appendChild(allInstrumentsOption);

//   const instrumentsSet = new Set();

//   if (selectedDiagnosis === 'all') {
//       data.forEach(item => {
//           item.promsInstruments.forEach(instObj => {
//               if (instObj.promsInstrument) instrumentsSet.add(instObj.promsInstrument);
//           });
//       });
//   } else {
//       const selectedData = data.find(item => {
//           if (selectedDiagnosis === 'null') return item.diagnosisICD10 == null || item.diagnosisICD10 === 'null';
//           return item.diagnosisICD10 === selectedDiagnosis;
//       });
//       if (selectedData) {
//           selectedData.promsInstruments.forEach(instObj => {
//               if (instObj.promsInstrument) instrumentsSet.add(instObj.promsInstrument);
//           });
//       } else {
//           console.warn("No instruments found for diagnosis:", selectedDiagnosis);
//       }
//   }

//   instrumentsSet.forEach(instrumentName => {
//       const option = document.createElement("option");
//       option.value = instrumentName;
//       option.text = instrumentName;
//       instrumentDropdown.appendChild(option);
//   });

//   // Try to restore preferred selection, otherwise default to "all"
//   if (instrumentsSet.has(preferredInstrument)) {
//        instrumentDropdown.value = preferredInstrument;
//    } else {
//        instrumentDropdown.value = "all";
//    }
//   instrumentDropdown.disabled = false;
//   console.log('Instrument dropdown updated. Selected:', instrumentDropdown.value);
//   return instrumentDropdown.value; // Return the actual selected value
// }

// /**
// * Updates Scale dropdown based on selected diagnosis and instrument.
// * @param {Array} data - Hierarchical data.
// * @param {string} selectedDiagnosis - Value from diagnosis dropdown.
// * @param {string} selectedInstrument - Value from instrument dropdown.
// * @param {string} [preferredScale='all'] - Attempt to restore this value if possible.
// */
// function updateScaleDropdown(data, selectedDiagnosis, selectedInstrument, preferredScale = 'all') { // Added preferredScale
//   const scaleDropdown = document.getElementById("scaleDropdown");
//   scaleDropdown.innerHTML = '';

//   const allScalesOption = document.createElement("option");
//   allScalesOption.value = "all";
//   allScalesOption.text = "All Scales";
//   scaleDropdown.appendChild(allScalesOption);

//   const scalesSet = new Set();

//   if (selectedInstrument === 'all') {
//       if (selectedDiagnosis === 'all') {
//           data.forEach(item => item.promsInstruments.forEach(inst => inst.scales.forEach(s => scalesSet.add(s))));
//       } else {
//           const diagData = data.find(item => selectedDiagnosis === 'null' ? (item.diagnosisICD10 == null || item.diagnosisICD10 === 'null') : item.diagnosisICD10 === selectedDiagnosis);
//           diagData?.promsInstruments.forEach(inst => inst.scales.forEach(s => scalesSet.add(s)));
//       }
//   } else {
//       if (selectedDiagnosis === 'all') {
//           data.forEach(item => {
//               const instData = item.promsInstruments.find(inst => inst.promsInstrument === selectedInstrument);
//               instData?.scales.forEach(s => scalesSet.add(s));
//           });
//       } else {
//           const diagData = data.find(item => selectedDiagnosis === 'null' ? (item.diagnosisICD10 == null || item.diagnosisICD10 === 'null') : item.diagnosisICD10 === selectedDiagnosis);
//           const instData = diagData?.promsInstruments.find(inst => inst.promsInstrument === selectedInstrument);
//           instData?.scales.forEach(s => scalesSet.add(s));
//       }
//   }

//   if (scalesSet.size === 0) {
//       console.warn("No scales found for diagnosis:", selectedDiagnosis, "and instrument:", selectedInstrument);
//   }

//   scalesSet.forEach(scaleName => {
//       const option = document.createElement("option");
//       option.value = scaleName;
//       option.text = scaleName;
//       scaleDropdown.appendChild(option);
//   });

//    // Try to restore preferred selection, otherwise default to "all"
//   if (scalesSet.has(preferredScale)) {
//        scaleDropdown.value = preferredScale;
//    } else {
//        scaleDropdown.value = "all";
//    }
//   scaleDropdown.disabled = false;
//   console.log('Scale dropdown updated. Selected:', scaleDropdown.value);
//   return scaleDropdown.value; // Return the actual selected value
// }


// /**
// * Populates the Doctor ID dropdown based on filters.
// * @param {string} selectedSite
// * @param {string} selectedDepartment
// * @param {string} selectedHospitalId // ADDED
// * @param {string} selectedHospitalName // ADDED
// */
// function populateDoctorIdDropdown(selectedSite = '', selectedDepartment = '', selectedHospitalId = '', selectedHospitalName = '') { // ADDED params
//   const doctorIdDropdown = document.getElementById("doctorIdDropdown");
//    if (!doctorIdDropdown) {
//        console.warn("No doctorIdDropdown element found!");
//        return Promise.resolve(null);
//    }
//   const currentDoctorId = doctorIdDropdown.value; // Save current


//   const params = new URLSearchParams();
//   if (selectedSite) params.append('siteName', selectedSite);
//   if (selectedDepartment) params.append('department', selectedDepartment);
//   // ADDED params to API call
//   if (selectedHospitalId && selectedHospitalId !== 'all') params.append('hospitalId', selectedHospitalId);
//   if (selectedHospitalName && selectedHospitalName !== 'all') params.append('hospitalName', selectedHospitalName);

//   const queryString = params.toString();
//   let url = `${basePath}/api/get-doctorid-options${queryString ? `?${queryString}` : ''}`;

//   return fetch(url)
//       .then(response => response.json())
//       .then(doctorIds => {
//           doctorIdDropdown.innerHTML = ''; // Clear existing

//           const allOption = document.createElement("option");
//           allOption.value = "all";
//           allOption.text = "All Doctors"; // Or just "All"
//           doctorIdDropdown.appendChild(allOption);

//           doctorIds.forEach(docId => {
//               if (docId) { // Ensure docId is not null/empty
//                   const option = document.createElement("option");
//                   option.value = docId;
//                   option.text = docId;
//                   doctorIdDropdown.appendChild(option);
//               }
//           });

//           // Try to restore previous selection OR defaultDoctorId, else 'all'
//            if (doctorIds.includes(currentDoctorId)) {
//                doctorIdDropdown.value = currentDoctorId;
//            } else if (doctorIds.includes(defaultDoctorId)) { // Check global default
//                doctorIdDropdown.value = defaultDoctorId;
//            } else {
//                doctorIdDropdown.value = "all";
//            }

//           doctorIdDropdown.disabled = false;
//           console.log("Doctor ID dropdown populated. Selected:", doctorIdDropdown.value);
//           return doctorIds;
//       })
//       .catch(error => {
//           console.error("Error fetching doctor ID options:", error);
//           doctorIdDropdown.value = "all"; // Fallback
//            doctorIdDropdown.disabled = true;
//           return null;
//       });
// }

// /**
// * Triggers updates for all charts based on current filter selections.
// */
// function filterDashboard() {
//   // Read values from ALL relevant dropdowns
//   const siteName = document.getElementById("siteNameDropdown").value;
//   const department = document.getElementById("departmentDropdown").value;
//   const hospitalId = document.getElementById("hospitalIdDropdown").value;
//   const hospitalName = document.getElementById("hospitalNameDropdown").value;
//   const doctorId = document.getElementById("doctorIdDropdown").value;
//   const intervention = document.getElementById("interventionDropdown").value;
//   const diagnosis = document.getElementById("diagnosisDropdown").value;
//   const instrument = document.getElementById("instrumentDropdown").value;
//   const scale = document.getElementById("scaleDropdown").value;

//   console.log("Filtering dashboard with:", {
//       hospitalId, hospitalName, siteName, department, doctorId, intervention, diagnosis, instrument, scale
//   });

//   // Call the fetch functions for each chart, passing all necessary filter values
//   // Ensure these functions are defined in their respective chart JS files and accept these arguments
//   if (typeof fetchMeanScoreData === 'function') {
//       fetchMeanScoreData(diagnosis, instrument, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName);
//   }
//   if (typeof fetchScatterPlotData === 'function') {
//       fetchScatterPlotData(diagnosis, instrument, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName);
//   }
//   if (typeof fetchHeatmapData === 'function') {
//       fetchHeatmapData(diagnosis, instrument, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName);
//   }
//   if (typeof fetchMCIDData === 'function') {
//       fetchMCIDData(diagnosis, instrument, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName);
//   }
//   // Add calls for combinedChart, numberCards if they need to be filtered dynamically
//   if (typeof fetchCombinedChartData === 'function') { // Assuming combinedChart.js has a fetch function
//        const combinedSurveyType = document.getElementById("combinedSurveyTypeDropdown")?.value || 'All';
//        fetchCombinedChartData(department, siteName, combinedSurveyType, doctorId, hospitalId, hospitalName);
//    }
//    if (typeof fetchNumberCardData === 'function') { // Assuming numberCard*.js have a combined fetch or individual ones
//        fetchNumberCardData(department, siteName, doctorId, hospitalId, hospitalName);
//    }
// }

// // --- Initialization and Event Listeners ---
// document.addEventListener("DOMContentLoaded", () => {
//   let hierarchicalData = [];

//   // 1) Get references to all dropdowns
//   const siteNameDropdown = document.getElementById("siteNameDropdown");
//   const departmentDropdown = document.getElementById("departmentDropdown");
//   const hospitalIdDropdown = document.getElementById("hospitalIdDropdown");
//   const hospitalNameDropdown = document.getElementById("hospitalNameDropdown");
//   const doctorIdDropdown = document.getElementById("doctorIdDropdown");
//   const interventionDropdown = document.getElementById("interventionDropdown");
//   const diagnosisDropdown = document.getElementById("diagnosisDropdown");
//   const instrumentDropdown = document.getElementById("instrumentDropdown");
//   const scaleDropdown = document.getElementById("scaleDropdown");

//   // 2) Read initial values (set by EJS or globally)
//   const initialSiteName = siteNameDropdown.value.trim();
//   const initialDeptName = departmentDropdown.value.trim();
//   // Use global JS variables set in EJS for initial hospital/doctor info
//   const initialHospitalId = typeof defaultHospitalId !== 'undefined' ? defaultHospitalId : '';
//   const initialHospitalName = typeof defaultHospitalName !== 'undefined' ? defaultHospitalName : '';
//   const initialDoctorId = typeof defaultDoctorId !== 'undefined' ? defaultDoctorId : ''; // Already exists

//   console.log("Initial Values:", { initialSiteName, initialDeptName, initialHospitalId, initialHospitalName, initialDoctorId });


//   // 3) Populate Dropdowns Sequentially (handling dependencies)
//   populateHospitalIdDropdown() // Populates and sets defaultHospitalId
//     .then(selectedHospitalId => populateHospitalNameDropdown(selectedHospitalId)) // Populates based on ID, sets defaultHospitalName
//     .then(() => populateDoctorIdDropdown(initialSiteName, initialDeptName, hospitalIdDropdown.value, hospitalNameDropdown.value)) // Use current dropdown values
//     .then(() => populateInterventionDropdown(initialDeptName, initialSiteName, hospitalIdDropdown.value, hospitalNameDropdown.value)) // Use current dropdown values
//     .then(() => populateHierarchicalDropdowns(initialSiteName, initialDeptName, hospitalIdDropdown.value, hospitalNameDropdown.value)) // Use current dropdown values
//     .then(initialState => {
//         if (initialState && initialState.data) {
//           hierarchicalData = initialState.data;
//         }
//         console.log("Initial dropdown population complete.");

//         // Initial filter trigger after everything is populated (optional, if charts don't fetch on their own init)
//         // filterDashboard();

//         // 4) Set up Event Listeners

//         // Hospital ID change
//         hospitalIdDropdown.addEventListener("change", event => {
//             const selectedHospitalId = event.target.value;
//             console.log("Hospital ID changed:", selectedHospitalId);
//             // Repopulate dependent dropdowns
//             populateHospitalNameDropdown(selectedHospitalId)
//                .then(() => populateDoctorIdDropdown(initialSiteName, initialDeptName, selectedHospitalId, hospitalNameDropdown.value))
//                .then(() => populateInterventionDropdown(initialDeptName, initialSiteName, selectedHospitalId, hospitalNameDropdown.value))
//                .then(() => populateHierarchicalDropdowns(initialSiteName, initialDeptName, selectedHospitalId, hospitalNameDropdown.value))
//                .then(newState => {
//                     if (newState && newState.data) hierarchicalData = newState.data;
//                     filterDashboard(); // Trigger chart updates
//                 });
//         });

//         // Hospital Name change
//         hospitalNameDropdown.addEventListener("change", event => {
//             const selectedHospitalName = event.target.value;
//             const selectedHospitalId = hospitalIdDropdown.value; // Use the currently selected ID
//             console.log("Hospital Name changed:", selectedHospitalName);
//              // Repopulate dependent dropdowns (excluding Hospital ID unless there's a strict mapping)
//             populateDoctorIdDropdown(initialSiteName, initialDeptName, selectedHospitalId, selectedHospitalName)
//                .then(() => populateInterventionDropdown(initialDeptName, initialSiteName, selectedHospitalId, selectedHospitalName))
//                .then(() => populateHierarchicalDropdowns(initialSiteName, initialDeptName, selectedHospitalId, selectedHospitalName))
//                .then(newState => {
//                     if (newState && newState.data) hierarchicalData = newState.data;
//                     filterDashboard(); // Trigger chart updates
//                 });
//         });


//         // SiteName dropdown change (ONLY if it's made interactive later)
//         // siteNameDropdown.addEventListener("change", event => { ... });

//         // Department dropdown change (ONLY if it's made interactive later)
//         // departmentDropdown.addEventListener("change", event => { ... });

//         // Doctor ID dropdown change
//         doctorIdDropdown.addEventListener("change", () => {
//           console.log("Doctor ID changed to:", doctorIdDropdown.value);
//           // Only need to update charts, as other filters aren't dependent on doctor selection in this direction
//            filterDashboard();
//         });

//         // Intervention dropdown change
//         interventionDropdown.addEventListener("change", () => {
//           console.log("Intervention changed to:", interventionDropdown.value);
//            // Only need to update charts
//            filterDashboard();
//         });

//         // Diagnosis dropdown change
//         diagnosisDropdown.addEventListener("change", event => {
//           const selectedDiagnosis = event.target.value;
//            console.log("Diagnosis changed to:", selectedDiagnosis);
//           const currentInstrument = instrumentDropdown.value; // Get current before update
//            const currentScale = scaleDropdown.value; // Get current before update
//           const selectedInstrument = updateInstrumentDropdown(hierarchicalData, selectedDiagnosis, currentInstrument);
//           updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument, currentScale);
//           filterDashboard(); // Update charts
//         });

//         // Instrument dropdown change
//         instrumentDropdown.addEventListener("change", event => {
//           const selectedInstrument = event.target.value;
//            const selectedDiagnosis = diagnosisDropdown.value;
//            const currentScale = scaleDropdown.value; // Get current before update
//            console.log("Instrument changed to:", selectedInstrument);
//           updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument, currentScale);
//           filterDashboard(); // Update charts
//         });

//         // Scale dropdown change
//         scaleDropdown.addEventListener("change", event => {
//            console.log("Scale changed to:", event.target.value);
//           filterDashboard(); // Update charts
//         });

//         // Combined Chart Survey Type change listener (if needed)
//         const combinedSurveyTypeDropdown = document.getElementById("combinedSurveyTypeDropdown");
//         if (combinedSurveyTypeDropdown && typeof fetchCombinedChartData === 'function') {
//             combinedSurveyTypeDropdown.addEventListener('change', () => {
//                console.log("Combined chart survey type changed");
//                filterDashboard(); // Or call a specific update function for the combined chart
//             });
//         }

//     }).catch(error => {
//         console.error("Error during initial dropdown population sequence:", error);
//     }); // End of promise chain for initial population
// }); // End DOMContentLoaded






// function populateHierarchicalDropdowns(selectedSite = '', selectedDepartment = '') {
//     return fetch(`${basePath}/api/get-hierarchical-options${selectedSite ? `?siteName=${selectedSite}` : ''}${selectedDepartment ? `&department=${selectedDepartment}` : ''}`)
//       .then(response => response.json())
//       .then(data => {
//         const diagnosisDropdown = document.getElementById("diagnosisDropdown");
//         const instrumentDropdown = document.getElementById("instrumentDropdown");
//         const scaleDropdown = document.getElementById("scaleDropdown");
  
//         // 1) Add "All Diagnoses" and "Unassigned / No Diagnosis"
//         diagnosisDropdown.innerHTML = `
//           <option value="all">All Diagnoses</option>
//           <option value="null">Unassigned / No Diagnosis</option>
//         `;
  
//         // Clear instruments & scales
//         instrumentDropdown.innerHTML = '';
//         scaleDropdown.innerHTML = '';
  
//         // 2) Populate real diagnoses from data
//         let firstAvailableDiagnosis = null;
//         data.forEach((item) => {
//           if (item.diagnosisICD10 && item.diagnosisICD10 !== 'null') {
//             const option = document.createElement("option");
//             option.value = item.diagnosisICD10;
//             option.text = item.diagnosisICD10;
//             diagnosisDropdown.appendChild(option);
  
//             if (firstAvailableDiagnosis === null) {
//               firstAvailableDiagnosis = item.diagnosisICD10;
//             }
//           }
//         });
  
//         // 3) Always default to "All Diagnoses"
//         diagnosisDropdown.value = "all";
//         console.log("Default diagnosis selected: All Diagnoses");
  
//         // Auto-populate instruments & scales for "all"
//         const defaultInstrument = updateInstrumentDropdown(data, "all");
//         if (defaultInstrument) {
//           const defaultScale = updateScaleDropdown(data, "all", defaultInstrument);
//           if (defaultScale) {
//             // Trigger a "change" so charts pick up the defaults
//             scaleDropdown.dispatchEvent(new Event('change'));
//           }
//         }
  
//         return { data };
//       })
//       .catch(error => {
//         console.error("Error fetching hierarchical dropdown data:", error);
//         return null;
//       });
//   }
  
//   function populateInterventionDropdown(selectedDepartment = '', selectedSite = '') {
//     let url = `${basePath}/api/get-intervention-options`;
//     const params = [];
//     if (selectedDepartment) params.push(`department=${encodeURIComponent(selectedDepartment)}`);
//     if (selectedSite) params.push(`siteName=${encodeURIComponent(selectedSite)}`);
//     if (params.length > 0) {
//       url += '?' + params.join('&');
//     }
  
//     return fetch(url)
//       .then(response => response.json())
//       .then(interventions => {
//         const interventionDropdown = document.getElementById("interventionDropdown");
//         if (!interventionDropdown) {
//           console.warn("No interventionDropdown element found!");
//           return null;
//         }
  
//         // Clear existing options
//         interventionDropdown.innerHTML = '';
  
//         // Always add "All Interventions" on top
//         const allOption = document.createElement("option");
//         allOption.value = "all";
//         allOption.text = "All Interventions";
//         interventionDropdown.appendChild(allOption);
  
//         // Populate options from the DB
//         interventions.forEach(interv => {
//           const option = document.createElement("option");
//           option.value = interv;
//           option.text = interv;
//           interventionDropdown.appendChild(option);
//         });
  
//         // Default to "all"
//         interventionDropdown.value = "all";
//         interventionDropdown.disabled = false;
//         console.log("Intervention dropdown populated with default 'all'");
//         return interventions;
//       })
//       .catch(error => {
//         console.error("Error fetching intervention options:", error);
//         return null;
//       });
//   }
  
//   function populateSiteNameDropdown() {
//     return fetch(`${basePath}/api/get-site-options`)
//       .then(response => response.json())
//       .then(sites => {
//         const siteNameDropdown = document.getElementById("siteNameDropdown");
  
//         // Clear existing options
//         siteNameDropdown.innerHTML = '';
  
//         // Populate with fetched sites
//         sites.forEach(site => {
//           const option = document.createElement("option");
//           option.value = site;
//           option.text = site;
//           siteNameDropdown.appendChild(option);
//         });
  
//         // Set default site to the first item, if available
//         if (sites.length > 0) {
//           const defaultSite = sites[0];
//           siteNameDropdown.value = defaultSite;
//           siteNameDropdown.disabled = false;
//           console.log("Default site selected:", defaultSite);
//           return defaultSite;
//         } else {
//           siteNameDropdown.disabled = true;
//           return null;
//         }
//       })
//       .catch(error => {
//         console.error("Error fetching site options:", error);
//       });
//   }
  
//   function updateInstrumentDropdown(data, selectedDiagnosis) {
//     const instrumentDropdown = document.getElementById("instrumentDropdown");
//     const scaleDropdown = document.getElementById("scaleDropdown");
  
//     instrumentDropdown.innerHTML = '';
//     scaleDropdown.innerHTML = '';
  
//     // 1) Always add "All Instruments"
//     const allInstrumentsOption = document.createElement("option");
//     allInstrumentsOption.value = "all";
//     allInstrumentsOption.text = "All Instruments";
//     instrumentDropdown.appendChild(allInstrumentsOption);
  
//     if (selectedDiagnosis === 'all') {
//       const allInstrumentsSet = new Set();
//       data.forEach(item => {
//         item.promsInstruments.forEach(instObj => {
//           if (instObj.promsInstrument) {
//             allInstrumentsSet.add(instObj.promsInstrument);
//           }
//         });
//       });
  
//       allInstrumentsSet.forEach(instrumentName => {
//         const option = document.createElement("option");
//         option.value = instrumentName;
//         option.text = instrumentName;
//         instrumentDropdown.appendChild(option);
//       });
  
//       instrumentDropdown.value = "all";
//       instrumentDropdown.disabled = false;
//       return instrumentDropdown.value;
//     }
  
//     // Otherwise, single or "null" diagnosis
//     const selectedData = data.find(item => {
//       if (selectedDiagnosis === 'null') {
//         return item.diagnosisICD10 == null || item.diagnosisICD10 === 'null';
//       }
//       return item.diagnosisICD10 === selectedDiagnosis;
//     });
  
//     if (!selectedData) {
//       console.warn("No instruments found for diagnosis:", selectedDiagnosis);
//       instrumentDropdown.value = "all";
//       instrumentDropdown.disabled = false;
//       return "all";
//     }
  
//     selectedData.promsInstruments.forEach(instObj => {
//       const option = document.createElement("option");
//       option.value = instObj.promsInstrument;
//       option.text = instObj.promsInstrument;
//       instrumentDropdown.appendChild(option);
//     });
  
//     instrumentDropdown.value = "all";
//     instrumentDropdown.disabled = false;
//     return instrumentDropdown.value;
//   }
  
//   function updateScaleDropdown(data, selectedDiagnosis, selectedInstrument) {
//     const scaleDropdown = document.getElementById("scaleDropdown");
//     scaleDropdown.innerHTML = '';
  
//     // Always add "All Scales"
//     const allScalesOption = document.createElement("option");
//     allScalesOption.value = "all";
//     allScalesOption.text = "All Scales";
//     scaleDropdown.appendChild(allScalesOption);
  
//     // If user picks "All Instruments"
//     if (selectedInstrument === 'all') {
//       const allScalesSet = new Set();
//       if (selectedDiagnosis === 'all') {
//         // Gather from entire dataset
//         data.forEach(item => {
//           item.promsInstruments.forEach(instObj => {
//             instObj.scales.forEach(s => allScalesSet.add(s));
//           });
//         });
//       } else {
//         const selData = data.find(item => {
//           if (selectedDiagnosis === 'null') {
//             return !item.diagnosisICD10 || item.diagnosisICD10 === 'null';
//           }
//           return item.diagnosisICD10 === selectedDiagnosis;
//         });
//         if (selData) {
//           selData.promsInstruments.forEach(instObj => {
//             instObj.scales.forEach(s => allScalesSet.add(s));
//           });
//         }
//       }
  
//       if (allScalesSet.size > 0) {
//         allScalesSet.forEach(scaleName => {
//           const option = document.createElement("option");
//           option.value = scaleName;
//           option.text = scaleName;
//           scaleDropdown.appendChild(option);
//         });
//       }
//       scaleDropdown.value = "all";
//       scaleDropdown.disabled = false;
//       return scaleDropdown.value;
//     }
  
//     // If user picks a specific instrument + "All Diagnoses"
//     if (selectedDiagnosis === 'all') {
//       const matchingScales = new Set();
//       data.forEach(item => {
//         item.promsInstruments.forEach(instObj => {
//           if (instObj.promsInstrument === selectedInstrument) {
//             instObj.scales.forEach(s => matchingScales.add(s));
//           }
//         });
//       });
  
//       if (matchingScales.size > 0) {
//         matchingScales.forEach(scaleName => {
//           const option = document.createElement("option");
//           option.value = scaleName;
//           option.text = scaleName;
//           scaleDropdown.appendChild(option);
//         });
//       }
//       scaleDropdown.value = "all";
//       scaleDropdown.disabled = false;
//       return scaleDropdown.value;
//     }
  
//     // Otherwise, single/"null" diagnosis + specific instrument
//     const selData = data.find(item => {
//       if (selectedDiagnosis === 'null') {
//         return !item.diagnosisICD10 || item.diagnosisICD10 === 'null';
//       }
//       return item.diagnosisICD10 === selectedDiagnosis;
//     });
  
//     if (!selData) {
//       console.warn("No data found for that diagnosis:", selectedDiagnosis);
//       scaleDropdown.value = "all";
//       scaleDropdown.disabled = false;
//       return "all";
//     }
  
//     const instrumentData = selData.promsInstruments.find(
//       inst => inst.promsInstrument === selectedInstrument
//     );
  
//     if (instrumentData) {
//       instrumentData.scales.forEach(scaleName => {
//         const option = document.createElement("option");
//         option.value = scaleName;
//         option.text = scaleName;
//         scaleDropdown.appendChild(option);
//       });
//       scaleDropdown.value = "all";
//       scaleDropdown.disabled = false;
//       return scaleDropdown.value;
//     } else {
//       console.warn("No scales found for instrument:", selectedInstrument);
//       scaleDropdown.value = "all";
//       scaleDropdown.disabled = false;
//       return "all";
//     }
//   }
  
//   function populateDepartmentDropdown(selectedSite = '') {
//     return fetch(`${basePath}/api/get-department-options${selectedSite ? `?site=${selectedSite}` : ''}`)
//       .then(response => response.json())
//       .then(departments => {
//         const departmentDropdown = document.getElementById("departmentDropdown");
  
//         // Clear existing options
//         departmentDropdown.innerHTML = '';
  
//         // Populate with fetched departments
//         departments.forEach(dept => {
//           const option = document.createElement("option");
//           option.value = dept;
//           option.text = dept;
//           departmentDropdown.appendChild(option);
//         });
  
//         if (departments.length > 0) {
//           const defaultDepartment = departments[0];
//           departmentDropdown.value = defaultDepartment;
//           departmentDropdown.disabled = false;
//           console.log("Default department selected:", defaultDepartment);
//           return defaultDepartment;
//         } else {
//           departmentDropdown.disabled = true;
//           return null;
//         }
//       })
//       .catch(error => {
//         console.error("Error fetching department data:", error);
//       });
//   }
  
//   // NEW: Function to populate Doctor ID dropdown
//   function populateDoctorIdDropdown(selectedSite = '', selectedDepartment = '') {
//     let url = `${basePath}/api/get-doctorid-options`;
//     const params = [];
//     if (selectedSite) params.push(`siteName=${encodeURIComponent(selectedSite)}`);
//     if (selectedDepartment) params.push(`department=${encodeURIComponent(selectedDepartment)}`);
//     if (params.length > 0) {
//       url += '?' + params.join('&');
//     }
  
//     return fetch(url)
//       .then(response => response.json())
//       .then(doctorIds => {
//         const doctorIdDropdown = document.getElementById("doctorIdDropdown");
//         // Clear existing options
//         doctorIdDropdown.innerHTML = '';
//         // Add default "All" option
//         const allOption = document.createElement("option");
//         allOption.value = "all";
//         allOption.text = "All";
//         doctorIdDropdown.appendChild(allOption);
//         // Populate dropdown with fetched doctor IDs
//         doctorIds.forEach(docId => {
//           const option = document.createElement("option");
//           option.value = docId;
//           option.text = docId;
//           doctorIdDropdown.appendChild(option);
//         });
//         // doctorIdDropdown.value = "all";

//              if (doctorIds.includes(defaultDoctorId)) {
//                doctorIdDropdown.value = defaultDoctorId;
//              } else {
//                doctorIdDropdown.value = "all";
//              }
//         doctorIdDropdown.disabled = false;
//         console.log("Doctor ID dropdown populated.");
//         return doctorIds;
//       })
//       .catch(error => {
//         console.error("Error fetching doctor ID options:", error);
//         return null;
//       });
//   }
  
//   // Filter function to refresh charts (updated to include doctorId)
//   function filterDashboard(scale, department, site) {
//     const doctorId = document.getElementById("doctorIdDropdown").value;
//     console.log("Filtering dashboard with scale:", scale, "department:", department, "site:", site, "doctorId:", doctorId);
//     // Implement the logic to refresh charts with the selected filters, including doctorId.
//     // For example: fetchMeanScoreData(..., doctorId);
//   }
  

//   document.addEventListener("DOMContentLoaded", () => {
//     let hierarchicalData = [];
  
//     // 1) Read the siteName & departmentName from the DOM 
//     //    (these were set by EJS defaults)
//     const siteNameDropdown = document.getElementById("siteNameDropdown");
//     const departmentDropdown = document.getElementById("departmentDropdown");
//     const siteName = siteNameDropdown.value.trim();
//     const deptName = departmentDropdown.value.trim();
  
//     // 2) Now populate other dropdowns (Doctor ID, Intervention, etc.) 
//     //    using the known siteName/departmentName from EJS
//     populateDoctorIdDropdown(siteName, deptName); 
//     populateInterventionDropdown(deptName, siteName)
//       .then(() => {
//         // Then fetch hierarchical data
//         populateHierarchicalDropdowns(siteName, deptName).then(initialState => {
//           if (initialState && initialState.data) {
//             hierarchicalData = initialState.data;
//           }
  
//           // 3) Set up event listeners once everything’s loaded
  
//           // --- DO NOT call 'populateSiteNameDropdown' or 'populateDepartmentDropdown'
//           //     here, because we already have them from EJS. Instead, if you want to
//           //     let the user pick a new site/department, you can keep the old code 
//           //     but be aware it might overwrite your EJS values.
          
//           // SiteName dropdown change
//           siteNameDropdown.addEventListener("change", event => {
//             const selectedSite = event.target.value;
//             // If you still want the user to *manually* change site, 
//             // you can re-populate department, intervention, etc. 
//             populateDepartmentDropdown(selectedSite).then(defaultDepartment => {
//               populateHierarchicalDropdowns(selectedSite, defaultDepartment).then(newState => {
//                 if (newState && newState.data) {
//                   hierarchicalData = newState.data;
//                   // Force the scaleDropdown to fire a change 
//                   document.getElementById('scaleDropdown').dispatchEvent(new Event('change'));
//                 }
//               });
//               populateInterventionDropdown(defaultDepartment, selectedSite);
//               populateDoctorIdDropdown(selectedSite, defaultDepartment);
//             });
//           });
  
//           // Department dropdown change
//           departmentDropdown.addEventListener("change", event => {
//             const selectedDepartment = event.target.value;
//             const selectedSite = siteNameDropdown.value;
//             populateHierarchicalDropdowns(selectedSite, selectedDepartment).then(newState => {
//               if (newState && newState.data) {
//                 hierarchicalData = newState.data;
//                 document.getElementById('scaleDropdown').dispatchEvent(new Event('change'));
//               }
//             });
//             populateInterventionDropdown(selectedDepartment, selectedSite);
//             populateDoctorIdDropdown(selectedSite, selectedDepartment);
//           });
  
//           // Doctor ID dropdown change
//           const doctorIdDropdown = document.getElementById("doctorIdDropdown");
//           doctorIdDropdown.addEventListener("change", () => {
//             console.log("Doctor ID changed to:", doctorIdDropdown.value);
//             filterDashboard(
//               document.getElementById("scaleDropdown").value,
//               departmentDropdown.value,
//               siteNameDropdown.value
//             );
//           });
  
//           // Intervention dropdown change
//           const interventionDropdown = document.getElementById("interventionDropdown");
//           if (interventionDropdown) {
//             interventionDropdown.addEventListener("change", () => {
//               console.log("Intervention changed => re‐fetch data if needed");
//             });
//           }
  
//           // Diagnosis dropdown change
//           const diagnosisDropdown = document.getElementById("diagnosisDropdown");
//           diagnosisDropdown.addEventListener("change", event => {
//             const selectedDiagnosis = event.target.value;
//             const selectedInstrument = updateInstrumentDropdown(hierarchicalData, selectedDiagnosis);
//             if (selectedInstrument) {
//               updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
//             }
//           });
  
//           // Instrument dropdown change
//           const instrumentDropdown = document.getElementById("instrumentDropdown");
//           instrumentDropdown.addEventListener("change", event => {
//             const selectedDiagnosis = diagnosisDropdown.value;
//             const selectedInstrument = event.target.value;
//             updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
//           });
  
//           // Scale dropdown change
//           const scaleDropdown = document.getElementById("scaleDropdown");
//           scaleDropdown.addEventListener("change", event => {
//             const selectedDiagnosis = diagnosisDropdown.value;
//             const selectedInstrument = instrumentDropdown.value;
//             const selectedScale = event.target.value;
//             filterDashboard(
//               selectedScale,
//               departmentDropdown.value,
//               siteNameDropdown.value
//             );
//           });
//         });
//       });
//   });
  



  




//This is code where we add the hospitalId and hospitalName in addition to what we have




// /public/js/common/hierarchicalDropdown.js

/**
 * Populates the Hospital ID dropdown.
 * Uses the global `defaultHospitalId` (set in EJS) for the initial value.
 */


function populateHospitalIdDropdown() {
    const hospitalIdDropdown = document.getElementById("hospitalIdDropdown");
    if (!hospitalIdDropdown) {
        console.warn("No hospitalIdDropdown element found!");
        return Promise.resolve(null); // Return resolved promise
    }
  
    return fetch(`${basePath}/api/get-hospitalid-options`)
        .then(response => response.json())
        .then(hospitalIds => {
            // Clear existing options except the initial one set by EJS
            // Keep the first option if it matches the default, otherwise clear all
            const firstOption = hospitalIdDropdown.options[0];
            if (!firstOption || firstOption.value !== defaultHospitalId) {
                hospitalIdDropdown.innerHTML = ''; // Clear if default isn't there
                // Add the default option first if it wasn't the initial one
                if (defaultHospitalId) {
                     const defaultOpt = document.createElement("option");
                     defaultOpt.value = defaultHospitalId;
                     defaultOpt.text = defaultHospitalId;
                     hospitalIdDropdown.appendChild(defaultOpt);
                }
            }
  
  
            // Add "All" option
             const allOption = document.createElement("option");
             allOption.value = "all";
             allOption.text = "All Hospitals"; // Or just "All"
             // Add "All" only if it's not already the default/first option
             if(hospitalIdDropdown.options.length === 0 || hospitalIdDropdown.options[0].value !== 'all') {
                // Prepending might be better if desired
                 hospitalIdDropdown.insertBefore(allOption, hospitalIdDropdown.firstChild);
             }
  
  
            // Populate with other fetched IDs, avoiding duplicates of default/all
            hospitalIds.forEach(id => {
                if (id && id !== defaultHospitalId && id !== 'all') { // Check if ID exists and is not the default/all
                    // Check if this ID is already in the dropdown
                     let exists = false;
                     for (let i = 0; i < hospitalIdDropdown.options.length; i++) {
                         if (hospitalIdDropdown.options[i].value === id) {
                             exists = true;
                             break;
                         }
                     }
                     if (!exists) {
                         const option = document.createElement("option");
                         option.value = id;
                         option.text = id;
                         hospitalIdDropdown.appendChild(option);
                     }
                }
            });
  
            // Set the value to the default passed from EJS, or 'all' if default is empty/invalid
            hospitalIdDropdown.value = defaultHospitalId || "all";
            // hospitalIdDropdown.disabled = false; // Assuming it should be interactive
            console.log("Hospital ID dropdown populated. Default:", hospitalIdDropdown.value);
            return hospitalIdDropdown.value; // Return the initially selected value
        })
        .catch(error => {
            console.error("Error fetching hospital ID options:", error);
            hospitalIdDropdown.value = "all"; // Fallback
            // hospitalIdDropdown.disabled = true;
            return "all";
        });
  }
  
  /**
  * Populates the Hospital Name dropdown based on the selected Hospital ID.
  * Uses the global `defaultHospitalName` (set in EJS) for the initial value.
  * @param {string} selectedHospitalId - The currently selected Hospital ID to filter by.
  */
  function populateHospitalNameDropdown(selectedHospitalId = '') {
    const hospitalNameDropdown = document.getElementById("hospitalNameDropdown");
    if (!hospitalNameDropdown) {
        console.warn("No hospitalNameDropdown element found!");
        return Promise.resolve(null);
    }
  
    let url = `${basePath}/api/get-hospitalname-options`;
    if (selectedHospitalId && selectedHospitalId !== 'all') {
        url += `?hospitalId=${encodeURIComponent(selectedHospitalId)}`;
    }
  
    return fetch(url)
        .then(response => response.json())
        .then(hospitalNames => {
             // Keep the first option if it matches the default, otherwise clear all
            const firstOption = hospitalNameDropdown.options[0];
             if (!firstOption || firstOption.value !== defaultHospitalName) {
                 hospitalNameDropdown.innerHTML = ''; // Clear if default isn't there
                // Add the default option first if it wasn't the initial one
                 if (defaultHospitalName) {
                      const defaultOpt = document.createElement("option");
                      defaultOpt.value = defaultHospitalName; // Use name as value? Or ID? Let's use Name for now.
                      defaultOpt.text = defaultHospitalName;
                      hospitalNameDropdown.appendChild(defaultOpt);
                 }
             }
  
  
            // Add "All" option
             const allOption = document.createElement("option");
             allOption.value = "all";
             allOption.text = "All Hospital Names"; // Or just "All"
             if(hospitalNameDropdown.options.length === 0 || hospitalNameDropdown.options[0].value !== 'all') {
                 hospitalNameDropdown.insertBefore(allOption, hospitalNameDropdown.firstChild);
             }
  
  
            // Populate with other fetched names
            hospitalNames.forEach(name => {
                 if (name && name !== defaultHospitalName && name !== 'all') {
                     let exists = false;
                     for (let i = 0; i < hospitalNameDropdown.options.length; i++) {
                         if (hospitalNameDropdown.options[i].value === name) {
                             exists = true;
                             break;
                         }
                     }
                     if (!exists) {
                         const option = document.createElement("option");
                         option.value = name; // Using name as value
                         option.text = name;
                         hospitalNameDropdown.appendChild(option);
                     }
                 }
            });
  
            // Set the value to the default passed from EJS, or 'all'
            hospitalNameDropdown.value = defaultHospitalName || "all";
            // hospitalNameDropdown.disabled = false;
            console.log("Hospital Name dropdown populated. Default:", hospitalNameDropdown.value);
            return hospitalNameDropdown.value;
        })
        .catch(error => {
            console.error("Error fetching hospital Name options:", error);
            hospitalNameDropdown.value = "all";
            // hospitalNameDropdown.disabled = true;
            return "all";
        });
  }
  
  
  /**
  * Populates Diagnosis, Instrument, and Scale dropdowns based on filters.
  * @param {string} selectedSite
  * @param {string} selectedDepartment
  * @param {string} selectedHospitalId // ADDED
  * @param {string} selectedHospitalName // ADDED
  */
  function populateHierarchicalDropdowns(selectedSite = '', selectedDepartment = '', selectedHospitalId = '', selectedHospitalName = '') { // ADDED params
    const params = new URLSearchParams();
    if (selectedSite) params.append('siteName', selectedSite);
    if (selectedDepartment) params.append('department', selectedDepartment);
    // ADDED params to API call
    if (selectedHospitalId && selectedHospitalId !== 'all') params.append('hospitalId', selectedHospitalId);
    if (selectedHospitalName && selectedHospitalName !== 'all') params.append('hospitalName', selectedHospitalName);
  
    const queryString = params.toString();
  
    return fetch(`${basePath}/api/get-hierarchical-options${queryString ? `?${queryString}` : ''}`)
        .then(response => response.json())
        .then(data => {
            const diagnosisDropdown = document.getElementById("diagnosisDropdown");
            const instrumentDropdown = document.getElementById("instrumentDropdown");
            const scaleDropdown = document.getElementById("scaleDropdown");
  
            // Save current values before clearing
            const currentDiagnosis = diagnosisDropdown.value;
            const currentInstrument = instrumentDropdown.value;
            const currentScale = scaleDropdown.value;
  
  
            diagnosisDropdown.innerHTML = `
                <option value="all">All Diagnoses</option>
                <option value="null">Unassigned / No Diagnosis</option>
            `;
            instrumentDropdown.innerHTML = '';
            scaleDropdown.innerHTML = '';
  
            let firstAvailableDiagnosis = null;
            data.forEach((item) => {
                if (item.diagnosisICD10 && item.diagnosisICD10 !== 'null') {
                    const option = document.createElement("option");
                    option.value = item.diagnosisICD10;
                    option.text = item.diagnosisICD10;
                    diagnosisDropdown.appendChild(option);
                    if (firstAvailableDiagnosis === null) firstAvailableDiagnosis = item.diagnosisICD10;
                }
            });
  
            // Try to restore previous selection, otherwise default to "all"
            if (Array.from(diagnosisDropdown.options).some(opt => opt.value === currentDiagnosis)) {
                 diagnosisDropdown.value = currentDiagnosis;
            } else {
                 diagnosisDropdown.value = "all";
            }
  
            console.log("Diagnosis dropdown updated. Selected:", diagnosisDropdown.value);
  
            // Repopulate instruments based on potentially restored diagnosis
             const defaultInstrument = updateInstrumentDropdown(data, diagnosisDropdown.value, currentInstrument); // Pass currentInstrument
            if (defaultInstrument) {
                 const defaultScale = updateScaleDropdown(data, diagnosisDropdown.value, defaultInstrument, currentScale); // Pass currentScale
                // No need to dispatch 'change' here, let the actual user change trigger updates
            }
  
            return { data }; // Return the new hierarchical data structure
        })
        .catch(error => {
            console.error("Error fetching hierarchical dropdown data:", error);
            return null;
        });
  }
  
  /**
  * Populates the Intervention dropdown based on filters.
  * @param {string} selectedDepartment
  * @param {string} selectedSite
  * @param {string} selectedHospitalId // ADDED
  * @param {string} selectedHospitalName // ADDED
  */
  function populateInterventionDropdown(selectedDepartment = '', selectedSite = '', selectedHospitalId = '', selectedHospitalName = '') { // ADDED params
    const interventionDropdown = document.getElementById("interventionDropdown");
     if (!interventionDropdown) {
         console.warn("No interventionDropdown element found!");
         return Promise.resolve(null);
     }
    const currentIntervention = interventionDropdown.value; // Save current
  
  
    const params = new URLSearchParams();
    if (selectedDepartment) params.append('department', selectedDepartment);
    if (selectedSite) params.append('siteName', selectedSite);
    // ADDED params to API call
    if (selectedHospitalId && selectedHospitalId !== 'all') params.append('hospitalId', selectedHospitalId);
    if (selectedHospitalName && selectedHospitalName !== 'all') params.append('hospitalName', selectedHospitalName);
  
    const queryString = params.toString();
    let url = `${basePath}/api/get-intervention-options${queryString ? `?${queryString}` : ''}`;
  
  
    return fetch(url)
        .then(response => response.json())
        .then(interventions => {
            interventionDropdown.innerHTML = ''; // Clear existing
  
            const allOption = document.createElement("option");
            allOption.value = "all";
            allOption.text = "All Interventions";
            interventionDropdown.appendChild(allOption);
  
            interventions.forEach(interv => {
                if (interv) { // Ensure intervention is not null/empty
                    const option = document.createElement("option");
                    option.value = interv;
                    option.text = interv;
                    interventionDropdown.appendChild(option);
                }
            });
  
             // Try to restore previous selection, otherwise default to "all"
             if (Array.from(interventionDropdown.options).some(opt => opt.value === currentIntervention)) {
                 interventionDropdown.value = currentIntervention;
             } else {
                 interventionDropdown.value = "all";
             }
            interventionDropdown.disabled = false;
            console.log("Intervention dropdown populated. Selected:", interventionDropdown.value);
            return interventions;
        })
        .catch(error => {
            console.error("Error fetching intervention options:", error);
            interventionDropdown.value = "all"; // Fallback
             interventionDropdown.disabled = true;
            return null;
        });
  }
  
  
  // Removed populateSiteNameDropdown and populateDepartmentDropdown as they are set by EJS
  
  
  /**
  * Updates Instrument dropdown based on selected diagnosis.
  * @param {Array} data - Hierarchical data.
  * @param {string} selectedDiagnosis - Value from diagnosis dropdown.
  * @param {string} [preferredInstrument='all'] - Attempt to restore this value if possible.
  */
  function updateInstrumentDropdown(data, selectedDiagnosis, preferredInstrument = 'all') { // Added preferredInstrument
    const instrumentDropdown = document.getElementById("instrumentDropdown");
    const scaleDropdown = document.getElementById("scaleDropdown");
  
    instrumentDropdown.innerHTML = '';
    scaleDropdown.innerHTML = ''; // Also clear scale when instrument changes
  
    const allInstrumentsOption = document.createElement("option");
    allInstrumentsOption.value = "all";
    allInstrumentsOption.text = "All Instruments";
    instrumentDropdown.appendChild(allInstrumentsOption);
  
    const instrumentsSet = new Set();
  
    if (selectedDiagnosis === 'all') {
        data.forEach(item => {
            item.promsInstruments.forEach(instObj => {
                if (instObj.promsInstrument) instrumentsSet.add(instObj.promsInstrument);
            });
        });
    } else {
        const selectedData = data.find(item => {
            if (selectedDiagnosis === 'null') return item.diagnosisICD10 == null || item.diagnosisICD10 === 'null';
            return item.diagnosisICD10 === selectedDiagnosis;
        });
        if (selectedData) {
            selectedData.promsInstruments.forEach(instObj => {
                if (instObj.promsInstrument) instrumentsSet.add(instObj.promsInstrument);
            });
        } else {
            console.warn("No instruments found for diagnosis:", selectedDiagnosis);
        }
    }
  
    instrumentsSet.forEach(instrumentName => {
        const option = document.createElement("option");
        option.value = instrumentName;
        option.text = instrumentName;
        instrumentDropdown.appendChild(option);
    });
  
    // Try to restore preferred selection, otherwise default to "all"
    if (instrumentsSet.has(preferredInstrument)) {
         instrumentDropdown.value = preferredInstrument;
     } else {
         instrumentDropdown.value = "all";
     }
    instrumentDropdown.disabled = false;
    console.log('Instrument dropdown updated. Selected:', instrumentDropdown.value);
    return instrumentDropdown.value; // Return the actual selected value
  }
  
  /**
  * Updates Scale dropdown based on selected diagnosis and instrument.
  * @param {Array} data - Hierarchical data.
  * @param {string} selectedDiagnosis - Value from diagnosis dropdown.
  * @param {string} selectedInstrument - Value from instrument dropdown.
  * @param {string} [preferredScale='all'] - Attempt to restore this value if possible.
  */
  function updateScaleDropdown(data, selectedDiagnosis, selectedInstrument, preferredScale = 'all') { // Added preferredScale
    const scaleDropdown = document.getElementById("scaleDropdown");
    scaleDropdown.innerHTML = '';
  
    const allScalesOption = document.createElement("option");
    allScalesOption.value = "all";
    allScalesOption.text = "All Scales";
    scaleDropdown.appendChild(allScalesOption);
  
    const scalesSet = new Set();
  
    if (selectedInstrument === 'all') {
        if (selectedDiagnosis === 'all') {
            data.forEach(item => item.promsInstruments.forEach(inst => inst.scales.forEach(s => scalesSet.add(s))));
        } else {
            const diagData = data.find(item => selectedDiagnosis === 'null' ? (item.diagnosisICD10 == null || item.diagnosisICD10 === 'null') : item.diagnosisICD10 === selectedDiagnosis);
            diagData?.promsInstruments.forEach(inst => inst.scales.forEach(s => scalesSet.add(s)));
        }
    } else {
        if (selectedDiagnosis === 'all') {
            data.forEach(item => {
                const instData = item.promsInstruments.find(inst => inst.promsInstrument === selectedInstrument);
                instData?.scales.forEach(s => scalesSet.add(s));
            });
        } else {
            const diagData = data.find(item => selectedDiagnosis === 'null' ? (item.diagnosisICD10 == null || item.diagnosisICD10 === 'null') : item.diagnosisICD10 === selectedDiagnosis);
            const instData = diagData?.promsInstruments.find(inst => inst.promsInstrument === selectedInstrument);
            instData?.scales.forEach(s => scalesSet.add(s));
        }
    }
  
    if (scalesSet.size === 0) {
        console.warn("No scales found for diagnosis:", selectedDiagnosis, "and instrument:", selectedInstrument);
    }
  
    scalesSet.forEach(scaleName => {
        const option = document.createElement("option");
        option.value = scaleName;
        option.text = scaleName;
        scaleDropdown.appendChild(option);
    });
  
     // Try to restore preferred selection, otherwise default to "all"
    if (scalesSet.has(preferredScale)) {
         scaleDropdown.value = preferredScale;
     } else {
         scaleDropdown.value = "all";
     }
    scaleDropdown.disabled = false;
    console.log('Scale dropdown updated. Selected:', scaleDropdown.value);
    return scaleDropdown.value; // Return the actual selected value
  }
  
  
  /**
  * Populates the Doctor ID dropdown based on filters.
  * @param {string} selectedSite
  * @param {string} selectedDepartment
  * @param {string} selectedHospitalId // ADDED
  * @param {string} selectedHospitalName // ADDED
  */
  // function populateDoctorIdDropdown(selectedSite = '', selectedDepartment = '', selectedHospitalId = '', selectedHospitalName = '') { // ADDED params
  //   const doctorIdDropdown = document.getElementById("doctorIdDropdown");
  //    if (!doctorIdDropdown) {
  //        console.warn("No doctorIdDropdown element found!");
  //        return Promise.resolve(null);
  //    }
  //   const currentDoctorId = doctorIdDropdown.value; // Save current
  
  
  //   const params = new URLSearchParams();
  //   if (selectedSite) params.append('siteName', selectedSite);
  //   if (selectedDepartment) params.append('department', selectedDepartment);
  //   // ADDED params to API call
  //   if (selectedHospitalId && selectedHospitalId !== 'all') params.append('hospitalId', selectedHospitalId);
  //   if (selectedHospitalName && selectedHospitalName !== 'all') params.append('hospitalName', selectedHospitalName);
  
  //   const queryString = params.toString();
  //   let url = `${basePath}/api/get-doctorid-options${queryString ? `?${queryString}` : ''}`;
  
  //   return fetch(url)
  //       .then(response => response.json())
  //       .then(doctorIds => {
  //           doctorIdDropdown.innerHTML = ''; // Clear existing
  
  //           const allOption = document.createElement("option");
  //           allOption.value = "all";
  //           allOption.text = "All Doctors"; // Or just "All"
  //           doctorIdDropdown.appendChild(allOption);
  
  //           doctorIds.forEach(docId => {
  //               if (docId) { // Ensure docId is not null/empty
  //                   const option = document.createElement("option");
  //                   option.value = docId;
  //                   option.text = docId;
  //                   doctorIdDropdown.appendChild(option);
  //               }
  //           });
  
  //           // Try to restore previous selection OR defaultDoctorId, else 'all'
  //            if (doctorIds.includes(currentDoctorId)) {
  //                doctorIdDropdown.value = currentDoctorId;
  //            } else if (doctorIds.includes(defaultDoctorId)) { // Check global default
  //                doctorIdDropdown.value = defaultDoctorId;
  //            } else {
  //                doctorIdDropdown.value = "all";
  //            }
  
  //           doctorIdDropdown.disabled = false;
  //           console.log("Doctor ID dropdown populated. Selected:", doctorIdDropdown.value);
  //           return doctorIds;
  //       })
  //       .catch(error => {
  //           console.error("Error fetching doctor ID options:", error);
  //           doctorIdDropdown.value = "all"; // Fallback
  //            doctorIdDropdown.disabled = true;
  //           return null;
  //       });
  // }
  
  
  /**
   * Populates the Doctor ID dropdown with only 'All Doctors' and the logged-in doctor's ID.
   * Relies on the global `defaultDoctorId` variable set by EJS.
   */
  // Removed parameters: selectedSite, selectedDepartment, selectedHospitalId, selectedHospitalName
  function populateDoctorIdDropdown() {
      const doctorIdDropdown = document.getElementById("doctorIdDropdown");
      if (!doctorIdDropdown) {
          console.warn("No doctorIdDropdown element found!");
          return Promise.resolve(null); // Return a resolved promise for consistency
      }
  
      // --- START OF MODIFICATIONS ---
  
      // Clear existing options
      doctorIdDropdown.innerHTML = '';
  
      // 1. Add "All Doctors" option
      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.text = "All Doctors";
      doctorIdDropdown.appendChild(allOption);
  
      // 2. Add the logged-in doctor's option if defaultDoctorId is available
      // Ensure defaultDoctorId is defined and not empty in your EJS template/global scope
      if (typeof defaultDoctorId !== 'undefined' && defaultDoctorId) {
          const selfOption = document.createElement("option");
          selfOption.value = defaultDoctorId;
          selfOption.text = defaultDoctorId; // Display the doctor's ID
          doctorIdDropdown.appendChild(selfOption);
  
          // Set the logged-in doctor as the default selection
          doctorIdDropdown.value = defaultDoctorId;
      } else {
          // If defaultDoctorId isn't set, default to "All Doctors"
          doctorIdDropdown.value = "all";
          console.warn("defaultDoctorId is not defined or empty. Defaulting Doctor ID dropdown to 'all'.");
      }
  
      doctorIdDropdown.disabled = false; // Ensure dropdown is enabled
      console.log("Doctor ID dropdown populated. Selected:", doctorIdDropdown.value);
  
      // Return a resolved promise as the operation is now synchronous
      return Promise.resolve(doctorIdDropdown.value);
  
      // --- END OF MODIFICATIONS ---
  
      /* --- REMOVED ORIGINAL FETCH LOGIC ---
      const currentDoctorId = doctorIdDropdown.value; // Save current
  
      const params = new URLSearchParams();
      if (selectedSite) params.append('siteName', selectedSite);
      if (selectedDepartment) params.append('department', selectedDepartment);
      // ADDED params to API call
      if (selectedHospitalId && selectedHospitalId !== 'all') params.append('hospitalId', selectedHospitalId);
      if (selectedHospitalName && selectedHospitalName !== 'all') params.append('hospitalName', selectedHospitalName);
  
      const queryString = params.toString();
      let url = `${basePath}/api/get-doctorid-options${queryString ? `?${queryString}` : ''}`;
  
      return fetch(url)
          .then(response => response.json())
          .then(doctorIds => {
              doctorIdDropdown.innerHTML = ''; // Clear existing
  
              const allOption = document.createElement("option");
              allOption.value = "all";
              allOption.text = "All Doctors"; // Or just "All"
              doctorIdDropdown.appendChild(allOption);
  
              doctorIds.forEach(docId => {
                  if (docId) { // Ensure docId is not null/empty
                      const option = document.createElement("option");
                      option.value = docId;
                      option.text = docId;
                      doctorIdDropdown.appendChild(option);
                  }
              });
  
              // Try to restore previous selection OR defaultDoctorId, else 'all'
               if (doctorIds.includes(currentDoctorId)) {
                   doctorIdDropdown.value = currentDoctorId;
               } else if (doctorIds.includes(defaultDoctorId)) { // Check global default
                   doctorIdDropdown.value = defaultDoctorId;
               } else {
                   doctorIdDropdown.value = "all";
               }
  
              doctorIdDropdown.disabled = false;
              console.log("Doctor ID dropdown populated. Selected:", doctorIdDropdown.value);
              return doctorIds;
          })
          .catch(error => {
              console.error("Error fetching doctor ID options:", error);
              doctorIdDropdown.value = "all"; // Fallback
               doctorIdDropdown.disabled = true;
              return null;
          });
      --- END REMOVED ORIGINAL FETCH LOGIC --- */
  }
  
  
  /**
  * Triggers updates for all charts based on current filter selections.
  */
  // function filterDashboard() {
  //   // Read values from ALL relevant dropdowns
  //   const siteName = document.getElementById("siteNameDropdown").value;
  //   const department = document.getElementById("departmentDropdown").value;
  //   const hospitalId = document.getElementById("hospitalIdDropdown").value;
  //   const hospitalName = document.getElementById("hospitalNameDropdown").value;
  //   const doctorId = document.getElementById("doctorIdDropdown").value;
  //   const intervention = document.getElementById("interventionDropdown").value;
  //   const diagnosis = document.getElementById("diagnosisDropdown").value;
  //   const instrument = document.getElementById("instrumentDropdown").value;
  //   const scale = document.getElementById("scaleDropdown").value;
  
  //   console.log("Filtering dashboard with:", {
  //       hospitalId, hospitalName, siteName, department, doctorId, intervention, diagnosis, instrument, scale
  //   });
  
  //   // Call the fetch functions for each chart, passing all necessary filter values
  //   // Ensure these functions are defined in their respective chart JS files and accept these arguments
  //   if (typeof fetchMeanScoreData === 'function') {
  //       fetchMeanScoreData(diagnosis, instrument, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName);
  //   }
  //   if (typeof fetchScatterPlotData === 'function') {
  //       fetchScatterPlotData(diagnosis, instrument, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName);
  //   }
  //   if (typeof fetchHeatmapData === 'function') {
  //       fetchHeatmapData(diagnosis, instrument, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName);
  //   }
  //   if (typeof fetchMCIDData === 'function') {
  //       fetchMCIDData(diagnosis, instrument, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName);
  //   }
  //   // Add calls for combinedChart, numberCards if they need to be filtered dynamically
  //   if (typeof fetchCombinedChartData === 'function') { // Assuming combinedChart.js has a fetch function
  //        const combinedSurveyType = document.getElementById("combinedSurveyTypeDropdown")?.value || 'All';
  //        fetchCombinedChartData(department, siteName, combinedSurveyType, doctorId, hospitalId, hospitalName);
  //    }
  //    if (typeof fetchNumberCardData === 'function') { // Assuming numberCard*.js have a combined fetch or individual ones
  //        fetchNumberCardData(department, siteName, doctorId, hospitalId, hospitalName);
  //    }
  // }
  
  
  /**
  * Triggers updates for all charts based on current filter selections.
  */
  function filterDashboard() {
      // --- NEW: Check if doctor initially had no data ---
      if (typeof doctorHasData !== 'undefined' && !doctorHasData) {
          console.log("Filtering skipped: Doctor has no data.");
          return; // Exit the function, don't fetch chart data
      }
      // --- End Check ---
  
      // Read values from ALL relevant dropdowns
      const siteName = document.getElementById("siteNameDropdown").value;
      const department = document.getElementById("departmentDropdown").value;
      const hospitalId = document.getElementById("hospitalIdDropdown").value;
      const hospitalName = document.getElementById("hospitalNameDropdown").value;
      const doctorId = document.getElementById("doctorIdDropdown").value;
      const intervention = document.getElementById("interventionDropdown").value;
      const diagnosis = document.getElementById("diagnosisDropdown").value;
      const instrument = document.getElementById("instrumentDropdown").value;
      const scale = document.getElementById("scaleDropdown").value;
  
      console.log("Filtering dashboard with:", {
          hospitalId, hospitalName, siteName, department, doctorId, intervention, diagnosis, instrument, scale
      });
  
      // Call the fetch functions for each chart
      // These will only be called now if doctorHasData is true
      if (typeof fetchMeanScoreData === 'function') {
          fetchMeanScoreData(diagnosis, instrument, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName);
      }
      if (typeof fetchScatterPlotData === 'function') {
          fetchScatterPlotData(diagnosis, instrument, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName);
      }
      if (typeof fetchHeatmapData === 'function') {
          fetchHeatmapData(diagnosis, instrument, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName);
      }
      if (typeof fetchMCIDData === 'function') {
          fetchMCIDData(diagnosis, instrument, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName);
      }
      // Add calls for combinedChart, numberCards IF they need to be filtered dynamically beyond the initial load
      if (typeof fetchCombinedChartData === 'function') {
          const combinedSurveyType = document.getElementById("combinedSurveyTypeDropdown")?.value || 'All';
          fetchCombinedChartData(department, siteName, combinedSurveyType, doctorId, hospitalId, hospitalName);
      }
      if (typeof fetchNumberCardData === 'function') { // Fetch number cards on filter change? Check if needed.
          fetchNumberCardData(department, siteName, doctorId, hospitalId, hospitalName);
      }
  }
  
  // --- Initialization and Event Listeners ---
  // document.addEventListener("DOMContentLoaded", () => {
  //   let hierarchicalData = [];
  
  //   // 1) Get references to all dropdowns
  //   const siteNameDropdown = document.getElementById("siteNameDropdown");
  //   const departmentDropdown = document.getElementById("departmentDropdown");
  //   const hospitalIdDropdown = document.getElementById("hospitalIdDropdown");
  //   const hospitalNameDropdown = document.getElementById("hospitalNameDropdown");
  //   const doctorIdDropdown = document.getElementById("doctorIdDropdown");
  //   const interventionDropdown = document.getElementById("interventionDropdown");
  //   const diagnosisDropdown = document.getElementById("diagnosisDropdown");
  //   const instrumentDropdown = document.getElementById("instrumentDropdown");
  //   const scaleDropdown = document.getElementById("scaleDropdown");
  
  //   // 2) Read initial values (set by EJS or globally)
  //   const initialSiteName = siteNameDropdown.value.trim();
  //   const initialDeptName = departmentDropdown.value.trim();
  //   // Use global JS variables set in EJS for initial hospital/doctor info
  //   const initialHospitalId = typeof defaultHospitalId !== 'undefined' ? defaultHospitalId : '';
  //   const initialHospitalName = typeof defaultHospitalName !== 'undefined' ? defaultHospitalName : '';
  //   const initialDoctorId = typeof defaultDoctorId !== 'undefined' ? defaultDoctorId : ''; // Already exists
  
  //   console.log("Initial Values:", { initialSiteName, initialDeptName, initialHospitalId, initialHospitalName, initialDoctorId });
  
  
  //   // 3) Populate Dropdowns Sequentially (handling dependencies)
  //   populateHospitalIdDropdown() // Populates and sets defaultHospitalId
  //     .then(selectedHospitalId => populateHospitalNameDropdown(selectedHospitalId)) // Populates based on ID, sets defaultHospitalName
  //     .then(() => populateDoctorIdDropdown(initialSiteName, initialDeptName, hospitalIdDropdown.value, hospitalNameDropdown.value)) // Use current dropdown values
  //     .then(() => populateInterventionDropdown(initialDeptName, initialSiteName, hospitalIdDropdown.value, hospitalNameDropdown.value)) // Use current dropdown values
  //     .then(() => populateHierarchicalDropdowns(initialSiteName, initialDeptName, hospitalIdDropdown.value, hospitalNameDropdown.value)) // Use current dropdown values
  //     .then(initialState => {
  //         if (initialState && initialState.data) {
  //           hierarchicalData = initialState.data;
  //         }
  //         console.log("Initial dropdown population complete.");
  
  //         // Initial filter trigger after everything is populated (optional, if charts don't fetch on their own init)
  //         // filterDashboard();
  
  //         // 4) Set up Event Listeners
  
  //         // Hospital ID change
  //         hospitalIdDropdown.addEventListener("change", event => {
  //             const selectedHospitalId = event.target.value;
  //             console.log("Hospital ID changed:", selectedHospitalId);
  //             // Repopulate dependent dropdowns
  //             populateHospitalNameDropdown(selectedHospitalId)
  //                .then(() => populateDoctorIdDropdown(initialSiteName, initialDeptName, selectedHospitalId, hospitalNameDropdown.value))
  //                .then(() => populateInterventionDropdown(initialDeptName, initialSiteName, selectedHospitalId, hospitalNameDropdown.value))
  //                .then(() => populateHierarchicalDropdowns(initialSiteName, initialDeptName, selectedHospitalId, hospitalNameDropdown.value))
  //                .then(newState => {
  //                     if (newState && newState.data) hierarchicalData = newState.data;
  //                     filterDashboard(); // Trigger chart updates
  //                 });
  //         });
  
  //         // Hospital Name change
  //         hospitalNameDropdown.addEventListener("change", event => {
  //             const selectedHospitalName = event.target.value;
  //             const selectedHospitalId = hospitalIdDropdown.value; // Use the currently selected ID
  //             console.log("Hospital Name changed:", selectedHospitalName);
  //              // Repopulate dependent dropdowns (excluding Hospital ID unless there's a strict mapping)
  //             populateDoctorIdDropdown(initialSiteName, initialDeptName, selectedHospitalId, selectedHospitalName)
  //                .then(() => populateInterventionDropdown(initialDeptName, initialSiteName, selectedHospitalId, selectedHospitalName))
  //                .then(() => populateHierarchicalDropdowns(initialSiteName, initialDeptName, selectedHospitalId, selectedHospitalName))
  //                .then(newState => {
  //                     if (newState && newState.data) hierarchicalData = newState.data;
  //                     filterDashboard(); // Trigger chart updates
  //                 });
  //         });
  
  
  //         // SiteName dropdown change (ONLY if it's made interactive later)
  //         // siteNameDropdown.addEventListener("change", event => { ... });
  
  //         // Department dropdown change (ONLY if it's made interactive later)
  //         // departmentDropdown.addEventListener("change", event => { ... });
  
  //         // Doctor ID dropdown change
  //         doctorIdDropdown.addEventListener("change", () => {
  //           console.log("Doctor ID changed to:", doctorIdDropdown.value);
  //           // Only need to update charts, as other filters aren't dependent on doctor selection in this direction
  //            filterDashboard();
  //         });
  
  //         // Intervention dropdown change
  //         interventionDropdown.addEventListener("change", () => {
  //           console.log("Intervention changed to:", interventionDropdown.value);
  //            // Only need to update charts
  //            filterDashboard();
  //         });
  
  //         // Diagnosis dropdown change
  //         diagnosisDropdown.addEventListener("change", event => {
  //           const selectedDiagnosis = event.target.value;
  //            console.log("Diagnosis changed to:", selectedDiagnosis);
  //           const currentInstrument = instrumentDropdown.value; // Get current before update
  //            const currentScale = scaleDropdown.value; // Get current before update
  //           const selectedInstrument = updateInstrumentDropdown(hierarchicalData, selectedDiagnosis, currentInstrument);
  //           updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument, currentScale);
  //           filterDashboard(); // Update charts
  //         });
  
  //         // Instrument dropdown change
  //         instrumentDropdown.addEventListener("change", event => {
  //           const selectedInstrument = event.target.value;
  //            const selectedDiagnosis = diagnosisDropdown.value;
  //            const currentScale = scaleDropdown.value; // Get current before update
  //            console.log("Instrument changed to:", selectedInstrument);
  //           updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument, currentScale);
  //           filterDashboard(); // Update charts
  //         });
  
  //         // Scale dropdown change
  //         scaleDropdown.addEventListener("change", event => {
  //            console.log("Scale changed to:", event.target.value);
  //           filterDashboard(); // Update charts
  //         });
  
  //         // Combined Chart Survey Type change listener (if needed)
  //         const combinedSurveyTypeDropdown = document.getElementById("combinedSurveyTypeDropdown");
  //         if (combinedSurveyTypeDropdown && typeof fetchCombinedChartData === 'function') {
  //             combinedSurveyTypeDropdown.addEventListener('change', () => {
  //                console.log("Combined chart survey type changed");
  //                filterDashboard(); // Or call a specific update function for the combined chart
  //             });
  //         }
  
  //     }).catch(error => {
  //         console.error("Error during initial dropdown population sequence:", error);
  //     }); // End of promise chain for initial population
  // }); // End DOMContentLoaded
  
  
  
  document.addEventListener("DOMContentLoaded", () => {
      let hierarchicalData = [];
  
      // 1) Get references to all dropdowns
      const siteNameDropdown = document.getElementById("siteNameDropdown");
      const departmentDropdown = document.getElementById("departmentDropdown");
      const hospitalIdDropdown = document.getElementById("hospitalIdDropdown");
      const hospitalNameDropdown = document.getElementById("hospitalNameDropdown");
      const doctorIdDropdown = document.getElementById("doctorIdDropdown");
      const interventionDropdown = document.getElementById("interventionDropdown");
      const diagnosisDropdown = document.getElementById("diagnosisDropdown");
      const instrumentDropdown = document.getElementById("instrumentDropdown");
      const scaleDropdown = document.getElementById("scaleDropdown");
  
      // 2) Read initial values (set by EJS or globally)
      const initialSiteName = siteNameDropdown.value.trim();
      const initialDeptName = departmentDropdown.value.trim();
      const initialHospitalId = typeof defaultHospitalId !== 'undefined' ? defaultHospitalId : '';
      const initialHospitalName = typeof defaultHospitalName !== 'undefined' ? defaultHospitalName : '';
      const initialDoctorId = typeof defaultDoctorId !== 'undefined' ? defaultDoctorId : ''; // Still potentially useful for logging
  
      // Use defaultDoctorId here as it's the key variable for the doctor dropdown
      console.log("Initial Values:", { initialSiteName, initialDeptName, initialHospitalId, initialHospitalName, defaultDoctorId });
  
  
      // 3) Populate Dropdowns Sequentially (handling dependencies)
      populateHospitalIdDropdown()
          .then(selectedHospitalId => populateHospitalNameDropdown(selectedHospitalId))
          // --- MODIFIED CALL: Removed arguments ---
          .then(() => populateDoctorIdDropdown())
          // --- END MODIFIED CALL ---
          .then(() => populateInterventionDropdown(initialDeptName, initialSiteName, hospitalIdDropdown.value, hospitalNameDropdown.value))
          .then(() => populateHierarchicalDropdowns(initialSiteName, initialDeptName, hospitalIdDropdown.value, hospitalNameDropdown.value))
          .then(initialState => {
              if (initialState && initialState.data) {
                  hierarchicalData = initialState.data;
              }
              console.log("Initial dropdown population complete.");
  
              // Optional: Trigger initial chart rendering/filtering if needed now
              // filterDashboard();
  
              // 4) Set up Event Listeners
  
              // Hospital ID change
              hospitalIdDropdown.addEventListener("change", event => {
                  const selectedHospitalId = event.target.value;
                  console.log("Hospital ID changed:", selectedHospitalId);
                  // Repopulate dependent dropdowns
                  populateHospitalNameDropdown(selectedHospitalId)
                      // --- MODIFIED CALL: Removed arguments ---
                      .then(() => populateDoctorIdDropdown())
                      // --- END MODIFIED CALL ---
                      .then(() => populateInterventionDropdown(initialDeptName, initialSiteName, selectedHospitalId, hospitalNameDropdown.value))
                      .then(() => populateHierarchicalDropdowns(initialSiteName, initialDeptName, selectedHospitalId, hospitalNameDropdown.value))
                      .then(newState => {
                          if (newState && newState.data) hierarchicalData = newState.data;
                          filterDashboard(); // Trigger chart updates
                      });
              });
  
              // Hospital Name change
              hospitalNameDropdown.addEventListener("change", event => {
                  const selectedHospitalName = event.target.value;
                  const selectedHospitalId = hospitalIdDropdown.value; // Use the currently selected ID
                  console.log("Hospital Name changed:", selectedHospitalName);
                  // Repopulate dependent dropdowns
                  // --- MODIFIED CALL: Removed arguments ---
                  populateDoctorIdDropdown()
                  // --- END MODIFIED CALL ---
                      .then(() => populateInterventionDropdown(initialDeptName, initialSiteName, selectedHospitalId, selectedHospitalName))
                      .then(() => populateHierarchicalDropdowns(initialSiteName, initialDeptName, selectedHospitalId, selectedHospitalName))
                      .then(newState => {
                          if (newState && newState.data) hierarchicalData = newState.data;
                          filterDashboard(); // Trigger chart updates
                      });
              });
  
  
              // SiteName dropdown change (ONLY if it's made interactive later)
              // siteNameDropdown.addEventListener("change", event => {
              //    // If site/dept changes affect doctors (they shouldn't with the new logic)
              //    // you might need to repopulate here, but likely just filtering is needed.
              //    populateDoctorIdDropdown()
              //      .then(...) // Repopulate other dependent dropdowns
              //      .then(() => filterDashboard());
              // });
  
              // Department dropdown change (ONLY if it's made interactive later)
              // departmentDropdown.addEventListener("change", event => {
              //    populateDoctorIdDropdown()
              //      .then(...) // Repopulate other dependent dropdowns
              //      .then(() => filterDashboard());
              // });
  
              // Doctor ID dropdown change
              doctorIdDropdown.addEventListener("change", () => {
                  console.log("Doctor ID changed to:", doctorIdDropdown.value);
                  // Only need to update charts, as other filters aren't dependent on doctor selection
                  filterDashboard();
              });
  
              // Intervention dropdown change
              interventionDropdown.addEventListener("change", () => {
                  console.log("Intervention changed to:", interventionDropdown.value);
                  // Only need to update charts
                  filterDashboard();
              });
  
              // Diagnosis dropdown change
              diagnosisDropdown.addEventListener("change", event => {
                  const selectedDiagnosis = event.target.value;
                  console.log("Diagnosis changed to:", selectedDiagnosis);
                  const currentInstrument = instrumentDropdown.value;
                  const currentScale = scaleDropdown.value;
                  const selectedInstrument = updateInstrumentDropdown(hierarchicalData, selectedDiagnosis, currentInstrument);
                  updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument, currentScale);
                  filterDashboard(); // Update charts
              });
  
              // Instrument dropdown change
              instrumentDropdown.addEventListener("change", event => {
                  const selectedInstrument = event.target.value;
                  const selectedDiagnosis = diagnosisDropdown.value;
                  const currentScale = scaleDropdown.value;
                  console.log("Instrument changed to:", selectedInstrument);
                  updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument, currentScale);
                  filterDashboard(); // Update charts
              });
  
              // Scale dropdown change
              scaleDropdown.addEventListener("change", event => {
                  console.log("Scale changed to:", event.target.value);
                  filterDashboard(); // Update charts
              });
  
              // Combined Chart Survey Type change listener (if needed)
              const combinedSurveyTypeDropdown = document.getElementById("combinedSurveyTypeDropdown");
              if (combinedSurveyTypeDropdown && typeof fetchCombinedChartData === 'function') {
                  combinedSurveyTypeDropdown.addEventListener('change', () => {
                      console.log("Combined chart survey type changed");
                      filterDashboard(); // Or call a specific update function for the combined chart
                  });
              }
  
          }).catch(error => {
              console.error("Error during initial dropdown population sequence:", error);
          }); // End of promise chain for initial population
  }); // End DOMContentLoaded