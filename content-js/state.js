
// constant to define how much loss compensation to give chunked transfer encoded images
const CHUNKED_IMAGE_LOSS_COMPENSATION_PERCENT = 0.05;

// boolean to check whether some requests are chunked and thus require more time
let isChunked = false;
// boolean to check if we have manipulated DOM by changing view and thus mutating all selectors
let canSendModels = true;
// bolean to check if we've sent initial models yet
let hasSentModel = false

let optimizedSizeModel = null;
let unoptimizedSizeModel = null;
let currentView = null;
let Active = true;
let serviceWorker = false;
let serviceWorkerDomains = {};
let imageDict = {};

// function that iterates through images in DOM & returns original & optimised image sources
function* iterateOnWhitelistedImages() {
    // let images = document.querySelectorAll('*,img.lazyloaded');
    let images = document.querySelectorAll('img');
    let isServiceWorkerImage = false;
    for (let im of images) {
        if (canUseUrl(im.currentSrc)) {
            let originalUrl = new URL(im.currentSrc);
            let noHapsUrl = originalUrl.origin + originalUrl.pathname + stripHAPsSearchParam(originalUrl.search); 
            let optimisedUrl = '';
            let doc_hostname = document.location.hostname;

            // check if image is supported by the serviceWorker
            let optimised_image_url = getServiceWorkerUrl(originalUrl);
            if (optimised_image_url !== undefined){
                isServiceWorkerImage = true;

                optimisedUrl = optimised_image_url;
                imageDict[optimisedUrl] = im;
                populateUnoptimizedSizeModel(originalUrl, isServiceWorkerImage, im.src);
                yield [im, originalUrl, optimisedUrl, isServiceWorkerImage];
            // else image optimisation is processed via origin
            }else{
                optimisedUrl = originalURLOfImage(im);
                imageDict[noHapsUrl] = im;
                if (originalUrl.hostname === doc_hostname) {
                    isServiceWorkerImage = false;
                    // remove HAPS compression
                    originalUrl = toNoHAPsURL(originalURLOfImage(im));  
                    populateUnoptimizedSizeModel(originalUrl, isServiceWorkerImage, im.src);
                    yield [im, originalUrl, optimisedUrl, isServiceWorkerImage];
                }else {
                    try {
                        isServiceWorkerImage = true;
                        originalUrl = getOriginalFromServiceWorkerUrl(im.currentSrc);
                        optimisedUrl = im.currentSrc;
                        if(originalUrl !== undefined && optimisedUrl !== undefined){
                            im.src = originalUrl
                            imageDict[optimisedUrl] = im;
                            populateUnoptimizedSizeModel(originalUrl, isServiceWorkerImage, im.src);
                            yield [im, originalUrl, optimisedUrl, isServiceWorkerImage];    
                        }else{
                            // image different host from page and not serviceWorker

                            // check if image is shimmercat-enabled

                        }
                    } catch (error) {
                        console.log(error)
                    }
                }
            }
        }
        if (retrieving(im.style['backgroundImage'])) {
            let returned_url = retrieving(im.style['backgroundImage']);
            let optimisedUrl = '';
        
            let originalUrl = new URL(returned_url);
            imageDict[originalUrl] = im;
            let doc_hostname = document.location.hostname;
            
            // check if image is supported by the serviceWorker
            let optimised_image_url = getServiceWorkerUrl(originalUrl);
            if (optimised_image_url !== undefined){
                // isServiceWorkerImage = 'serviceWorker';
                isServiceWorkerImage = true;
                optimisedUrl = optimised_image_url;
                populateUnoptimizedSizeModel(originalUrl, isServiceWorkerImage, im.src);
                yield [im, originalUrl, optimisedUrl, isServiceWorkerImage];
            // else image optimisation is processed via origin
            }else{
                // optimisedUrl = originalUrl;
                optimisedUrl = originalURLOfImage(im);
                if (originalUrl.hostname === doc_hostname) {
                    // isServiceWorkerImage = 'origin'
                    isServiceWorkerImage = false;

                    // remove HAPS compression
                    originalUrl = toNoHAPsURL(originalURLOfImage(im)); 
                    populateUnoptimizedSizeModel(originalUrl, isServiceWorkerImage, im.src); 
                    yield [im, originalUrl, optimisedUrl, isServiceWorkerImage];
                // image compression not supported for the domain as it is not defined in serviceWorker and not the root url of the site
                }else continue;
            }
        }
    }
}

