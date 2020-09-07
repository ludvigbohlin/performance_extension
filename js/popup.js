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
    "filetypes": {}
};


// function send_refresh() {
//
//   let resultP = new Promise(
//     (complete, reject) =>
//     {
//       browser.tabs.query({active: true, currentWindow: true})
//         .then(
//           (tabs) => {
//             if (tabs.length > 0)
//               return browser.tabs.sendMessage(tabs[0].id, {refreshView: true});
//           })
//         .then((response) => {
//             console.log(response);
//             complete();
//           });
//     }
//   );
//
//   return resultP;
// }


browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(request);
    if (sender.tab && sender.tab.active) {
        // console.log("Message from active tab");
        localStorage.setItem('clog', JSON.stringify(request));
        if (request.active === false) {
            console.log("true");
            vue_data["Active"] = false;
        }
        vue_data["imagesCount"]=Object.keys(request.optimized).length;
        //console.log("count: "+Object.keys(request.optmized).length);
        vue_data["ServiceWorker"] = request.serviceWorker;
        summarizeImagesModel(request);
        vue_data["Spinner"] = false;
    }
    //console.log("From popup: ", sender, request);
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
    let total_unoptimized_size = 0.0;
    for (let im_url of Object.getOwnPropertyNames(images_summary_input.unoptimized)) {
        total_unoptimized_size += images_summary_input.unoptimized[im_url].transfer_size;
    }

    let total_optimized_size = 0.0;
    for (let im_url of Object.getOwnPropertyNames(images_summary_input.optimized)) {
        // console.log("From the total optimised function ")
        // console.log(im_url)
        // console.log(images_summary_input.optimized[im_url].transfer_size)
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

    // calculate filetype percentages
    let total_files = Object.keys(images_summary_input.optimized).length;
    console.log(total_files);
    let filetypes = {};
    // get file totals
    console.log(Object.keys(images_summary_input.optimized));
    for (const file of Object.keys(images_summary_input.optimized)){
        let filetype = images_summary_input.optimized[file]["filetype"]
        console.log(filetype);
        if(!(filetype in filetypes)){
            filetypes[filetype] = 1;
        }else{
            filetypes[filetype] += 1;     
        }
    }
    console.log("fieltypes 1: ",filetypes)
    for (const filetype of Object.keys(filetypes)){
        filetypes[filetype] = Math.round((filetypes[filetype] / total_files) * 100) + "%";
    }
    console.log("fieltypes 2: ",filetypes)

    vue_data["filetypes"] = filetypes;
    
    console.log("total optimised: ", vue_data["total_size_optimized"]);
    console.log("total unoptimised: ", vue_data["total_size_unoptimized"]);
    console.log("compression: ", vue_data["image_compression"]);

}

function numberWithSpaces(x) {
    let x_str = x.toString();
    let val = x_str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return val;
}

function imageCompression(total_optimized, total_original) {
    let result = (((total_original - total_optimized) / total_original) * 100).toFixed(1)
    return result

}
function myVersion() {
    document.getElementById("version").innerText="v"+ chrome.app.getDetails().version;
}
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
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

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
        saveData: function () {
            let the_data = this.$data;
            browser.storage.sync.set({
                "model_data": the_data
            });
        },
        SplashScreenChange: function () {

            vue_data["SplashScreen"] = false;
            vue_data["Spinner"] = true;
            this.changeShim("select");

        }
    },

    watch: {
        shim: function (new_shim, old_shim) {
            // console.log("Shim changed to ", new_shim);
            this.changeShim(new_shim);
        }
    }
});

restoreData(vue_data);
myVersion();