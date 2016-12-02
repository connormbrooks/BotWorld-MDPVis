//universally accessible board object
var board;

//univerisally accessible simulation state for holding data during pause
var simState;

//flag for interrupting running processes
var HALT = false;


//MAIN FUNCTIONS*********************************************************************

//Handle board clicks
function boardClick(div){
	var divId = div.id;
	var row = parseInt(divId.split(":")[0]);
	var col = parseInt(divId.split(":")[1]);
	var el = board.getElement(row,col);
	displayOptions(el);
	drawTileData(el);
}

//Validate input before beginning value iteration
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

//start value iteration
function valueIteration(){
	var s = board.getAccessibleStates();
	var util = startingUtilities(s);
	setIteratingStatus();
	iterate(s, util, 1);
}

//Main value iteration loop
function iterate(s, util_prime, count){
	var util = deepCopy(util_prime);
	var delta = 0;
	//value iteration algorithm from slides:
	// U'[s] = R(s) + gamme * max over all actions(sum for all s' (P(s' | s, a) * U[s']))
	for(var i = 0; i < s.length; i++){
		util_prime[""+s[i].id] = board.getElementById(s[i].id).score 
		+ board.gamma*Math.max(scoreAction(s[i],"U",util),scoreAction(s[i],"R",util), scoreAction(s[i],"D",util),scoreAction(s[i],"L",util));
		if(Math.abs(util_prime[""+s[i].id] - util[""+s[i].id]) > delta){
			delta = Math.abs(util_prime[""+s[i].id] - util[""+s[i].id]);
		}
	}
	//check if we are under the threshold used for stopping criteria
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


//use calculated utilities to set policy for each state 
function setPolicy(util){
	clearOptions();
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

//Run agent simulation
function run(agnt = null, mode = 0){
	clearOptions();
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

//Finds the next move of the agent during a simulation
function getNextState(tile, score, agnt, mode){
	var el = board.getElement(tile[0], tile[1]);
	score += el.score;
	//first check if an ending tile has been reached
	if(el.endingTile){
		if(mode == 0){
			endRun(tile, score);
		} else {
			endPOMDPRun(tile, score, agnt);
		}
		return;
	}

	//get probability that whatever move is chosen will be successful
	var probSuccess = board.getElement(tile[0], tile[1]).probability;
	var probEachOther = (1-probSuccess)/2.0;

	var optimum = null; 
	var altMoves = null;
	//find chosen move based on mode of MDP or POMDP
	if(mode == 0){
		//Fully Observable MDP
		optimum = getPolicyMove(tile);
	} else if (mode == 1){
		//Most Likely State (MLS) POMDP solver
		//for this greedy POMDP solver, just do the policy for the dominant belief state
		var domBelief = getDominantBeliefState(agnt);
		optimum = getPolicyMove([domBelief.row,domBelief.col]);
	} else if (mode == 2){
		//Q-MDP POMDP solver
		optimum = getQMDP(agnt);
	}
	altMoves = getSideMoves(optimum);

	//now use a random number to determine if optimal move is used or if there is a 'slip'
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
	drawAttemptedMove(arrayToDirection(optimum));

	//if POMDP, update belief state
	if(mode > 0){
		var sense = getSensors(agnt, newTile);
		//forward the belief state based on the chosen action
		forwardBeliefs(agnt, optimum, sense);
		//draw new beliefs
		drawBeliefs(agnt);
		drawPOMDPData(agnt, sense);
	}

	if(HALT){
		HALT = false;
		simState = new pause(newTile, score, agnt, mode);
		drawResumeRun();
	} else {
		setTimeout(function(){
			getNextState(newTile, score, agnt, mode);
		}, 250);
	}
}

//Pause button clicked
function stopRun(){
	//flip halting flag
	HALT = true;
}

//Resume button clicked
function resumeRun(){
	drawStopRun();
	setTimeout(function(){
		getNextState(simState.tile, simState.score, simState.agnt, simState.mode);
	}, 250);
}

//MAIN FUNCTIONS*********************************************************************