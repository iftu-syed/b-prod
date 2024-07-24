// var Server = "https://www.assessmentcenter.net/ac_api/2014-01/Forms";
// var CORS_PROXY = "http://localhost:8081/";
// var globalAssessmentID = ""; // Global variable to store the assessment ID
// var ItemResponseOID = "";    // Global variable to store the item response ID
// var Response = "";           // Global variable to store the response value

// // Predefined values
// var predefinedRegistration = "B1138D93-56C0-4F91-A00F-B9EA28743028";
// var predefinedToken = "F1EC46FD-7E7F-474B-868E-63EEF61C9104";
// var predefinedFormOID = "572240E6-AA7D-4F45-BC20-E95422EBDB94";

// function listForms() {
//     $.ajax({
//         url: Server + "/.json",
//         cache: false,
//         type: "POST",
//         data: "",
//         dataType: "json",

//         beforeSend: function (xhr) {
//             var combinedString = predefinedRegistration + ":" + predefinedToken;
//             var base64 = btoa(combinedString); // Use btoa to encode to base64
//             xhr.setRequestHeader("Authorization", "Basic " + base64);
//         },

//         success: function (data) {
//             var container = document.getElementById("Content");
//             var forms = data.Form;
//             for (var i = 0; i < forms.length; i++) {
//                 var myform = document.createElement("div");
//                 myform.innerHTML = forms[i].OID + " : " + forms[i].Name;
//                 container.appendChild(myform);
//             }
//         },

//         error: function (jqXHR, textStatus, errorThrown) {
//             document.write(jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
//         }
//     });
// }

// function formDetails() {
//     $.ajax({
//         url: CORS_PROXY + Server + "/" + predefinedFormOID,
//         cache: false,
//         type: "GET",
//         dataType: "html",

//         beforeSend: function (xhr) {
//             var combinedString = predefinedRegistration + ":" + predefinedToken;
//             var base64 = btoa(combinedString);
//             xhr.setRequestHeader("Authorization", "Basic " + base64);
//         },

//         success: function (data) {
//             var container = document.getElementById("Content");
//             container.innerHTML = data; // Display the HTML content directly
//         },

//         error: function (jqXHR, textStatus, errorThrown) {
//             alert(jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
//         }
//     });
// }

// function startAssessment() {
//     var uid = document.getElementById("UID").value;
//     $.ajax({
//         url: CORS_PROXY + "https://www.assessmentcenter.net/ac_api/2014-01/Assessments/" + predefinedFormOID + ".json",
//         cache: false,
//         type: "POST",
//         data: JSON.stringify({ UID: uid }),
//         dataType: "json",
//         contentType: "application/json",

//         beforeSend: function (xhr) {
//             var combinedString = predefinedRegistration + ":" + predefinedToken;
//             var base64 = btoa(combinedString);
//             xhr.setRequestHeader("Authorization", "Basic " + base64);
//         },

//         success: function (data) {
//             console.log("Response Data: ", data); // Log the response to understand its structure
//             var container = document.getElementById("Content");
//             container.innerHTML = ""; // Clear previous content

//             globalAssessmentID = data.OID || data.AssessmentID || "Not provided"; // Store assessment ID globally
//             var userID = data.UID || uid; // Use a fallback if UID is not present
//             var expiration = data.Expiration || "Not provided"; // Use a fallback if Expiration is not present

//             // Create and append Assessment ID
//             var assessmentIDElement = document.createElement("p");
//             assessmentIDElement.innerHTML = "<strong>AssessmentID:</strong> " + globalAssessmentID;
//             container.appendChild(assessmentIDElement);

//             // Create and append User-defined ID
//             var userIDElement = document.createElement("p");
//             userIDElement.innerHTML = "<strong>User-defined ID:</strong> " + userID;
//             container.appendChild(userIDElement);

//             // Create and append Expiration
//             var expirationElement = document.createElement("p");
//             expirationElement.id = "expirationDate";
//             expirationElement.innerHTML = "<strong>Expiration:</strong> " + expiration;
//             container.appendChild(expirationElement);

//             // Get the first question
//             getAssessmentQuestion();
//         },

//         error: function (jqXHR, textStatus, errorThrown) {
//             console.error("Error response: ", jqXHR.responseText);
//             alert(jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
//         }
//     });
// }

