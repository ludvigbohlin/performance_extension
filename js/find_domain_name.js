chrome.extension.sendMessage({ greeting: "hello", hostname: window.location.hostname }, function (response) {
    console.log(response)
});
