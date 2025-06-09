import * as Types from "./types.js"

/**
 * Throws error if condition is false
 * @param {boolean} x 
 * @param {string?} message 
 */
export function assert(x, message) {
    if (!x) {
        const template = message ? `Assertion failed: ${message}` : "Assertion failed";
        throw new Error(template);
    }
}

export const Result = {
    /**
     * @template T, U
     * @param {T} x
     * @returns {Types.Result<T, U>} 
     */
    success(x) {
        return { success: true, value: x };
    },
    /**
     * @template T, U
     * @param {U} x
     * @returns {Types.Result<T, U>} 
     */
    failure(x) {
        return { success: false, value: x };
    }
};
