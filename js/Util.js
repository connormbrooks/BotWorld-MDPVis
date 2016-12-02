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

//pause object
function pause(tile, score, agnt, mode){
	this.tile = tile;
	this.score = score;
	this.agnt = agnt;
	this.mode = mode;
}

//OBJECTS*********************************************************************



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
	var prob = 0;
	if(resultingState(state, action) == newState){
		prob += state.probability;
	} 
	var slips = getSideMoves(action);
	if(resultingState(state, slips[0]) == newState){
		prob += (1 - state.probability) / 2.0;
	}
	if(resultingState(state, slips[1]) == newState){
		prob += (1 - state.probability) / 2.0;
	}
	return prob;
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


//Use Q-MDP to find next move
function getQMDP(agnt){
	var possibleMoves = [[1,0],[-1,0],[0,1],[0,-1]];
	var best = Number.MIN_VALUE;
	var bestMove = 0;
	var states = board.getAccessibleStates();
	for(var i = 0; i < possibleMoves.length; i++){
		var sum = 0;
		for(var j = 0; j < states.length; j++){
			sum += agnt.beliefs[""+states[j].id]*getQ(states[j],possibleMoves[i]);
		}
		if(sum > best){
			best = sum;
			bestMove = i;
		}
	}
	return possibleMoves[bestMove];
}

//Calculates Q(s,a) of the current policy
function getQ(state, action){
	var possibleStates = getAdjacentAccessibleStates(state);
	var sum = 0;
	for(var i = 0; i < possibleStates.length; i++){
		sum += getTransitionProbability(state, action, possibleStates[i])*(possibleStates[i].score 
			+ board.gamma*possibleStates[i].utility);
	}
	return sum;
}

//POMDP HELPER FUNCTIONS********************************************************************