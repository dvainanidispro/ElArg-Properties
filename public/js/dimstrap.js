/**
 * @file dim-bootstrap-plus.
 * @author Dimitris Vainanidis,
 * @copyright Dimitris Vainanidis 2024
 */


"use strict"; 

{


let dimstrap = {       // bootstrap is reserved for... Bootstrap!

    /** 
     * Initiates/enables all Bootstrap tooltips 
     * @type void
    */
    enableBootstrapTooltips: () => {
        let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
        return tooltipList;
    },
    /** 
     * Initiates/enables all Bootstrap popovers 
     * @type void
    */
    enableBootstrapPopovers: () => {
        let popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
            let popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
                return new bootstrap.Popover(popoverTriggerEl);
            });
        return popoverList;
    },

     /** 
     * Shows a specific modal 
     * @type {(modalId: string) => any}  
    */
     showModal: (modalId,customText=null) => {
        let theModal = new bootstrap.Modal(document.getElementById(modalId));
        if (customText) {document.getElementById(modalId).querySelector('.modal-body').innerHTML = customText}
        theModal.show();
        return theModal;
    },

    /** 
     * Shows a specific toast 
     * @param {string}  toastIdOrClass - The toast's class or id (use "#" or ".") 
     * @param {number}  duration - The toast's duration in seconds (default=10)
    */
    showToast: (toastId, duration=10, customText=null) => {
        let toast = new bootstrap.Toast(document.getElementById(toastId), {delay: duration*1000});
        if (customText) {document.getElementById(toastId).querySelector('.toast-body').innerHTML = customText}
        toast.show();
        return toast;
    },
    /** 
     * Changes the percentage of a Plus Progress component 
     * @type {(elementID: string, value: number ) => HTMLElement}  
    */
    setProgress: (elementID, value) => {
        document.getElementById(elementID+'-progress').style.width = value;
        return document.getElementById(elementID);
    },

};



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////     Bootstrap Plus Custom Elements    //////////////////////////////////////////


class BootstrapIcon extends HTMLElement {
    constructor(){
        super();
        let size = this.getAttribute('size')||"1rem";
        let icon = this.getAttribute('icon')||"";
        switch (icon) {
            case 'cart':
                this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cart4" viewBox="0 0 16 16">
                    <path d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 11H4a.5.5 0 0 1-.485-.379L1.61 3H.5a.5.5 0 0 1-.5-.5M3.14 5l.5 2H5V5zM6 5v2h2V5zm3 0v2h2V5zm3 0v2h1.36l.5-2zm1.11 3H12v2h.61zM11 8H9v2h2zM8 8H6v2h2zM5 8H3.89l.5 2H5zm0 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2m-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0m9-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0"/>
                    </svg>
                `;
                break;   
            case 'profile':
                    this.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-circle" viewBox="0 0 16 16">
                        <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
                        <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/>
                        </svg>
                    `;
                    break;   
            case 'check-circle-fill':
                this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="bi bi-check-circle-fill" viewbox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                    </svg>
                `;
                break;
            case 'info-circle-fill':
                this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="bi bi-info-circle-fill" viewbox="0 0 16 16">
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                    </svg>
                `;
                break;
            case 'question-circle-fill':
                this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="bi bi-question-circle-fill" viewbox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/>
                    </svg>
                `;
                break;
            case 'x-circle-fill':
                this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="bi bi-x-circle-fill" viewbox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                    </svg>
                `;
                break;
            case 'exclamation-triangle-fill':
                this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewbox="0 0 16 16">
                        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                    </svg>
                `;
                break;
            case 'burger':
                this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="bi bi-list" viewbox="0 0 16 16">
                        <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                    </svg>
                `;
                break;               
            default:
                break;
        }

    }
}
window.customElements.define('bootstrap-icon',BootstrapIcon);


class BootstrapProgress extends HTMLElement {
    constructor(){
            super();
            let identity = this.id ? `id=${this.id}-progress` : ""; 
            let percentage = this.getAttribute('value');
            let bgColor = this.getAttribute('color') ? 'bg-' + this.getAttribute('color') : "";
            this.innerHTML = /*html*/`
            <div class="progress">
                <div ${identity} class="progress-bar progress-bar-striped ${bgColor}" role="progressbar" style="width: ${percentage}"></div>
            </div>
            `;
            this.classList.add("d-block");
        }
    }
window.customElements.define('bootstrap-progress', BootstrapProgress);
// Attributes: value, color


class BootstrapSpinner extends HTMLElement {
    constructor(){
        super(); 
        let text = this.getAttribute('text') ?? 'Loading';
        this.classList.add("d-block");
        this.innerHTML = /*html*/`
        <div class="d-flex flex-column align-items-center">
            <div class="spinner-border text-${this.getAttribute('color')||'dark'} m-2" role="status">
                <span class="visually-hidden">${text}</span>
            </div>
            <div>${text}</div>
        </div>
        `;
    }
}
window.customElements.define('bootstrap-spinner',BootstrapSpinner);
// Attibutes: text, color


class BootstrapToast extends HTMLElement {
    constructor(){
        super();
        let toastColor = this.getAttribute('color'); 
        this.outerHTML = /*html*/`
            <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
                <div id="${this.id}" class="toast" role="alert">
                    <div class="toast-header">
                        <div style="background-color: ${toastColor}; height: 20px; width: 20px;" class="rounded me-2" title="Gold"></div>
                        <strong class="me-auto">${this.getAttribute('title')}</strong>
                        <small>${this.getAttribute('note')}</small>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                    <div class="toast-body">${this.getAttribute('message')}</div>
                </div>
            </div>
            `;
    }
}
window.customElements.define('bootstrap-toast',BootstrapToast);
// Attributes: title, message, note, color


class BootstrapModal extends HTMLElement {
    constructor(){
        super();     
        this.outerHTML = /*html*/`
            <div class="modal fade" id="${this.id}" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${this.id}Label">${this.getAttribute('title')}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            ${this.getAttribute('body')}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">${this.getAttribute('button')}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
window.customElements.define('bootstrap-modal',BootstrapModal);
// Attributes: title, body, button














window.dimstrap = dimstrap;
}