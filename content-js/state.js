/*  Documentation of code Bishal Nepali
*/
// 
let optimizedSizeModel = null;
let unoptimizedSizeModel = null;
let currentView = null;

/* Generator funciton iterateOnImages:
The function iterates over the list of all elements matching selectors (*) which means all the elements in our body of html. 
We have two functions to filter the elements that has the image url
1. canUseUrl
2. retrieving
Once they satified required the function will return html element(im) and javascript url(url) object 
 */
function* iterateOnImages() {
    // returns the list of all elements
    let images = document.querySelectorAll('*,img.lazyloaded');
    // for loop iteration for all the images
    for (let im of images) {
        // canUseUrl function is called
        if (canUseUrl(im.currentSrc)) {
            let url = new URL(im.currentSrc);
            //console.log(` This is the url ${url}`);
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


/*
displaySelected() :
In this funciton the return element and url  of iterateOnImages will have addition of classes in element and creates the function like h,g,i which has elements of classes like scbca-webp,
scbca-processing,scbca-non-viable using the functions highlightAs*. and image url is from originalURLOfImage function.
and according to the header_status the element will be updated with the classe value by calling the function h,g,i
the optimizedSizeModel varible will be converted into the objects having the url as key and value in objects where status,size value will be provided
*/

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
        // header_status and content-length is checked.
        urlPointsToStatus(use_url_for_highlight)
            .then(([status, transfer_size]) => {
                // Removing the class attribute 
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
                // optimizedSizeModel with url as key will have the value of status and size
                if (transfer_size !== null) {
                    optimizedSizeModel[use_url_for_highlight] = {
                        'status': status,
                        'transfer_size': transfer_size
                    }
                }
            });
    }
}

/* This function will call the displaySeletected and refresh as 
 sets a timer which executes a function again after 15 seconds and 
send the summaries again afer 3 seconds
*/

function refreshSelectedView() {
    if (currentView === "selected") {
        displaySelected();
        window.setTimeout(refreshSelectedView, 15000);
        window.setTimeout(sendModelSummaries, 3000);
    }
}

/*
displaySelected function is called wnd currenView is change to slected  if current view is not selected
 
*/
function changeToSelected() {
    if (currentView !== "selected") {
        window.setTimeout(sendModelSummaries, 3000);
        window.setTimeout(refreshSelectedView, 15000);
    }
    currentView = "selected";
    displaySelected();
}

// This function will send the message from content script to which this to the pop script which is popup script
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

// This function will add the scbca-webp in class attribute
function highlightAsWebp(im_element) {
    im_element.classList.add("scbca-webp");
}

// This function will add the scbca-processing in class attribute
function highlightAsProcessing(im_element) {
    im_element.classList.add("scbca-processing");
}

//This function will add the scbca-non-viable in class attribute
function highlightAsNonViable(im_element) {
    im_element.classList.add("scbca-non-viable");
}

/*
This function removes the classe attribute of the element which are present beforebundleRenderer.renderToStream
return the image with removal of mention classes */
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

// This function will also iterate with images.
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

/*
retrieving(url):
It will look for the url in the images which has regular currentscr and return the url by doing some extra work to
return the img url.
*/
function retrieving(url) {
    if (url == null || url == undefined || url.length == 0) {
        //console.log("Url is found null")
        //console.log(url)
        return false;

    }
    else {
        console.log(url)
        console.log(`Before placing ${typeof (url)}`)
        console.log(`The length = ${url.length}`)
        url = "https://" + document.location.hostname + url.replace(/^url\(['"](.+)['"]\)/, '$1');
        // PARAMETER FOR IMAGES SELECTION
        var dotIndex = url.lastIndexOf('.');
        try { var ext = url.substring(dotIndex); }
        catch (e) {
            var ext = ""
        }
        let images_extensions = ['.png', '.jpg']
        if (images_extensions.includes(ext)) {

            console.log(`from retriving funciton ${url}`)

            return url;
        }
        else if (/.jpg\?preset|.png\?preset|.gif\?preset/.test(url)) {
            console.log("Checked via jpg")
            console.log(url)
            return url;
        }
        else {
            console.log("The issue is ")
            console.log(url)
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


    /* This function checks the header_name if header_value is sc-note
     header_value if it includes webp0 as nv,ip,re it will return the header status like non-viable,in-processing,ready 
     */
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
/* 
This function
It will return Integer value for content-lenght of the image or null
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

/*
urlPointsToStatus(url):
This function will make the  fetch request of the url(image url ) and retrieve the resonse with resultP which has two data
1. header_status - non-viable,in-processing,ready accordily, false ,null,
2. indicated_size - can be numeric value or null
*/

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
    // Return the header_status like non-viable,in-processing,ready accordily or false or null and content-size or null
    let resultP = new Promise((resolve, reject) => {
        prom.then(
            (response) => {
                // If the response is okay
                if (response.status === 200) {
                    // console.log("This is the response of header")
                    // console.log(response.headers);
                    // it will return the header status like non-viable,in-processing,ready accordily
                    let headers_status = image_opt_status_from_headers(response);
                    //Content-length size of header is return
                    let indicated_size = size_from_headers(response);
                    //console.log(`The header status ${headers_status} and ${indicated_size}`)
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
