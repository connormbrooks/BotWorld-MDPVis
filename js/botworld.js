//universally accessible board object
var board;


//OBJECTS*********************************************************************

//board object
function boardObject(){
	this.boardMat = [];
	this.addRow = function(newRow){
		this.boardMat.push(newRow);
	}
	this.getElement = function(row, col){
		return this.boardMat[row][col];
	}
	this.startingTile = [0,0];
	this.endingTile = [1,1];
	this.rows = 2;
	this.cols = 2;
}

function boardSpace(id, row, col){
	this.accessible = true;
	this.score = 0;
	this.id = id;
	this.row = row;
	this.col = col;
	this.probability = 1;
	this.utility = 0;
}

//OBJECTS*********************************************************************


function boardClick(div){
	var divId = div.id;
	var row = parseInt(divId.split(":")[0]);
	var col = parseInt(divId.split(":")[1]);
	var el = board.getElement(row,col);
	displayOptions(el);
}

function validateInput(){
	var rows = parseInt(document.getElementsByName('size')[0].value);
	var cols = parseInt(document.getElementsByName('size')[1].value);
	if(isNaN(rows) || isNaN(cols)){
		alert("Invalid number format - please reenter size");
	} else if(rows > 50 || cols > 50){
		alert("Max number of rows/cols = 50");
	} else if(rows < 2 || cols < 2){
		alert("Min number of rows/cols = 2");
	}
	else {
		document.getElementById("InfoInput").innerHTML = "";
		generateBoard(rows, cols);
	}
}


function updateScore(row, col){
	var score = parseFloat(document.getElementsByName('score')[0].value);
	if(isNaN(score)){
		alert("Invalid number format for score");
	} else{
		board.getElement(row,col).score = score;
		document.getElementById(row+":"+col+"score").innerHTML = score;
		document.getElementById("BottomInfoPanel").innerHTML = "";
	} 
}

function updateProbability(row, col){
	var probability = parseFloat(document.getElementsByName('probability')[0].value);
	if(isNaN(probability)){
		alert("Invalid number format for score");
	} else{
		board.getElement(row,col).probability = probability;
		document.getElementById(row+":"+col+"probability").innerHTML = probability;
		document.getElementById("BottomInfoPanel").innerHTML = "";
	} 
}

function policy(){
	var gamma = parseFloat(document.getElementsByName("gamma")[0].value);
	if(isNaN(gamma) || gamma < 0 || gamma > 1){
		alert("Gamma must be a number between 0 and 1");
	} else {
		var threshold = parseFloat(document.getElementsByName("threshold")[0].value);
		if(isNaN(threshold) || threshold < 0){
			alert("Threshold must be a positive number");
		} else {
			board.gamma = gamma;
			board.threshold = threshold;
			valueIteration();
			addRunButton();
		}
	}
}

function valueIteration(){
	util = startingUtilities();
	util2 = deepCopy(util);
	delta = 0;
	do{
		for(var i = 0; i < util.length; i++){
			//TODO: finish value iteration
		}
	} while(delta >= (board.threshold*(1-board.gamma))/board.gamma);
	setUtilities(util2);
}

function run(){
	console.log("run");
}

//HTML MODIFIERS*********************************************************************

//This function creates a matrix of appropriate size to use for internal model of game
//also modifies HTML to create divs for gameboard on screen
function generateBoard(rows, cols){
	var boardElement = document.getElementById("Board");
	var size = 90/(cols);
	size = Math.min(size, 4);
	var padding = (90 - size*cols)/2;
	document.getElementById("TopInfoPanel").style["padding-left"] = padding + "vw";
	document.getElementById("BottomInfoPanel").style["padding-left"] = padding + "vw";
	board = new boardObject();
	board.rows = rows;
	board.cols = cols;
	var counter = 1;
	for(var i = 0; i < rows; i++){
		var row = [];
		boardElement.innerHTML = boardElement.innerHTML + "<div id='Row"+i
			+"' style='padding-left: "+padding+"vw; float: left;'></div>";
		var rowElement = document.getElementById("Row"+i);
		for(var j = 0; j < cols; j++){
			row.push(new boardSpace(counter++, i, j));
			rowElement.innerHTML = rowElement.innerHTML + "<div id='"+i+":"+j
				+"' class='boardspace' onclick='boardClick(this)' style='width: "
				+size+"vw; min-height: "+size+"vw; float: left'><span id='"+i+":"+j+"status"+"'>"
				+"</span><br><span id='"+i+":"+j+"score'>0</span>/<span id='"+i+":"+j+"probability'>1</span></div>";
		}
		board.addRow(row);
	}
	document.getElementById("0:0status").innerHTML = "START";
	document.getElementById("1:1status").innerHTML = "END";
	addPolicyButton();
}

