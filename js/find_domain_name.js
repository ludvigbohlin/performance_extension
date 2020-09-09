chrome.extension.sendMessage({ command: "startup", hostname: window.location.hostname }, function (response) {
   console.log(response['status'])
});
