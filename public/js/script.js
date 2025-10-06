
/** Reload the page if it was restored from the back/forward cache */
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        window.location.reload();
    }
});

/**
 * Ένδειξη στο sidebar για το link που αντιστοιχεί στην τρέχουσα σελίδα.
 * Χρησιμοποιούμε every αντί για forEach γιατι το forEach δεν έχει break, 
 * ενώ το every σταματάει όταν επιστραφεί false.
 */
(() => {
    const nav = Q.url.get('nav');
    const path = Q.url.path;
    Q(".sidebar .sidebar-link").every(link => {
        const href = link.getAttribute("href");
        if (!href || href.length < 3) {
            return true; // συνεχίζουμε το every
        }
        if ((nav && href === nav) || (!nav && href === path)) {
            link.classList.add("active");
            return false; // σταματάμε το every
        } 
        return true; // συνεχίζουμε το every
    });
})();

/**
 * Προσθήκη validation classes (is-valid, is-invalid) σε input πεδία με pattern ή minlength
 * καθώς ο χρήστης πληκτρολογεί
 */
document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll("input[pattern], input[minlength]");

  inputs.forEach(input => {
    input.addEventListener("input", () => {
      if (input.value === "") {
        input.classList.remove("is-valid", "is-invalid");
        return;
      }

      if (input.checkValidity()) {
        input.classList.add("is-valid");
        input.classList.remove("is-invalid");
      } else {
        input.classList.add("is-invalid");
        input.classList.remove("is-valid");
      }
    });
  });
});


/**
 * Όταν υπάρχει κάποιο get parameter που αντιστοιχεί σε πεδιο φόρμας (με το ίδιο name),
 * τότε συμπληρώνει αυτόματα το πεδίο με την τιμή του parameter και το πεδίο γίνεται readonly.
 * Χρήσιμο για φόρμες αναζήτησης/φιλτραρίσματος.
 */
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const formFields = document.querySelectorAll("input[name], select[name], textarea[name]");

   formFields.forEach(field => {
       const paramValue = urlParams.get(field.name);
       if (paramValue) {
           field.value = paramValue;
           field.readOnly = true;
       }
   });
});




/**
 * Ελέγχει αν το JWT token είναι έγκυρο και αν δεν έχει λήξει
 * @param {string} token - Το JWT token προς έλεγχο
 * @returns {object} - {valid: boolean, reason: string}
 */
function isValidJWT(token) {
    try {
        // Διαχωρισμός του JWT σε header, payload, signature
        const parts = token.split('.');
        if (parts.length !== 3) {
            return { valid: false, reason: 'invalid' };
        }

        // Αποκωδικοποίηση του payload (base64url)
        let payload;
        try {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            payload = JSON.parse(atob(base64));
        } catch (decodeError) {
            return { valid: false, reason: 'invalid' };
        }
        
        // Έλεγχος αν το token έχει λήξει
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < currentTime) {
            return { valid: false, reason: 'expired' };
        }

        return { valid: true, reason: null };
    } catch (error) {
        console.error('Σφάλμα κατά τον έλεγχο του JWT token:', error);
        return { valid: false, reason: 'invalid' };
    }
}


function periodDescription(startDate, endDate) {
    let getGreekMonthName = (monthIndex) => {
        const months = [
            'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
            'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
        ];
        return months[monthIndex];
    }; 

    let start = new Date(startDate);
    let end = new Date(endDate);
    if (isNaN(start) || isNaN(end)) {
        return '';
    }

    let startMonth = getGreekMonthName(start.getMonth());
    let endMonth = getGreekMonthName(end.getMonth());

    return `${startMonth} - ${endMonth}`;
}




/**
 * Κατεβάζει έναν HTML πίνακα ως αρχείο Excel
 * Απαιτεί το SheetJS (xlsx) library - https://docs.sheetjs.com/docs/getting-started/installation/standalone
 * @param {string} tableID - Το ID του HTML table στοιχείου
 * @param {string} filename - Το όνομα του αρχείου Excel που θα δημιουργηθεί (προαιρετικό)
 */
