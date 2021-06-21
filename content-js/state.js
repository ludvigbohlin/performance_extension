// constant to define how much loss compensation to give chunked transfer encoded images
const CHUNKED_IMAGE_LOSS_COMPENSATION_PERCENT = 0.05;
// boolean to check whether some requests are chunked and thus require more time
let isChunked = false;
// boolean to check if we have manipulated DOM by changing view and thus mutating all selectors
let canSendModels = true;
// boolean to check if we've sent initial models yet
let hasSentModel = false;

// image payload data definitions
let optimizedSizeModel = null;
let unoptimizedSizeModel = null;
let currentView = null;
let Active = true;
let imageDict = {};

// array containing all urls we wish to ignore in any image parsing (used for non-whitelist functionality)
let IGNORED_IMAGE_URLS = [
    "cdn.klarna.com",
    "shop.textalk.se",
    "www.juliaspearls.com",
    "images.ctfassets.net"
]

// function that iterates over all images on the screen
function* iterateOverImages() {
    let images = document.querySelectorAll('img');
    // iterate over all images on the page
    for (let im of images) {
        // check for aria-hidden images, we want to ignore these as they serve no purpose
        // also check if image domain is blacklisted
        if (canUseUrl(im.currentSrc)) {
            if((im.getAttribute("aria-hidden") ===  "true") || ( IGNORED_IMAGE_URLS.includes(new URL(im.currentSrc).host)) ){
                continue;
            }
            let originalUrl = new URL(im.currentSrc);
            let noHapsUrl = originalUrl.origin + originalUrl.pathname + stripHAPsSearchParam(originalUrl.search); 
            let optimisedUrl = '';

            optimisedUrl = originalURLOfImage(im);
            imageDict[noHapsUrl] = im;

            // remove HAPS compression
            originalUrl = toNoHAPsURL(originalURLOfImage(im));  
            // send UNOPTIMISED image details to background script so we can make a CORS request to get the headers/details
            chrome.runtime.sendMessage({
                command: "imageFetch", 
                url: originalUrl,
                type: "original",
                image: im.src
            })
            // return image details to parent function 
            yield [im, originalUrl, optimisedUrl];
        }
        // if the image (using background-img css) src is valid
        if (retrieving(im.style['backgroundImage'])) {
            if((im.getAttribute("aria-hidden") ===  "true") || ( IGNORED_IMAGE_URLS.includes(new URL(im.currentSrc).host)) ){
                continue;
            }
            let returned_url = retrieving(im.style['backgroundImage']);
            let optimisedUrl = '';
        
            let originalUrl = new URL(returned_url);
            imageDict[originalUrl] = im;

            optimisedUrl = originalURLOfImage(im);

            // remove HAPS compression
            originalUrl = toNoHAPsURL(originalURLOfImage(im)); 

            // send UNOPTIMISED image details to background script so we can make a CORS request to get the headers/details
            chrome.runtime.sendMessage({
                command: "imageFetch", 
                url: originalUrl,
                type: "original",
                image: im.src
            })

            yield [im, originalUrl, optimisedUrl];
        }
    }
}

// function that displays various styles based on the status of the image
function displaySelected(){
    imageDict = {};
    optimizedSizeModel = {};
    unoptimizedSizeModel = {};

    // iterate over all images on page
    for (let [im, originalUrl,optimisedUrl] of iterateOverImages()) {
        im.currentSrc = originalUrl;
        im.src = originalUrl;

        // send OPTIMISED image details to background script so we can make a CORS request to get the headers/details
        setTimeout(
            chrome.runtime.sendMessage({
                command: "imageFetch", 
                url: optimisedUrl,
                type: "optimised",
                image: originalUrl
            })
        , 100);
    }  
    // functionality that is used to display failure in popup for sites have no same domain images and whitelist checkbox is unchecked
    setTimeout(function(){
        if (Object.keys(unoptimizedSizeModel).length == 0){
            browser.runtime.sendMessage({
                active: false,
                error: 'unsupported'
            });
        }
    }, 6000)
}

// refreshes selectedview 
async function refreshSelectedView() {
    if (currentView === "selected") {
        displaySelected();
    }
}

// changes the view to selected
async function changeToSelected() {
    currentView = "selected";
    displaySelected()
}

