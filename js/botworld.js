//universally accessible board object
var board;

//flag for interrupting running processes
var HALT = false;


//OBJECTS*********************************************************************

//board object
function boardObject(){
	//matrix keeping track of elements stored by their location
	this.boardMat = [];

	//matrix that maps ids to locations
	this.idLocationMat = [];

	this.addElement = function(el){
		this.boardMat[el.row+":"+el.col] = el;
		this.idLocationMat[""+el.id] = el.row+":"+el.col;
	}
	this.getElement = function(row, col){
		if(row < 0 || row >= this.rows || col < 0 || col >= this.cols){
			return null;
		}
		return this.boardMat[row+":"+col];
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
	this.gradient = new Rainbow();
}


//tile object
function boardSpace(id, row, col){
	this.accessible = true;
	this.score = 0;
	this.id = id;
	this.row = row;
	this.col = col;
	this.probability = 1;
	this.utility = 0;
	this.endingTile = false;
	this.policy = "-";
}

//agent object
function agent(leftProb,upProb,rightProb,downProb,knowsStart){
	this.probabilities = {
		"L" : leftProb,
		"U" : upProb,
		"R" : rightProb,
		"D" : downProb
	};
	this.knowsStartingLocation = knowsStart;
	this.beliefs = {};
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
		}
	}
}

function valueIteration(){
	var s = board.getAccessibleStates();
	var util = startingUtilities(s);
	setIteratingStatus();
	iterate(s, util, 1);
}

function iterate(s, util_prime, count){
	var util = deepCopy(util_prime);
	var delta = 0;
	for(var i = 0; i < s.length; i++){
		util_prime[""+s[i].id] = board.getElementById(s[i].id).score 
		+ board.gamma*Math.max(scoreAction(s[i],"U",util),scoreAction(s[i],"R",util), scoreAction(s[i],"D",util),scoreAction(s[i],"L",util));
		if(Math.abs(util_prime[""+s[i].id] - util[""+s[i].id]) > delta){
			delta = Math.abs(util_prime[""+s[i].id] - util[""+s[i].id]);
		}
	}
	if(delta >= (board.threshold*(1-board.gamma))/board.gamma){
		//iterate again
		setTimeout(function(){
			iterate(s, util_prime, ++count);
		},10);
	} else {
		//done iterating, show calculated utilities of each spot
		setUtilities(util_prime);
		//then specify policy
		setPolicy(util_prime);
		addRunButton(count);
	}
}

function setPolicy(util){
	var keys = Object.keys(util);
	for(var i = 0; i < keys.length; i++){
		var state = board.getElementById(keys[i]);
		var moves = ["U", "R", "D", "L"];
		//mix up moves to make it random which one is chosen as best when there are equal utilities
		moves = shuffleArr(moves, 10);
		var bestMove = moves[0][0];
		var bestScore = scoreAction(state, moves[0], util);
		for(var j = 1; j < moves.length; j++){
			var newScore = scoreAction(state, moves[j], util);
			if(newScore > bestScore){
				bestMove = moves[j][0];
				bestScore = newScore;
			} else if (newScore == bestScore){
				bestMove += "/"+moves[j][0];
			}
		}
		state.policy = bestMove;
		drawPolicy(state, bestMove);
	}
}

function run(agnt = null, mode = 0){
	setCurrentState(board.startingTile,null);
	if(mode > 0 && agnt != null){
		startingBeliefs(agnt);
		drawBeliefs(agnt);
	}
	HALT = false;
	drawStopRun();
	setTimeout(function(){
		getNextState(board.startingTile, 0, agnt, mode);
	}, 100);
}

