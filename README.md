# BotWorld-MDPVis

DEMO THE PROJECT NOW:

https://rawgit.com/connormbrooks/BotWorld-MDPVis/master/index.html

BotWorld is a Markov Decision Process Visualizer tool.




FEATURES

-User can enter their world as a text file

-User can select of starting state

-User can specify multiple ending states

-User can create inaccessible states

-User can specify the reward/cost of a state

-User can specify the probability of successful movement while in a state

-User can specify threshold and gamma for policy finding

-Finds a policy for the given board

-After finding a policy, executes the policy and displays final “score” during simulation

-User can specify agent sensor characteristics for POMDPs

-User can specify whether or not agent knows starting location for POMDPs

-Simulation of running through partially observable environment with belief updating

-Current belief state visualized through “heat-map” while simulation runs

-POMDP solution approximation using most likely state for policy determination

-POMDP solution approximation using Q-MDP for policy determination

-User can pause and resume the agent moving through the policy

-Data on states/agent printing below the board




BACKGROUND

The solution to a MDP can be found by using the Bellman equation:

U(s) = R(s) + 𝛾 max<sub>a</sub> ∑<sub>s’</sub> [ P(s’ | s, a) * U(s’) ] , ∀ a ∈ A(s) 


to calculate the utility of each move. The utility is found through using the value-iteration algorithm. For this value-iteration, the user provided gamma is used as the discount rate on future moves and the user provided threshold value determines how long to keep iterating. Once the change is less than the threshold value, it stops. 


U’(s) = R(s) + 𝛾 max<sub>a</sub> ∑<sub>s’</sub> P(s’ | s,a) *U(s’)

ẟ = maxs | U’(s) - U(s) |

Quit once ẟ < THRESHOLD*(1-𝛾 )/𝛾 


BotWorld also sets up Partially Observable Markov Decision Processes. In POMDPs, the agent isn’t always certain which state it is currently in, but instead has beliefs about its state based on sensory evidence and its last belief state/action. Thus, the agent must maintain a belief state that represents how likely the agent believe it is that it is in any given state. If the agent knows the starting position, it starts with a belief of 1 in that position and 0 in all other positions. Otherwise, it evenly distributes the belief between all positions. To update the agent’s belief state, b, after an action, a, is taken (note this action is what the agent ATTEMPTED, the agent does not know if it was successful or not) and sensory input, e, is received, the following equation is used:

b’(s’) = 𝛂 P(e | s’) ∑<sub>s</sub> [P(s’ | s, a) * b(s)]

Where   𝛂 = 1/[∑<sub>s’</sub> (P(e | s’) ∑<sub>s</sub> [P(s’ | s, a) * b(s)])]


Several methods have been developed to approximate the solutions to POMDPs. For our project, we use “greedy” approaches which rely on the underlying MDP. We implement two heuristics: the Most-Likely State policy, and the Q-MDP policy. 
The “Most-Likely State” (MLS) heuristic policy is found by: 


𝝅<sub>POMDP</sub>(s) = 𝝅<sub>MDP</sub>(max<sub>s</sub> b(s))


The Q-MDP policy is found by:


𝝅<sub>POMDP</sub>(s) = max<sub>a</sub>(∑<sub>s</sub> b(s)*Q(s,a))

Where	    Q(s,a) = ∑<sub>s’</sub> (P(s’ | s, a) * (R(s, a, s’) * 𝛾*U(s’)))

