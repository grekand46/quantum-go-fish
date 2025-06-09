import * as Types from "./types.js";
import { State } from "./state.js";
import { assert } from "./util.js";

/**
 * @param {number} asking 
 * @param {number} asked 
 * @param {number} suit 
 * @returns {Types.QgfRequest}
 */
function createRequest(asking, asked, suit) {
    return { asking, asked, suit };
}

/** @typedef {{ names: string[], cardCount: number, difficulty: number }} InitOptions */

class Game {
    /** @param {InitOptions} initOptions */
    constructor(initOptions) {
        this._names = initOptions.names || ["Alice", "Bob", "Charlie"];
        this._playerCount = this._names.length;
        this._cardCount = initOptions.cardCount || 4;
        this._difficulty = initOptions.difficulty || 0;
        /*
            Difficulty key:
            0 -> only shows how many cards each player has (default)
            1 -> IDs cards handed off
            2 -> IDs cards when requesting a suit previously unclaimed
            3 -> IDs cards based on multiplayer collapse
        */
        this._state = State.begin(this._playerCount, this._cardCount);
    }
}

const game = new Game({});

const example = [
    // createRequest(0, 1, 0), false,
    // createRequest(1, 0, 1), true,
    // createRequest(2, 0, 0), true,
    // createRequest(0, 1, 1), true,
    // createRequest(1, 2, 2), true
    createRequest(0, 2, 0), false,
    createRequest(1, 2, 1), false,
];

assert(example.length % 2 === 0, "Example must be req res pairs");
for (let i = 0; i < example.length; i += 2) {
    /** @type {Types.QgfRequest} */
    const request = example[i];
    /** @type {boolean} */
    const accept = example[i + 1];
    
    const pendingReq = game._state.processRequest(request);
    if (!pendingReq.success) {
        console.log(pendingReq.value);
        break;
    }
    /** @type {State} */
    const beforeRes = pendingReq.value;
    const pendingRes = beforeRes.processResponse(request, accept);
    if (!pendingRes.success) {
        console.log(pendingRes.value);
        break;
    }
    game._state = pendingRes.value;
    console.log("New:", game._state);
}


/*
playerInfo [excludes[...], known[...], unknown: 1]

log = [request, reponse, request, response...]
currentS = new state(default);

for n = 0 in log; n += 2; n < log.length - 1;

currentS = generateState(currentS, log[n], log[n + 1])

*/
