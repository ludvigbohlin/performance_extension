
download_csv();



function download_csv(){
	var s = localStorage.getItem("clog");
	data =  JSON.parse(s);
	console.log(data);
	var a = [];
	var b = [];
	var c = [];
	var combined = [];

	// populate array with unoptimised img urls
	for (var key in data.unoptimized) {
		if (data.unoptimized.hasOwnProperty(key)) {
			a.push(key);
		}
	}
	// console.log(a);
	// populate array with unoptimised transfer sizes
	for (var key in data.unoptimized) {
		if (data.unoptimized.hasOwnProperty(key)) {
			b.push(data.unoptimized[key]["transfer_size"]);

			console.log("key: ",key);
			var optimizedKey = Object.keys(data.optimized).find(searchKey => data.optimized[searchKey]["pathname"] === data.unoptimized[key]["pathname"]);
			console.log("optimizedKey", optimizedKey);	
			c.push(data.optimized[optimizedKey]["transfer_size"])
		}
	} 
	// console.log(b);
	// populate array with optimised transfer sizes
	// for (var key in data.optimized) {	
	// 	if (data.optimized.hasOwnProperty(key)) {
	// 		c.push(data.optimized[key]["transfer_size"]);
	// 	}	
	// }
	var combined = [];
	for(var i=0; i < a.length; i++){
		// console.log('FROM DOWNLOAD JS ')
		// console.log({img:a[i],realsize:b[i],optimizedSize:c[i]})
		combined.push({img:a[i],realsize:b[i],optimizedSize:c[i]});
	}
	
	var csv = 'Image, Original Size, Optimized Size\n';
	combined.forEach(function(col) {
	cimg = col.img.replace('?sc-disable-haps=1','');
	csv += cimg + ", "+col.realsize +", "+col.optimizedSize;
	csv += "\n";

	}); 
	var filename = Date.now();
	var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = filename+'.csv';
    hiddenElement.click();
}