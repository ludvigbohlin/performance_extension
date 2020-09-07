const CHUNKED_IMAGE_LOSS_COMPENSATION_PERCENT = 0.05;

let optimizedSizeModel = null;
let unoptimizedSizeModel = null;
let currentView = null;
let Active = true;
let serviceWorker = false;
let serviceWorkerDomains = {};
function* iterateOnImages() {
    let images = document.querySelectorAll('*,img.lazyloaded');
    let optimisationSource = '';
    for (let im of images) {

        if (canUseUrl(im.currentSrc)) {
            let originalUrl = new URL(im.currentSrc);
            let optimisedUrl = '';
            let doc_hostname = document.location.hostname;

            let optimised_image_url = getServiceWorkerUrl(originalUrl);
            if (optimised_image_url !== undefined){
                optimisationSource = 'serviceWorker';
                optimisedUrl = optimised_image_url;
                populateUnoptimizedSizeModel(originalUrl, optimisationSource);
                yield [im, originalUrl, optimisedUrl, optimisationSource];
            }else{
                optimisedUrl = originalUrl;
                if (originalUrl.hostname === doc_hostname) {
                    optimisationSource = 'origin'
                    originalUrl = toNoHAPsURL(originalURLOfImage(im));  
                    populateUnoptimizedSizeModel(originalUrl, optimisationSource);
                    yield [im, originalUrl, optimisedUrl, optimisationSource];
                }else {
                    console.log("continuing....");
                    continue;
                }
            }
        }
        if (retrieving(im.style['backgroundImage'])) {
            let returned_url = retrieving(im.style['backgroundImage']);
            let optimisedUrl = '';
        
            let originalUrl = new URL(returned_url);
            let doc_hostname = document.location.hostname;
            
            let optimised_image_url = getServiceWorkerUrl(originalUrl);
            if (optimised_image_url !== undefined){
                optimisationSource = 'serviceWorker';
                optimisedUrl = optimised_image_url;
                populateUnoptimizedSizeModel(originalUrl, optimisationSource);
                yield [im, originalUrl, optimisedUrl, optimisationSource];
            }else{
                optimisedUrl = originalUrl;
                if (originalUrl.hostname === doc_hostname) {
                    optimisationSource = 'origin'
                    originalUrl = toNoHAPsURL(originalURLOfImage(im)); 
                    populateUnoptimizedSizeModel(originalUrl, optimisationSource); 
                    yield [im, originalUrl, optimisedUrl, optimisationSource];
                }else continue;
            }
        }
    }
}


function combinedDisplaySelected(){
    optimizedSizeModel = {};
    unoptimizedSizeModel = {};
    for (let [im, originalUrl,optimisedUrl, optimisationSource] of iterateOnImages()) {
        let h = highlightAsWebp.bind(null, im);
        let g = highlightAsProcessing.bind(null, im);
        let i = highlightAsNonViable.bind(null, im);
        let b = highlightAsServiceWorkerImage.bind(null, im);

        
        im.currentSrc = originalUrl;
        im.src = originalUrl;

        urlPointsToStatus(optimisedUrl, optimisationSource)
            .then(([status, transfer_size, filetype]) => {
                removeCustomStyles(im);
                if(optimisationSource == 'serviceWorker'){
                    im.classList.remove("scbca-gray"); 
                    b()
                }
                else if (status === "ready") {
                    im.classList.remove("scbca-gray");
                    h();
                } else if (status === "non-viable") {
                    im.classList.remove("scbca-gray");
                    i();
                } else if (status === "in-processing") {
                    im.classList.remove("scbca-gray");
                    g();
                } else {
                    im.classList.add("scbca-gray");
                }    
                if (transfer_size !== null) {
                    if(filetype.includes("image")){
                        optimizedSizeModel[optimisedUrl] = {
                            'status': status,
                            'transfer_size': transfer_size,
                            'pathname': originalUrl.pathname + stripHAPsSearchParam(originalUrl.search),
                            'filetype': filetype};
                    }
                }else{
                    continue;
                }   
                }
                
        );
    } 
}

function onChunkedResponseComplete([result, response]) {
    return result *(1 + CHUNKED_IMAGE_LOSS_COMPENSATION_PERCENT);
  }
  
function onChunkedResponseError(err) {
    console.error(err)
}
  
  function processChunkedResponse(response) {
    var text = '';
    var count = 0;
    var chunkSize = 0; 
    var reader = response.body.getReader()
    var decoder = new TextDecoder();
    
    return readChunk();
  
    function readChunk() {
      return reader.read().then(appendChunks);
    }
  
    function appendChunks(result) {
      var chunk = decoder.decode(result.value || new Uint8Array, {stream: !result.done});
    //   console.log('got chunk of', chunk.length, 'bytes')
      chunkSize += chunk.length;
    //   text += chunk
      count+=1;
    //   console.log('text so far is', text.length, 'bytes\n');
      if (result.done) {
        // console.log(response);
        // console.log('total chunkSize: ', chunkSize)
        // return text;
        return [chunkSize, response];
      } else {
            // chunkSize += 4
            // console.log('recursing')
            return readChunk();
      }
    }
  }

