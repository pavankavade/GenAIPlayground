function addNewMessage(role, content) {
    // Escape backslashes in code blocks
    var escapedContent = content.replace(/\\/g, '\\\\');

    var formattedContent = marked.parse(escapedContent); // Format with marked

    // Create a message card
    var messageCard = `
        <div class="card mb-2 rounded shadow ${role === 'user' ? 'user-message' : 'assistant-message'}">
            <div class="card-body">
                <p class="card-text"><b>${role}:</b> ${formattedContent}</p>
            </div>
        </div>
    `;

    $("#chatbox").append(messageCard);

    // Use setTimeout to delay adding copy buttons (adjust delay as needed)
    setTimeout(() => {
        // Add copy button to code blocks with a class
        $("#chatbox pre code.language-").each(function () {
            var codeBlock = $(this);
            var copyButton = $("<button class='copy-button btn btn-sm btn-light'>Copy</button>");
            copyButton.click(function () {
                navigator.clipboard.writeText(codeBlock.text());
            });
            codeBlock.parent().append(copyButton);
        });
    }, 100);
}
function addNewStreamingMessage(content) {
    // Escape backslashes in code blocks
    var escapedContent = content.replace(/\\/g, '\\\\');

    // Check if the AI message card already exists
    if ($("#ai-message-content").length === 0) {
        // Create a message card without Markdown formatting
        var messageCard = `
            <div class="card mb-2 rounded shadow assistant-message">
                <div class="card-body">
                    <p class="card-text"><b>AI:</b> <span id="ai-message-content"></span></p>
                </div>
            </div>
        `;

        // Append the message card to the chatbox
        $("#chatbox").append(messageCard);
    }

    // Append the escaped content to the existing AI message card
    $("#ai-message-content").append(escapedContent);

    // Scroll to the bottom of the chatbox
    $("#chatbox").scrollTop($("#chatbox")[0].scrollHeight);
}
function sendMessage() {
    var userMessage = $("#userinput").val();
    addNewMessage('You', userMessage); // Use addNewMessage() for user messages
    $("#userinput").val("");

    var systemPrompt = $("#systemprompt").val();
    var pastMessages = $("#pastMessages").val();
    var aiMessageElement = null;

    var chatData = loadChatData();
    chatData.push({ role: "user", content: userMessage });

    var runButton = $(".btn-primary");
    runButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Stop');
    runButton.prop('disabled', true);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", '/Home/GetAIResponse', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.responseType = 'text';

    var accumulatedText = "";
    var appendedContentLength = 0;

    xhr.onprogress = function () {
        var responseText = xhr.responseText;

        if (aiMessageElement === null) {
            // Create a message card without Markdown formatting
            aiMessageElement = `
            <div class="card mb-2 rounded shadow assistant-message">
                <div class="card-body">
                    <p class="card-text"><b>AI:</b> <span id="ai-message-content"></span></p>
                </div>
            </div>
        `;

            // Append the message card to the chatbox
            $("#chatbox").append(aiMessageElement);

            // Update aiMessageElement to point to the span
            aiMessageElement = $("#ai-message-content");
        }
        var dataStartIndex = responseText.indexOf("data: ") + "data: ".length;
        var data = responseText.substring(dataStartIndex);

        data = data.replace(/data: /g, "");
        if (data.includes("[DONE]")) {
            data = data.replace("[DONE]", "");
        }

        var newData = data.substring(appendedContentLength);
        accumulatedText += newData;
        accumulatedText = accumulatedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        aiMessageElement.append(newData);
        $("#chatbox").scrollTop($("#chatbox")[0].scrollHeight);
        appendedContentLength = data.length;
    };

    xhr.onload = function () {
        if (aiMessageElement !== null) {
            chatData.push({ role: "assistant", content: accumulatedText });
            saveChatData(chatData);
            aiMessageElement.closest('.card').remove(); 
            // Use addNewMessage() for AI messages
            addNewMessage('AI', accumulatedText);
        }

        runButton.html('Run (Ctrl + ⏎)');
        runButton.prop('disabled', false);
    };

    xhr.onerror = function () {
        console.error("Error during request");
        runButton.html('Run (Ctrl + ⏎)');
        runButton.prop('disabled', false);
    };

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
});

function loadChatHistory() {
    var chatData = loadChatData();
    $("#chatbox").empty();

    for (var i = 0; i < chatData.length; i++) {
        var message = chatData[i];
        var role = message.role === "user" ? "You" : "AI";

        // Use addNewMessage() to add messages from history
        addNewMessage(role, message.content);
    }

    $("#chatbox").scrollTop($("#chatbox")[0].scrollHeight);
}

function saveSystemPrompt() {
    var systemPrompt = $("#systemprompt").val();
    localStorage.setItem("systemPrompt", systemPrompt);
    console.log("System prompt saved:", systemPrompt);
}

function setDefaultPrompt() {
    $("#systemprompt").val("You are a helpful assistant.");
}