// function that sends data to popup.js
function sendModelSummaries(cors_error=true) {
    var domain  = window.location.hostname
    browser.runtime.sendMessage({
        'kind': 'model-summary',
        'unoptimized': unoptimizedSizeModel,
        'optimized': optimizedSizeModel,
        'active': Active,
        'cors_error': cors_error,
        'domain' : domain
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
// function that adds all custom styles on view change for when whitelist checkbox unchecked
function addCustomStyles(classname){
    let images = document.querySelectorAll('img');
    //iterate through images and change src to the optimised version
    images.forEach((im) => {
        // remove styles
        removeCustomStyles(im);
        if (canUseUrl(im.currentSrc)) {
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
        if (retrieving(im.style['backgroundImage'])) {
             // optimised
             if(classname === 'scbca-optimised'){
                let dataset = im.dataset;
                    if (dataset.hasOwnProperty("scbOriginalLocation")) {
                        im.src = dataset.scbOriginalLocation;
                    }
                // unoptimised
                }else{
                    let original_url = originalURLOfImage(im);
                    let use_url = toNoHAPsURL(original_url);
                    im.src = use_url.toString(); 
                }
                im.classList.add(classname)
        }
        
    }); 
    // add style to all elements with a css background image of the specified src
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
function changeToOptimized() {
    if(hasSentModel){
        canSendModels = false; 
        currentView = 'optimized';
        addCustomStyles('scbca-optimised')
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
function getImageOptimisationStatus(headers) {
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
function getSizeFromHeaders(headers) {
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
function getFiletypeFromHeaders(headers){
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

// function that handles all image metadata to get ready to send to popup
function handleImageHeadersCallback(data,url, imageSource, kind){
    let urlObj = new URL(url); 
    let status = data.status;
    let transfer_size = data.size;
    let filetype = data.filetype;

    // if image is the optimised version we want to classify it
    if (kind === 'optimised'){
        classifyImages(status, imageSource, kind);
    }
    
    // if we have transfer size (i.e not using a chunked transfer encoding)
    if (transfer_size !== null) {
        if(filetype.includes("image")){
            let split_filename_arr = filetype.split('/');
            filetype = split_filename_arr[1];
            // add image to optimised images object ready for compression computation in popup.js
            if (kind == 'original'){
                unoptimizedSizeModel[url] = {
                    'status': status,
                    'transfer_size': transfer_size,
                    'pathname': urlObj.pathname,
                    'filetype': filetype};
            }
            if (kind == 'optimised'){
                optimizedSizeModel[url] = {
                    'status': status,
                    'transfer_size': transfer_size,
                    'pathname': urlObj.pathname,
                    'filetype': filetype};
            }
        }
    }else{
        // if image is using a chunked transfer encoding
        isChunked = true;
        // we need background script to fetch the image and compute the filesize from the image chunks
        chrome.runtime.sendMessage({
            command: "chunkedImageFetch", 
            url: url,
            kind,
            status: status,
            pathname: urlObj.pathname + stripHAPsSearchParam(urlObj.search),
            filetype: filetype 
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


// function to strip HAPs params from search params of url for transmitting pathnames to popup.js
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
    if(hasSentModel){
        canSendModels = false;
        currentView = "unoptimized";
        addCustomStyles('scbca-original')
    }
}

// make select default view
let shimSelected = "select";

// event listener for on startup as well as when views are changed in popup.js
browser.runtime.onMessage.addListener(
    function (request) {
        // view change
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
        // we have received headers for an image
        if(request.hasOwnProperty("headers")){
            let headers = request.headers;
            let im = request.image;
            let url = request.url;
            let kind = request. kind;
            // get image status
            let headers_status = getImageOptimisationStatus(headers);
            // get image size
            let indicated_size = getSizeFromHeaders(headers);

            // get image filetype
            let filetype = getFiletypeFromHeaders(headers);

            let data = {
                "status": headers_status,
                "size": indicated_size,
                "filetype": filetype,
            };
            handleImageHeadersCallback(data,url, im, kind);
            return { status: "ok" };
        }
        // all images have been processed so we can now send image payload data to popup
        if(request.hasOwnProperty("notification")){
            // all images have been processed, now set timeout
            if(canSendModels){
                if(!isChunked){
                    window.setTimeout(sendModelSummaries, 2000);  
                    hasSentModel = true;
                }else{
                    window.setTimeout(sendModelSummaries, 4000);
                    hasSentModel = true;
                }
            }   
        }
        // popup has loaded, thus we need to reset model sending states
        if(request.hasOwnProperty("loaded")){
            // allow sending of models
            hasSentModel = false;
            canSendModels = true;
        }
        
        // chunked image fetch details have been returned
        if (request.hasOwnProperty("transfer_size")){
            var filetype = request.filetype;
            var kind = request.kind;
            var status = request.status;
            var url = request.url;
            var urlObj = new URL(url);
            var transfer_size = request.transfer_size;
            if(filetype.includes("image")){
                let split_filename_arr = filetype.split('/');
                filetype = split_filename_arr[1];
                if (kind == 'original'){
                    unoptimizedSizeModel[url] = {
                        'status': status,
                        'transfer_size': transfer_size,
                        'pathname': urlObj.pathname,
                        'filetype': filetype};
                }
                if (kind == 'optimised'){
                    optimizedSizeModel[url] = {
                        'status': status,
                        'transfer_size': transfer_size,
                        'pathname': urlObj.pathname,
                        'filetype': filetype};
                }
            }
            return { status: "ok" };
        }
}
);