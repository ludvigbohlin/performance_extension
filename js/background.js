let optimisedImages = {};
let originalImages = {};


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command === 'startup'){
    const CustomANALYZED_DOMAIN = request.hostname; //retrive hostname in request from js/find_domain_name.js
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
      chrome.declarativeContent.onPageChanged.addRules(
        [{
          conditions: [
            new browser.declarativeContent.PageStateMatcher(
              {
                pageUrl: { hostEquals: CustomANALYZED_DOMAIN },
              })
          ],
          actions: [new browser.declarativeContent.ShowPageAction()]
        }]);
    });

    sendResponse({ "status": "Welcome to ShimmerCat Image Extension" })
  }
  if(request.command === 'imageTransfer'){
    if(request.kind === 'original'){
      originalImages[request.url] = request.image;
    }else{
      optimisedImages[request.url]= {
        "image": request.image,
        "isServiceWorkerImage": request.isServiceWorker
      }
    }

  }
  if(request.command === 'imageFetch'){
    let headers = new Headers({
      "cache-control": "no-cache",
      "accept": "image/webp,image/apng,image/*",
      "accept-encoding": "gzip, deflate, br",});
    
      let mode = "cors";

    let fetch_request = new Request(
      request.url,
      {
          "headers": headers,
          "method": "GET",
          "mode": mode,
          "cache": "no-store"
      });
  
  
  let prom = fetch(fetch_request);

  prom.then(
    (response) => {
        if (response.status === 200) {
          // console.log("success!")
          if(request.type === 'original'){
            originalImages[request.url] = request.image;  
          }else{
            optimisedImages[request.url]= {
              "image": request.image,
              "isServiceWorkerImage": false
            } 
          }
        }
        else {
            console.log("error");
        }
    }                                
  );
    
  }
});
const ANALYZED_DOMAIN = 'https://tools.se';

function install_rules() {

  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules(
      [{
        conditions: [
          new browser.declarativeContent.PageStateMatcher(
            {
              pageUrl: { hostEquals: ANALYZED_DOMAIN },
            })
        ],
        actions: [new browser.declarativeContent.ShowPageAction()]
      }]);
  });
}



function install_context_menus() {
  browser.contextMenus.removeAll().then(() => {
    console.log("Removed all menus!");

    // Let's create the first one: add bad image
    browser.contextMenus.create({
      title: "Mark bad compression",
      id: "mark_bad",
      contexts: ["image"]
    });
    browser.contextMenus.create({
      title: "Mark good compression",
      id: "mark_good",
      contexts: ["image"]
    });
    browser.contextMenus.create({
      title: "Un-mark compression",
      id: "unmark",
      contexts: ["image"]
    });
  });
  browser.contextMenus.onClicked.addListener(on_context_menu_clicked);
}


function on_context_menu_clicked(info, tab) {
  let menu_item_id = info.menuItemId;
  let maybe_url = info.srcUrl;
  if (menu_item_id === "mark_bad" && typeof (maybe_url) == "string" &&
    maybe_url.startsWith("https://" + ANALYZED_DOMAIN)) {
    forward_mark("bad", maybe_url, info);
  } else if (menu_item_id === "mark_good" && typeof (maybe_url) == "string" &&
    maybe_url.startsWith("https://" + ANALYZED_DOMAIN)) {
    forward_mark("good", maybe_url, info);
  } else if (menu_item_id === "unmark" && typeof (maybe_url) == "string" &&
    maybe_url.startsWith("https://" + ANALYZED_DOMAIN)) {
    forward_mark("unmark", maybe_url, info);
  }
}


function forward_mark(mark, maybe_url, info) {
  browser.storage.sync.get(["model_data"]).then((items) => {
    if (items.hasOwnProperty("model_data")) {
      let model_data = items.model_data;
      let url_obj = new URL(maybe_url);
      let pathname = url_obj.pathname;
      for (let imark of ["good", "bad"]) {
        if (imark === mark) {
          model_data[mark + "_images"] = model_data[mark + "_images"] || [];
          let images_list = model_data[mark + "_images"];
          let images_set = new Set(images_list);

          // Add path to set
          images_set.add(pathname);
          let new_images_list = Array.from(images_set);
          model_data[mark + "_images"] = new_images_list;
        } else {
          // Remove path from set
          model_data[imark + "_images"] = model_data[imark + "_images"] || [];
          let images_list = model_data[imark + "_images"];
          let images_set = new Set(images_list);
          images_set.delete(pathname);
          let new_images_list = Array.from(images_set);
          model_data[imark + "_images"] = new_images_list;
        }
      }

      browser.storage.sync.set({
        "model_data": model_data
      })
        .then(() => {

          // noinspection JSCheckFunctionSignatures
          browser.tabs.query({ active: true, currentWindow: true })
            .then(
              (tabs) => {
                if (tabs.length > 0) {
                  browser.tabs.sendMessage(tabs[0].id, { refreshView: true })
                    .then(
                      () => { console.log("message sent to content script") },
                      () => { console.error("message was not sent! ") }
                    );
                }
              })
            .then((response) => {
              console.log(response);
            });

        });
    }
  });
}


