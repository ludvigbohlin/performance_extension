download_csv();



function download_csv(){
	var s = localStorage.getItem("clog");
	data =  JSON.parse(s);
	var a = [];
	var b = [];
	var c = [];
	var combined = [];

	for (var key in data.unoptimized) {
		if (data.unoptimized.hasOwnProperty(key)) {
			a.push(key);
		}
	}
	for (var key in data.unoptimized) {
		if (data.unoptimized.hasOwnProperty(key)) {
			b.push(data.unoptimized[key]);
		}
		
	} 
	for (var key in data.optimized) {	
		if (data.optimized.hasOwnProperty(key)) {
			var optimizedKey = data.optimized[key];
			console.log("From optimized key")
			console.log(optimizedKey)
			for (var key1 in optimizedKey) {
				console.log("This is the log")
				console.log(key1)
				if (optimizedKey.hasOwnProperty(key1)) {
					//if(optimizedKey[key1]!="non-viable"){
						if (key1 =='transfer_size'){
						c.push(optimizedKey[key1]);
						}
					}
				}
			}
		}	

	var combined = [];
	for(var i=0; i < a.length; i++){
		console.log('FROM DOWNLOAD JS ')
		console.log({img:a[i],realsize:b[i],optimizedSize:c[i]})
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