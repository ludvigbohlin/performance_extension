
// constant to define how much loss compensation to give chunked transfer encoded images
const CHUNKED_IMAGE_LOSS_COMPENSATION_PERCENT = 0.05;

let optimizedSizeModel = null;
let unoptimizedSizeModel = null;
let currentView = null;
let Active = true;
let serviceWorker = false;
let serviceWorkerDomains = {};

// function that iterates through images in DOM & returns original & optimised image sources
function* iterateOnImages() {
    let images = document.querySelectorAll('*,img.lazyloaded');
    let optimisationSource = '';
    for (let im of images) {
        if (canUseUrl(im.currentSrc)) {
            let originalUrl = new URL(im.currentSrc);
            let optimisedUrl = '';
            let doc_hostname = document.location.hostname;

            // check if image is supported by the serviceWorker
            let optimised_image_url = getServiceWorkerUrl(originalUrl);
            if (optimised_image_url !== undefined){
                optimisationSource = 'serviceWorker';
                optimisedUrl = optimised_image_url;
                populateUnoptimizedSizeModel(originalUrl, optimisationSource, im.src);
                yield [im, originalUrl, optimisedUrl, optimisationSource];
            // else image optimisation is processed via origin
            }else{
                optimisedUrl = originalUrl;
                if (originalUrl.hostname === doc_hostname) {
                    optimisationSource = 'origin'

                    // remove HAPS compression
                    originalUrl = toNoHAPsURL(originalURLOfImage(im));  
                    populateUnoptimizedSizeModel(originalUrl, optimisationSource, im.src);
                    yield [im, originalUrl, optimisedUrl, optimisationSource];
                }else {
                    continue;
                }
            }
        }
        if (retrieving(im.style['backgroundImage'])) {
            let returned_url = retrieving(im.style['backgroundImage']);
            let optimisedUrl = '';
        
            let originalUrl = new URL(returned_url);
            let doc_hostname = document.location.hostname;
            
            // check if image is supported by the serviceWorker
            let optimised_image_url = getServiceWorkerUrl(originalUrl);
            if (optimised_image_url !== undefined){
                optimisationSource = 'serviceWorker';
                optimisedUrl = optimised_image_url;
                populateUnoptimizedSizeModel(originalUrl, optimisationSource, im.src);
                yield [im, originalUrl, optimisedUrl, optimisationSource];
            // else image optimisation is processed via origin
            }else{
                optimisedUrl = originalUrl;
                if (originalUrl.hostname === doc_hostname) {
                    optimisationSource = 'origin'

                    // remove HAPS compression
                    originalUrl = toNoHAPsURL(originalURLOfImage(im)); 
                    populateUnoptimizedSizeModel(originalUrl, optimisationSource, im.src); 
                    yield [im, originalUrl, optimisedUrl, optimisationSource];
                // image compression not supported for the domain as it is not defined in serviceWorker and not the root url of the site
                }else continue;
            }
        }
    }
}

// function that displays various styles based on the status of the image
function displaySelected(){
    optimizedSizeModel = {};
    unoptimizedSizeModel = {};
    for (let [im, originalUrl,optimisedUrl, optimisationSource] of iterateOnImages()) {
        let h = highlightAsWebp.bind(null, im);
        let g = highlightAsProcessing.bind(null, im);
        let i = highlightAsNonViable.bind(null, im);
        let b = highlightAsServiceWorkerImage.bind(null, im);

        
        im.currentSrc = originalUrl;
        im.src = originalUrl;

        urlPointsToStatus(optimisedUrl, optimisationSource, im.src);
        //     .then(([status, transfer_size, filetype]) => {
        //         // console.log("status: ", status);
        //         // console.log("transfer size: ", transfer_size);
        //         // console.log("filetype: ", filetype);
        //         removeCustomStyles(im);
        //         if(optimisationSource == 'serviceWorker'){
        //             im.classList.remove("scbca-gray"); 
        //             b()
        //         }
        //         else if (status === "ready") {
        //             im.classList.remove("scbca-gray");
        //             h();
        //         } else if (status === "non-viable") {
        //             im.classList.remove("scbca-gray");
        //             i();
        //         } else if (status === "in-processing") {
        //             im.classList.remove("scbca-gray");
        //             g();
        //         } else {
        //             im.classList.add("scbca-gray");
        //         }    
        //         if (transfer_size !== null) {
        //             if(filetype.includes("image")){
        //                 // add image to optimised images object ready for compression computation in popup.js
        //                 optimizedSizeModel[optimisedUrl] = {
        //                     'status': status,
        //                     'transfer_size': transfer_size,
        //                     'pathname': originalUrl.pathname + stripHAPsSearchParam(originalUrl.search),
        //                     'filetype': filetype};
        //             }
        //         }else{
        //         }
        //         }
                
        // );
    } 
}

