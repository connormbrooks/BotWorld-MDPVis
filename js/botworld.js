//universally accessible board object
var board;


//board object
function boardObject(){
	this.board = [];
	this.addRow = function(newRow){
		this.board.push(newRow);
	}
	this.getElement = function(row, col){
		return this.board[row][col];
	}
}

function boardSpace(id){
	this.accessible = true;
	this.value = 0;
	this.id = id;
}

function boardClick(div){
	var divId = div.id;
	var row = parseInt(divId.split(":")[0]);
	var col = parseInt(divId.split(":")[1]);
	var el = board.getElement(row,col);
	alert("hello from id: "+el.id);
}


function validateInput(){
	var rows = document.getElementsByName('size')[0].value;
	var cols = document.getElementsByName('size')[1].value;
	if(isNaN(parseInt(rows)) || isNaN(parseInt(cols))){
		alert("Invalid number format - please reenter size");
	} else {
		document.getElementById("InfoInput").innerHTML = "";
		generateBoard(parseInt(rows), parseInt(cols));
	}
}

//This function creates a matrix of appropriate size to use for internal model of game
//also modifies HTML to create divs for gameboard on screen
function generateBoard(rows, cols){
	var boardElement = document.getElementById("Board");
	var colWidth = 95/(cols+1);
	board = new boardObject();
	var counter = 1;
	for(var i = 0; i < rows; i++){
		var row = [];
		boardElement.innerHTML = boardElement.innerHTML + "<div id='Row"+i
			+"' style='width: 100%; float: left;'></div>";
		var rowElement = document.getElementById("Row"+i);
		for(var j = 0; j < cols; j++){
			row.push(new boardSpace(counter++));
			rowElement.innerHTML = rowElement.innerHTML + "<div id='"+i+":"+j
				+"' class='boardspace' onclick='boardClick(this)' style='width: "
				+colWidth+"%; float: left'></div>";
		}
		board.addRow(row);
	}
}