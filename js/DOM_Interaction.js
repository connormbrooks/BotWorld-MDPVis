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
	+ " Left Range Sensor Probability: <input type='text' name='leftsensor' value='"+agnt.probabilities["L"]+"'/> <br/>"
	+ " Up Range Sensor Probability: <input type='text' name='upsensor' value='"+agnt.probabilities["U"]+"'/> <br/>"
	+ " Right Range Sensor Probability: <input type='text' name='rightsensor' value='"+agnt.probabilities["R"]+"'/> <br/>"
	+ " Down Range Sensor Probability: <input type='text' name='downsensor' value='"+agnt.probabilities["D"]+"'/> <br/>"
	+ " Agent knows starting tile: <input type='radio' name='startknowledge' value='true'"+(agnt.knowsStart ? "checked" : "")+">True</input>"
	+ " &nbsp;<input type='radio' name='startknowledge' value='false'" +(agnt.knowsStart ? "" : "checked")+">False</input> <br/>"
	+ " <button onclick='validatePOMDPInput(1)'>Run Most-Likely State</button>"
	+ " <button onclick='validatePOMDPInput(2)'>Run Q-MDP</button>";
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

function validatePOMDPInput(mode){
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
	document.getElementById("TopInfoPanel").innerHTML = "<button onclick='stopRun()'>Pause Run</button>";
}

function drawResumeRun(){
	document.getElementById("TopInfoPanel").innerHTML = "<button onclick='resumeRun()'>Resume Run</button>";
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
	+ " <button onclick='validatePOMDPInput(1)'>Run Most-Likely State</button>"
	+ " <button onclick='validatePOMDPInput(2)'>Run Q-MDP</button>";
	document.getElementById("TopInfoPanel").innerHTML = str;
	board.gradient.setSpectrum("blue", "red");
	board.gradient.setNumberRange(0,1000);
}

//use a 'heatmap' to color tiles based on agent beliefs 
//(deeper colors = stronger belief that agent is in that state)
//gradient goes (from least belief to strongest belief) blue-red
//tiles for which the belief state has 0 belief are colored white
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
