function sendMessage() {
    var userMessage = $("#userinput").val();
    $("#chatbox").append("<p><b>You:</b> " + userMessage + "</p>");
    $("#userinput").val("");

    var systemPrompt = $("#systemprompt").val();
    var pastMessages = $("#pastMessages").val();
    var aiMessageElement = null; // Variable to store the AI message element

    // Load chat data from localStorage
    var chatData = loadChatData();

    // Add the new user message to the chat data
    chatData.push({ role: "user", content: userMessage });

    // Change button to stop icon
    var runButton = $(".btn-primary");
    runButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Stop');
    runButton.prop('disabled', true);

    // Use a POST request instead of GET
    var xhr = new XMLHttpRequest();
    xhr.open("POST", '/Home/GetAIResponse', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.responseType = 'text';

    var accumulatedText = ""; // Variable to accumulate the full assistant message
    var lastChar = ""; // Variable to store the last character processed
    var appendedContentLength = 0; // Variable to track appended content length

    xhr.onprogress = function () {
        // Process the streamed data here
        var responseText = xhr.responseText;
        console.log(responseText);

        if (aiMessageElement === null) {
            aiMessageElement = $("<p><b>AI:</b> </p>");
            $("#chatbox").append(aiMessageElement);
        }

        // Extract all text after the first "data: "
        var dataStartIndex = responseText.indexOf("data: ") + "data: ".length;
        var data = responseText.substring(dataStartIndex);

        // Replace all "data: " prefixes and trim only the end
        data = data.replace(/data: /g, "").trimEnd();
        // Ignore [DONE]
        if (data.includes("[DONE]")) {
            data = data.replace("[DONE]", "");
        }
        // Get the new data to append
        var newData = data.substring(appendedContentLength);
        // Add the new data to the accumulated text
        accumulatedText += newData; // Update accumulatedText here
        // Append the NEW data to the AI message element
        aiMessageElement.append(newData);
        $("#chatbox").scrollTop($("#chatbox")[0].scrollHeight);

        // Update the appended content length
        appendedContentLength = data.length;
    };
    xhr.onload = function () {
        // Streaming is done, now store the complete assistant message in localStorage
        if (aiMessageElement !== null) {
            // Add the AI message to the chat data
            chatData.push({ role: "assistant", content: accumulatedText });
            saveChatData(chatData);
            console.log("Saved")
        }

        // Request completed
        runButton.html('Run (Ctrl + ⏎)');
        runButton.prop('disabled', false);
    };

    xhr.onerror = function () {
        // Handle errors
        console.error("Error during request");
        runButton.html('Run (Ctrl + ⏎)');
        runButton.prop('disabled', false);
    };

    // Send the data as JSON in the request body
    xhr.send(JSON.stringify({
        userMessage: userMessage,
        systemPrompt: systemPrompt,
        pastMessages: pastMessages,
        chatData: JSON.stringify(chatData)
    }));
}



function loadChatData() {
    var chatData = localStorage.getItem("chatData");
    return chatData ? JSON.parse(chatData) : [];
}

function saveChatData(chatData) {
    localStorage.setItem("chatData", JSON.stringify(chatData));
}

function clearChat() {
    $("#chatbox").empty();
    localStorage.removeItem("chatData");
}

// Update the displayed value when the slider changes
$("#pastMessages").on("input", function () {
    $("#pastMessagesValue").text($(this).val());
});

// Load chat history on page load
$(document).ready(function () {

    loadChatHistory();
    var savedSystemPrompt = localStorage.getItem("systemPrompt");
    if (savedSystemPrompt) {
        $("#systemprompt").val(savedSystemPrompt);
    }

    autosize($('#userinput'));

    // Get the textarea element
    var textArea = document.getElementById('userinput'); // Replace 'userinput' with your textarea's ID

    // Initialize the encoder (using cl100k_base as an approximation for GPT-4)
    var enc = tiktoken.getEncoding("cl100k_base");

    // Function to update the token count
    function updateTokenCount() {
        var text = textArea.value;
        var tokens = enc.encode(text);
        var tokenCount = tokens.length;

        // Update the UI with the token count (replace 'tokenCount' with your element's ID)
        document.getElementById('tokenCount').textContent = "Token Count: " + tokenCount;
    }

    // Update the token count initially and on input
    updateTokenCount();
    textArea.addEventListener('input', updateTokenCount);
});

// Function to load chat history from localStorage and display it
function loadChatHistory() {
    var chatData = loadChatData();
    $("#chatbox").empty(); // Clear existing chat messages

    for (var i = 0; i < chatData.length; i++) {
        var message = chatData[i];
        var role = message.role === "user" ? "You" : "AI";
        $("#chatbox").append("<p><b>" + role + ":</b> " + message.content + "</p>");
    }

    $("#chatbox").scrollTop($("#chatbox")[0].scrollHeight); // Scroll to bottom
}


function saveSystemPrompt() {
    var systemPrompt = $("#systemprompt").val();
    localStorage.setItem("systemPrompt", systemPrompt);
    console.log("System prompt saved:", systemPrompt);
}
function setDefaultPrompt() {
    $("#systemprompt").val("You are a helpful assistant.");
}