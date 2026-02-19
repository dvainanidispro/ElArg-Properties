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
        const baseHref = href.split('?')[0];    // χωρίς get parameters
        if (!href || href.length < 3) {
            return true; // συνεχίζουμε το every
        }
        
        if ((nav && baseHref === nav) || (!nav && path.startsWith(baseHref))) {
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
 * Ελέγχει τα ενεργά badges για ληγμένες μισθώσεις και μισθώσεις που λήγουν σύντομα
 * @param {number} thresholdMonths - Αριθμός μηνών για το όριο "λήγει σύντομα" και "πολύ παλιά λήξη" (προεπιλογή: 6)
 * @param {string} expiredText - Το κείμενο για ληγμένες μισθώσεις (προεπιλογή: "Έχει λήξει")
 * @param {string} expiringSoonText - Το κείμενο για μισθώσεις που λήγουν σύντομα (προεπιλογή: "Λήγει σύντομα")
 */
function checkLeaseExpiry(thresholdMonths = 6, expiredText = 'Έχει λήξει', expiringSoonText = 'Λήγει σύντομα') {
    const statusBadges = document.querySelectorAll('.status-badge.bg-success');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Υπολογισμός ημερομηνίας όριου λήξης
    const expiryThreshold = new Date(today);
    expiryThreshold.setMonth(today.getMonth() + thresholdMonths);
    const expiryThresholdStr = expiryThreshold.toISOString().split('T')[0];
    // Υπολογισμός ημερομηνίας πολύ παλιάς λήξης
    const oldExpiryThreshold = new Date(today);
    oldExpiryThreshold.setMonth(today.getMonth() - thresholdMonths);
    const oldExpiryThresholdStr = oldExpiryThreshold.toISOString().split('T')[0];
    
    statusBadges.forEach(badge => {
        const leaseEndStr = badge.getAttribute('data-lease-end');
        const isLatestStr = badge.getAttribute('data-is-latest');
        
        if (leaseEndStr) {
            if (leaseEndStr < oldExpiryThresholdStr){
                // Ληγμένη μίσθωση εδώ και πολύ καιρό
                badge.textContent = expiredText;
                badge.classList.remove('bg-success');
                badge.classList.add('bg-gray');
            } else if (leaseEndStr < todayStr) {
                // Πρόσφατα ληγμένη μίσθωση
                badge.textContent = expiredText;
                badge.classList.remove('bg-success');
                if (isLatestStr !== 'false') {
                    // Ληγμένη ΜΕ πρόβλημα (δεν υπάρχει νεότερη ή δεν υπάρχει το attribute)
                    badge.classList.add('bg-danger', 'text-light');
                } else {
                    // Ληγμένη αλλά ΟΚ (υπάρχει νεότερη)
                    badge.classList.add('bg-gray');
                }
            } else if (leaseEndStr <= expiryThresholdStr) {
                // Μίσθωση που λήγει σύντομα
                badge.textContent = expiringSoonText;
                badge.classList.remove('bg-success');
                badge.classList.add('bg-warning');
            }
        }
    });
}

/**
 * Υπολογίζει τη διάρκεια των μισθώσεων και την εμφανίζει σε ανθρώπινη μορφή
 */
function calculateLeaseDuration() {
    const leaseDurationElements = document.querySelectorAll('.lease-duration');
    leaseDurationElements.forEach(element => {
        const startDate = new Date(element.getAttribute('data-start'));
        const endDateStr = element.getAttribute('data-end');
        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);
        const days = diffDays % 30;
        
        let durationText = '';
        if (years > 0) {
            durationText += years + ' έτη ';
        }
        if (months > 0) {
            durationText += months + ' μήνες ';
        }
        if (days > 0 && years === 0) {
            durationText += days + ' ημέρες';
        }
        
        element.textContent = durationText.trim() || '0 ημέρες';
    });
}

/**
 * Ελέγχει τα κελιά αναπροσαρμογής μισθώματος και τονίζει αυτά που αντιστοιχούν στον τρέχοντα μήνα
 */