function* iterateOnAllImages() {
    // let images = document.querySelectorAll('*,img.lazyloaded');
    let images = document.querySelectorAll('img');
    let isServiceWorkerImage = false;
    for (let im of images) {
        if (canUseUrl(im.currentSrc)) {
            let originalUrl = new URL(im.currentSrc);
            let noHapsUrl = originalUrl.origin + originalUrl.pathname + stripHAPsSearchParam(originalUrl.search); 
            let optimisedUrl = '';
            let doc_hostname = document.location.hostname;

            optimisedUrl = originalURLOfImage(im);
            imageDict[noHapsUrl] = im;

            isServiceWorkerImage = false;
            // remove HAPS compression
            originalUrl = toNoHAPsURL(originalURLOfImage(im));  
            // instead of using populateUnoptimizedSizeModel we need to make a background workaround
            chrome.runtime.sendMessage({
                command: "imageFetch", 
                url: originalUrl,
                type: "original",
                image: im.src
            })
            yield [im, originalUrl, optimisedUrl, isServiceWorkerImage];

            // if (originalUrl.hostname === doc_hostname) {
            //     isServiceWorkerImage = false;
            //     // remove HAPS compression
            //     originalUrl = toNoHAPsURL(originalURLOfImage(im));  
            //     populateUnoptimizedSizeModel(originalUrl, isServiceWorkerImage, im.src);
            //     yield [im, originalUrl, optimisedUrl, isServiceWorkerImage];
            // }else {
            //     try {
            //         isServiceWorkerImage = true;
            //         originalUrl = getOriginalFromServiceWorkerUrl(im.currentSrc);
            //         optimisedUrl = im.currentSrc;
            //         if(originalUrl !== undefined && optimisedUrl !== undefined){
            //             im.src = originalUrl
            //             imageDict[optimisedUrl] = im;
            //             populateUnoptimizedSizeModel(originalUrl, isServiceWorkerImage, im.src);
            //             yield [im, originalUrl, optimisedUrl, isServiceWorkerImage];    
            //         }else{
            //             // image different host from page and not serviceWorker

            //             // check if image is shimmercat-enabled

            //         }
            //     } catch (error) {
            //         console.log(error)
            //     }
            // }
        }
        if (retrieving(im.style['backgroundImage'])) {
            let returned_url = retrieving(im.style['backgroundImage']);
            let optimisedUrl = '';
        
            let originalUrl = new URL(returned_url);
            imageDict[originalUrl] = im;
            let doc_hostname = document.location.hostname;

            optimisedUrl = originalURLOfImage(im);


            isServiceWorkerImage = false;

            // remove HAPS compression
            originalUrl = toNoHAPsURL(originalURLOfImage(im)); 
            //     // optimisedUrl = originalUrl;
            //     optimisedUrl = originalURLOfImage(im);
            //     if (originalUrl.hostname === doc_hostname) {
            //         // isServiceWorkerImage = 'origin'
            //         isServiceWorkerImage = false;

            //         // remove HAPS compression
            //         originalUrl = toNoHAPsURL(originalURLOfImage(im)); 

            // instead of using populateUnoptimizedSizeModel we need to make a background workaround
            chrome.runtime.sendMessage({
                command: "imageFetch", 
                url: originalUrl,
                type: "original",
                image: im.src
            })

            // populateUnoptimizedSizeModel(originalUrl, isServiceWorkerImage, im.src);
            yield [im, originalUrl, optimisedUrl, isServiceWorkerImage];
            
            // // check if image is supported by the serviceWorker
            // let optimised_image_url = getServiceWorkerUrl(originalUrl);
            // if (optimised_image_url !== undefined){
            //     // isServiceWorkerImage = 'serviceWorker';
            //     isServiceWorkerImage = true;
            //     optimisedUrl = optimised_image_url;
            //     populateUnoptimizedSizeModel(originalUrl, isServiceWorkerImage, im.src);
            //     yield [im, originalUrl, optimisedUrl, isServiceWorkerImage];
            // // else image optimisation is processed via origin
            // }else{
            //     // optimisedUrl = originalUrl;
            //     optimisedUrl = originalURLOfImage(im);
            //     if (originalUrl.hostname === doc_hostname) {
            //         // isServiceWorkerImage = 'origin'
            //         isServiceWorkerImage = false;

            //         // remove HAPS compression
            //         originalUrl = toNoHAPsURL(originalURLOfImage(im)); 
            //         populateUnoptimizedSizeModel(originalUrl, isServiceWorkerImage, im.src); 
            //         yield [im, originalUrl, optimisedUrl, isServiceWorkerImage];
            //     // image compression not supported for the domain as it is not defined in serviceWorker and not the root url of the site
            //     }else continue;
            // }
        }
    }
}