// callback function for returning total chunk size of chunked image transfer
function onChunkedResponseComplete([result, response]) {
    return result *(1 + CHUNKED_IMAGE_LOSS_COMPENSATION_PERCENT);
  }

// error handler for chunked image transfer
function onChunkedResponseError(err) {
    console.error(err)
}

// function that processes chunked image responses
function processChunkedResponse(response) {
    var text = '';
    var count = 0;
    var chunkSize = 0; 
    var reader = response.body.getReader()
    var decoder = new TextDecoder();
    
    return readChunk();
  
    // use reader to read chunk and pass into appendChunks ready for size aggregation
    function readChunk() {
      return reader.read().then(appendChunks);
    }
    
    // function that adds the length of each chunk to total chunk size in order to compute file size
    function appendChunks(result) {
      var chunk = decoder.decode(result.value || new Uint8Array, {stream: !result.done});
      chunkSize += chunk.length;
      count+=1;
      if (result.done) {
        return [chunkSize, response];
      } else {
            return readChunk();
      }
    }
}

// gets the relevant optimised url for an image hosted on a serviceWorker-supported site
function getServiceWorkerUrl(url){
    var host = url.host;
    domains = Object.keys(serviceWorkerDomains);
    if (host in domains){
        return "https://" + serviceWorkerDomains[host] + url.pathname + url.search;
    }else{
        for (const domain of domains){
            if (domain.includes(host) || host.includes(domain)){
                return "https://" + serviceWorkerDomains[domain] + url.pathname + url.search; 
            }
        }
        return undefined
    }
}

// refreshes selectedview 
async function refreshSelectedView() {
    let domains = await getServiceWorkerDomains();
    if (currentView === "selected") {
        // check if site is serviceWorker supported and if so, get serviceWorker domains that are used on the site
        serviceWorker =  CheckWorkerProcess();
        if (serviceWorker){
            getServiceWorkerDomains();
        }else{
            displaySelected();
        }
        // automated refresh & sending of data to popup.js
        // window.setTimeout(refreshSelectedView, 15000);
        window.setTimeout(sendModelSummaries, 3000);
    }
}

// changes the view to selected
async function changeToSelected() {
    if (currentView !== "selected") {
        // automated refresh & sending of data to popup.js
        window.setTimeout(sendModelSummaries, 3000);
        // window.setTimeout(refreshSelectedView, 15000);
    }
    currentView = "selected";

    // check if site is serviceWorker supported and if so, get serviceWorker domains that are used on the site
    serviceWorker =  CheckWorkerProcess();
    if (serviceWorker){
        getServiceWorkerDomains();
    }else{
        displaySelected();
    }
}

// function that sends data to popup.js
function sendModelSummaries() {
    browser.runtime.sendMessage({
        'kind': 'model-summary',
        'unoptimized': unoptimizedSizeModel,
        'optimized': optimizedSizeModel,
        'active': Active,
        'serviceWorker': serviceWorker,
    }).then(
        () => { },
        () => { },
    );
}

// function that highlights a given element as a webp image
function highlightAsWebp(im_element) {
    im_element.classList.add("scbca-webp");
}

// function that highlights a given element as a processing image
function highlightAsProcessing(im_element) {
    im_element.classList.add("scbca-processing");
}

// function that highlights a given element as a non-viable image
function highlightAsNonViable(im_element) {
    im_element.classList.add("scbca-non-viable");
}

