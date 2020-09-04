
let optimizedSizeModel = null;
let unoptimizedSizeModel = null;
let currentView = null;
let Active = false;
let serviceWorker = false;
let serviceWorkerDomains = {};
function* iterateOnImages() {
    let images = document.querySelectorAll('*,img.lazyloaded');
    for (let im of images) {
        if (canUseUrl(im.currentSrc)) {
            let url = new URL(im.currentSrc);
            let doc_hostname = document.location.hostname;

            if (!serviceWorker && url.hostname === doc_hostname) {
                yield [im, url];
            }else{
                yield[im, url];
            }
        }
        if (retrieving(im.style['backgroundImage'])) {
            let returned_url = retrieving(im.style['backgroundImage']);
            // console.log(`this is from reteriving${returned_url}`)
            let url = new URL(returned_url);
            let doc_hostname = document.location.hostname;
            
            if (!serviceWorker && url.hostname === doc_hostname) {
                yield [im, url];
            }else{
                yield[im, url];
            }
        }
    }
}

// function* iterateOnServiceWorkerImages() {
//     let images = document.querySelectorAll('*,img.lazyloaded');
//     for (let im of images) {
//         if (canUseUrl(im.currentSrc)) {
//             let url = new URL(im.currentSrc);
//             let doc_hostname = document.location.hostname;
//             if (url.hostname === doc_hostname) {
//                 yield [im, url];
//             }
//         }
//         if (retrieving(im.style['backgroundImage'])) {
//             let returned_url = retrieving(im.style['backgroundImage']);
//             // console.log(`this is from reteriving${returned_url}`)
//             let url = new URL(returned_url);
//             // console.log(`this is from donwnside ${url}`)
//             let doc_hostname = document.location.hostname;
//             if (url.hostname === doc_hostname) {
//                 yield [im, url];
//             }
//         }
//     }
// }




function displaySelected() {
    optimizedSizeModel = {};
    unoptimizedSizeModel = {};
    for (let [im, url] of iterateOnImages()) {
        let h = highlightAsWebp.bind(null, im);
        let g = highlightAsProcessing.bind(null, im);
        let i = highlightAsNonViable.bind(null, im);

        let use_url_for_highlight = originalURLOfImage(im);

        let use_url = toNoHAPsURL(use_url_for_highlight);
        populateUnoptimizedSizeModel(use_url);

        im.currentSrc = use_url_for_highlight;
        im.src = use_url_for_highlight;

        urlPointsToStatus(use_url_for_highlight)
            .then(([status, transfer_size]) => {
                removeCustomStyles(im);
                if (status === "ready") {
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
                    optimizedSizeModel[use_url_for_highlight] = {
                        'status': status,
                        'transfer_size': transfer_size
                    }
                }
            });
    }
}

function serviceWorkerDisplay() {
    console.log("serviceWorker running");
    optimizedSizeModel = {};
    unoptimizedSizeModel = {};
    for (let [im, url] of iterateOnImages()) {
        let h = highlightAsWebp.bind(null, im);
        let g = highlightAsProcessing.bind(null, im);
        let i = highlightAsNonViable.bind(null, im);
        // console.log(url);
        let use_url_for_highlight = originalURLOfImage(im);
        // original image on domain isn't using haps by default so we do not need this
        // let use_url = toNoHAPsURL(use_url_for_highlight);
        populateUnoptimizedSizeModel(use_url_for_highlight);
        
        let optimised_image_url = getServiceWorkerUrl(url);
        
        im.currentSrc = use_url_for_highlight;
        im.src = use_url_for_highlight;

        // now we need to make get requests to compute & compare sizes
        


        urlPointsToStatus(optimised_image_url)
            .then(([status, transfer_size]) => {
                // console.log("status: ", status);
                // console.log("transfer_size: ", transfer_size);
                removeCustomStyles(im);
                if (status === "ready") {
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
                    optimizedSizeModel[use_url_for_highlight] = {
                        'status': status,
                        'transfer_size': transfer_size
                    }
                }
            });
    } 
    // console.log("optimised: ",optimizedSizeModel);
    // console.log("unoptimised: ", unoptimizedSizeModel);
}

