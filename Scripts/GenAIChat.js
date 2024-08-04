function sendMessage() {
    var userMessage = $("#userinput").val();
    $("#chatbox").append("<p><b>You:</b> " + userMessage + "</p>");
    $("#userinput").val("");

    var systemPrompt = $("#systemprompt").val();
    var pastMessages = $("#pastMessages").val();
    var aiMessageElement = null;
    var assistantMessage = ""; // Variable to accumulate the assistant's message
    // Load chat data from localStorage
    var chatData = loadChatData();

    // Add the new user message to the chat data
    chatData.push({ role: "user", content: userMessage });

    // Change button to stop icon
    var runButton = $(".btn-primary");
    runButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Stop');
    runButton.prop('disabled', true);
    console.log(JSON.stringify(chatData))
    var eventSource = new EventSource('/Home/GetAIResponse?' + $.param({ userMessage: userMessage, systemPrompt: systemPrompt, pastMessages: pastMessages, chatData: JSON.stringify(chatData) }));

    eventSource.onmessage = function (event) {
        if (event.data !== "[DONE]") {
            try {
                var jsonContent = JSON.parse(event.data);
                if (jsonContent.choices && jsonContent.choices[0].delta && jsonContent.choices[0].delta.content) {
                    // Accumulate the assistant's message
                    assistantMessage += jsonContent.choices[0].delta.content;

                    if (aiMessageElement === null) {
                        // Create the initial AI message element
                        aiMessageElement = $("<p><b>AI:</b> " + jsonContent.choices[0].delta.content + "</p>");
                        $("#chatbox").append(aiMessageElement);
                    } else {
                        // Update the existing AI message element
                        aiMessageElement.html("<b>AI:</b> " + assistantMessage);
                    }

                    $("#chatbox").scrollTop($("#chatbox")[0].scrollHeight); // Scroll to bottom
                }
            } catch (error) {
                console.error("Error parsing JSON:", error);
            }
        } else {
            // Streaming is done, now store the complete assistant message in localStorage
            if (aiMessageElement !== null) {
                // Add the AI message to the chat data
                chatData.push({ role: "assistant", content: assistantMessage });
                saveChatData(chatData);
            }

            // Reset button state
            runButton.html('Run (Ctrl + ⏎)');
            runButton.prop('disabled', false);
            eventSource.close();
        }

        // Save the updated chat data to localStorage
        saveChatData(chatData);
    };

    eventSource.onerror = function (error) {
        console.error("SSE Error:", error);
        // Reset button state
        runButton.html('Run (Ctrl + ⏎)');
        runButton.prop('disabled', false);
        eventSource.close();
    };

    eventSource.onopen = function () {
        // Connection opened successfully
    };
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

// Load chat history on page load
$(document).ready(function () {
    loadChatHistory();
});