function getNextState(tile, score, agnt, mode){
	var el = board.getElement(tile[0], tile[1]);
	score += el.score;
	if(el.endingTile || HALT){
		HALT = false;
		if(mode < 0){
			endRun(tile, score);
		} else {
			endPOMDPRun(tile, score, agnt);
		}
		return;
	}

	//note that the actual probability of a successful movement is contingent on the ACTUAL tile
	//is not affected by the belief state of the agent
	var probSuccess = board.getElement(tile[0], tile[1]).probability;
	var probEachOther = (1-probSuccess)/2.0;

	var optimum = null; 
	var altMoves = null;
	//find chosen move based on mode of MDP or POMDP
	if(mode == 0){
		optimum = getPolicyMove(tile);
	} else if (mode == 1){
		//for this greedy POMDP solver, just do the policy for the dominant belief state
		var domBelief = getDominantBeliefState(agnt);
		optimum = getPolicyMove([domBelief.row,domBelief.col]);
	}
	altMoves = getSideMoves(optimum);

	var randomRoll = Math.random();
	if(randomRoll < probSuccess){
		//take the best move
		var newTile = [tile[0] + optimum[0], tile[1] + optimum[1]];
	} else if (randomRoll < probSuccess + probEachOther){
		//take the first alternate move
		var newTile = [tile[0] + altMoves[0][0], tile[1] + altMoves[0][1]];
	} else {
		//take the second alternate move
		var newTile = [tile[0] + altMoves[1][0], tile[1] + altMoves[1][1]];
	}

	//check if the chosen move results in an inaccessible/out of bounds state. if so, stay still
	if(newTile[0] < 0 || newTile[0] >= board.rows || newTile[1] < 0 || newTile[1] >= board.cols 
		|| !board.getElement(newTile[0],newTile[1]).accessible){
		newTile = tile;
	}

	//make move
	setCurrentState(newTile,tile);

	//if POMDP, update belief state
	if(mode > 0){
		var sense = getSensors(agnt, newTile);
		//forward the belief state based on the chosen action
		forwardBeliefs(agnt, optimum, sense);
		//draw new beliefs
		drawBeliefs(agnt);
	}

	setTimeout(function(){
		getNextState(newTile, score, agnt, mode);
	}, 250);
}

function stopRun(){
	//flip halting flag
	HALT = true;
}

//MAIN FUNCTIONS*********************************************************************



//HTML MODIFIERS*********************************************************************

//This function creates a matrix of appropriate size to use for internal model of game
//also modifies HTML to create divs for gameboard on screen

function endRun(tile, score){
	document.getElementById("TopInfoPanel").innerHTML="Final score: "+score+"<br/><button onclick='run()'>Run Again</button>";
	setTimeout(function(){
		document.getElementById(tile[0]+":"+tile[1]).style["border-radius"] = "0%";
	}, 700);
}
function endPOMDPRun(tile, score, agnt){
	document.getElementById("TopInfoPanel").innerHTML="Final score: "+score+"<br/>"
	+ " Left Range Sensor Probability: <input type='text' name='leftsensor' /> <br/>"
	+ " Up Range Sensor Probability: <input type='text' name='upsensor' /> <br/>"
	+ " Right Range Sensor Probability: <input type='text' name='rightsensor' /> <br/>"
	+ " Down Range Sensor Probability: <input type='text' name='downsensor' /> <br/>"
	+ " Agent knows starting tile: <input type='radio' name='startknowledge' value='true' checked>True</input>"
	+ " &nbsp;<input type='radio' name='startknowledge' value='false'>False</input> <br/>"
	+ " <button onclick='validatePOMDPInput()'>Run</button>";
	setTimeout(function(){
		document.getElementById(tile[0]+":"+tile[1]).style["border-radius"] = "0%";
		clearBeliefs();
	}, 700);
}

function setCurrentState(tile,lastTile){
	if(lastTile != null){
		document.getElementById(lastTile[0]+":"+lastTile[1]).style["border-radius"] = "0%";
	}
	document.getElementById(tile[0]+":"+tile[1]).style["border-radius"] = "50%";
}