function getServiceWorkerUrl(url){
    // console.log(url)
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

function optimisedURLofImage(im){
    //lookup image src in serviceWorkerDomains to get correct cloud domain
    // let cloud_img_url =  

    // make get request to cloud domain


}

// function refreshSelectedView() {
//     if (currentView === "selected") {
//         if (CheckWorkerProcess()){
//             serviceWorkerDisplay();        
//         }else{
//         displaySelected();
//         }
//         // window.setTimeout(refreshSelectedView, 15000);
//         // window.setTimeout(sendModelSummaries, 3000);
//     }
// }


async function changeToSelected() {
    if (currentView !== "selected") {
        // window.setTimeout(sendModelSummaries, 3000);
        // window.setTimeout(refreshSelectedView, 15000);
    }
    currentView = "selected";
    // var result = await CheckWorkerProcess();
    // console.log(result)
    if (CheckWorkerProcess()){
        getServiceWorkerDomains();
        // serviceWorkerDisplay();        
    }else{
    displaySelected();
    }
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
    console.log(response);
    for (let
        /** @type String[] */
        header_val_arr of response.headers.entries()) {
        let [header_name, header_value] = header_val_arr;
        console.log(`The header value ${header_name} and ${header_value}`)
        console.log(header_val_arr);

        if (header_name === "sc-note") {
            // console.log("SC-NOTE!!!!!");
            Active = true;
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


function urlPointsToStatus(url) {
    let mode = "same-origin";
    let headers = new Headers({
        "cache-control": "no-cache",
        "accept": "image/webp,image/apng,image/*",
        "accept-encoding": "gzip, deflate, br",
    });
    if(serviceWorker){
        mode = "cors";
        headers = {}
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
                    console.log("This is the response of header")
                    // console.log(response.headers.keys())
                    let headers_status = image_opt_status_from_headers(response);
                    // for (var pair of response.headers.entries()) {
                    //     console.log(pair[0]+ ': '+ pair[1]);
                    //  }
                    // console.log(headers_status);
                    let indicated_size = size_from_headers(response);
                    // console.log(`The header status ${headers_status} and ${indicated_size}`)
                    //optimizedSizeModel[captured_url] = indicated_size;
                    //noinspection JSIncompatibleTypesComparison;
                    if (headers_status === null) {

                        resolve([false, indicated_size]);
                    } else {

                        resolve([headers_status, indicated_size]);
                    }
                } else {
                    resolve([null, null]);
                }
            },
            (error) => {
                resolve([null, null]);
            }
        )
    });

    return resultP;
}

function populateUnoptimizedSizeModel(url) {
    let mode = "same-origin";
    if(serviceWorker){
        mode = "no-cors";
    }
    let headers = new Headers({
        "cache-control": "no-cache",
        "accept": "image/jpeg,image/apng,image/*",
        "accept-encoding": "gzip, deflate, br",
    });

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
        (response) => {
            if (response.status === 200) {
                // console.log("For unptomized")
                // console.log(response.headers);
                let indicated_size = size_from_headers(response);
                unoptimizedSizeModel[url] = indicated_size;

            } else {
            }
        },
        (error) => {
        }
    );

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
    serviceWorker = false;
    return false;
}

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
        return res.text()
    }).then(function(data){
        // get string indices for range of switch_domain_for_images object
        var start = data.search("switch_domains_for_images") + 26;
        var end =data.search("}") +1; 

        // create substring
        var serviceWorkerDomainsObjString = data.substring(start, end);
        // parse as JSON & save in global variable
        serviceWorkerDomains = JSON.parse(serviceWorkerDomainsObjString);
        console.log("serviceWorkerDomains: ",serviceWorkerDomains);
        serviceWorker = true;
    }).then(function(){serviceWorkerDisplay()})
} 