// function getAssessmentQuestion() {
//     $.ajax({
//         url: CORS_PROXY + "https://www.assessmentcenter.net/ac_api/2014-01/Participants/" + globalAssessmentID + ".json",
//         cache: false,
//         type: "GET",
//         dataType: "json",

//         beforeSend: function (xhr) {
//             var combinedString = predefinedRegistration + ":" + predefinedToken;
//             var base64 = btoa(combinedString);
//             xhr.setRequestHeader("Authorization", "Basic " + base64);
//         },

//         success: function (data) {
//             console.log("Current Question Data: ", data); // Log the response to understand its structure

//             if (data.Items && data.Items.length > 0) {
//                 var elements = data.Items[0].Elements;
//                 if (elements && elements.length > 0) {
//                     console.log("Elements: ", elements); // Log elements to inspect them

//                     // Find the element with the Map property
//                     var elementWithMap = elements.find(el => el.Map && el.Map.length > 0);

//                     if (elementWithMap) {
//                         var question = elements[1].Description; // Assuming the question is in the second element
//                         var map = elementWithMap.Map;

//                         // Store the ItemResponseOID and Response globally
//                         ItemResponseOID = map[0].ItemResponseOID;
//                         Response = map[0].Value;

//                         renderScreen(question, map);
//                     } else {
//                         console.error("No map found in any element. Elements data: ", elements);
//                         alert("No map found in any element. Please check the console for more details.");
//                     }
//                 } else {
//                     console.error("No elements found in the first item. Items data: ", data.Items);
//                     alert("No elements found in the first item. Please check the console for more details.");
//                 }
//             } else {
//                 console.error("No items found in the response. Data: ", data);
//                 alert("No items found in the response. Please check the console for more details.");
//             }
//         },

//         error: function (jqXHR, textStatus, errorThrown) {
//             console.error("Error response: ", jqXHR.responseText);
//             alert(jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
//         }
//     });
// }

// function renderScreen(question, map) {
//     var container = document.getElementById("Content");
//     container.innerHTML = ""; // Clear previous content

//     // Display the question
//     var questionElement = document.createElement("p");
//     questionElement.classList.add("question");
//     questionElement.innerHTML = question;
//     container.appendChild(questionElement);

//     // Display the possible answers
//     var answersContainer = document.createElement("div");
//     answersContainer.classList.add("answers-container");

//     if (map && map.length > 0) {
//         for (var i = 0; i < map.length; i++) {
//             var answerElement = document.createElement("button");
//             answerElement.innerHTML = map[i].Description;
//             answerElement.classList.add("answer-button");
//             answerElement.setAttribute("data-item-response-oid", map[i].ItemResponseOID);
//             answerElement.setAttribute("data-response", map[i].Value);
//             answerElement.setAttribute("data-score", map[i].Score || 0); // Assume Score is part of map[i]
//             answerElement.onclick = function() {
//                 postAnswer(this.getAttribute("data-item-response-oid"), this.getAttribute("data-response"), parseInt(this.getAttribute("data-score")));
//             };
//             answersContainer.appendChild(answerElement);
//         }
//     } else {
//         var fallbackMessage = document.createElement("p");
//         fallbackMessage.innerHTML = "No answer options available.";
//         answersContainer.appendChild(fallbackMessage);
//     }

//     container.appendChild(answersContainer);
// }

// function postAnswer(itemResponseOID, response, score) {
//     var postedData = "ItemResponseOID=" + itemResponseOID + "&Response=" + response;

//     $.ajax({
//         url: CORS_PROXY + "https://www.assessmentcenter.net/ac_api/2014-01/Participants/" + globalAssessmentID + ".json",
//         cache: false,
//         type: "POST",
//         data: postedData,
//         dataType: "json",

//         beforeSend: function (xhr) {
//             var combinedString = predefinedRegistration + ":" + predefinedToken;
//             var base64 = btoa(combinedString);
//             xhr.setRequestHeader("Authorization", "Basic " + base64);
//         },

//         success: function (data) {
//             if (data.DateFinished != '') {
//                 displayFinalScore(globalAssessmentID);
//                 return;
//             }
//             getAssessmentQuestion();
//         },

