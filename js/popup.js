

let vue_data = {
  "good_images": [],
  "bad_images": [],
  "shim": "optimized",
  "total_size_optimized": "",
  "total_size_unoptimized": ""
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


browser.runtime.onMessage.addListener(function(request, sender, sendResponse){
  if (sender.tab && sender.tab.active) {
    console.log("Message from active tab");
	localStorage.setItem('clog', JSON.stringify(request));
    summarizeImagesModel(request);
  }
  console.log("From popup: ", sender, request);
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
function summarizeImagesModel(images_summary_input)
{
  let total_unoptimized_size = 0.0;
  for (let im_url of Object.getOwnPropertyNames(images_summary_input.unoptimized)) {
    total_unoptimized_size += images_summary_input.unoptimized[im_url];
  }

  let total_optimized_size = 0.0;
  for (let im_url of Object.getOwnPropertyNames(images_summary_input.optimized)) {
    console.log("From the total optimised function ")
    console.log(im_url)
    console.log(images_summary_input.optimized[im_url].transfer_size)
    total_optimized_size += images_summary_input.optimized[im_url].transfer_size;
  }

  vue_data["total_size_optimized"] = numberWithSpaces(total_optimized_size);
  vue_data["total_size_unoptimized"] = numberWithSpaces(total_unoptimized_size);
}


function numberWithSpaces(x) {
  let x_str = x.toString();
  let val = x_str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return val;
}

function restoreData(vue_data)
{
  let resultP = new Promise((resolve, reject) => {
    browser.storage.sync.get(["model_data"]).then( (items) => {
        if (items.hasOwnProperty("model_data"))
        {
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


window.vue_body_app = new Vue({
  data: vue_data,
  el: "#app-root",

  methods: {
    changeShim: function(to_what) {
      browser.tabs.query({
        'active': true,
        'currentWindow': true})
        .then(
          (tabs) => {
            return browser.tabs.sendMessage(tabs[0].id, {newShim: to_what});
          })
        .then((response) => {
            console.log(response);
          });
      this.saveData();
    },

    saveData: function() {
      let the_data = this.$data;
      browser.storage.sync.set({
        "model_data": the_data
      });
    }
  },

  watch: {
    shim: function(new_shim, old_shim) {
      console.log("Shim changed to ", new_shim);
      this.changeShim(new_shim);
    }
  }
});

restoreData(vue_data);
