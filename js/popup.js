// default value to be displayed in the popup menu on startup.
let vue_data = {
    "good_images": [],
    "bad_images": [],
    "shim": "select",
    "total_size_optimized": "",
    "total_size_unoptimized": "",
    "image_compression": "",
    "total_original": "",
    "Active": true,
    "ServiceWorker": false,
    "SplashScreen": true,
    "Spinner": false,
    "imagesCount":0,
    "filetype_data": {},
    "filetypes": [],
    "cors_error": false,
    "cors_error_number": 0,
    
};

// function that adds an event listener to handle data send from state.js and set as vue variables for rendering in popup.html
browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (sender.tab && sender.tab.active) {
        setTimeout(function(){
        $('[data-toggle="popover"]').popover({
            html: true,
            trigger: 'hover'
          })}, 4000);

        localStorage.setItem('clog', JSON.stringify(request));
        if (request.active === false) {
            vue_data["Active"] = false;
        }
        vue_data["imagesCount"]=Object.keys(request.optimized).length;
        vue_data["ServiceWorker"] = request.serviceWorker;
        summarizeImagesModel(request);
        vue_data["Spinner"] = false;
    }
});

/**
 * @typedef OptimizedImageEntry
 * @type {object}
 * @property {string} status
 * @property {number} transfer_size
 */

/**
 *
 * @typedef ImagesSummaryInput
 * @type {object}
 * @property {object.<string, number>} unoptimized
 * @property {object.<string, OptimizedImageEntry>} optimized
 */

/**
 *
 * @param {ImagesSummaryInput} images_summary_input
 */
function summarizeImagesModel(images_summary_input) {
    // if original, optimised image count is not equal
    if (Object.keys(images_summary_input.optimized).length !== Object.keys(images_summary_input.unoptimized).length ){
        vue_data['cors_error'] = true;
        // get number of serviceworker images that are not in original images but are in optimised
        let cors_error_number = 0;
        for (var key in images_summary_input.optimized){
            var originalKey = Object.keys(images_summary_input.unoptimized).find(searchKey => images_summary_input.unoptimized[searchKey]["pathname"] === images_summary_input.optimized[key]["pathname"]);
            if (originalKey === undefined){
                cors_error_number +=1; 
            }
        }
        vue_data["cors_error_number"] = cors_error_number;
    }

    // calculate total size of all original images found
    let total_unoptimized_size = 0.0;
    for (let im_url of Object.getOwnPropertyNames(images_summary_input.unoptimized)) {
        total_unoptimized_size += images_summary_input.unoptimized[im_url].transfer_size;
    }

    // calculate total size of all optimized images found
    let total_optimized_size = 0.0;
    for (let im_url of Object.getOwnPropertyNames(images_summary_input.optimized)) {
        total_optimized_size += images_summary_input.optimized[im_url].transfer_size;
    }

    vue_data["total_size_optimized"] = numberWithSpaces(formatBytes(total_optimized_size));
    vue_data["total_size_unoptimized"] = numberWithSpaces(formatBytes(total_unoptimized_size));
    let compression = imageCompression(total_optimized_size, total_unoptimized_size);
    if (compression >= 0){
        vue_data["image_compression"] = compression + "%";
    }else{
        vue_data["image_compression"] = "0%"; 
    }

    let total_files = Object.keys(images_summary_input.optimized).length;
    let filetypes = [];
    let filetype_data = {
        origin: {},
        optimised: {}
    };
    // get origin file totals
    for (const file of Object.keys(images_summary_input.unoptimized)){
        let filetype = images_summary_input.unoptimized[file]["filetype"];
        if(!(filetype in filetype_data["origin"])){
            filetype_data["origin"][filetype] = 1;
        }else{
            filetype_data["origin"][filetype] += 1;     
        }
    }
    // get optimised file totals
    for (const file of Object.keys(images_summary_input.optimized)){
        let filetype = images_summary_input.optimized[file]["filetype"]
        if(!(filetype in filetype_data["optimised"])){
            filetype_data["optimised"][filetype] = 1;
        }else{
            filetype_data["optimised"][filetype] += 1;     
        }
    }

    // get origin filetype percentages
    for (const filetype of Object.keys(filetype_data["origin"])){
        if(!(filetypes.includes(filetype.toString()))){
            filetypes.push(filetype);
        }
        let num = filetype_data["origin"][filetype].toString() 
        filetype_data["origin"][filetype] = num + " (" + Math.round((filetype_data["origin"][filetype] / total_files) * 100) + "%)"; 
    }

    for (const filetype of Object.keys(filetype_data["optimised"])){
        if(!(filetypes.includes(filetype.toString()))){
            filetypes.push(filetype);
        }
        let num = filetype_data["optimised"][filetype].toString() 
        filetype_data["optimised"][filetype] = num + " (" + Math.round((filetype_data["optimised"][filetype] / total_files) * 100) + "%)"; 
    }

    vue_data["filetype_data"] = filetype_data;
    vue_data["filetypes"] = filetypes
}

// function that formats numbers
function numberWithSpaces(x) {
    let x_str = x.toString();
    let val = x_str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return val;
}

// function to calculate compression percentage
function imageCompression(total_optimized, total_original) {
    let result = (((total_original - total_optimized) / total_original) * 100).toFixed(1)
    return result

}
function myVersion() {
    document.getElementById("version").innerText="v"+ chrome.app.getDetails().version;
}

// function that restores data 
function restoreData(vue_data) {
    let resultP = new Promise((resolve, reject) => {
        browser.storage.sync.get(["model_data"]).then((items) => {
            if (items.hasOwnProperty("model_data")) {
                let model_data = items.model_data;
                vue_data.good_images = model_data.good_images;
                vue_data.bad_images = model_data.bad_images;
                vue_data.shim = model_data.shim;
            }
            resolve();
        });
    });
    return resultP;

}

// function to format bytes to be more readable
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// vue initialization
window.vue_body_app = new Vue({
    data: vue_data,
    el: "#app-root",
    methods: {
        changeShim: function (to_what) {
            browser.tabs.query({
                'active': true,
                'currentWindow': true
            })
                .then(
                    (tabs) => {
                        return browser.tabs.sendMessage(tabs[0].id, { newShim: to_what });
                    })
                .then((response) => {
                    // console.log(response);
                });
            this.saveData();
        },
        // function to save data
        saveData: function () {
            let the_data = this.$data;
            browser.storage.sync.set({
                "model_data": the_data
            });
        },
        // function to change state of splashscreen
        SplashScreenChange: function () {

            vue_data["SplashScreen"] = false;
            vue_data["Spinner"] = true;
            this.changeShim("select");

        },
        getOriginFiletype: function(index){
            if (vue_data["filetype_data"]["origin"][index] !== undefined){
                return vue_data["filetype_data"]["origin"][index];
                }else{
                    return "0"
                }
        },
        getOptimisedFiletype: function(index){
            if (vue_data["filetype_data"]["optimised"][index] !== undefined){
            return vue_data["filetype_data"]["optimised"][index];
            }else{
                return "0"
            }
        }
    },

    watch: {
        shim: function (new_shim, old_shim) {
            this.changeShim(new_shim);
        }
    }
});

restoreData(vue_data);
myVersion();