// function that highlights a given element as an image processed by the serviceWorker
function highlightAsServiceWorkerImage(im_element){
    im_element.classList.add("scbca-serviceworker");
 
}

// function that removes all styles for a given image element
function removeCustomStyles(im_element) {
    const tokens = [
        "scbca-gray",
        "scbca-good",
        "scbca-webp",
        "scbca-processing",
        "scbca-non-viable",
        "scbca-serviceworker"
    ];
    for (let token of tokens) {
        im_element.classList.remove(token);
    }
}

// function that changes the view to optimised images only 
function changeToOptimized() {
    currentView = 'optimized';
    let images = document.querySelectorAll('*,img.lazyloaded');

    //iterate through images and change src to the optimised version
    images.forEach((im) => {
        if (canUseUrl(im.currentSrc)) {
            let url = new URL(im.currentSrc);
            let doc_hostname = document.location.hostname;
            // if serviceWorker image
            let optimised_image_url = getServiceWorkerUrl(url);
            if (optimised_image_url !== undefined){
                // optimisationSource = 'serviceWorker';
                removeCustomStyles(im);
                im.src = optimised_image_url;
            }else{
                if (url.hostname === doc_hostname) {
                    removeCustomStyles(im);
                    let dataset = im.dataset;
                    if (dataset.hasOwnProperty("scbOriginalLocation")) {
                        im.src = dataset.scbOriginalLocation;
                    }
                }
            }
            ;
        }
        if (retrieving(im.style['backgroundImage'])) {
            let returned_url = retrieving(im.style['backgroundImage']);
            let url = new URL(returned_url);
            let doc_hostname = document.location.hostname;
            
            // if serviceWorker image
            let optimised_image_url = getServiceWorkerUrl(url);
            if (optimised_image_url !== undefined){
                // optimisationSource = 'serviceWorker';
                removeCustomStyles(im);
                im.src = optimised_image_url;
            }else{
                if (url.hostname === doc_hostname) {
                    removeCustomStyles(im);
                    let dataset = im.dataset;
                    if (dataset.hasOwnProperty("scbOriginalLocation")) {
                        im.src = dataset.scbOriginalLocation;
                    }
                }
            }
        }
    });
}