function validatePOMDPInput(){
	var createHTML = document.getElementById("BottomInfoPanel").innerHTML;
	var left = parseFloat(document.getElementsByName("leftsensor")[0].value);
	var up = parseFloat(document.getElementsByName("upsensor")[0].value);
	var right = parseFloat(document.getElementsByName("rightsensor")[0].value);
	var down = parseFloat(document.getElementsByName("downsensor")[0].value);
	if(isNaN(left) || left < 0 || left > 1 || isNaN(up) || up < 0 || up > 1 
		|| isNaN(right) || right < 0 || right > 1 || isNaN(down) || down < 0 || down > 1){
		alert("Sensor probabilities must be numbers between 0 and 1");
		return;
	}
	var radios = document.getElementsByName("startknowledge");
	var knowsStart = true;
	for(var i = 0; i < radios.length; i++){
		if(radios[i].checked){
			knowsStart = eval(radios[i].value);
		}
	}
	var agnt = new agent(left, up, right, down, knowsStart);
	agnt.create_text = createHTML;
	//TODO: add entropy-based greedy method as separate mode option for POMDPs
	var mode = 1;
	run(agnt, mode);
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
		document.getElementById("InfoInput").innerHTML = "<button onclick='restart()'>Restart</button>";
		generateBoard(rows, cols);
	}
}

function validateText(){
	try{
		var textObject = JSON.parse(document.getElementById("usertext").value);
	}catch(e){
		alert("Syntax error in board specification");
		return;
	}
	var rows = textObject.rows;
	var cols = textObject.cols;
	if(!Number.isInteger(rows) || !Number.isInteger(cols)){
		alert("Board specification must specify rows and cols properties as integers");
		return;
	}
	document.getElementById("InfoInput").innerHTML = "<button onclick='restart()'>Restart</button>";
	generateBoard(rows,cols);
	//turn off default ending tile before beginning
	toggleEndingTile(1,1,true);

	var start = textObject.start;
	if(start.length == 2){
		makeStartingTile(start[0],start[1]);
	}

	var enders = textObject.ends;
	for(var i = 0; i < enders.length; i++){
		if(enders[i].length == 2){
			toggleEndingTile(enders[i][0],enders[i][1]);
		}
	}

	var inaccessibles = textObject.inaccessibles;
	for(var i = 0; i < inaccessibles.length; i++){
		if(inaccessibles[i].length == 2){
			makeInaccessible(inaccessibles[i][0], inaccessibles[i][1]);
		}
	}

	var def_score = textObject.default_score;
	var def_prob = textObject.default_probability_of_successful_move;
	if(!isNaN(def_score)){
		for(var i = 0; i < board.rows; i++){
			for(var j = 0; j < board.cols; j++){
				updateScore(i,j, def_score);
			}
		}
	}

	if(!isNaN(def_prob) && def_prob > 0 && def_prob < 1){
		for(var i = 0; i < board.rows; i++){
			for(var j = 0; j < board.cols; j++){
				updateProbability(i, j, def_prob);
			}
		}
	}

	var score_updates = textObject.override_scores;
	var tiles = Object.keys(score_updates);
	for(var i = 0; i < tiles.length; i++){
		try{
			var tile = tiles[i].split(":");
			var score = score_updates[tiles[i]];
			updateScore(parseInt(tile[0]), parseInt(tile[1]), score);
		} catch(err){
			alert("Error in score override specifications");
		}
	}

	var prob_updates = textObject.override_probabilities;
	var tiles = Object.keys(prob_updates);
	for(var i = 0; i < tiles.length; i++){
		try{
			var tile = tiles[i].split(":");
			var prob = prob_updates[tiles[i]];
			updateProbability(parseInt(tile[0]), parseInt(tile[1]), prob);
		} catch(err){
			alert("Error in probability override specifications");
		}
	}

}

function updateScore(row, col, score=NaN){
	if(isNaN(score)){
		score = parseFloat(document.getElementsByName('score')[0].value);
		if(isNaN(score)){
			alert("Invalid number format for score");
			return;
		}
	}
	board.getElement(row,col).score = score;
	document.getElementById(row+":"+col+"score").innerHTML = Math.round(score*1000)/1000.0;
	document.getElementById("BottomInfoPanel").innerHTML = ""; 
}

