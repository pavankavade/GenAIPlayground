function sendMessage() {
    var userMessage = $("#userinput").val();
    $("#chatbox").append("<p><b>You:</b> " + userMessage + "</p>");
    $("#userinput").val("");

    var systemPrompt = $("#systemprompt").val();

    // Change button to stop icon
    var runButton = $(".btn-primary");
    runButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Stop');
    runButton.prop('disabled', true);

    fetch('/Home/GetAIResponse', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userMessage: userMessage, systemPrompt: systemPrompt })
    })
        .then(async response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            let decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("data: ");
                buffer = lines.pop(); // Store the last (potentially incomplete) line

                for (const line of lines) {
                    if (line.trim() !== "") {
                        // Simulate character-by-character streaming
                        for (let i = 0; i < line.length; i++) {
                            await new Promise(resolve => setTimeout(resolve, 50)); // Adjust delay as needed
                            $("#chatbox").append(line[i]);
                        }
                    }
                }
            }
        })
        .catch(error => {
            console.error("Error:", error);
        })
        .finally(() => {
            // Change button back to run
            runButton.html('Run (Ctrl + ⏎)');
            runButton.prop('disabled', false);
        });
}