// function that takes an element using a background image and retrieves the corresponding image url for it 
function retrieving(url) {
    if (url == null || url == undefined || url.length == 0) {
        return false;

    }
    else {
        url = "https://" + document.location.hostname + url.replace(/^url\(['"](.+)['"]\)/, '$1');
        // PARAMETER FOR IMAGES SELECTION
        var dotIndex = url.lastIndexOf('.');
        try { var ext = url.substring(dotIndex); }
        catch (e) {
            var ext = ""
        }
        let images_extensions = ['.png', '.jpg']
        if (images_extensions.includes(ext)) {


            return url;
        }
        else if (/.jpg\?preset|.png\?preset|.gif\?preset/.test(url)) {
            return url;
        }
        else {
        }

    }
}

// function that validates each url
function canUseUrl(url) {
    if (url === null || url === undefined) {
        return false;
    }
    return url.startsWith("https://");
}


// unused function, will leave in case it is needed later
function isWEBPFile(arrayBuffer) {
    let byteArray = new Uint8Array(arrayBuffer);

    let b0 = byteArray[0];
    let b1 = byteArray[1];
    let b2 = byteArray[2];
    let b3 = byteArray[3];

    let b8 = byteArray[8];
    let b9 = byteArray[9];
    let b10 = byteArray[10];
    let b11 = byteArray[11];

    let riff = "RIFF";
    let webp = "WEBP";
    let result =
        (
            (
                (b0 === riff.charCodeAt(0)) &&
                (b1 === riff.charCodeAt(1)) &&
                (b2 === riff.charCodeAt(2)) &&
                (b3 === riff.charCodeAt(3))
            )
            &&
            (
                (b8 === webp.charCodeAt(0)) &&
                (b9 === webp.charCodeAt(1)) &&
                (b10 === webp.charCodeAt(2)) &&
                (b11 === webp.charCodeAt(3))
            )
        );
    return result;
}

// function that reads header values for a given image and determines the status of the image and how it will be visualised 
function image_opt_status_from_headers(response) {
    let headers_status = null;
    for (let
        /** @type String[] */
        header_val_arr of response.headers.entries()) {
        let [header_name, header_value] = header_val_arr;

        if (header_name === "sc-note") {
            if (header_value.includes("webp0=nv")) {
                headers_status = 'non-viable';
                break;
            } else if (header_value.includes("webp0=ip")) {
                headers_status = 'in-processing'
                break;
            } else if (header_value.includes("webp0=re")) {
                headers_status = 'ready'
                break;
            }
            else {
            }
        }
    }
    return headers_status;
}

function new_image_opt_status_from_headers(headers) {
    let headers_status = null;
    for (let
        /** @type String[] */
        header_val_arr of headers.entries()) {
        let [header_name, header_value] = header_val_arr;
        let header = header_value["name"]
        let value = header_value['value'];

        if (header === "sc-note") {
            if (value.includes("webp0=nv")) {
                headers_status = 'non-viable';
                break;
            } else if (value.includes("webp0=ip")) {
                headers_status = 'in-processing'
                break;
            } else if (value.includes("webp0=re")) {
                headers_status = 'ready'
                break;
            }
            else {
            }
        }
    }
    return headers_status;
}

// function that reads header values for a given image and determines the file size of the image for computing compression amount  
function size_from_headers(response) {
    let result = null;
    for (let
        /** @type String[] */
        header_val_arr of response.headers.entries()) {
        let [header_name, header_value] = header_val_arr;
        if (header_name.match(/[Cc]ontent-[Ll]ength/)) {
            result = Number(header_value);
            break;
        }
    }
    return result;
}

function new_size_from_headers(headers) {
    let result = null;
    for (let
        /** @type String[] */
        header_val_arr of headers.entries()) {
        let [header_name, header_value] = header_val_arr;
        let header = header_value["name"]
        let value = header_value['value'];
        if (header.match(/[Cc]ontent-[Ll]ength/)) {
            result = Number(value);
            break;
        }
    }
    return result;
}

// function that reads header values for a given image and determines the filetype of the image for filetype analytics  
function filetype_from_headers(response){
    let result = null;
    for (let
        /** @type String[] */
        header_val_arr of response.headers.entries()) {
        let [header_name, header_value] = header_val_arr;
        if (header_name.match(/[Cc]ontent-[Tt]ype/)) {
            result = header_value;
            break;
        }
    }
    return result; 
}

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


// function that makes a request to the optimised url of each image which then gives status information and file size
function urlPointsToStatus(url, optimisationSource, im) {
    let mode = "cors";
    let headers = new Headers({
    });

    if(optimisationSource === 'origin'){
        mode = "same-origin";
        headers = new Headers({
            "cache-control": "no-cache",
            "accept": "image/webp,image/apng,image/*",
            "accept-encoding": "gzip, deflate, br",});
    }

    let fetch_request = new Request(
        url,
        {
            "headers": headers,
            "method": "GET",
            "mode": mode,
            "cache": "no-store"
        });
    
    
    let prom = fetch(fetch_request);

    // notify background.js of the url we want to monitor
    
    // console.log("sending: ", url);
    browser.runtime.sendMessage({
        command: "imageTransfer",
        url: url,
        image: im,
        kind: "optimised"
    }).then(
        () => { console.log("message sent")},
        () => { },
    );

    prom.then(
        (response) => {
            if (response.status === 200) {
            }
            else {
                console.log("error");
            }
        }                                
    );

    // prom.the
        
    
    // let resultP = new Promise((resolve, reject) => {
    //     prom.then(
    //         (response) => {
    //             if (response.status === 200) {
    //                 let headers_status = '';
    //                 let indicated_size = '';
    //                 let filetype = '';

    //                 // browser.runtime.onMessage.addListener(
    //                 //     function (request, sender, sendResponse) {
    //                 //         if(request.headers){
    //                 //             let headers = request.headers;
    //                 //             // console.log(headers);
    //                 //             // get image status
    //                 //             let headers_status = new_image_opt_status_from_headers(headers);
    //                 //             // console.log("headers status: ", headers_status);
    //                 //             // get image size
    //                 //             let indicated_size = new_size_from_headers(headers);
    //                 //             // console.log("indicated size: ", indicated_size);

    //                 //             // get image filetype
    //                 //             let filetype = new_filetype_from_headers(headers);
    //                 //             // console.log("filetype: ", filetype);

    //                 //             if (headers_status === null) {
    //                 //                 // console.log("error- not 200");
    //                 //                 resolve([false, indicated_size, filetype]);
    //                 //             } else {
    //                 //                 // console.log("error- not 200");
    //                 //                 resolve([headers_status, indicated_size, filetype]);
    //                 //             }
    //                 //         }
                    
    //                 //     }
    //                 // );
    //                 // if (headers_status === null) {
    //                 //                 // console.log("error- not 200");
    //                 //     resolve([false, indicated_size, filetype]);
    //                 // } else {
    //                 //     // console.log("error- not 200");
    //                 //     resolve([headers_status, indicated_size, filetype]);
    //                 // }
    //                 // console.log("200"); 
    //                 // get image status
    //                 // let headers_status = image_opt_status_from_headers(response);
    //                 // get image size
    //                 // let indicated_size = size_from_headers(response);

    //                 // get image filetype
    //                 // let filetype = filetype_from_headers(response);

    //             } else {
    //                 console.log("error");
    //                 // resolve([null, null, null]);
    //             }
    //         },
    //         (error) => {
    //             console.log("error");
    //             // resolve([null, null, null]);
    //         }
    //     )
    // });

    // return resultP;

}

function handleImageHeadersCallback(data,url, imageSource, kind){
    // console.log(data);
    // let h = highlightAsWebp.bind(null, im);
    // let g = highlightAsProcessing.bind(null, im);
    // let i = highlightAsNonViable.bind(null, im);
    // let b = highlightAsServiceWorkerImage.bind(null, im);
    let urlObj = new URL(url); 
    let status = data.status;
    let transfer_size = data.size;
    let filetype = data.filetype;
    // console.log("im: ", im);
    // let im = $(`img[src=${imageSource}]`);
    // console.log(im);
    // removeCustomStyles(im);
    // // if(optimisationSource == 'serviceWorker'){
    // //     im.classList.remove("scbca-gray"); 
    // //     b()
    // // }
    // if (status === "ready") {
    //     im.classList.remove("scbca-gray");
    //     h();
    // } else if (status === "non-viable") {
    //     im.classList.remove("scbca-gray");
    //     i();
    // } else if (status === "in-processing") {
    //     im.classList.remove("scbca-gray");
    //     g();
    // } else {
    //     im.classList.add("scbca-gray");
    // }    
    if (transfer_size !== null) {
        if(filetype.includes("image")){
            // add image to optimised images object ready for compression computation in popup.js
            if (kind == 'original'){
                unoptimizedSizeModel[url] = {
                    'status': status,
                    'transfer_size': transfer_size,
                    'pathname': urlObj.pathname + stripHAPsSearchParam(urlObj.search),
                    'filetype': filetype};
                // console.log(un);
            }
            if (kind == 'optimised'){
                optimizedSizeModel[url] = {
                    'status': status,
                    'transfer_size': transfer_size,
                    'pathname': urlObj.pathname + stripHAPsSearchParam(urlObj.search),
                    'filetype': filetype};
                // console.log(optimizedSizeModel);
            }
        }
    }else{
        let mode = "cors";
        let headers = new Headers({
        });
    
        let fetch_request = new Request(
            url,
            {
                "headers": new Headers(),
                "method": "GET",
                "mode": mode,
                "cache": "no-store"
            });
        
        
        fetch(fetch_request)
        .then(async function (response){
            if (response.status === 200) {
                transfer_size = await processChunkedResponse(response).then(onChunkedResponseComplete).catch(onChunkedResponseError);

                if(filetype.includes("image")){
                    if (kind == 'original'){
                        unoptimizedSizeModel[url] = {
                            'status': status,
                            'transfer_size': transfer_size,
                            // 'pathname': originalUrl.pathname + stripHAPsSearchParam(originalUrl.search),
                            'filetype': filetype};
                        // console.log(un);
                    }
                    if (kind == 'optimised'){
                        optimizedSizeModel[url] = {
                            'status': status,
                            'transfer_size': transfer_size,
                            // 'pathname': originalUrl.pathname + stripHAPsSearchParam(originalUrl.search),
                            'filetype': filetype};
                    }
                }
            } 

        })
    }
}

// function that makes a request to the original url of each image which then gives status information and file size
function populateUnoptimizedSizeModel(url, optimisationSource, im) {
    let urlObj = new URL(url)
    let mode = "cors";
    let headers = new Headers({
    });
    if(optimisationSource === 'origin'){
        mode = "same-origin";
        headers = new Headers({
            "cache-control": "no-cache",
            "accept": "image/webp,image/apng,image/*",
            "accept-encoding": "gzip, deflate, br",});
    }
    let fetch_request = new Request(
        url,
        {
            "headers": headers,
            "method": "GET",
            "mode": mode,
            "cache": "no-store"
        });

    let prom = fetch(fetch_request);


    // notify background.js of the url we want to monitor
    
    // console.log("sending: ", url);
    browser.runtime.sendMessage({
        command: "imageTransfer",
        url: url,
        image: im,
        kind: "original"
    }).then(
        () => { console.log("message sent")},
        () => { },
    );

    prom.then(
        (response) => {
            if (response.status === 200) {
            }
            else {
                console.log("error");
            }
        }                                
    );


    // prom.then(
    //     async (response) => {
    //         if (response.status === 200) {
    //             // check for Content-Length header, if it doesn't exist we must use chunked request
    //             if(response.headers.get("Content-Length") === null){
    //                 // get image size
    //                 let indicated_size = await processChunkedResponse(response).then(onChunkedResponseComplete).catch(onChunkedResponseError);
    //                 // get image filetype
    //                 let filetype = filetype_from_headers(response);
    //                 // filter out erroneous text/html responses that are sometimes picked up
    //                 if(filetype.includes("image")){
    //                     unoptimizedSizeModel[url] = {"transfer_size": indicated_size, "pathname": urlObj.pathname + urlObj.search, "filetype": filetype}
    //                 }
    //             // else if Content-length header readily available
    //             }else{
    //                 // get image size
    //                 let indicated_size = size_from_headers(response);
    //                 // get image filetype
    //                 let filetype = filetype_from_headers(response);
    //                 // filter out erroneous text/html responses that are sometimes picked up
    //                 if(filetype.includes("image")){
    //                     unoptimizedSizeModel[url] = {"transfer_size": indicated_size, "pathname": urlObj.pathname + stripHAPsSearchParam(urlObj.search), "filetype": filetype}
    //                 }
    //             }
    //         } else {
    //         }
    //     },
    //     (error) => {
    //         console.error(error);
    //     }
    // );

    
}

// function to strip HAPs params from search params of url for tranmitting pathnames to popup.js
function stripHAPsSearchParam(url){
    return url.replace('?sc-disable-haps=1', '');
}

// function for disabling haps of images
function toNoHAPsURL(original_url) {
    let use_url = new URL(original_url);
    use_url.search = "?sc-disable-haps=1";
    return use_url;
}

// function for getting the original url of an image using haps
function originalURLOfImage(im) {
    let dataset = im.dataset;
    if (dataset.hasOwnProperty("scbOriginalLocation")) {
    }
    else if (im.currentSrc) {
        dataset.scbOriginalLocation = im.currentSrc;
    }
    else {
        dataset.scbOriginalLocation = retrieving(im.style['backgroundImage'])
    }
    let original_url = dataset.scbOriginalLocation;
    return original_url;
}

// change images to unoptimized versions
function changeToUnoptimized() {
    currentView = "unoptimized";
    let images = document.querySelectorAll("*,img.lazyloaded");
    images.forEach((im) => {
        const from_url = im.currentSrc;

        if (canUseUrl(from_url)) {
            let url = new URL(im.currentSrc);
            let doc_hostname = document.location.hostname;
            // if serviceWorker image
            let optimised_image_url = getServiceWorkerUrl(url);
            if (optimised_image_url !== undefined){
                removeCustomStyles(im);
                //shimmercat.cloud -> original url 
                im.src = getOriginalFromServiceWorkerUrl(optimised_image_url);
            }else{
                if (url.hostname === doc_hostname) {
                    removeCustomStyles(im);
                    let original_url = originalURLOfImage(im);
                    let use_url = toNoHAPsURL(original_url);
                    im.src = use_url.toString();
                }
            }
            ;
        }

    });
}

// function for going from a serviceWorker url to an original via looking up it's corresponding domain in serviceWorker config
function getOriginalFromServiceWorkerUrl(url){
    let urlObj = new URL(url)
    var host = urlObj.host;
    domains = Object.values(serviceWorkerDomains);
    if (host in domains){
        const originalDomain = Object.keys(domains).find(key => domains[key] === host);
        return "https://" + originalDomain + urlObj.pathname + urlObj.search;
    }else{
        for (const domain of domains){
            if (domain.includes(host) || host.includes(domain)){
                const originalDomain = Object.keys(domains).find(key => domains[key] === host);
                return "https://" + originalDomain + urlObj.pathname + urlObj.search;
            }
        }
        return undefined
    }
}

// make select default view
let shimSelected = "select";

// event listener for on startup as well as when views are changed in popup.js
browser.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.hasOwnProperty("newShim")) {
            if (request.newShim === "select") {
                changeToSelected();
            } else if (request.newShim === "optimized") {
                changeToOptimized();
            } else if (request.newShim === "unoptimized") {
                changeToUnoptimized();
            }
            shimSelected = request.newShim;
            return { status: "ok" };
        } else if (request.hasOwnProperty("refreshView") && shimSelected === "select") {
            changeToSelected();
        }
        if(request.hasOwnProperty("headers")){
            let headers = request.headers;
            let im = request.image;
            let url = request.url;
            let kind = request. kind;
            // console.log(headers);
            // get image status
            let headers_status = new_image_opt_status_from_headers(headers);
            // console.log("headers status: ", headers_status);
            // get image size
            let indicated_size = new_size_from_headers(headers);
            // console.log("indicated size: ", indicated_size);

            // get image filetype
            let filetype = new_filetype_from_headers(headers);
            // console.log("filetype: ", filetype);

            let data = {
                "header_status": headers_status,
                "size": indicated_size,
                "filetype": filetype,
            };
            // console.log(data);
            handleImageHeadersCallback(data,url, im, kind);
            return { status: "ok" };
            // if (headers_status === null) {
            //     // console.log("error- not 200");
            //     resolve([false, indicated_size, filetype]);
            // } else {
            //     // console.log("error- not 200");
            //     resolve([headers_status, indicated_size, filetype]);
            // }
        }
    }
);

// function for checking whether a site is using the serviceWorker or not
function CheckWorkerProcess () {

    let scripts = this.document.scripts;
    for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src) {
            if (scripts[i].src.includes("sc-sw-installer")) {
                return true
            }
        }
    }
    return false;
}

// function for getting the supported serviceWorker domains from root/sc-sw.min.js
function getServiceWorkerDomains(){
    let origin = window.location.origin;
    //get sc script to get serviceWorker domains
    let fetch_sc_script = new Request(
        origin + "/sc-sw.min.js",
        {
            "method": "GET",
        });
        
    fetch(fetch_sc_script)
    .then(function(res){
        if (res.status === 200){
            return res.text()
        } else{
            return undefined;
        }
    }).then(function(data){
        if (data !== undefined){
            // get string indices for range of switch_domain_for_images object
            var start = data.search("switch_domains_for_images") + 26;
            var end =data.search("}") +1; 

            // create substring
            var serviceWorkerDomainsObjString = data.substring(start, end);
            // parse as JSON & save in global variable
            serviceWorkerDomains = JSON.parse(serviceWorkerDomainsObjString);
            serviceWorker = true;
        }
    }).then(function(){
        displaySelected()
    })
} 