// function that displays various styles based on the status of the image
function displaySelected(isWhitelisted){
    imageDict = {};
    optimizedSizeModel = {};
    unoptimizedSizeModel = {};

    // only certain domains allowed
    if (isWhitelisted){
        for (let [im, originalUrl,optimisedUrl, isServiceWorkerImage] of iterateOnWhitelistedImages()) {
            // console.log(im);
            im.currentSrc = originalUrl;
            im.src = originalUrl;
    
            urlPointsToStatus(optimisedUrl, isServiceWorkerImage, originalUrl);
        } 
    }else{
        // all domains allowed
        for (let [im, originalUrl,optimisedUrl, isServiceWorkerImage] of iterateOnAllImages()) {
            // console.log(im);
            im.currentSrc = originalUrl;
            im.src = originalUrl;
    
            // urlPointsToStatus(optimisedUrl, isServiceWorkerImage, originalUrl);
            // need to make a CORS request so we need to pass urls to background.js and perform the requests there. 
            chrome.runtime.sendMessage({
                command: "imageFetch", 
                url: optimisedUrl,
                type: "optimised",
                image: originalUrl
            })
        }  

    }
}

// callback function for returning total chunk size of chunked image transfer
function onChunkedResponseComplete([result, response]) {
    return Math.round(result *(1 + CHUNKED_IMAGE_LOSS_COMPENSATION_PERCENT));
  }

// error handler for chunked image transfer
function onChunkedResponseError(err) {
    console.error(err)
}

// function that processes chunked image responses
function processChunkedResponse(response) {
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
    if (currentView === "selected") {
        // check if site is serviceWorker supported and if so, get serviceWorker domains that are used on the site
        serviceWorker =  CheckWorkerProcess();
        if (serviceWorker){
            getServiceWorkerDomains();
        }else{
            displaySelected();
        }
    }
}

// changes the view to selected
async function changeToSelected(isWhitelisted) {

    currentView = "selected";

    // check if site is serviceWorker supported and if so, get serviceWorker domains that are used on the site
    serviceWorker =  CheckWorkerProcess();
    if (serviceWorker){
        getServiceWorkerDomains(isWhitelisted);
    }else{
        displaySelected(isWhitelisted)
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
        () => {},
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
        "scbca-serviceworker",
        "scbca-optimised", 
        "scbca-original",
    ];
    for (let token of tokens) {
        im_element.classList.remove(token);
    }
}
function allAddCustomStyles(classname){
    // let images = document.querySelectorAll('*,img.lazyloaded');
    let images = document.querySelectorAll('img');
    //iterate through images and change src to the optimised version
    images.forEach((im) => {
        // remove styles
        removeCustomStyles(im);
        if (canUseUrl(im.currentSrc)) {
            let url = new URL(im.currentSrc);
            let doc_hostname = document.location.hostname;
            
            // optimised
            if(classname === 'scbca-optimised'){
                let dataset = im.dataset;
                    if (dataset.hasOwnProperty("scbOriginalLocation")) {
                        im.src = dataset.scbOriginalLocation;
                    }
                }else{
                    // unoptimised
                    let original_url = originalURLOfImage(im);
                    let use_url = toNoHAPsURL(original_url);
                    im.src = use_url.toString(); 
                }
                im.classList.add(classname) 

            // let dataset = im.dataset
            // if (dataset.hasOwnProperty("scbOriginalLocation")) {
            //     console.log("tru");
            //     im.src = dataset.scbOriginalLocation;
            //     im.classList.add(classname)
            // }
            // im.classList.add('scbca-optimised')
            // let optimised_image_url = getServiceWorkerUrl(url);
            // if (optimised_image_url !== undefined){
            //     im.src = optimised_image_url;
            //     im.classList.add('scbca-optimised')
            // }else{
            //     if (url.hostname === doc_hostname) {;
            //         let dataset = im.dataset;
            //         if (dataset.hasOwnProperty("scbOriginalLocation")) {
            //             im.src = dataset.scbOriginalLocation;
            //             im.classList.add('scbca-optimised')
            //         }
            //     }
            // }
        }
        if (retrieving(im.style['backgroundImage'])) {
            let returned_url = retrieving(im.style['backgroundImage']);
            let url = new URL(returned_url);
            let doc_hostname = document.location.hostname;
             // optimised
             if(classname === 'scbca-optimised'){
                let dataset = im.dataset;
                    if (dataset.hasOwnProperty("scbOriginalLocation")) {
                        im.src = dataset.scbOriginalLocation;
                    }
                }else{
                    // unoptimised
                    let original_url = originalURLOfImage(im);
                    let use_url = toNoHAPsURL(original_url);
                    im.src = use_url.toString(); 
                }
                im.classList.add(classname)
            // if (dataset.hasOwnProperty("scbOriginalLocation")) {
            //     im.src = dataset.scbOriginalLocation;
            //     im.classList.add(classname)
            // }
            
            // // if serviceWorker image
            // let optimised_image_url = getServiceWorkerUrl(url);
            // if (optimised_image_url !== undefined){
            //     // im.src = optimised_image_url;
            //     im.style.backgroundImage = `url(${optimised_image_url})`
            //     im.classList.add('scbca-optimised')
            // }else{
            //     if (url.hostname === doc_hostname) {
            //         let dataset = im.dataset;
            //         if (dataset.hasOwnProperty("scbOriginalLocation")) {
            //             im.src = dataset.scbOriginalLocation;
            //             im.classList.add('scbca-optimised')
            //         }
            //     }
            // }
        }
        
    }); 
    // find all elements with a css background image of the specified src
    for(var img of document.querySelectorAll((`div[data-bgset]`))){
        let bgSet = img.getAttribute('data-bgset')
        for (var file of Object.keys(unoptimizedSizeModel)){
            if(bgSet.includes(file) || bgSet === file){
                img.classList.add(classname);
            }
        }
    }
}



