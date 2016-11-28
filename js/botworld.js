//universally accessible board object
var board;


//OBJECTS*********************************************************************

//board object
function boardObject(){
	//matrix keeping track of elements stored by their location
	this.boardMat = [];

	//matrix that maps ids to locations
	this.idLocationMat = [];

	this.addElement = function(el){
		this.boardMat[el.row+"_"+el.col] = el;
		this.idLocationMat[""+el.id] = el.row+"_"+el.col;
	}
	this.getElement = function(row, col){
		return this.boardMat[row+"_"+col];
	}
	this.getElementById = function(id){
		return this.boardMat[this.idLocationMat[""+id]];
	}
	this.getAccessibleStates = function(){
		var s = [];
		for(var i = 0; i < this.rows; i++){
			for(var j = 0; j < this.cols; j++){
				if(this.getElement(i,j).accessible){
					s.push(this.getElement(i,j));
				}
			}
		}
		return s;
	}
	this.startingTile = [0,0];
	this.endingTiles = [[1,1]];
	this.rows = 2;
	this.cols = 2;
	this.gamma = 0.1;
	this.threshold = 1;
}

function boardSpace(id, row, col){
	this.accessible = true;
	this.score = 0;
	this.id = id;
	this.row = row;
	this.col = col;
	this.probability = 1;
	this.utility = 0;
	this.endingTile = false;
}

//OBJECTS*********************************************************************



//MAIN FUNCTIONS*********************************************************************

function boardClick(div){
	var divId = div.id;
	var row = parseInt(divId.split(":")[0]);
	var col = parseInt(divId.split(":")[1]);
	var el = board.getElement(row,col);
	displayOptions(el);
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
	var s = board.getAccessibleStates();
	var util = startingUtilities(s);
	iterate(s, util, 1);
}

function iterate(s, util_prime, count){
	var util = deepCopy(util_prime);
	var delta = 0;
	for(var i = 0; i < s.length; i++){
		util_prime[""+s[i].id] = board.getElementById(s[i].id).score 
		+ board.gamma*Math.max(scoreAction(s[i],"UP",util),scoreAction(s[i],"RIGHT",util), scoreAction(s[i],"DOWN",util),scoreAction(s[i],"LEFT",util));
		if(Math.abs(util_prime[""+s[i].id] - util[""+s[i].id]) > delta){
			delta = Math.abs(util_prime[""+s[i].id] - util[""+s[i].id]);
		}
	}
	if(delta >= (board.threshold*(1-board.gamma))/board.gamma){
		//iterate again
		setTimeout(function(){
			iterate(s, util_prime, ++count);
		},100);
	} else {
		//done iterating, set utilities and end
		setUtilities(util_prime);
	}
}

function run(){
	console.log("run");
}

function scoreAction(state, action){
	return 0;
}

//MAIN FUNCTIONS*********************************************************************



//HTML MODIFIERS*********************************************************************

