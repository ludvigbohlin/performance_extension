
// download_csv();


// // function that downloads csv for each image found on document with the optimised size and original size for comparing sizes 
// function download_csv(){
// 	var s = localStorage.getItem("clog");
// 	data =  JSON.parse(s);
// 	var a = [];
// 	var b = [];
// 	var c = [];
// 	var d = [];
// 	var e = [];
// 	var combined = [];
// 	console.log(data);

// 	// populate array with unoptimised img urls
// 	for (var key in data.unoptimized) {
// 		if (data.unoptimized.hasOwnProperty(key)) {
// 			a.push(key);
// 		}
// 	}
// 	// populate array with unoptimised transfer sizes
// 	for (var key in data.unoptimized) {
// 		if (data.unoptimized.hasOwnProperty(key)) {
// 			b.push(data.unoptimized[key]["transfer_size"]);
// 			d.push(data.unoptimized[key]["filetype"])
// 			var optimizedPathnameKey = Object.keys(data.optimized).find(searchKey => data.optimized[searchKey]["pathname"] === data.unoptimized[key]["pathname"]);
// 			var optimizedFiletypeKey = Object.keys(data.optimized).find(searchKey => data.optimized[searchKey]["filetype"] === data.unoptimized[key]["filetype"]);
// 			if (optimizedPathnameKey === undefined){
// 				b.pop();
// 				d.pop();
// 			}else{
// 				c.push(data.optimized[optimizedPathnameKey]["transfer_size"])
// 				e.push(data.optimized[optimizedPathnameKey]["filetype"])
// 			}
// 		}
// 	} 

// 	// create combined array for storing in csv
// 	var combined = [];
// 	for(var i=0; i < a.length; i++){
// 		combined.push({img:a[i],realsize:b[i],optimizedSize:c[i], originalFiletype:d[i], optimizedFiletype:e[i]});
// 	}
	
// 	// build csv file
// 	var csv = 'Image, Original Size, Optimized Size, Original Filetype, Optimised Filetype\n';
// 	combined.forEach(function(col) {
// 	cimg = col.img.replace('?sc-disable-haps=1','');
// 	csv += cimg + ", "+col.realsize +", "+col.optimizedSize +", "+col.originalFiletype +", "+col.optimizedFiletype;
// 	csv += "\n";

// 	}); 
// 	// file metatags
// 	var filename = Date.now();
// 	var hiddenElement = document.createElement('a');
//     hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
//     hiddenElement.target = '_blank';
//     hiddenElement.download = filename+'.csv';
//     hiddenElement.click();
// }

download_csv();

// function that downloads csv for each image found on document with the optimised size and original size for comparing sizes 
function download_csv(){
	// get image compression data from localStorage
	var s = localStorage.getItem("clog");
	data =  JSON.parse(s);
	var domain = data.domain;
	// temp arrays to store data for each column
	var a = [];
	var b = [];
	var c = [];
	var d = [];
	var e = [];
	var f = [];

	// variables to store aggregated file sizes in order to compute aggregated compression percentages
	var optimizedTotal = 0;
	var unoptimizedTotal = 0;

	// populate column arrays with image data
	for (var key in data.unoptimized) {
		if (data.unoptimized.hasOwnProperty(key)) {
			a.push(key);
			b.push(data.unoptimized[key]["transfer_size"]);
			d.push(data.unoptimized[key]["filetype"])
			var optimizedPathnameKey = Object.keys(data.optimized).find(searchKey => data.optimized[searchKey]["pathname"] === data.unoptimized[key]["pathname"]);
			if (optimizedPathnameKey === undefined){
				b.pop();
				d.pop();
				a.pop();
			}else{
				c.push(data.optimized[optimizedPathnameKey]["transfer_size"]);
				e.push(data.optimized[optimizedPathnameKey]["filetype"]);
				// update total filesizes
				optimizedTotal += data.optimized[optimizedPathnameKey]["transfer_size"]; 
				unoptimizedTotal += data.unoptimized[key]["transfer_size"];
			}
			// populate with compression percentages
			let pct  = calculatePercentageChange(data.unoptimized[key]["transfer_size"], data.optimized[optimizedPathnameKey]["transfer_size"])
			f.push(pct >= 0 ? pct + "%" : "0%");
		}
	} 

	// create combined array for storing in csv
	var combined = [];
	for(var i=0; i < a.length; i++){
		combined.push({imgUrl:a[i],originalSize:b[i],optimizedSize:c[i], originalFiletype:d[i], optimizedFiletype:e[i], compressionPct:f[i]});
	}
	
	// build csv file
	var csv = 'Image, Original Size, Optimised Size, Original Filetype, Optimised Filetype, Compression (%) \n';
	combined.forEach(function(col) {
		col.imgUrl = col.imgUrl.replace('?sc-disable-haps=1','');
		csv += col.imgUrl + ", "+col.originalSize +", "+col.optimizedSize +", "+col.originalFiletype +", "+col.optimizedFiletype + ", " + col.compressionPct;
		csv += "\n";
	}); 
	csv += `Total Original Images Size: ${numberWithSpaces(formatBytes(unoptimizedTotal))}`;
	csv += "\n";
	csv += `Total Optimised Images Size: ${numberWithSpaces(formatBytes(optimizedTotal))}`;
	csv += "\n";
	let pct = calculatePercentageChange(unoptimizedTotal, optimizedTotal)
	csv += `Total Compression: ${pct >= 0 ? pct + "%" : "0%"}`;
	csv += "\n";

	// file metatags
	let date = new Date();
	var filename = domain + "_" + date.getUTCDate().toString() + (date.getUTCMonth() + 1).toString() + date.getFullYear().toString() 
	
	var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = filename+'.csv';
    hiddenElement.click();
}

// function that calculates percentage change
function calculatePercentageChange(original, updated){
	return (((original - updated) / original) * 100).toFixed(1); 
}

// function that formats numbers
function numberWithSpaces(x) {
    let x_str = x.toString();
    let val = x_str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return val;
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