function displayUpdateScore(row, col){
	var infoSpace = document.getElementById("BottomInfoPanel");
	var str = "Update score for tile ("+row+","+col+"): <input name='score' type='text'/>"
	 +"<br/><input type='submit' value='Update' onclick='updateScore("+row+","+col+");'/>";
	infoSpace.innerHTML = str;
	addPolicyButton();
}

function displayUpdateProbability(row, col){
	var infoSpace = document.getElementById("BottomInfoPanel");
	var str = "Update probability of successful movement when on tile ("+row+","+col+"): <input name='probability' type='text'/>"
	 +"<br/><input type='submit' value='Update' onclick='updateProbability("+row+","+col+");'/>";
	infoSpace.innerHTML = str;
	addPolicyButton();
}

function makeStartingTile(row, col){
	if(board.endingTile[0] == row && board.endingTile[1] == col){
		alert("Starting and ending tiles must be different!");
	} else if(!(board.getElement(row,col).accessible)){
		alert("Staring tile must be accessible");
	}
	else {
		//delete old START signifier
		document.getElementById(board.startingTile[0]+":"+board.startingTile[1]+"status").innerHTML="";

		board.startingTile[0] = row;
		board.startingTile[1] = col;
		document.getElementById(row+":"+col+"status").innerHTML = "START";

		document.getElementById("BottomInfoPanel").innerHTML = "";
	}
	addPolicyButton();
}

function makeEndingTile(row, col){
	if(board.startingTile[0] == row && board.startingTile[1] == col){
		alert("Starting and ending tiles must be different!");
	} else if(!(board.getElement(row,col).accessible)){
		alert("Ending tile must be accessible");
	} 
	else {
		//delete old START signifier
		document.getElementById(board.endingTile[0]+":"+board.endingTile[1]+"status").innerHTML="";

		board.endingTile[0] = row;
		board.endingTile[1] = col;
		document.getElementById(row+":"+col+"status").innerHTML = "END";

		document.getElementById("BottomInfoPanel").innerHTML = "";
	}
	addPolicyButton();
}

function makeAccessible(row, col){
	var elem = board.getElement(row,col);
	if(!elem.accessible){
		elem.accessible = true;
		document.getElementById(row+":"+col).style["background-color"] = "white";
		addPolicyButton();
	}
	document.getElementById("BottomInfoPanel").innerHTML = "";
}

function makeInaccessible(row, col){
	if((board.startingTile[0] == row && board.startingTile[1] == col)
		|| (board.endingTile[0] == row && board.endingTile[1] == col)){
		alert("Cannot make starting/ending tile inaccessible");
	} else {
		var elem = board.getElement(row, col);
		if(elem.accessible){
			elem.accessible = false;
			document.getElementById(row+":"+col).style["background-color"] = "black";
			addPolicyButton();
		}
		document.getElementById("BottomInfoPanel").innerHTML = "";
	}
}

function displayOptions(el){
	var infoSpace = document.getElementById("BottomInfoPanel");
	var str="Tile ("+el.row+","+el.col+")<br/><button onclick='displayUpdateScore("+el.row+","+el.col+")'>Update Score</button>"
	+"<br/><button onclick='displayUpdateProbability("+el.row+","+el.col+")'>Update Prob. of Successful Move</button>"
	+"<br/><button onclick='makeStartingTile("+el.row+","+el.col+")'>Make Starting Tile</button>"
	+"<br/><button onclick='makeEndingTile("+el.row+","+el.col+")'>Make Ending Tile</button>"
	+"<br/><button onclick='makeAccessible("+el.row+","+el.col+")'>Make Accessible</button>"
	+"<br/><button onclick='makeInaccessible("+el.row+","+el.col+")'>Make Inaccessible</button>";
	infoSpace.innerHTML = str;
}

function addPolicyButton(){
	var str = "Gamma:<input type='text' name='gamma' size=4/>Threshold:<input type='text' name='threshold' size=4/>"
	+"<button onclick='policy()'>Find Policy</button>";
	document.getElementById("TopInfoPanel").innerHTML = str;
}

function addRunButton(){
	document.getElementById("TopInfoPanel").innerHTML = "<button onclick='run()'>Run</button>";
}

//HTML MODIFIERS*********************************************************************

//MDP HELPER FUNCTIONS*********************************************************************

function setUtilities(vec){
	var place = 0;
	for(var i = 0; i < board.rows; i++){
		for(var j = 0; j < board.cols; j++){
			var ele = board.getElement(i,j);
			if(ele.accessible){
				ele.utility = vec[place++];
			}
		}
	}
}

function startingUtilities(){
	util = [];
	for(var i = 0; i < board.rows; i++){
		for(var j = 0; j < board.cols; j++){
			if(board.getElement(i,j).accessible){
				util.push(0);
			}
		}
	}
}

function deepCopy(vec, newvec){
	for(var i = 0; i < vec.length; i++){
		newvec.push(vec[i]);
	}
}

//MDP HELPER FUNCTIONS*********************************************************************