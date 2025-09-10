import { Router } from 'express';
import Models from '../models/models.js';
import { can } from '../controllers/roles.js';
import log from '../controllers/logger.js';
import { Op } from 'sequelize';

/**
 * Router for canteens-related routes.
 * @type {Router}
 */
const canteens = Router();

////////////////////   ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ PRINCIPALS   ////////////////////

/**
 * GET /canteens/principals - Εμφάνιση λίστας όλων των principals
 */
canteens.get('/principals', can('view:content'), async (req, res) => {
    try {
        const principals = await Models.Principal.findAll({
            attributes: ['id', 'email', 'name', 'contact', 'role', 'active', 'createdAt'],
            order: [['createdAt', 'DESC']],
            raw: true
        });
        
        res.render('canteens/principals', { 
            principals,
            user: req.user,
            title: 'Διαχείριση Διευθυντών'
        });
    } catch (error) {
        log.error('Σφάλμα κατά την ανάκτηση διευθυντών:', error);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση διευθυντών' });
    }
});

/**
 * GET /canteens/principals/new - Φόρμα για νέο principal
 */
canteens.get('/principals/new', can('edit:content'), async (req, res) => {
    try {
        res.render('canteens/edit-principal', { 
            principalDetails: null, // null για νέο principal ώστε το view να ξέρει
            user: req.user,
            title: 'Νέος Διευθυντής'
        });
    } catch (error) {
        log.error('Σφάλμα κατά την εμφάνιση φόρμας νέου principal:', error);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την εμφάνιση φόρμας' });
    }
});

/**
 * GET /canteens/principals/:id - Εμφάνιση στοιχείων συγκεκριμένου principal
 */
canteens.get('/principals/:id', can('view:content'), async (req, res) => {
    try {
        const principalId = parseInt(req.params.id);
        const principal = await Models.Principal.findByPk(principalId, {
            attributes: ['id', 'email', 'name', 'contact', 'role', 'active', 'createdAt', 'updatedAt'],
            raw: true
        });
        
        if (!principal) {
            return res.status(404).render('errors/404', { message: 'Ο Διευθυντής δεν βρέθηκε' });
        }
        
        res.render('canteens/edit-principal', { 
            principalDetails: principal,
            user: req.user,
            title: `Επεξεργασία Διευθυντή: ${principal.name || principal.email}`
        });
    } catch (error) {
        log.error('Σφάλμα κατά την ανάκτηση principal:', error);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση του διευθυντή' });
    }
});

/**
 * POST /canteens/principals - Δημιουργία νέου principal
 */
canteens.post('/principals', can('edit:content'), async (req, res) => {
    try {
        const { email, name, contact, active } = req.body;
        
        // Βασικός έλεγχος δεδομένων
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Το πεδίο email είναι υποχρεωτικό' 
            });
        }
        
        // Έλεγχος αν υπάρχει ήδη principal με το ίδιο email
        const existingPrincipal = await Models.Principal.findOne({
            where: { email }
        });
        
        if (existingPrincipal) {
            return res.status(400).json({ 
                success: false, 
                message: 'Υπάρχει ήδη Διευθυντής με αυτό το email' 
            });
        }
        
        const newPrincipal = await Models.Principal.create({
            email,
            name: name || email.split('@')[0],
            contact: contact || '',
            role: 'principal',
            active: active !== undefined ? active : true // Default true για νέους principals
        });
        
        log.info(`Νέος principal δημιουργήθηκε: ${newPrincipal.email} (ID: ${newPrincipal.id})`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Ο Διευθυντής δημιουργήθηκε επιτυχώς',
            principal: {
                id: newPrincipal.id,
                email: newPrincipal.email,
                name: newPrincipal.name,
                contact: newPrincipal.contact,
                role: newPrincipal.role,
                active: newPrincipal.active
            }
        });
    } catch (error) {
        log.error('Σφάλμα κατά τη δημιουργία principal:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη δημιουργία του Διευθυντή' 
        });
    }
});

/**
 * PUT /canteens/principals/:id - Ενημέρωση στοιχείων principal
 */
canteens.put('/principals/:id', can('edit:content'), async (req, res) => {
    try {
        const principalId = parseInt(req.params.id);
        const { email, name, contact, active } = req.body;
        
        const principal = await Models.Principal.findByPk(principalId);
        if (!principal) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ο Διευθυντής δεν βρέθηκε' 
            });
        }
        
        // Έλεγχος αν το νέο email υπάρχει ήδη σε άλλον principal
        if (email !== principal.email) {
            const existingPrincipal = await Models.Principal.findOne({
                where: {
                    id: { [Op.ne]: principalId },
                    email
                }
            });
            
            if (existingPrincipal) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Υπάρχει ήδη άλλος Διευθυντής με αυτό το email' 
                });
            }
        }
        
        // Δημιουργία αντικειμένου ενημέρωσης
        const updateData = {
            email: email || principal.email,
            name: name || principal.name,
            contact: contact || principal.contact,
            active: active !== undefined ? active : principal.active
        };
        
        await principal.update(updateData);
        
        log.info(`Ο Principal ${principal.email} ενημερώθηκε (ID: ${principal.id})`);
        
        res.json({ 
            success: true, 
            message: 'Ο Διευθυντής ενημερώθηκε επιτυχώς',
            principal: {
                id: principal.id,
                email: principal.email,
                name: principal.name,
                contact: principal.contact,
                role: principal.role,
                active: principal.active
            }
        });
    } catch (error) {
        log.error('Σφάλμα κατά την ενημέρωση principal:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά την ενημέρωση του Διευθυντή' 
        });
    }
});

/**
 * DELETE /canteens/principals/:id - Διαγραφή principal
 */
canteens.delete('/principals/:id', can('edit:content'), async (req, res) => {
    try {
        const principalId = parseInt(req.params.id);
        
        const principal = await Models.Principal.findByPk(principalId);
        if (!principal) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ο Διευθυντής δεν βρέθηκε' 
            });
        }
        
        await principal.destroy();
        
        log.info(`Principal διαγράφηκε: ${principal.email} (ID: ${principal.id})`);
        
        res.json({ 
            success: true, 
            message: 'Ο Διευθυντής διαγράφηκε επιτυχώς' 
        });
    } catch (error) {
        log.error('Σφάλμα κατά τη διαγραφή principal:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη διαγραφή του Διευθυντή' 
        });
    }
});

////////////////////   ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ CANTEENS   ////////////////////

canteens.get('/canteens', can('view:content'), async (req, res) => {
    try {
        const canteensList = await Models.Canteen.findAll({
            include: [{ model: Models.Principal, as: 'principal' }]
        });
        res.render('canteens/canteens', { canteens: canteensList });
    } catch (error) {
        log.error(`Error fetching canteens: ${error.message}`);
        res.status(500).render('errors/500');
    }
});

export default canteens;