function sendMessage() {
    var userMessage = $("#userinput").val();
    $("#chatbox").append("<p><b>You:</b> " + userMessage + "</p>");
    $("#userinput").val("");

    var systemPrompt = $("#systemprompt").val();
    var aiMessageElement = null; // Variable to store the AI message element

    // Change button to stop icon
    var runButton = $(".btn-primary");
    runButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Stop');
    runButton.prop('disabled', true);

    var eventSource = new EventSource('/Home/GetAIResponse?' + $.param({ userMessage: userMessage, systemPrompt: systemPrompt }));

    eventSource.onmessage = function (event) {
        if (event.data !== "[DONE]") {
            try {
                var jsonContent = JSON.parse(event.data);
                if (jsonContent.choices && jsonContent.choices[0].delta && jsonContent.choices[0].delta.content) {
                    if (aiMessageElement === null) {
                        // Create the initial AI message element
                        aiMessageElement = $("<p><b>AI:</b> " + jsonContent.choices[0].delta.content + "</p>");
                        $("#chatbox").append(aiMessageElement);
                    } else {
                        // Append content to the existing AI message element
                        aiMessageElement.html(aiMessageElement.html() + jsonContent.choices[0].delta.content);
                    }
                    $("#chatbox").scrollTop($("#chatbox")[0].scrollHeight); // Scroll to bottom
                }
            } catch (error) {
                console.error("Error parsing JSON:", error);
            }
        } else {
            // Reset button state
            runButton.html('Run (Ctrl + ⏎)');
            runButton.prop('disabled', false);
            eventSource.close();
        }
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