function whitelistedAddCustomStyles(classname){
    let images = document.querySelectorAll('*,img.lazyloaded');

    //iterate through images and change src to the optimised version
    images.forEach((im) => {
        // remove styles
        removeCustomStyles(im);
        if (canUseUrl(im.currentSrc)) {
            let url = new URL(im.currentSrc);
            let doc_hostname = document.location.hostname;
            let optimised_image_url = getServiceWorkerUrl(url);
            if (optimised_image_url !== undefined){
                // optimised
                if (classname === 'scbca-optimised'){
                    im.src = optimised_image_url;
                }else{
                    // unoptimised
                    im.src = getOriginalFromServiceWorkerUrl(optimised_image_url);
                }
                im.classList.add(classname)

            }else{
                if (url.hostname === doc_hostname) {;
                    // optimised
                    if(classname === 'scbca-optimised'){
                    let dataset = im.dataset;
                        if (dataset.hasOwnProperty("scbOriginalLocation")) {
                            im.src = dataset.scbOriginalLocation;
                        }
                    }else{
                        // unoptimised
                        let original_url = originalURLOfImage(im);
                        let use_url = toNoHAPsURL(original_url);
                        im.src = use_url.toString(); 
                    }
                    im.classList.add(classname)
                }
            }
        }
        if (retrieving(im.style['backgroundImage'])) {
            let returned_url = retrieving(im.style['backgroundImage']);
            let url = new URL(returned_url);
            let doc_hostname = document.location.hostname;
            
            // if serviceWorker image
            let optimised_image_url = getServiceWorkerUrl(url);
            if (optimised_image_url !== undefined){
                // optimised
                if (classname === 'scbca-optimised'){
                    im.src = optimised_image_url;
                }else{
                    // unoptimised
                    im.src = getOriginalFromServiceWorkerUrl(optimised_image_url);
                }
                im.classList.add(classname)
            }else{
                if (url.hostname === doc_hostname) {
                    // optimised
                    if(classname === 'scbca-optimised'){
                        let dataset = im.dataset;
                            if (dataset.hasOwnProperty("scbOriginalLocation")) {
                                im.src = dataset.scbOriginalLocation;
                            }
                        }else{
                            // unoptimised
                            let original_url = originalURLOfImage(im);
                            let use_url = toNoHAPsURL(original_url);
                            im.src = use_url.toString(); 
                        }
                        im.classList.add(classname)
                }
            }
        }
        
    }); 
    // find all elements with a css background image of the specified src
    for(var img of document.querySelectorAll((`div[data-bgset]`))){
        let bgSet = img.getAttribute('data-bgset')
        for (var file of Object.keys(unoptimizedSizeModel)){
            if(bgSet.includes(file) || bgSet === file){
                img.classList.add(classname);
            }
        }
    }
}

