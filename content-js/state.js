
let optimizedSizeModel = null;
let unoptimizedSizeModel = null;
let currentView = null;


function* iterateOnImages() {
    let images = document.querySelectorAll('*,img.lazyloaded');
    for (let im of images) {
        if (canUseUrl(im.currentSrc)) {
            let url = new URL(im.currentSrc);
            console.log(` This is the url ${url}`);
            let doc_hostname = document.location.hostname;
            if (url.hostname === doc_hostname) {
                yield [im, url];
            }
        }
        if (retrieving(im.style['backgroundImage'])) {
            let returned_url = retrieving(im.style['backgroundImage']);
            console.log(`this is from reteriving${returned_url}`)
            let url = new URL(returned_url);
            console.log(`this is from donwnside ${url}`)
            let doc_hostname = document.location.hostname;
            if (url.hostname === doc_hostname) {
                yield [im, url];
            }
        }
    }
}




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


function refreshSelectedView() {
    if (currentView === "selected") {
        displaySelected();
        window.setTimeout(refreshSelectedView, 15000);
        window.setTimeout(sendModelSummaries, 3000);
    }
}


function changeToSelected() {
    if (currentView !== "selected") {
        window.setTimeout(sendModelSummaries, 3000);
        window.setTimeout(refreshSelectedView, 15000);
    }
    currentView = "selected";
    displaySelected();
}


function sendModelSummaries() {
    browser.runtime.sendMessage({
        'kind': 'model-summary',
        'unoptimized': unoptimizedSizeModel,
        'optimized': optimizedSizeModel
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
    let images = document.querySelectorAll('*');
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
        console.log("Url is found null")
        console.log(url)
        return false;

    }
    else {
        console.log(`Before placing ${typeof (url)}`)
        console.log(`The length = ${url.length}`)
        url = "https://" + document.location.hostname + url.replace(/^url\(['"](.+)['"]\)/, '$1');
        // PARAMETER FOR IMAGES SELECTION
        var dotIndex = url.lastIndexOf('.');
        try { var ext = str.substring(dotIndex); }
        catch (e) {
            var ext = ""
        }
        let images_extensions = ['.png', '.jpg']
        if (images_extensions.includes(ext)) {

            console.log(`from retriving funciton ${url}`)

            return url;
        }
        else {
            return false
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
    for (let
        /** @type String[] */
        header_val_arr of response.headers.entries()) {
        let [header_name, header_value] = header_val_arr;
        console.log(`The header value ${header_name} and ${header_value}`)
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
                console.log('Open the value')
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
    let headers = new Headers({
        "cache-control": "no-cache",
        "accept": "image/webp,image/apng,image/*",
        "accept-encoding": "gzip, deflate, br",
    });

    let fetch_request = new Request(
        url,
        {
            "headers": headers,
            "method": "GET",
            "mode": "same-origin",
            "cache": "no-store"
        });

    let prom = fetch(fetch_request);

    let resultP = new Promise((resolve, reject) => {
        prom.then(
            (response) => {
                if (response.status === 200) {
                    console.log("This is the response of header")
                    console.log(response.headers);
                    let headers_status = image_opt_status_from_headers(response);
                    let indicated_size = size_from_headers(response);
                    console.log(`The header status ${headers_status} and ${indicated_size}`)
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
            "mode": "same-origin",
            "cache": "no-store"
        });

    let prom = fetch(fetch_request);

    prom.then(
        (response) => {
            if (response.status === 200) {
                console.log("For unptomized")
                console.log(response.headers);
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
    let images = document.querySelectorAll("*");
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

let shimSelected = "optimized";

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
            console.log("refreshView");
            changeToSelected();
        }

    });
