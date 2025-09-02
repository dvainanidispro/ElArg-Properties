/**
 * @file Q.js
 * @author Dimitris Vainanidis
 * @copyright Dimitris Vainanidis, 2024
 */

/* jshint ignore:start */
'use strict';


{



const singleDOMObjectHandler = {
    get(target, prop) {
        if (prop == 'element') {
            return target
        }
        else if (prop in target) {
            const value = target[prop];
            // For methods to work, bind it to the target to preserve 'this' context
            if (typeof value === 'function') {
                return value.bind(target);
            }
            return value;
        } else if (prop === 'on') {
            return function(event, callback, options) {
                target.addEventListener(event, callback, options);
                return target;
            };
        } else if (prop === 'set') {
            return function(content) {
                target.textContent = content;
                return target;
            };
        } else if (prop === 'show') {
            return function(condition = true) {
                if (condition) {
                    target.classList.remove('d-none');
                } else {
                    target.classList.add('d-none');
                }
                return target;
            };
        }
        return undefined;
    },
    set(target, prop, value) {
        if (prop in target) {
            target[prop] = value;
            return value;
        }
        return false;
    }
};

const arrayOfDOMObjectsHandler = (selector) => {
    return {
        get(target, prop) {
            if (prop in target) {
                return target[prop];
            } else if (prop === 'on') {
                return function(event, callback, options) {
                    document.addEventListener(event, function(e) {
                        if (e.target.closest(selector)) {       // closest instead of matches, 
                            callback.call(e.target.closest(selector), e);       // callback(e), but the "this" is the element
                        }
                    }, options);
                };
            } else if (prop === 'set') {
                return function(content) {
                    target.forEach(element => element.textContent = content);
                    return target;
                };
            } else if (prop === 'show') {
                return function(condition = true) {
                    target.forEach(element => {
                        if (condition) {
                            element.classList.remove('d-none');
                        } else {
                            element.classList.add('d-none');
                        }
                    });
                    return target;
                };
            }
            return undefined;
        },
        set(target, prop, value) {
            if (prop in target) {
                target[prop] = value;
                return value;
            }
            return false;
        }
    };
};




/** 
 * Returns the selected DOM element or array of elements, by ID, class, e.t.c. 
 * Adds the extra methods to the element/array: on, set, show(condition). 
 * @type {(selector: string) => HTMLElement | HTMLElement[]}
*/
function Q (selector) {         // Χρήση function declaretion (όχι πχ expression / arrow function) για να παίζουν τα JsDoc των methods παρακάτω
    if ( selector.charAt(0)=='#' ) {  
        const element = document.querySelector(selector);
        if (!element) {return null}
        return new Proxy(element, singleDOMObjectHandler);
    } else {
        if (selector.charAt(0)=='~') {selector=`[data-variable=${selector.substring(1)}]`}
        let elements = [...document.querySelectorAll(selector)];
        return new Proxy(elements, arrayOfDOMObjectsHandler(selector));
    }
};




/** 
 * Change the value of a css variable 
 * @type {(variable: string, value: string) => string}  
 */
Q.setCssVariable = (variable,value) => {document.documentElement.style.setProperty(variable, value); return value};

/** returns the array's unique values */
Q.unique = array => [...new Set(array)];
/** sum of an array of numbers  */
Q.sum = array => array.reduce((prev,curr)=>prev+(+curr),0);   // +val converts to number
/** Delay function. Use: await delay(2) */
Q.delay = (sec) => new Promise(resolve => setTimeout(resolve, sec*1000));


/** 
 * Fetch that returns the result as JSON or the desired property 
 * @param {string} URL The URL to fetch
 * @param {string | boolean} [property=true] The property to return, true (default) for the entire object (JSON), or false to return as text 
 * @type {(URL: string, property: string | boolean) => Promise<any>}
*/
Q.fetch = async (URL,property=true) => {
    return fetch(URL)               //return, so user can use "then"
        .then(response=>{
            if (!response.ok) {throw new Error('Q.fetch failed')} 
            else {return property?response.json():response.text()}
        })
        .then(data=>(property&&property!==true)?data[property]:data)      //property truthy but not true!
        .catch(e=>{console.error(e)});     
};

/**
 * Makes a POST request and returns the result as JSON
 * @param {string} URL The URL to make a POST request 
 * @param {object} data The data to send
 * @returns {Promise<object>} Returns the result as JSON
 */
Q.fetchPost = async (URL, data) => {
    return fetch(URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    })
    .then(response=>{
        if (!response.ok) {throw new Error('Q.fetchPost failed')} 
        else {return response.json()}
    })
    .catch(e=>{console.error(e)});     
};



/** Get things from the URL */
Q.url = {
    get: (parameter) => new URLSearchParams(window.location.search).get(parameter),
    domain: window.location.hostname,
    path: window.location.pathname,
    referrer: document.referrer,
    goto: (url) => window.location.href = url,
};




/** 
 * Cookie hanlders  
*/
Q.cookies = {
    set: function(name,value,days) {
        let expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        let secure = (window.location.protocol=="https:") ? " secure;" : "";
        document.cookie = `${name}=${value||""}${expires}; path=/; samesite=lax;${secure}`;
    },
    get: function(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }
};


/** Converts a number to euro format */
Q.euro = price => (price==null||isNaN(price)) ? "- €" : (new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
})).format(price);




window.Q = Q;
}




class requiredField extends HTMLElement {
    constructor(){
        super(); 
        this.classList.add("text-danger");
        this.innerHTML = "*";
    }
}
window.customElements.define('req-star',requiredField);