//         error: function (jqXHR, textStatus, errorThrown) {
//             alert('postAnswer: ' + jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
//         }
//     });
// }

// function displayFinalScore(assessmentID) {
//     $.ajax({
//         url: CORS_PROXY + "https://www.assessmentcenter.net/ac_api/2014-01/Results/" + assessmentID + ".json",
//         cache: false,
//         type: "GET",
//         dataType: "json",

//         beforeSend: function (xhr) {
//             var combinedString = predefinedRegistration + ":" + predefinedToken;
//             var base64 = btoa(combinedString);
//             xhr.setRequestHeader("Authorization", "Basic " + base64);
//         },

//         success: function (data) {
//             var container = document.getElementById("Content");
//             container.innerHTML = ""; // Clear previous content

//             if (data.Error) {
//                 container.innerHTML = "Error: " + data.Error;
//                 return;
//             }

//             var tScore = (data.Theta * 10 + 50.0).toFixed(2);
//             var stdError = (data.StdError * 10).toFixed(2);

//             var scoreElement = document.createElement("p");
//             scoreElement.innerHTML = "Final Score: " + tScore + " (Standard Error: " + stdError + ")";
//             container.appendChild(scoreElement);

//             for (var i = 0; i < data.Items.length; i++) {
//                 var itemElement = document.createElement("div");
//                 itemElement.innerHTML = "ID: " + data.Items[i].ID + ", Position: " + data.Items[i].Position + ", Theta: " + data.Items[i].Theta + ", Error: " + data.Items[i].StdError;
//                 container.appendChild(itemElement);
//             }

//             // Store the score in MongoDB
//             storeScoreInMongoDB(data);
//         },

//         error: function (jqXHR, textStatus, errorThrown) {
//             alert('displayFinalScore: ' + jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
//         }
//     });
// }

// function storeScoreInMongoDB(data) {
//     var uid = document.getElementById("UID").value;
//     var assessmentID = globalAssessmentID;
//     var expirationElement = document.getElementById("expirationDate");
//     var expiration = expirationElement ? expirationElement.innerText.split(": ")[1] : "Not provided";

//     var scoreData = {
//         Mr_no: uid, // Use Mr_no from the UID field
//         formID: predefinedFormOID,
//         assessmentID: assessmentID,
//         expiration: expiration,
//         scoreDetails: data
//     };

//     $.ajax({
//         url: "/storeScore", // Express route to store data in MongoDB
//         type: "POST",
//         data: JSON.stringify(scoreData),
//         contentType: "application/json",
//         success: function (response) {
//             console.log("Score stored successfully: ", response);
//         },
//         error: function (jqXHR, textStatus, errorThrown) {
//             console.error('storeScoreInMongoDB: ' + jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
//         }
//     });
// }


var Server = "/proxy"; // Use proxy for API requests
var globalAssessmentID = ""; // Global variable to store the assessment ID
var ItemResponseOID = "";    // Global variable to store the item response ID
var Response = "";           // Global variable to store the response value

// Predefined values
var predefinedRegistration = "B1138D93-56C0-4F91-A00F-B9EA28743028";
var predefinedToken = "F1EC46FD-7E7F-474B-868E-63EEF61C9104";
var predefinedFormOID = "572240E6-AA7D-4F45-BC20-E95422EBDB94";