function getServiceWorkerUrl(url){
    // console.log("service check: ", url)
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

async function refreshSelectedView() {
    let domains = await getServiceWorkerDomains();
    if (currentView === "selected") {
        serviceWorker =  CheckWorkerProcess();
        if (serviceWorker){
            getServiceWorkerDomains();
        }else{
            combinedDisplaySelected();
        }
        // serviceWorker = CheckWorkerProcess();

        // if (serviceWorker){
        //     getServiceWorkerDomains();
        // }
        // combinedDisplaySelected();
        // if (CheckWorkerProcess()){
        //     serviceWorkerDisplay();        
        // }else{
        // displaySelected();
        // }
        // window.setTimeout(refreshSelectedView, 15000);
        window.setTimeout(sendModelSummaries, 3000);
    }
}


async function changeToSelected() {
    if (currentView !== "selected") {
        window.setTimeout(sendModelSummaries, 3000);
        window.setTimeout(refreshSelectedView, 15000);
    }
    currentView = "selected";
    // var result = await CheckWorkerProcess();
    // console.log(result)

    serviceWorker =  CheckWorkerProcess();
    if (serviceWorker){
        getServiceWorkerDomains();
    }else{
        combinedDisplaySelected();
    }
    // let domains = await getServiceWorkerDomains();
    // if (CheckWorkerProcess()){
    //     getServiceWorkerDomains();
    //     // serviceWorkerDisplay();        
    // }else{
    // displaySelected();
    // }
    // combinedDisplaySelected();
}


function sendModelSummaries() {
    // CheckWorkerProcess();
    // serviceWorker = CheckWorkerProcess();
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


function highlightAsWebp(im_element) {
    im_element.classList.add("scbca-webp");
}


function highlightAsProcessing(im_element) {
    im_element.classList.add("scbca-processing");
}


function highlightAsNonViable(im_element) {
    im_element.classList.add("scbca-non-viable");
}

function highlightAsServiceWorkerImage(im_element){
    im_element.classList.add("scbca-serviceworker");
 
}
function removeCustomStyles(im_element) {
    const tokens = [
        "scbca-gray",
        "scbca-good",
        "scbca-webp",
        "scbca-processing",
        "scbca-non-viable",
    ];
    for (let token of tokens) {
        im_element.classList.remove(token);
    }
}


function changeToOptimized() {
    currentView = 'optimized';
    let images = document.querySelectorAll('*,img.lazyloaded');
    images.forEach((im) => {
        if (canUseUrl(im.currentSrc)) {
            let url = new URL(im.currentSrc);
            let doc_hostname = document.location.hostname;
            if (url.hostname === doc_hostname) {
                removeCustomStyles(im);
                let dataset = im.dataset;
                if (dataset.hasOwnProperty("scbOriginalLocation")) {
                    im.src = dataset.scbOriginalLocation;
                }
            }
            ;
        }
        if (retrieving(im.style['backgroundImage'])) {
            let returned_url = retrieving(im.style['backgroundImage']);
            let url = new URL(returned_url);
            let doc_hostname = document.location.hostname;
            if (url.hostname === doc_hostname) {
                removeCustomStyles(im);
                let dataset = im.dataset;
                if (dataset.hasOwnProperty("scbOriginalLocation")) {
                    im.src = dataset.scbOriginalLocation;
                }
            }
        }
    });
}

function retrieving(url) {
    if (url == null || url == undefined || url.length == 0) {
        //console.log("Url is found null")
        //console.log(url)
        return false;

    }
    else {
        // console.log(url)
        // console.log(`Before placing ${typeof (url)}`)
        // console.log(`The length = ${url.length}`)
        url = "https://" + document.location.hostname + url.replace(/^url\(['"](.+)['"]\)/, '$1');
        // PARAMETER FOR IMAGES SELECTION
        var dotIndex = url.lastIndexOf('.');
        try { var ext = url.substring(dotIndex); }
        catch (e) {
            var ext = ""
        }
        let images_extensions = ['.png', '.jpg']
        if (images_extensions.includes(ext)) {

            // console.log(`from retriving funciton ${url}`)

            return url;
        }
        else if (/.jpg\?preset|.png\?preset|.gif\?preset/.test(url)) {
            // console.log("Checked via jpg")
            // console.log(url)
            return url;
        }
        else {
            // console.log("The issue is ")
            // console.log(url)
        }

    }
}

function canUseUrl(url) {
    // console.log(url);
    if (url === null || url === undefined) {
        return false;
    }
    return url.startsWith("https://");
}


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

/**
 *
 * @param {Response} response
 * @returns {?string}
 */
function



    image_opt_status_from_headers(response) {
    let headers_status = null;
    // console.log(response);
    for (let
        /** @type String[] */
        header_val_arr of response.headers.entries()) {
        let [header_name, header_value] = header_val_arr;
        // console.log(`The header value ${header_name} and ${header_value}`)
        // console.log(header_val_arr);

        if (header_name === "sc-note") {
            // console.log("SC-NOTE!!!!!");
            // Active = true;
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
                // console.log('Open the value')
            }
        }


    }
    return headers_status;
}

/**
 *
 * @param {Response} response
 * @returns {?number}
 */
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


function urlPointsToStatus(url, optimisationSource) {
    // console.log(optimisationSource);
    // console.log(url);
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

    let resultP = new Promise((resolve, reject) => {
        prom.then(
            (response) => {
                if (response.status === 200) {
                    let headers_status = image_opt_status_from_headers(response);
                    // for (var pair of response.headers.entries()) {
                    //     console.log(pair[0]+ ': '+ pair[1]);
                    //  }
                    let indicated_size = size_from_headers(response);

                    let filetype = filetype_from_headers(response);
                    // filetype = response.headers.get()
                    // console.log(filetype);
                    if (headers_status === null) {

                        resolve([false, indicated_size, filetype]);
                    } else {

                        resolve([headers_status, indicated_size, filetype]);
                    }
                } else {
                    resolve([null, null, null]);
                }
            },
            (error) => {
                resolve([null, null, null]);
            }
        )
    });

    return resultP;
}

function populateUnoptimizedSizeModel(url, optimisationSource) {
    // console.log("url: ", url);
    // console.log("opt source: ", optimisationSource);
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

    prom.then(
        async (response) => {
            if (response.status === 200) {
                // check for Content-Length header, if it doesn't exist we must use chunked request
                if(response.headers.get("Content-Length") === null){
                    console.log("No content type header!!!");
                    console.log(response);
                    // need to check and potentially refactor this
                    let indicated_size = await processChunkedResponse(response).then(onChunkedResponseComplete).catch(onChunkedResponseError);
                    // console.log("indicated size (chunked)", indicated_size)
                    let filetype = filetype_from_headers(response);
                    if(filetype.includes("image")){
                        unoptimizedSizeModel[url] = {"transfer_size": indicated_size, "pathname": urlObj.pathname + urlObj.search}
                    }
                }else{
                    // for (var pair of response.headers.entries()) {
                    //     console.log(pair[0]+ ': '+ pair[1]);
                    // }
                    // Active = true;
                    let indicated_size = size_from_headers(response);
                    let filetype = filetype_from_headers(response);
                    // console.log(filetype);
                    // console.log("indicated size (non-chunked)", indicated_size)
                    if(filetype.includes("image")){
                        console.log(url);
                        unoptimizedSizeModel[url] = {"transfer_size": indicated_size, "pathname": urlObj.pathname + stripHAPsSearchParam(urlObj.search)}
                    }
                }
            } else {
                console.log(response);
            }
        },
        (error) => {
            console.error(error);
        }
    );

    
}

function stripHAPsSearchParam(url){
    return url.replace('?sc-disable-haps=1', '');
}

function toNoHAPsURL(original_url) {
    let use_url = new URL(original_url);
    use_url.search = "?sc-disable-haps=1";
    return use_url;
}

function originalURLOfImage(im) {
    let dataset = im.dataset;
    // console.log(dataset);
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

function changeToUnoptimized() {
    currentView = "unoptimized";
    let images = document.querySelectorAll("*,img.lazyloaded");
    images.forEach((im) => {
        const from_url = im.currentSrc;

        if (canUseUrl(from_url)) {
            let url = new URL(im.currentSrc);
            let doc_hostname = document.location.hostname;
            if (url.hostname === doc_hostname) {
                removeCustomStyles(im);
                let original_url = originalURLOfImage(im);
                let use_url = toNoHAPsURL(original_url);
                im.src = use_url.toString();
            }
            ;
        }

    });
}

let shimSelected = "select";

browser.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        // console.log(sender.tab ?
        //             "from a content script:" + sender.tab.url :
        //             "from the extension");
        // console.log("Request: ", request);
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
            // Do this once more ? .. this is not the most efficient
            // way to do stuff, but ...
            // console.log("refreshView");
            changeToSelected();
        }

    });

CheckWorkerProcess = function () {

    let scripts = this.document.scripts;
    for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src) {
            if (scripts[i].src.includes("sc-sw-installer")) {
                return true
            }
        }
    }
    // serviceWorker = false;
    return false;
}

function getServiceWorkerDomains(){
    console.log("test");
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
            console.log("data: ",data);
            // get string indices for range of switch_domain_for_images object
            var start = data.search("switch_domains_for_images") + 26;
            var end =data.search("}") +1; 

            // create substring
            var serviceWorkerDomainsObjString = data.substring(start, end);
            // parse as JSON & save in global variable
            serviceWorkerDomains = JSON.parse(serviceWorkerDomainsObjString);
            console.log("serviceWorkerDomains: ",serviceWorkerDomains);
            serviceWorker = true;
        }
    }).then(function(){
        combinedDisplaySelected()
    })
} 