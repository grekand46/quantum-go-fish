/** @typedef {{ asking: number, asked: number, suit: number }} QgfRequest */
/** @typedef {boolean} QgfResponse */

/**
 * @param {number} asking 
 * @param {number} asked 
 * @param {number} suit 
 * @returns {Request}
 */

function createRequest(asking, asked, suit) {
    return { asking, asked, suit };
}

/**
 * @param {boolean} response 
 * @returns {Request}
 */

function createResponse(response) {
    return { response };
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
        this._State = paramedState(this._playerCount, this._cardCount);
        this._state = this._State.begin();
    }
}

/** @typedef {{ exclude: boolean[], known: number[], unknown: number }} PlayerInfo */

/** 
 * @template A, B
 * @typedef {{ success: boolean, value: A | B }} Result 
 */
const Result = {
    /**
     * @template T, U
     * @param {T} x
     * @returns {Result<T, U>} 
     */
    success(x) {
        return { success: true, value: x };
    },
    /**
     * @template T, U
     * @param {U} x
     * @returns {Result<T, U>} 
     */
    failure(x) {
        return { success: false, value: x };
    }
};

const DIFFICULTY_LEVELS = 4;

/** 
 * @param {number} playerCount
 * @param {number} cardsPerPlayer 
 */
function paramedState(playerCount, cardsPerPlayer) {
    return class State {
        /**
         * 
         * @param {number} turn 
         * @param {number[]} unrevealed 
         * @param {PlayerInfo[]} players
         */
        constructor(turn, unrevealed, players) {
            this._turn = turn;
            this._unrevealed = unrevealed;
            this._players = players;
        }

        /** @returns {State} */
        static begin() {
            return new State(
                0,
                Array(playerCount).fill(cardsPerPlayer),
                Array(playerCount).fill(null).map(_ => ({
                    exclude: Array(playerCount).fill(false),
                    known: Array(playerCount * DIFFICULTY_LEVELS).fill(0),
                    unknown: cardsPerPlayer
                }))
            );
        }
        
        /**
         * @param {QgfRequest} request
         * @returns {Result<State, string>} 
         */
        processRequest(request) {
            const { asking, asked, suit } = request;
            if (this._players[asking].exclude[suit]) return Result.failure(`Player ${asking} cannot possibly have card ${suit}`);
            
        }

        /**
         * @param {QgfRequest} request
         * @param {boolean} accept
         * @returns {State | null}
         */
        processResponse(request, accept) {

        }
    };
}

const game = new Game({});
new game._State();

/*
playerInfo [excludes[...], known[...], unknown: 1]

log = [request, reponse, request, response...]
currentS = new state(default);

for n = 0 in log; n += 2; n < log.length - 1;

currentS = generateState(currentS, log[n], log[n + 1])

*/