browser.runtime.onInstalled.addListener(() => {
  console.log("Background method called");
});

install_context_menus();


chrome.webRequest.onErrorOccurred.addListener(function(details){
  if(details.url in originalImages){
    delete originalImages[details.url]
  }
  if(details.url in optimisedImages){
    delete optimisedImages[details.url]
  }

},
{urls: ["<all_urls>"]},
);

// listener for getting response headers from image requests
chrome.webRequest.onCompleted.addListener(function(details){
  // if original image
  if (details.url in originalImages){
    browser.tabs.query({ active: true, currentWindow: true })
            .then(
              (tabs) => {
                if (tabs.length > 0) {
                  // send headers to state.js 
                  return browser.tabs.sendMessage(tabs[0].id, { 
                    headers: details.responseHeaders,
                    image : originalImages[details.url],
                    url : details.url,
                    kind : "original" });
                }
              })
              .then(
                ()=>{
                //delete image
                delete originalImages[details.url];  
              },
              (error) => {
                console.error("error sending headers for: ", details.url);
                console.error(error);
            })
  }
  // if optimised image
  if (details.url in optimisedImages){
    // if it is a serviceWorker image
    if(optimisedImages[details.url]["isServiceWorkerImage"]){
      if(details.tabId === -1 && details.frameId === -1){
      // if(details.parentFrameId === -1){
        let filetype = new_filetype_from_headers(details.responseHeaders);
        if (!(filetype.includes('image'))){
          delete optimisedImages[details.url]
        }else{
          browser.tabs.query({ active: true, currentWindow: true })
                  .then(
                    (tabs) => {
                      if (tabs.length > 0) {
                        // send headers to state.js 
                        return browser.tabs.sendMessage(tabs[0].id, { 
                          headers: details.responseHeaders,
                          image : optimisedImages[details.url]["image"],
                          url : details.url,
                          kind : "optimised" });
                      }
                    })
                    .then(()=>{
                      //delete image
                      delete optimisedImages[details.url]
                      //check if we have processed all images, if we have notify state.js to show model data
                      if(Object.keys(optimisedImages).length === 0){
                        browser.tabs.query({ active: true, currentWindow: true })
                        .then(
                          (tabs) => {
                            browser.tabs.sendMessage(tabs[0].id, { 
                              notification: "final image"});
                          })
                      }
                    },
                    (error) => {
                      console.error("error sending headers")
                      console.error(error);
                  })
        }
      }else{
        // filter out non-image requests that slip through (bliz)
        let filetype = new_filetype_from_headers(details.responseHeaders);
        if (!(filetype.includes('image'))){
          delete optimisedImages[details.url]
          if(Object.keys(optimisedImages).length === 0){
            browser.tabs.query({ active: true, currentWindow: true })
            .then(
              (tabs) => {
                browser.tabs.sendMessage(tabs[0].id, { 
                  notification: "final image"});
              })
          }
        }
      }
    } else{
      // non-serviceworker optimised image
      browser.tabs.query({ active: true, currentWindow: true })
              .then(
                (tabs) => {
                  if (tabs.length > 0) {
                    // send headers to state.js 
                    return browser.tabs.sendMessage(tabs[0].id, { 
                      headers: details.responseHeaders,
                      image : optimisedImages[details.url]["image"],
                      url : details.url,
                      kind : "optimised" });
                  }
                })
                .then((tabs)=>{
                  //delete image
                  delete optimisedImages[details.url]
                  //check if we have processed all images, if we have notify state.js to show model data
                  if(Object.keys(optimisedImages).length === 0){
                    browser.tabs.query({ active: true, currentWindow: true })
                    .then(
                      (tabs) => {
                      browser.tabs.sendMessage(tabs[0].id, { 
                        notification: "final image"});
                      })
                  }
                },
                (error) => {
                  // console.error("error sending headers for: ", details.url);
                  // console.error(error);
              })
    }
  }
},
{urls: ["<all_urls>"]},
["responseHeaders", "extraHeaders"]);

//function to get filetype from headers to filter out non-image requests
function new_filetype_from_headers(headers){
  let result = null;
  for (let
      header_val_arr of headers.entries()) {
      let [header_name, header_value] = header_val_arr;
      let header = header_value["name"]
      let value = header_value['value'];
      if (header.match(/[Cc]ontent-[Tt]ype/)) {
          result = value;
          break;
      }
  }
  return result; 
}