//This function creates a matrix of appropriate size to use for internal model of game
//also modifies HTML to create divs for gameboard on screen

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
	} else if(probability < 0 || probability > 1){
		alert("Probability of successful move must be between 0 and 1");
	} else{
		board.getElement(row,col).probability = probability;
		document.getElementById(row+":"+col+"probability").innerHTML = probability;
		document.getElementById("BottomInfoPanel").innerHTML = "";
	} 
}

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
		boardElement.innerHTML = boardElement.innerHTML + "<div id='Row"+i
			+"' style='padding-left: "+padding+"vw; float: left;'></div>";
		var rowElement = document.getElementById("Row"+i);
		for(var j = 0; j < cols; j++){
			board.addElement(new boardSpace(counter++, i, j));
			rowElement.innerHTML = rowElement.innerHTML + "<div id='"+i+":"+j
				+"' class='boardspace' onclick='boardClick(this)' style='width: "
				+size+"vw; min-height: "+size+"vw; float: left'><span id='"+i+":"+j+"status"+"'>"
				+"</span><br><span id='"+i+":"+j+"score'>0</span>/<span id='"+i+":"+j+"probability'>1</span>"
				+"<br/><span id='"+i+":"+j+"util'>0</div>";
		}
	}
	document.getElementById("0:0status").innerHTML = "START";
	document.getElementById("1:1status").innerHTML = "END";
	board.getElement(1,1).endingTile = true;
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
	if(board.getElement(row,col).endingTile){
		alert("Starting tile cannot be an ending tile!");
	} else if(!(board.getElement(row,col).accessible)){
		alert("Starting tile must be accessible");
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

function toggleEndingTile(row, col){
	if(board.startingTile[0] == row && board.startingTile[1] == col){
		alert("Starting tile cannot be an ending tile!");
	} else if(!(board.getElement(row,col).accessible)){
		alert("Ending tile must be accessible");
	} 
	else {
		if(!board.getElement(row,col).endingTile){
			board.endingTiles.push([row,col]);
			document.getElementById(row+":"+col+"status").innerHTML = "END";
			board.getElement(row,col).endingTile = true;
		} else{
			if(board.endingTiles.length == 1){
				alert("Must have at least one ending tile");
			} else {
				board.endingTiles.splice(board.endingTiles.indexOf([row,col]),1);
				document.getElementById(row+":"+col+"status").innerHTML = "";
				board.getElement(row,col).endingTile = false;
			}
		}

		document.getElementById("BottomInfoPanel").innerHTML = "";
	}
	addPolicyButton();
	console.log(board.endingTiles);
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

function drawUtility(row, col, util){
	document.getElementById(row+":"+col+"util").innerHTML = util;
}

function displayOptions(el){
	var infoSpace = document.getElementById("BottomInfoPanel");
	var str="Tile ("+el.row+","+el.col+")<br/><button onclick='displayUpdateScore("+el.row+","+el.col+")'>Update Score</button>"
	+"<br/><button onclick='displayUpdateProbability("+el.row+","+el.col+")'>Update Prob. of Successful Move</button>"
	+"<br/><button onclick='makeStartingTile("+el.row+","+el.col+")'>Make Starting Tile</button>"
	+"<br/><button onclick='toggleEndingTile("+el.row+","+el.col+")'>Toggle Ending Tile</button>"
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

function scoreAction(state, action, util){
	//sum up four possible results from an action (intended action + 3 unintended actions)
	var actionMove;
	if(action == "UP"){
		actionMove = [[-1, 0], [0, 1], [0, -1]];
	} else if (action == "RIGHT"){
		actionMove = [[0, 1], [-1, 0], [1, 0]];
	} else if (action == "DOWN"){
		actionMove = [[1, 0], [0, 1], [0, -1]];
	} else if (action == "LEFT"){
		actionMove = [[0, -1], [-1, 0], [1, 0]];
	} else {
		console.log("Invalid action");
		return 0;
	}
	var probSuccess = state.probability;
	var probOther = (1 - probSuccess) / 2.0;
	var scoreSum = probSuccess*util[""+resultingState(state, actionMove[0]).id];
	for(var i = 1; i < actionMove.length; i++){
		scoreSum += probOther*util[""+resultingState(state, actionMove[i]).id];
	}
	return scoreSum;
}

function resultingState(state, action){
	var newRow = state.row + action[0];
	var newCol = state.col + action[1];
	if(newRow < 0 || newRow >= board.rows || newCol < 0 || newCol >= board.cols || !board.getElement(newRow,newCol).accessible){
		//out of bounds or inaccessible
		return state;
	} else {
		return board.getElement(newRow, newCol);
	}
}

function setUtilities(vec){
	var ids = Object.keys(vec);
	for(var i = 0; i < ids.length; i++){
		var boardEl = board.getElementById(ids[i]);
		boardEl.utility = vec[ids[i]];
		drawUtility(boardEl.row, boardEl.col, boardEl.utility);
	}
}

function startingUtilities(states){
	util = [];
	for(var i = 0; i < states.length; i++){
		util[""+states[i].id] = 0;
	}
	return util;
}

function deepCopy(obj){
	var newobj = [];
	var properties = Object.keys(obj);
	for(var i = 0; i < properties.length; i++){
		newobj[properties[i]] = obj[properties[i]];
	}
	return newobj;
}

//MDP HELPER FUNCTIONS*********************************************************************