function listForms() {
    $.ajax({
        url: Server + "/ac_api/2014-01/Forms.json", // Ensure the URL path aligns with API documentation
        cache: false,
        type: "POST",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify({}), // Even if no data is needed, ensure content length is set
        beforeSend: function (xhr) {
            var combinedString = predefinedRegistration + ":" + predefinedToken;
            var base64 = btoa(combinedString);
            xhr.setRequestHeader("Authorization", "Basic " + base64);
        },
        success: function (data) {
            var container = document.getElementById("Content");
            container.innerHTML = ""; // Clear previous content
            if (data && data.Form) {
                data.Form.forEach(form => {
                    var formElement = document.createElement("div");
                    formElement.innerHTML = `${form.OID} : ${form.Name}`;
                    container.appendChild(formElement);
                });
            } else {
                container.innerHTML = "No forms available.";
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("Error response:", jqXHR.responseText, textStatus, errorThrown);
            alert(jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}

function formDetails() {
    $.ajax({
        url: Server + "/ac_api/2014-01/Forms/" + predefinedFormOID + ".json",
        cache: false,
        type: "GET",
        dataType: "html",
        beforeSend: function (xhr) {
            var combinedString = predefinedRegistration + ":" + predefinedToken;
            var base64 = btoa(combinedString);
            xhr.setRequestHeader("Authorization", "Basic " + base64);
        },
        success: function (data) {
            var container = document.getElementById("Content");
            container.innerHTML = data; // Display the HTML content directly
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("Error response:", jqXHR.responseText, textStatus, errorThrown);
            alert(jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}

function startAssessment() {
    var uid = document.getElementById("UID").value;
    $.ajax({
        url: Server + "/ac_api/2014-01/Assessments/" + predefinedFormOID + ".json",
        cache: false,
        type: "POST",
        data: JSON.stringify({ UID: uid }),
        dataType: "json",
        contentType: "application/json",
        beforeSend: function (xhr) {
            var combinedString = predefinedRegistration + ":" + predefinedToken;
            var base64 = btoa(combinedString);
            xhr.setRequestHeader("Authorization", "Basic " + base64);
        },
        success: function (data) {
            console.log("Response Data: ", data); // Log the response to understand its structure
            var container = document.getElementById("Content");
            container.innerHTML = ""; // Clear previous content

            globalAssessmentID = data.OID || data.AssessmentID || "Not provided"; // Store assessment ID globally
            var userID = data.UID || uid; // Use a fallback if UID is not present
            var expiration = data.Expiration || "Not provided"; // Use a fallback if Expiration is not present

            // Create and append Assessment ID
            var assessmentIDElement = document.createElement("p");
            assessmentIDElement.innerHTML = "<strong>AssessmentID:</strong> " + globalAssessmentID;
            container.appendChild(assessmentIDElement);

            // Create and append User-defined ID
            var userIDElement = document.createElement("p");
            userIDElement.innerHTML = "<strong>User-defined ID:</strong> " + userID;
            container.appendChild(userIDElement);

            // Create and append Expiration
            var expirationElement = document.createElement("p");
            expirationElement.id = "expirationDate";
            expirationElement.innerHTML = "<strong>Expiration:</strong> " + expiration;
            container.appendChild(expirationElement);

            // Get the first question
            getAssessmentQuestion();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("Error response: ", jqXHR.responseText);
            alert(jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}

function getAssessmentQuestion() {
    $.ajax({
        url: Server + "/ac_api/2014-01/Participants/" + globalAssessmentID + ".json",
        cache: false,
        type: "GET",
        dataType: "json",
        beforeSend: function (xhr) {
            var combinedString = predefinedRegistration + ":" + predefinedToken;
            var base64 = btoa(combinedString);
            xhr.setRequestHeader("Authorization", "Basic " + base64);
        },
        success: function (data) {
            console.log("Current Question Data: ", data); // Log the response to understand its structure

            if (data.Items && data.Items.length > 0) {
                var elements = data.Items[0].Elements;
                if (elements && elements.length > 0) {
                    console.log("Elements: ", elements); // Log elements to inspect them

                    // Find the element with the Map property
                    var elementWithMap = elements.find(el => el.Map && el.Map.length > 0);

                    if (elementWithMap) {
                        var question = elements[1].Description; // Assuming the question is in the second element
                        var map = elementWithMap.Map;

                        // Store the ItemResponseOID and Response globally
                        ItemResponseOID = map[0].ItemResponseOID;
                        Response = map[0].Value;

                        renderScreen(question, map);
                    } else {
                        console.error("No map found in any element. Elements data: ", elements);
                        alert("No map found in any element. Please check the console for more details.");
                    }
                } else {
                    console.error("No elements found in the first item. Items data: ", data.Items);
                    alert("No elements found in the first item. Please check the console for more details.");
                }
            } else {
                console.error("No items found in the response. Data: ", data);
                alert("No items found in the response. Please check the console for more details.");
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("Error response: ", jqXHR.responseText);
            alert(jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}

function renderScreen(question, map) {
    var container = document.getElementById("Content");
    container.innerHTML = ""; // Clear previous content

    // Display the question
    var questionElement = document.createElement("p");
    questionElement.classList.add("question");
    questionElement.innerHTML = question;
    container.appendChild(questionElement);

    // Display the possible answers
    var answersContainer = document.createElement("div");
    answersContainer.classList.add("answers-container");

    if (map && map.length > 0) {
        for (var i = 0; i < map.length; i++) {
            var answerElement = document.createElement("button");
            answerElement.innerHTML = map[i].Description;
            answerElement.classList.add("answer-button");
            answerElement.setAttribute("data-item-response-oid", map[i].ItemResponseOID);
            answerElement.setAttribute("data-response", map[i].Value);
            answerElement.setAttribute("data-score", map[i].Score || 0); // Assume Score is part of map[i]
            answerElement.onclick = function() {
                postAnswer(this.getAttribute("data-item-response-oid"), this.getAttribute("data-response"), parseInt(this.getAttribute("data-score")));
            };
            answersContainer.appendChild(answerElement);
        }
    } else {
        var fallbackMessage = document.createElement("p");
        fallbackMessage.innerHTML = "No answer options available.";
        answersContainer.appendChild(fallbackMessage);
    }

    container.appendChild(answersContainer);
}

function postAnswer(itemResponseOID, response, score) {
    var postedData = "ItemResponseOID=" + itemResponseOID + "&Response=" + response;

    $.ajax({
        url: Server + "/ac_api/2014-01/Participants/" + globalAssessmentID + ".json",
        cache: false,
        type: "POST",
        data: postedData,
        dataType: "json",
        beforeSend: function (xhr) {
            var combinedString = predefinedRegistration + ":" + predefinedToken;
            var base64 = btoa(combinedString);
            xhr.setRequestHeader("Authorization", "Basic " + base64);
        },
        success: function (data) {
            if (data.DateFinished != '') {
                displayFinalScore(globalAssessmentID);
                return;
            }
            getAssessmentQuestion();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            alert('postAnswer: ' + jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}

function displayFinalScore(assessmentID) {
    $.ajax({
        url: Server + "/ac_api/2014-01/Results/" + assessmentID + ".json",
        cache: false,
        type: "GET",
        dataType: "json",
        beforeSend: function (xhr) {
            var combinedString = predefinedRegistration + ":" + predefinedToken;
            var base64 = btoa(combinedString);
            xhr.setRequestHeader("Authorization", "Basic " + base64);
        },
        success: function (data) {
            var container = document.getElementById("Content");
            container.innerHTML = ""; // Clear previous content

            if (data.Error) {
                container.innerHTML = "Error: " + data.Error;
                return;
            }

            var tScore = (data.Theta * 10 + 50.0).toFixed(2);
            var stdError = (data.StdError * 10).toFixed(2);

            var scoreElement = document.createElement("p");
            scoreElement.innerHTML = "Final Score: " + tScore + " (Standard Error: " + stdError + ")";
            container.appendChild(scoreElement);

            for (var i = 0; i < data.Items.length; i++) {
                var itemElement = document.createElement("div");
                itemElement.innerHTML = "ID: " + data.Items[i].ID + ", Position: " + data.Items[i].Position + ", Theta: " + data.Items[i].Theta + ", Error: " + data.Items[i].StdError;
                container.appendChild(itemElement);
            }

            // Store the score in MongoDB
            storeScoreInMongoDB(data);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            alert('displayFinalScore: ' + jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}

function storeScoreInMongoDB(data) {
    var uid = document.getElementById("UID").value;
    var assessmentID = globalAssessmentID;
    var expirationElement = document.getElementById("expirationDate");
    var expiration = expirationElement ? expirationElement.innerText.split(": ")[1] : "Not provided";

    var scoreData = {
        Mr_no: uid, // Use Mr_no from the UID field
        formID: predefinedFormOID,
        assessmentID: assessmentID,
        expiration: expiration,
        scoreDetails: data
    };

    $.ajax({
        url: "/storeScore", // Express route to store data in MongoDB
        type: "POST",
        data: JSON.stringify(scoreData),
        contentType: "application/json",
        success: function (response) {
            console.log("Score stored successfully: ", response);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('storeScoreInMongoDB: ' + jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}
