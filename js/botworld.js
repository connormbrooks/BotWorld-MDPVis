function createTable() {
	var body = document.body;
	var table = document.createElement("table");
	var size = document.getElementsByName('size')[0].value;

	for(var i = 0; i < size; i++) {
		var tr = table.insertRow();
		for(var j = 0; j < size; j++) {
			var td = tr.insertCell();
            var textbox = document.createElement("input");
            textbox.setAttribute("type", "textbox");
            textbox.setAttribute("name", i + "-" + j);
            
			td.appendChild(textbox);
		}
	}

	body.appendChild(table);
}