// function that changes the view to optimised images only 
function changeToOptimized(isWhitelisted) {
    if(hasSentModel){
        canSendModels = false; 
        currentView = 'optimized';

        if(isWhitelisted){
            whitelistedAddCustomStyles('scbca-optimised')
        }else{
            allAddCustomStyles('scbca-optimised')
        }
        
    }
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


// function that reads header values for a given image and determines the status of the image and how it will be visualised 
function image_opt_status_from_headers(headers) {
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
function size_from_headers(headers) {
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
function filetype_from_headers(headers){
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
function urlPointsToStatus(url, isServiceWorkerImage, im) {
    let mode = "cors";
    let headers = new Headers({
    });

    if(!isServiceWorkerImage){
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
    browser.runtime.sendMessage({
        command: "imageTransfer",
        url: url,
        image: im,
        kind: "optimised",
        isServiceWorker: isServiceWorkerImage
    }).then(
        () =>{}, 
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

}

// function that handles all image metadata to get ready to send to popup
function handleImageHeadersCallback(data,url, imageSource, kind){
    let urlObj = new URL(url); 
    let im = imageDict[urlObj]
    let h = highlightAsWebp.bind(null, im);
    let g = highlightAsProcessing.bind(null, im);
    let i = highlightAsNonViable.bind(null, im);
    let status = data.status;
    let transfer_size = data.size;
    let filetype = data.filetype;

    // if image is the optimised version we want to classify it
    if (kind === 'optimised'){
        classifyImages(status, imageSource, kind);
    }
    
    if (transfer_size !== null) {
        if(filetype.includes("image")){
            let split_filename_arr = filetype.split('/');
            filetype = split_filename_arr[1];
            // add image to optimised images object ready for compression computation in popup.js
            if (kind == 'original'){
                unoptimizedSizeModel[url] = {
                    'status': status,
                    'transfer_size': transfer_size,
                    'pathname': urlObj.pathname + stripHAPsSearchParam(urlObj.search),
                    'filetype': filetype};
            }
            if (kind == 'optimised'){
                optimizedSizeModel[url] = {
                    'status': status,
                    'transfer_size': transfer_size,
                    'pathname': urlObj.pathname + stripHAPsSearchParam(urlObj.search),
                    'filetype': filetype};
            }
        }
    }else{
        isChunked = true;
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
                    let split_filename_arr = filetype.split('/');
                    filetype = split_filename_arr[1];
                    if (kind == 'original'){
                        unoptimizedSizeModel[url] = {
                            'status': status,
                            'transfer_size': transfer_size,
                            'pathname': urlObj.pathname + stripHAPsSearchParam(urlObj.search),
                            'filetype': filetype};
                    }
                    if (kind == 'optimised'){
                        optimizedSizeModel[url] = {
                            'status': status,
                            'transfer_size': transfer_size,
                            'pathname': urlObj.pathname + stripHAPsSearchParam(urlObj.search),
                            'filetype': filetype};
                    }
                }
                return;
            } 
            else{
                console.error("Request failed");
                return;
            }
        })
        .catch((error) => {
            console.error(error);
            return;
        })
    }
}

// function that classifies images
function classifyImages(status, url){

    // find all img elements with the specified src
    for(var img of document.querySelectorAll(`img[src='${url}']`)){
        let h = highlightAsWebp.bind(null, img);
        let g = highlightAsProcessing.bind(null, img);
        let i = highlightAsNonViable.bind(null, img);
        removeCustomStyles(img);
        if (status === "ready") {
            img.classList.remove("scbca-gray");
            h();
        } else if (status === "non-viable") {
            img.classList.remove("scbca-gray");
            i();
        } else if (status === "in-processing") {
            img.classList.remove("scbca-gray");
            g();
        } else {
            img.classList.add("scbca-gray");
        }  
        
    }

    // find all elements with a css background image of the specified src
    for(var img of document.querySelectorAll((`div[data-bgset]`))){
        let bgSet = img.getAttribute('data-bgset')
        if(bgSet.includes(url) || bgSet === url){
            let h = highlightAsWebp.bind(null, img);
            let g = highlightAsProcessing.bind(null, img);
            let i = highlightAsNonViable.bind(null, img);
            removeCustomStyles(img);
            if (status === "ready") {
                img.classList.remove("scbca-gray");
                h();
            } else if (status === "non-viable") {
                img.classList.remove("scbca-gray");
                i();
            } else if (status === "in-processing") {
                img.classList.remove("scbca-gray");
                g();
            } else {
                img.classList.add("scbca-gray");
            }  
        }
    }
}

// function that makes a request to the original url of each image which then gives status information and file size
function populateUnoptimizedSizeModel(url, isServiceWorkerImage, im) {
    let urlObj = new URL(url)
    let mode = "cors";
    let headers = new Headers({
    });
    if(!isServiceWorkerImage){
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
    browser.runtime.sendMessage({
        command: "imageTransfer",
        url: url,
        image: im,
        kind: "original"
    }).then(
        () => {},
        () => { },
    );

    prom.then(
        (response) => {
            if (response.status === 200) {
            }
            else {
                console.log("error");
            }
        }, 
        (response) => {}                                
    );
    
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
function changeToUnoptimized(isWhitelisted) {
    if(hasSentModel){
        canSendModels = false;
        currentView = "unoptimized";

        if(isWhitelisted){
            whitelistedAddCustomStyles('scbca-original')
        }else{
            allAddCustomStyles('scbca-original') 
        }
        // let images = document.querySelectorAll("*,img.lazyloaded");
        // images.forEach((im) => {
        //     // remove styles
        //     removeCustomStyles(im);
        //     const from_url = im.currentSrc;
        //     if (canUseUrl(from_url)) {
        //         let url = new URL(im.currentSrc);
        //         let doc_hostname = document.location.hostname;
        //         // if serviceWorker image
        //         let optimised_image_url = getServiceWorkerUrl(url);
        //         if (optimised_image_url !== undefined){
        //             //shimmercat.cloud -> original url  
        //             im.src = getOriginalFromServiceWorkerUrl(optimised_image_url);
        //             im.classList.add('scbca-original')
        //         }else{
        //             if (url.hostname === doc_hostname) {
        //                 let original_url = originalURLOfImage(im);
        //                 let use_url = toNoHAPsURL(original_url);
        //                 im.src = use_url.toString();
        //                 im.classList.add('scbca-original')
        //             }
        //         }
        //         ;
        //     }
        // });
        // // find all elements with a css background image of the specified src
        // for(var img of document.querySelectorAll((`div[data-bgset]`))){
        //     let bgSet = img.getAttribute('data-bgset')
        //     for (var file of Object.keys(unoptimizedSizeModel)){
        //         if(bgSet.includes(file) || bgSet === file){
        //             img.classList.add('scbca-original');
        //         }
        //     }
        // }
    }
}

// function for going from a serviceWorker url to an original via looking up it's corresponding domain in serviceWorker config
function getOriginalFromServiceWorkerUrl(url){
    let urlObj = new URL(url)
    var host = urlObj.host;
    domains = Object.values(serviceWorkerDomains);
    if (host in domains){
        const originalDomain = Object.keys(domains).find(key => domains[key] === host);
        return "https://" + Object.keys(serviceWorkerDomains)[originalDomain] + urlObj.pathname + urlObj.search;
    }else{
        for (const domain of domains){
            if (domain.includes(host) || host.includes(domain)){
                const originalDomain = Object.keys(domains).find(key => domains[key] === host);
                return "https://" + Object.keys(serviceWorkerDomains)[originalDomain] + urlObj.pathname + urlObj.search;
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
            console.log("Whitelisted? ", request.whitelist);
            if (request.newShim === "select") {
                changeToSelected(request.whitelist);
            } else if (request.newShim === "optimized") {
                changeToOptimized(request.whitelist);
            } else if (request.newShim === "unoptimized") {
                changeToUnoptimized(request.whitelist);
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
            // get image status
            let headers_status = image_opt_status_from_headers(headers);
            // get image size
            let indicated_size = size_from_headers(headers);

            // get image filetype
            let filetype = filetype_from_headers(headers);

            let data = {
                "status": headers_status,
                "size": indicated_size,
                "filetype": filetype,
            };
            handleImageHeadersCallback(data,url, im, kind);
            return { status: "ok" };
        }

        if(request.hasOwnProperty("notification")){
            // all images have been processed, now set timeout
            if(canSendModels){
                if(!isChunked){
                    window.setTimeout(sendModelSummaries, 2000);
                    hasSentModel = true;
                    // sendModelSummaries()
                }else{
                    // sendModelSummaries()
                    window.setTimeout(sendModelSummaries, 4000);
                    hasSentModel = true;
                }
            }   

        
        }
        if(request.hasOwnProperty("loaded")){
            // allow sending of models
            hasSentModel = false;
            canSendModels = true;
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
function getServiceWorkerDomains(isWhitelisted){
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
        displaySelected(isWhitelisted)
    })
} 