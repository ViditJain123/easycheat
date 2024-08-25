function changeResponse(response) {
  var responseElement = document.getElementById("response");
  responseElement.textContent = response.answer;
  console.log("Response updated:", response.answer);
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "updateResponse") {
    changeResponse(message.data);
  }
});
