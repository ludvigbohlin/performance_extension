
download_csv();


// function that downloads csv for each image found on document with the optimised size and original size for comparing sizes 
function download_csv(){
	var s = localStorage.getItem("clog");
	data =  JSON.parse(s);
	var a = [];
	var b = [];
	var c = [];
	var d = [];
	var e = [];
	var combined = [];
	console.log(data);

	// populate array with unoptimised img urls
	for (var key in data.unoptimized) {
		if (data.unoptimized.hasOwnProperty(key)) {
			a.push(key);
		}
	}
	// populate array with unoptimised transfer sizes
	for (var key in data.unoptimized) {
		if (data.unoptimized.hasOwnProperty(key)) {
			b.push(data.unoptimized[key]["transfer_size"]);
			d.push(data.unoptimized[key]["filetype"])
			var optimizedPathnameKey = Object.keys(data.optimized).find(searchKey => data.optimized[searchKey]["pathname"] === data.unoptimized[key]["pathname"]);
			var optimizedFiletypeKey = Object.keys(data.optimized).find(searchKey => data.optimized[searchKey]["filetype"] === data.unoptimized[key]["filetype"]);
			if (optimizedPathnameKey === undefined){
				b.pop();
				d.pop();
			}else{
				c.push(data.optimized[optimizedPathnameKey]["transfer_size"])
				e.push(data.optimized[optimizedPathnameKey]["filetype"])
			}
		}
	} 

	// create combined array for storing in csv
	var combined = [];
	for(var i=0; i < a.length; i++){
		combined.push({img:a[i],realsize:b[i],optimizedSize:c[i], originalFiletype:d[i], optimizedFiletype:e[i]});
	}
	
	// build csv file
	var csv = 'Image, Original Size, Optimized Size, Original Filetype, Optimised Filetype\n';
	combined.forEach(function(col) {
	cimg = col.img.replace('?sc-disable-haps=1','');
	csv += cimg + ", "+col.realsize +", "+col.optimizedSize +", "+col.originalFiletype +", "+col.optimizedFiletype;
	csv += "\n";

	}); 
	// file metatags
	var filename = Date.now();
	var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = filename+'.csv';
    hiddenElement.click();
}