function updateProbability(row, col, probability=NaN){
	if(isNaN(probability)){
		probability = parseFloat(document.getElementsByName('probability')[0].value);
		if(isNaN(probability)){
			alert("Invalid number format for score");
			return;
		} 
	}

	if(probability < 0 || probability > 1){
		alert("Probability of successful move must be between 0 and 1");
	} else{
		board.getElement(row,col).probability = probability;
		document.getElementById(row+":"+col+"probability").innerHTML = Math.round(probability*1000)/1000.0;
		document.getElementById("BottomInfoPanel").innerHTML = "";
	} 
}

function generateBoard(rows, cols){
	var boardElement = document.getElementById("Board");
	boardElement.innerHTML = "";
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
			+"' style='padding-left: "+padding+"vw; width: "+((100-1)-padding)+"vw; float: left;'></div>";
		var rowElement = document.getElementById("Row"+i);
		for(var j = 0; j < cols; j++){
			board.addElement(new boardSpace(counter++, i, j));
			rowElement.innerHTML = rowElement.innerHTML + "<div id='"+i+":"+j
				+"' class='boardspace' onclick='boardClick(this)' style='width: "
				+size+"vw; min-height: "+size+"vw; float: left'><span id='"+i+":"+j+"status"+"'>"
				+"</span><br><span id='"+i+":"+j+"score'>0</span>/<span id='"+i+":"+j+"probability'>1</span>"
				+"<br/><span id='"+i+":"+j+"util'>0</span><br/><span id='"+i+":"+j+"policy'>-</span></div>";
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

function toggleEndingTile(row, col, override = false){
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
			if(board.endingTiles.length == 1 && !override){
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
		|| (board.getElement(row,col).endingTile)){
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

function drawPolicy(state, policy){
	document.getElementById(state.row+":"+state.col+"policy").innerHTML = policy;
}

function drawUtility(row, col, util){
	document.getElementById(row+":"+col+"util").innerHTML = Math.round(util*1000)/1000.0;
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
	var str = "Gamma:<input type='text' name='gamma' size=4/><br>Threshold:<input type='text' name='threshold' size=4/>"
	+"<br><button onclick='policy()'>Find Policy</button>";
	document.getElementById("TopInfoPanel").innerHTML = str;
}

function setIteratingStatus(){
	document.getElementById("TopInfoPanel").innerHTML = "Performing value iteration...";
}

function addRunButton(c){
	document.getElementById("TopInfoPanel").innerHTML = "Utility convergence after: "+c+" iterations<br/>"
	+"<button onclick='run()'>Run as fully-observable world</button> <button onclick='setupPOMDP()'>Run as partially-observable world</button>";
}

function drawStopRun(){
	document.getElementById("TopInfoPanel").innerHTML = "<button onclick='stopRun()'>Stop Run</button>"
}

function restart(){
	location.reload();
}

function drawInstructions(){
	var str = "<div style='text-align: left; font-size: 10pt; margin-left: 10vw;'>Instructions:<br>&gt;Select rows and columns to determine size of world"
	+"<br>&gt;Each tile in the world can be a starting tile, an ending tile, or neither"
	+"<br>&nbsp;&nbsp;&gt;There must be at least one ending tile, but there can be as many as desired"
	+"<br>&nbsp;&nbsp;&gt;The starting tile cannot be an ending tile"

	+"<br><br>&gt;Each tile can be made inaccessible, resulting in it acting the same as an out of bounds tile"
	+"<br>&nbsp;&nbsp;&gt;Starting and ending tiles cannot be made inaccessible"

	+"<br><br>&gt;Each tile in the world has a score and a probability of success<br>"
	+"&nbsp;&nbsp;&gt;The score is the reward gained each time the agent enters that state<br>"
	+"&nbsp;&nbsp;&gt;The probability of success is the prob. that the agent moves as attempted when in that state<br>"
	+"&nbsp;&nbsp;&nbsp;&nbsp;&gt;If the agent's move does not success, the agent is equally likely to move in either of the adjacent directions"
	+"<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&gt;I.e. if the agent tries to move RIGHT but fails, it will either move UP or DOWN with equal probability"
	+"<br>&nbsp;&nbsp;&gt;The score and probability of success for a tile are shown on the tile in the format 'score/probability'"

	+"<br><br>&gt;Each tile has a utility, which is assumed to be 0 before being calculated"
	+"<br>&nbsp;&nbsp;&gt;The utility is drawn below the score/probability, and is updated after value iteration is run"

	+"<br><br>&gt;Once value iteration has been run, a policy is determined for each tile"
	+"<br>&nbsp;&nbsp;&gt;The policy at a tile is shown on a tile with the corresponding letter(s) of the directions of intended movement"
	+"<br>&nbsp;&nbsp;&nbsp;&nbsp;&gt;I.e. if the policy at tile A is move either left or right, 'L/R' will be displayed on the tile (in random order)</div>";
	document.getElementById("Board").innerHTML = str;
}

function displayTextBox(){
	var str = '<input type="submit" onclick="validateText()"/><br/><br/>'
	+'<span style="font-size: 10pt;">Alter the given fields to design a custom gameboard...</span>'
	+'<br><br><textarea rows="25" cols="70" id="usertext">'
	+'{\n\t"rows": 3,\n\t"cols": 4,\n\t"start": [0,0],\n\t"ends": [[0,1],[1,1]],\n\t"inaccessibles": [[2,2],[2,3]],'
	+'\n\n\t"default_score": 0,\n\t"default_probability_of_successful_move": 1,'
	+'\n\n\t"override_scores": {\n\t\t"1:1": 2,\n\t\t"1:0": -1\n\t},'
	+'\n\n\n\t"override_probabilities": {\n\t\t"0:0": 0.7,\n\t\t"2:1": 0.55\n\t}\n}</textarea>';
	document.getElementById("Board").innerHTML = str;
}

function setupPOMDP(){
	var str = "Set probability that each range sensor correctly"
	+ " senses distance to closest wall. <br>If sensor does not return the correct distance,<br> it has a uniformly"
	+ " distributed chance of returning all numbers less than the correct distance. <br>Thus, a noisy sensor will never overestimate"
	+ " the distance to the closest wall, <br>and will always be correct when directly adjacent to a wall<br><br>"
	+ " Left Range Sensor Probability: <input type='text' name='leftsensor' /> <br/>"
	+ " Up Range Sensor Probability: <input type='text' name='upsensor' /> <br/>"
	+ " Right Range Sensor Probability: <input type='text' name='rightsensor' /> <br/>"
	+ " Down Range Sensor Probability: <input type='text' name='downsensor' /> <br/>"
	+ " Agent knows starting tile: <input type='radio' name='startknowledge' value='true' checked>True</input>"
	+ " &nbsp;<input type='radio' name='startknowledge' value='false'>False</input> <br/>"
	+ " <button onclick='validatePOMDPInput()'>Run</button>";
	document.getElementById("TopInfoPanel").innerHTML = str;
	board.gradient.setSpectrum("blue", "red");
	board.gradient.setNumberRange(0,1000);
}

//use a 'heatmap' to color tiles based on agent beliefs 
//(deeper colors = stronger belief that agent is in that state)
function drawBeliefs(agnt){
	var stateIDs = Object.keys(agnt.beliefs);
	//var x = deepCopy(agnt.beliefs);
	//console.log(x);
	for(var i = 0; i < stateIDs.length; i++){
		var tile = board.getElementById(stateIDs[i]);
		var belief = agnt.beliefs[""+tile.id];
		if(belief < 0.000001){
			document.getElementById(tile.row+":"+tile.col).style["background-color"] = "white";
		} else {
			document.getElementById(tile.row+":"+tile.col).style["background-color"] = board.gradient.colourAt(Math.floor(belief * 1000));
		}
	}
}


function clearBeliefs(){
	var states = board.getAccessibleStates();
	for(var i = 0; i < states.length; i++){
		document.getElementById(states[i].row+":"+states[i].col).style["background-color"] = "white";
	}
}

//HTML MODIFIERS*********************************************************************



//MDP HELPER FUNCTIONS*********************************************************************

function directionToArray(str){
	if(str == "U"){
		return [-1, 0];
	} else if (str == "R"){
		return [0, 1];
	} else if (str == "D"){
		return [1, 0];
	} else if (str == "L"){
		return [0,-1];
	} else {
		alert("Unrecognized direction encountered");
		return [0,0];
	}
}

function arrayToDirection(arr){
	if(arr == [-1, 0]){
		return "U";
	} else if (arr == [0, 1]){
		return "R";
	} else if (arr == [1, 0]){
		return "D";
	} else if (arr == [0, -1]){
		return "L";
	} else {
		alert("Unrecognized direction encountered");
		return "";
	}
}

//finds moves to relative left and right of an intended move
function getSideMoves(move){
	if(move[0] != 0){
		return [[0,1],[0,-1]];
	} else {
		return [[1,0],[-1,0]];
	}
}

function getPolicyMove(tile){
	var policy = board.getElement(tile[0],tile[1]).policy;
	var policy_split = policy.split("/");
	//choose a random move in the case of multiple moves in policy
	var move = policy_split[Math.floor(Math.random()*policy_split.length)];
	return directionToArray(move);
}


//returns states accessible from current state
function getAdjacentAccessibleStates(state){
	var successors = [];
	var moves = [[-1,0],[0,1],[1,0],[0,-1]];
	var newState;
	var local_inaccessibles = false;
	for(var i = 0; i < moves.length; i++){
		newState = board.getElement(state.row + moves[i][0], state.col + moves[i][1]);
		if(newState != null && newState.accessible){
			successors.push(newState);
		} else {
			local_inaccessibles = true;
		}
	}
	//if there are any inaccessible states around, the current state is a possible adjacent state
	//since landing on an inaccessible state "bounces" the agent back to the current state
	if(local_inaccessibles){
		successors.push(state);
	}
	return successors;
}

function scoreAction(state, action, util){
	//first check if this is an ending tile
	if(state.endingTile){
		return 0;
	}

	//TODO: clean this up using getTransitionProbability and getAdjacentAccessibleStates

	//sum up four possible results from an action (intended action + 3 unintended actions)
	var actionMove;
	if(action == "U"){
		actionMove = [[-1, 0], [0, 1], [0, -1]];
	} else if (action == "R"){
		actionMove = [[0, 1], [-1, 0], [1, 0]];
	} else if (action == "D"){
		actionMove = [[1, 0], [0, 1], [0, -1]];
	} else if (action == "L"){
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

function shuffleArr(array, slices){
	for(var i = 0; i < slices; i++){
		var mover = Math.floor(Math.random() * array.length);
		var second_mover = Math.floor(Math.random() * array.length);
		var temp = array[mover];
		array[mover] = array[second_mover];
		array[second_mover] = temp;
	}
	return array;
}


//probability that taking action in state leads to newState
function getTransitionProbability(state, action, newState){
	if(resultingState(state, action) == newState){
		return state.probability;
	} else {
		var slips = getSideMoves(action);
		if(slips.length == 2){
			if(resultingState(state, slips[0]) == newState || resultingState(state, slips[1]) == newState){
				return (1 - state.probability) / 2.0;
			} else {
				//not a possible resulting state
				return 0;
			}
		}
	}
}
//MDP HELPER FUNCTIONS*********************************************************************


//POMDP HELPER FUNCTIONS********************************************************************

//find the most likely belief state for the agent
function getDominantBeliefState(agnt){
	var states = Object.keys(agnt.beliefs);
	var maxStateBelief = 0;
	for(var i = 1; i < states.length; i++){
		if(agnt.beliefs[states[i]] > agnt.beliefs[states[maxStateBelief]]){
			maxStateBelief = i;
		}
	}
	return board.getElementById(states[maxStateBelief]);
}

function getSensors(agnt, stateLoc){
	var sensePack = [];
	var directions = ["L", "U", "R", "D"];
	for(var i = 0; i < directions.length; i++){
		var range = findRange(stateLoc, directions[i]);
		var roll = Math.random();
		var baseProbability = agnt.probabilities[directions[i]];
		var selected = false;
		if(roll < baseProbability || range == 0){
			//sensor correctly detects range
			sensePack[directions[i]] = range;
			selected = true;
		} else {
			//odds are distributed evenly between all numbers up to range
			var altProbability = (1 - baseProbability) / range;
			for(var j = 0; j < range; j++){
				if(roll < baseProbability + (j+1)*altProbability){
					sensePack[directions[i]] = j;
					selected = true;
					break;
				}
			}

			//because of rounding errors, there is a slight chance none could be selected yet
			if(!selected){
				sensePack[directions[i]] = range;
				selected = true;
			}
		}
	}
	return sensePack; 
}

//setup starting belief state for agent
function startingBeliefs(agnt){
	var s = board.getAccessibleStates();
	//first clear the beliefs object
	var keys = Object.keys(agnt.beliefs);
	for (var i = 0; i < keys.length; i++){
		delete agnt.beliefs[keys[i]];
	}
	//then...
	//set default belief state based on whether or not agent knows where it starts
	var def_state = (agnt.knowsStartingLocation) ? 0 : 1.0/s.length;
	for(var i = 0; i < s.length; i++){
		agnt.beliefs[""+s[i].id] = def_state;
	}
	if(agnt.knowsStartingLocation){
		//make the belief state 1 for the starting state
		var start = board.getElement(board.startingTile[0],board.startingTile[1]);
		agnt.beliefs[""+start.id] = 1;
	}
}

//Update belief state for the agent based on the current belief state, the action taken, and the sensory input received
function forwardBeliefs(agnt, action, sense){
	var states = Object.keys(agnt.beliefs);
	var newBeliefs = deepCopy(agnt.beliefs);
	//build alpha as we generate each new belief - will use it 
	var alpha = 0.0;
	for(var i = 0; i < states.length; i++){
		var stateTile = board.getElementById(states[i]);
		newBeliefs[states[i]] = probabilityOfSensing(agnt, stateTile, sense) * sumPossibleLastStates(stateTile, action, agnt);
		alpha += newBeliefs[states[i]];
	}
	//once alpha is finished being computed, go back through and divide all beliefs by alpha to make them sum to 1
	for(var j = 0; j < states.length; j++){
		agnt.beliefs[states[j]] = (newBeliefs[states[j]] / alpha);
	}
}

//finds the probability that agent gets sensory input sense in given state
function probabilityOfSensing(agnt, state, sense){
	//agent has specified probability of sensing correctly. 
	//if the agent does not sense correctly, it has a uniform probability of sensing all possible values less than actual value
	//consequently, the sensor never senses too far and always senses correctly when directly next to a wall
	var directions = ["L", "U", "R", "D"];
	var overallProb = 1;
	var range, prob;
	//find the probability of sensing what was sensed in each of the four directions and multiply by each other
	for(var i = 0; i < directions.length; i++){
		range = findRange([state.row,state.col], directions[i]);
		if(range == 0 && sense[directions[i]] == 0){
			prob = 1;
		} else if(range == 0 && sense[directions[i]] != 0){
			prob = 0;
		} else if (sense[directions[i]] == range){
			prob = agnt.probabilities[directions[i]];
		} else {
			prob = (1 - agnt.probabilities[directions[i]])/range;
		}
		overallProb = overallProb * prob;
	}
	return overallProb;
}

//finds term that is the sum of the probabilities that any "originating" state could end up in the given state
//after taking the given action, multiplied by the belief that the agent was in the "originating" state
function sumPossibleLastStates(state, action, agnt){
	//the only possible states that could lead to this state are the adjacent states,
	// so these are the only ones we need to check
	var sum = 0;
	var adj = getAdjacentAccessibleStates(state);
	for(var i = 0; i < adj.length; i++){
		sum += getTransitionProbability(adj[i], action, state) * agnt.beliefs[""+adj[i].id];
	}
	return sum;
}


//finds the ACTUAL range in a given direction from a given state (what would be returned from a perfect sensor)
function findRange(stateLoc, direction){
	move = directionToArray(direction);
	var count = 0;
	var newState = board.getElement(stateLoc[0] + move[0], stateLoc[1] + move[1]);
	while(newState != null && newState.accessible){
		count++;
		newState = board.getElement(newState.row + move[0], newState.col + move[1]);
	}
	return count;
}

//POMDP HELPER FUNCTIONS********************************************************************