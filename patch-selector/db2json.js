var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('sqlite.db');
var OUT = ""; 
db.each("SELECT * FROM patches", function(err, row) {
	if(OUT.length != 0) OUT += ",\n";
	OUT += JSON.stringify(row);
});	

 
db.close(function(){
	console.log("var patches = ["+OUT+"];"); 	
});
