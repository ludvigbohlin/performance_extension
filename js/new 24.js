download_csv();



function download_csv(){
	var s = localStorage.getItem("clog");
	data =  JSON.parse(s);
	var unoptimized = [];
	var unoptimized1 = [];
	var optimized = [];
	var c = [];

	for (var key in data.unoptimized) {
		if (data.unoptimized.hasOwnProperty(key)) {
			unoptimized.push({img:key}); 
			unoptimized.push({size:data.unoptimized[key]});
		}
		
	}
	
	for (var key in data.optimized) {
		
		if (data.optimized.hasOwnProperty(key)) {
	
			var a = data.optimized[key];
			for (var key1 in a) {
				if (a.hasOwnProperty(key1)) {
					if(a[key1]!="non-viable"){
						
						unoptimized.push({optimizedsize:a[key1]}); 
						//optimized.push(a[key1]);
					
					}
				}
			}
	
		}	
	}
	
	unoptimized.forEach(function(col) {
		if(typeof col.img !== "undefined"){
			//c['img'] = col.img;
			c.push({img:col.img}); 
			
		}
		if(typeof col.size !== "undefined"){
			//c['img'] = col.img;
			c.push({size:col.size});
			
		}
		if(typeof col.optimizedsize !== "undefined"){
			//c['img'] = col.img;
			c.push({optimizedsize:col.optimizedsize});
			
		}
		
		
	});
	//console.log(c);
	
}