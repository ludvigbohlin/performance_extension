// default values to be displayed in the popup menu on startup.
let vue_data = {
    "good_images": [],
    "bad_images": [],
    "shim": "select",
    "total_size_optimized": "",
    "total_size_unoptimized": "",
    "image_compression": "",
    "total_original": "",
    "Active": true,
    "SplashScreen": true,
    "Spinner": false,
    "imagesCount":0,
    "filetype_data": {},
    "filetypes": [],
    "cors_error": false,
    "cors_error_number": 0,
};

// let startup = true;

// array to hold deleted optimised images in case of corresponding origin image repopulation
var backupOptimised = {};

// function that adds an event listener to handle data send from state.js and set as vue variables for rendering in popup.html
browser.runtime.onMessage.addListener(function (request, sender) {
    // if there are no errors with the image payload data
    if (sender.tab && sender.tab.active && !request.hasOwnProperty('error') && !request.hasOwnProperty('command')) {
        setTimeout(function(){
        $('[data-toggle="popover"]').popover({
            html: true,
            trigger: 'hover'
        })}, 100);

        // store image payload data in localStorage so it can be used in download.js
        localStorage.setItem('clog', JSON.stringify(request));
        vue_data["imagesCount"]=Object.keys(request.optimized).length;
        // perform all compression computation for display in popup
        summarizeImagesModel(request);

        // disable spinner
        vue_data["Spinner"] = false;
        
        // make radio buttons visible 
        document.getElementById('radiobutton-area').style.display = 'block';

    }

    // if there is an error with the image payload data
    if(sender.tab && sender.tab.active && request.hasOwnProperty('error') && !request.hasOwnProperty('command')){
        if (request.active === false) {
            vue_data["Active"] = false;
        }
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
    if (Object.keys(images_summary_input.optimized).length !== Object.keys(images_summary_input.unoptimized).length && images_summary_input.cors_error == true ){
        vue_data['cors_error'] = true;
        console.log("optimised length before deletion: ");
        console.log(Object.keys(images_summary_input.optimized).length);
        
        // get number of serviceworker images that are not in original images but are in optimised
        let cors_error_number = 0;
        for (var key in images_summary_input.optimized){
            var originalKey = Object.keys(images_summary_input.unoptimized).find(searchKey => images_summary_input.unoptimized[searchKey]["pathname"] === images_summary_input.optimized[key]["pathname"]);
            if (originalKey === undefined){
                var optimisedImage = images_summary_input.optimized[key];

                // add to backup array so we can re-add it later if the origin image is eventually found (if not already there)
                console.log("deleting optimised image");
                if (backupOptimised[key] == undefined){
                    backupOptimised[key]  = optimisedImage;    
                }
                // var isInArray = backupOptimised.find(function(el){ return el.pathname === optimisedImage.pathname }) !== undefined;
                // if (!isInArray) {
                //     backupOptimised[key]  = optimisedImage;    
                // }
                
                delete images_summary_input.optimized[key];
                console.log("optimised length after deletion: ");
                console.log(Object.keys(images_summary_input.optimized).length);

                // increment image count difference
                cors_error_number +=1; 
            }
        }
        console.log("backup array: ");
        console.log(backupOptimised);
        
        // check for new origin images that have optimised images in backup array
        for (var key in backupOptimised){
            // check if origin has the image pathname
            var originalKey = Object.keys(images_summary_input.unoptimized).find(searchKey => images_summary_input.unoptimized[searchKey]["pathname"] === backupOptimised[key]["pathname"]);
            if (originalKey !== undefined){

                console.log("found newly-populated origin image");
                // re-add to optimised images 
                images_summary_input.optimized[key] = backupOptimised[key];

                // remove from backup array
                // var index = backupOptimised.indexOf(i);
                // if (index > -1) {
                //     array.splice(index, 1);
                // }
                delete backupOptimised[key];


                // decrement image count difference
                cors_error_number -=1

                //  recheck imbalance: if none we remove cors error
                if (!Object.keys(images_summary_input.optimized).length === Object.keys(images_summary_input.unoptimized).length && images_summary_input.cors_error == true ){
                    vue_data['cors_error'] = false;
                }else{
                    // break;
                }
                
            }
            
        }
        
        vue_data["cors_error_number"] = cors_error_number;
    }else{
        vue_data['cors_error'] = false;
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
    let filetypes = [];
    let filetype_data = {
        origin: {},
        optimised: {}
    };
    // get origin file totals
    for (const file of Object.keys(images_summary_input.unoptimized)){
        var optimizedPathnameKey = Object.keys(images_summary_input.optimized).find(searchKey => images_summary_input.optimized[searchKey]["pathname"] === images_summary_input.unoptimized[file]["pathname"]);
        if (optimizedPathnameKey === undefined){
        }
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
    }

    for (const filetype of Object.keys(filetype_data["optimised"])){
        if(!(filetypes.includes(filetype.toString()))){
            filetypes.push(filetype);
        }
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

// function that populates the version identifier in popup header
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
                        
                        return browser.tabs.sendMessage(tabs[0].id, { 
                            newShim: to_what,
                        });
                    })
                .then((response) => {
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
        shim: function (new_shim) {
            this.changeShim(new_shim);
        }
    }
});

// make select view the default on first run
document.getElementById('submit-btn').addEventListener('click', function(){

    // force select view
    vue_data["shim"] = "select";
});

// listener for popup load to notify content script
window.addEventListener('load', function(){
    // enable sending of models
    browser.tabs.query({
        'active': true,
        'currentWindow': true
    })
        .then(
            (tabs) => {
                return browser.tabs.sendMessage(tabs[0].id, { "loaded": true });
            })
        .then((response) => {
        })
        .catch((error) =>{
            console.error(error);
        });
})

restoreData(vue_data);
myVersion();