function checkRentAdjustmentMonth() {
    const currentMonth = new Date().getMonth() + 1; // getMonth() επιστρέφει 0-11
    const currentYear = new Date().getFullYear();
    const rentAdjustmentCells = document.querySelectorAll('.adjustment-month');
    
    rentAdjustmentCells.forEach(cell => {
        const cellMonth = parseInt(cell.getAttribute('data-sort-value'), 10);
        let cellYear = parseInt(cell.getAttribute('data-last-adjustment-year'), 10);
        if (isNaN(cellYear)) {cellYear=0}
        const span = cell.querySelector('span');
        if (cellMonth == currentMonth && cellYear < currentYear) {
            if (span) {
                span.classList.add('badge', 'fs-6', 'bg-warning2', 'fw-bold');
            }
        } else if (cellMonth == currentMonth && cellYear == currentYear) {
            span.insertAdjacentHTML('beforeend', ' ✔️');
        }
    });
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
    
    // Αφαίρεση μη έγκυρων χαρακτήρων και περιορισμός μήκους
    sheetname = sheetname.substring(0,31).replace(/[/\\?%*:|"<>]/g, '_');
    filename = filename.replace(/[/\\?%*:|"<>]/g, '_'); 

    // Clone για να μην πειραχτεί το DOM
    const clone = table.cloneNode(true);
    const arrayValuesMap = new Map(); // Αποθήκευση array values για αντικατάσταση μετά το table_to_book

    // Επεξεργασία των cells
    const rows = clone.querySelectorAll('tr');
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td, th');
      cells.forEach((cell, colIndex) => {
        const dataValue = cell.getAttribute('data-value') ?? cell.getAttribute('data-sort-value');
        const dataValueArray = cell.getAttribute('data-value-array');
        
        if (dataValueArray !== null && dataValueArray !== "") {
          // Αποθήκευση για αντικατάσταση αργότερα
          const value = dataValueArray.split(',').map(el=>el.trim());
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          arrayValuesMap.set(cellAddress, value.join('\n'));
          // To textContent, αν είχε '\n', θα ερμηνευόταν ως literal /n από την HTML. 
          // Και η cell.innerHTML = value.join('<br>') δεν θα λειτουργούσε αξιόπιστα με το table_to_book.
          cell.textContent = ''; // Δεν χρειάζεται περιεχόμενο, θα το αντικαταστήσουμε μετά το table_to_book
        } else if (dataValue !== null && dataValue !== "") {
          cell.textContent = dataValue;
        }
      });
    });

    const wb = XLSX.utils.table_to_book(clone, { sheet: sheetname });
    const ws = wb.Sheets[sheetname];
    
    // Αντικατάσταση των array values με line breaks
    arrayValuesMap.forEach((value, cellAddress) => {
      ws[cellAddress].v = value;
      ws[cellAddress].t = 's';
    });
    
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

    // Confetti animation για elements με data-confetti attribute
    initConfetti();

});


/**
 * Εμφανίζει confetti animation γύρω από elements που έχουν data-confetti, .easy-pie-chart class και data-percent="100"
 * Απαιτεί το canvas-confetti library (https://cdn.jsdelivr.net/npm/canvas-confetti)
 */
function initConfetti() {
    // Έλεγχος αν το library έχει φορτώσει
    if (typeof confetti === 'undefined') {
        console.warn('canvas-confetti library not loaded');
        return;
    }
    
    const confettiElements = document.querySelectorAll('[data-confetti].easy-pie-chart[data-percent="100"][data-period-status="open"]');

    confettiElements.forEach(element => {
        // Υπολογισμός της θέσης του element στη σελίδα
        const rect = element.getBoundingClientRect();
        const originX = (rect.left + rect.width / 2) / window.innerWidth;
        const originY = (rect.top + rect.height / 2) / window.innerHeight;
        
        // Περίμενε λίγο να φορτώσει η σελίδα
        setTimeout(() => {
            // Μικρό, subtle confetti burst γύρω από το element
            confetti({
                particleCount: 60,
                spread: 60,
                startVelocity: 25,
                origin: { x: originX, y: originY },
                colors: ['#177b45', '#28a745', '#20c997', '#ffc107', '#FFD700' , '#dd5507ff'],
                ticks: 120,
                gravity: 1.2,
                scalar: 0.8
            });
        }, 800);
    });
}