function downloadTableAsExcel(tableID, filename = 'table.xlsx', sheetname = 'Sheet1') {
    const table = document.getElementById(tableID);
    if (!table) { console.error('Table not found:', tableID); return; }

    // Clone για να μην πειραχτεί το DOM
    const clone = table.cloneNode(true);

    // Αν υπάρχει data-value χρησιμοποιείται, αλλιώς το textContent
    clone.querySelectorAll('td, th').forEach(cell => {
      const dataValue = cell.getAttribute('data-value') ?? cell.getAttribute('data-sort-value');
      if (dataValue !== null && dataValue !== "") {
        cell.textContent = dataValue;
      } else {
        cell.textContent = cell.textContent;
      }
    });

    const wb = XLSX.utils.table_to_book(clone, { sheet: sheetname });
    XLSX.writeFile(wb, filename);
}




// Μεταβλητή για αποθήκευση του onClose callback
let currentOnCloseCallback = null;

/**
 * Εμφανίζει ένα success modal με μήνυμα
 * @param {string} message - Το μήνυμα προς εμφάνιση
 * @param {number} autoCloseDelay - Χρόνος σε ms για αυτόματο κλείσιμο (προαιρετικό)
 * @param {function} onClose - Callback function όταν κλείσει το modal (προαιρετικό)
 */
function showSuccessModal(message, autoCloseDelay = null, onClose = null) {
    const successModal = document.getElementById('successModal');
    const messageElement = document.getElementById('successMessage');
    
    if (!successModal || !messageElement) {
        console.error('Success modal elements not found');
        return;
    }
    
    // Αποθήκευση του onClose callback
    currentOnCloseCallback = onClose;
    
    messageElement.textContent = message;
    successModal.classList.add('show');
    successModal.style.display = 'block';
    document.body.classList.add('modal-open');
    
    if (autoCloseDelay && autoCloseDelay > 0) {
        setTimeout(() => {
            closeModal('successModal');
        }, autoCloseDelay);
    }
}

/**
 * Εμφανίζει ένα error modal με μήνυμα
 * @param {string} message - Το μήνυμα σφάλματος προς εμφάνιση
 */
function showErrorModal(message) {
    const errorModal = document.getElementById('errorModal');
    const messageElement = document.getElementById('errorMessage');
    
    if (!errorModal || !messageElement) {
        console.error('Error modal elements not found');
        return;
    }
    
    messageElement.textContent = message;
    errorModal.classList.add('show');
    errorModal.style.display = 'block';
    document.body.classList.add('modal-open');
}

/**
 * Κλείνει ένα modal
 * @param {string} modalId - Το ID του modal προς κλείσιμο
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        
        // Εκτέλεση του onClose callback αν υπάρχει και το modal είναι το success modal
        if (modalId === 'successModal' && currentOnCloseCallback && typeof currentOnCloseCallback === 'function') {
            currentOnCloseCallback();
            currentOnCloseCallback = null; // Καθαρισμός του callback
        }
    }
    
    // Αφαίρεση του modal-open class από το body ανεξάρτητα από το αν βρέθηκε το modal
    // για να εξασφαλίσουμε ότι η σελίδα δεν μένει blocked
    document.body.classList.remove('modal-open');
    
    // Αφαίρεση οποιουδήποτε backdrop element που μπορεί να έχει μείνει
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
        backdrop.remove();
    }
}

/**
 * Σε περίπτωση επιτυχίας, ανακατευθύνει το χρήστη σε μια προεπιλεγμένη διαδρομή.
 * Αν τυχόν υπάρχει get request παράμετρος 'redirect', πχ ?redirect=/canteens/canteens/1
 * τότε ανακατευθύνει εκεί (αγνοώντας την προεπιλεγμένη διαδρομή).
 * Αν defaultPath = null, κάνει απλή ανανέωση της τρέχουσας σελίδας.
 */
function redirectOnSuccess(defaultPath = null) {
    const redirectPath = Q.url.get('redirect');
    
    if (redirectPath) {
        window.location.href = redirectPath;
    } else if (defaultPath) {
        window.location.href = defaultPath;
    } else {
        window.location.reload();
    }
}


// Αρχικοποίηση event listeners για τα modals όταν φορτώσει η σελίδα
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners για κλείσιμο modals
    document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Κλείσιμο modal με κλικ στο backdrop - διόρθωση για drag behavior
    document.querySelectorAll('.modal').forEach(modal => {
        let mouseDownTarget = null;
        
        modal.addEventListener('mousedown', function(e) {
            mouseDownTarget = e.target;
        });
        
        modal.addEventListener('click', function(e) {
            // Κλείσιμο μόνο αν το mousedown και το click έγιναν στο ίδιο element (το backdrop)
            if (e.target === this && mouseDownTarget === this) {
                closeModal(this.id);
            }
            mouseDownTarget = null;
        });
    });


});