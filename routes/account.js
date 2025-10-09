import express from 'express';
import { hashPassword } from '../controllers/auth.js';
import Models from '../models/models.js';
import { roles, can } from '../controllers/roles.js';
import log from '../controllers/logger.js';

const account = express.Router();

/**
 * GET /account/profile - Εμφάνιση προφίλ χρήστη
 */
account.get('/profile', async (req, res) => {
    try {
        //# ΠΡΟΣΟΧΗ! Αν επεκταθεί η αναζήτηση σε άλλα models, πχ Models.Principals, θα υπάρχουν Users και Principals με το ίδιο ID!
        // Σε αυτή την περίπτωση θα πρέπει να γίνει αναζήτηση και με το role, όχι μόνο με το ID.
        const user = await Models.User.findByPk(req.user.sub, {
            attributes: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
            raw: true
        });

        if (!user) {
            log.warn(`Χρήστης με ID ${req.user.sub} δεν βρέθηκε`);
            return res.status(404).render('errors/404');
        }

        res.render('account/profile', {
            user,
            title: 'Προφίλ Χρήστη',
            roles
        });
    } catch (error) {
        log.error('Σφάλμα κατά την ανάκτηση προφίλ χρήστη:', error);
        res.status(500).render('errors/500', { 
            message: 'Σφάλμα κατά την ανάκτηση των στοιχείων του προφίλ' 
        });
    }
});

/**
 * POST /account/profile - Ενημέρωση προφίλ χρήστη
 */
account.post('/profile', async (req, res) => {
    try {
        const { name, password } = req.body;
        const userId = req.user.sub;

        // Βασικός έλεγχος εισόδου
        if (!name) {
             //# ΠΡΟΣΟΧΗ! Αν επεκταθεί η αναζήτηση σε άλλα models, ισχύουν τα σχόλια πιο πάνω.
            const user = await Models.User.findByPk(userId, {
                attributes: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
                raw: true
            });
            return res.status(400).render('account/profile', {
                user,
                title: 'Προφίλ Χρήστη',
                error: 'Το όνομα είναι υποχρεωτικό'
            });
        }

        // Ο έλεγχος ομοιότητας password με confirmPassword γίνεται μόνο client-side

        // Δημιουργία αντικειμένου ενημέρωσης
        const updateData = { name };
        if (password) {
            // Hash του password με SHA-256
            updateData.password = hashPassword(password);
        }

        // Ενημέρωση χρήστη
        await Models.User.update(updateData, { where: { id: userId } });

        log.info(`O Χρήστης ${req.user.email} ενημέρωσε το προφίλ του`);
        
        // Ανάκτηση ενημερωμένων στοιχείων
        const updatedUser = await Models.User.findByPk(userId, {
            attributes: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
            raw: true
        });

        res.render('account/profile', {
            user: updatedUser,
            title: 'Προφίλ Χρήστη',
            success: 'Το προφίλ σας ενημερώθηκε επιτυχώς'
        });

    } catch (error) {
        log.error('Σφάλμα κατά την ενημέρωση προφίλ χρήστη:', error);
        res.status(500).render('account/profile', { 
            user: req.user,
            title: 'Προφίλ Χρήστη',
            roles,
            error: 'Σφάλμα κατά την ενημέρωση του προφίλ. Προσπαθήστε ξανά.' 
        });
    }
});

/**
 * GET /account/settings - Εμφάνιση ρυθμίσεων χρήστη (δεν εφαρμόζεται)
 */
account.get('/settings', async (req, res) => {
    res.render('account/settings');
});


export default account;