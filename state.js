import * as Types from "./types.js";
import { assert, Result } from "./util.js";

const DIFFICULTY_LEVELS = 4;

/** @typedef {{ exclude: boolean[], known: number[], unknown: number }} PlayerInfo */

export class State {
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

    /** 
     * @param {number} playerCount
     * @param {number} cardsPerPlayer
     * @returns {State} 
     */
    static begin(playerCount, cardsPerPlayer) {
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
     * @returns {State}
     */
    clone() {
        return new State(this._turn, structuredClone(this._unrevealed), structuredClone(this._players)); 
    }

    /**
     * @param {Types.QgfRequest} request
     * @returns {Types.Result<State, QgfError>} 
     */
    processRequest(request) {
        const { asking, asked, suit } = request;
        if (this._players[asking].exclude[suit]) return Result.failure(`Player ${asking} cannot possibly have card ${suit} due to previous responses`);
        if (this.tallyKnown(asking, suit) > 0) return Result.success(this);
        if (this._unrevealed[suit] === 0) return Result.failure(`Player ${asked} cannot possibly have card ${suit} because all of them are revealed`);
        if (this._players[asking].unknown === 0) return Result.failure(`Player ${asked} cannot possibly have card ${suit} because all their cards are revealed`);
        const next = this.clone();
        next._revealCard(asking, suit, 1);
        const err = next._validate();
        if (err === null) return Result.success(next);
        return Result.failure(err);
    }

    /*
    
    processRequest(request) {
    if u cant have that suit 
        print "you cant do that", return a state on the next turn with no move applied
    else
        generate both possible states resulting from either answering yes or no

        let yesValid = validate(state resulting from yes)
        let noValid = validate(state resulting from no)

        if !(yesValid || noValid)
            print "you cant do that", return a state on the next turn with no move applied
        else
            // request is valid
            return processResponse(request, yesValid, noValid)


    processResponse() {
        if getResponse() 
    }
    }
    
    */

    /*
    
    illegal request -> lose current turn
    illegal response -> lose next turn
    incorrect guess -> lose next turn
    
    */

    /**
     * @param {Types.QgfRequest} request
     * @param {boolean} accept
     * @returns {Types.Result<State, QgfError>}
     */
    processResponse(request, accept) {
        const { asking, asked, suit } = request;
        const next = this.clone();
        if (this.tallyKnown(asked, suit) > 0) {
            // Player being asked simply gives a known card
            if (!accept) return Result.failure(`Player ${asked} does have card ${suit}`);
            next._giveCard(asking, asked, suit);
        }
        else if (accept) {
            // Player being asked attempts to reveal new card
            if (next._players[asked].unknown === 0) return Result.failure(`Player ${asked} cannot reveal a new card`);
            if (next._players[asked].exclude[suit]) return Result.failure(`Player ${asked} cannot reveal a new card ${suit} due to previous responses`);
            if (next._unrevealed[suit] === 0) return Result.failure(`Player ${asked} cannot reveal a new card ${suit} because they all have been revealed`);
            next._players[asked].unknown--;
            next._updateUnrevealed(suit);
            next._players[asking].known[suit * DIFFICULTY_LEVELS]++;
        }
        else {
            // Player being asked denies they have such card
            next._players[asked].exclude[suit] = true;
        }
        next._turn++;
        const err = next._validate();
        if (err === null) return Result.success(next);
        return Result.failure(err);
    }

    /**
     * 
     * @param {number} player 
     * @returns {number}
     */
    tallyKnown(player, suit) {
        const start = suit * DIFFICULTY_LEVELS;
        let total = 0;
        for (let i = 0; i < DIFFICULTY_LEVELS; i++) {
            total += this._players[player].known[start + i];
        }
        return total;
    }

    /**
     * Returns `null` for valid states and a `QgfError` for invalid ones
     * @returns {Types.QgfError | null}
     */
    _validate() {
        let done = false;
        while (!done) {
            done = true;
            // Check for exclusion paradox
            for (const [i, player] of this._players.entries()) {
                let maxUnknown = 0;
                const possibleSuits = [];
                for (const [suit, excluded] of player.exclude.entries()) {
                    if (!excluded) {
                        maxUnknown += this._unrevealed[suit];
                        possibleSuits.push(suit);
                    }
                }
                if (player.unknown > maxUnknown) return `Paradox occured! Player ${i} can have at most ${maxUnknown} unknown card(s)`;
                if (player.unknown === maxUnknown && player.unknown > 0) {
                    // In this case the player must have the remaining unexcluded cards
                    for (const [suit, excluded] of player.exclude.entries()) {
                        if (!excluded) this._revealCard(i, suit, 2, this._unrevealed[suit]);
                    }
                    // Might be able to deduce cards for previous players
                    done = false;
                    break;
                }
                if (possibleSuits.length === 1) {
                    // Unknown cards must be this suit
                    this._revealCard(i, possibleSuits[0], 2, player.unknown);
                }
            }
        }

        return null;
    }

    /**
     * 
     * @param {number} asking 
     * @param {number} asked 
     * @param {number} suit 
     */
    _giveCard(asking, asked, suit) {
        const start = suit * DIFFICULTY_LEVELS;
        const searching = this._players[asked].known;
        let found = false;
        for (let i = 0; i < DIFFICULTY_LEVELS; i++) {
            if (searching[start + i] > 0) {
                searching[start + i]--;
                found = true;
                break;
            }
        }
        assert(found, `Player ${asked} doesn't have card ${suit}`);
        this._players[asking].known[suit * DIFFICULTY_LEVELS]++;
    }

    /**
     * 
     * @param {number} player 
     * @param {number} suit 
     * @param {number} tag 
     * @param {number} count
     */
    _revealCard(player, suit, tag, count = 1) {
        const ref = this._players[player];
        assert(ref.unknown >= count, `Impossible to reveal new card for player ${player}`);
        ref.unknown -= count;
        ref.known[DIFFICULTY_LEVELS * suit + tag] += count;
        this._updateUnrevealed(suit, count);
    }

    /**
     * @param {number} suit 
     * @param {number} count 
     */
    _updateUnrevealed(suit, count = 1) {
        assert(this._unrevealed[suit] >= count, `Impossible to reveal ${count} new card(s) ${suit}`);
        this._unrevealed[suit] -= count;
        // Apply automatic exclusion
        if (this._unrevealed[suit] === 0) {
            for (const [i, player] of this._players.entries()) {
                if (this.tallyKnown(i, suit) === 0) player.exclude[suit] = true;
            }
        }
    }
}