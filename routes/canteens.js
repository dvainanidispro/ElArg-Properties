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

/**
 * GET /canteens - Εμφάνιση λίστας όλων των canteens (redirect)
 */
canteens.get('/', can('view:content'), async (req, res) => {
    res.redirect('/canteens/canteens');
});

/**
 * GET /canteens/canteens - Εμφάνιση λίστας όλων των canteens
 */
canteens.get('/canteens', can('view:content'), async (req, res) => {
    try {
        const canteensList = await Models.Canteen.findAll({
            include: [{ 
                model: Models.Principal, 
                as: 'principal',
                attributes: ['id', 'name', 'email']
            }],
            order: [['createdAt', 'DESC']]
        });
        
        res.render('canteens/canteens', { 
            canteens: canteensList,
            user: req.user,
            title: 'Διαχείριση Κυλικείων'
        });
    } catch (error) {
        log.error('Σφάλμα κατά την ανάκτηση κυλικείων:', error);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση κυλικείων' });
    }
});

/**
 * GET /canteens/canteens/new - Φόρμα για νέο canteen
 */
canteens.get('/canteens/new', can('edit:content'), async (req, res) => {
    try {
        // Ανάκτηση όλων των principals για το dropdown
        const principals = await Models.Principal.findAll({
            attributes: ['id', 'name', 'email'],
            where: { active: true },
            order: [['name', 'ASC']],
            raw: true
        });
        
        res.render('canteens/edit-canteen', { 
            canteenDetails: null, // null για νέο canteen ώστε το view να ξέρει
            principals,
            user: req.user,
            title: 'Νέο Κυλικείο'
        });
    } catch (error) {
        log.error('Σφάλμα κατά την εμφάνιση φόρμας νέου canteen:', error);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την εμφάνιση φόρμας' });
    }
});

/**
 * GET /canteens/canteens/:id - Εμφάνιση στοιχείων συγκεκριμένου canteen
 */
canteens.get('/canteens/:id', can('view:content'), async (req, res) => {
    try {
        const canteenId = parseInt(req.params.id);
        const canteen = await Models.Canteen.findByPk(canteenId);
        
        if (!canteen) {
            return res.status(404).render('errors/404', { message: 'Το Κυλικείο δεν βρέθηκε' });
        }
        
        // Ανάκτηση όλων των principals για το dropdown
        const principals = await Models.Principal.findAll({
            attributes: ['id', 'name', 'email'],
            where: { active: true },
            order: [['name', 'ASC']],
            raw: true
        });
        
        res.render('canteens/edit-canteen', { 
            canteenDetails: canteen.toJSON(),
            principals,
            user: req.user,
            title: `Επεξεργασία Κυλικείου: ${canteen.name}`
        });
    } catch (error) {
        log.error('Σφάλμα κατά την ανάκτηση canteen:', error);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση του κυλικείου' });
    }
});

/**
 * POST /canteens/canteens - Δημιουργία νέου canteen
 */
canteens.post('/canteens', can('edit:content'), async (req, res) => {
    try {
        const { name, area, principal_id, lease_start, lease_end, revision_number, landlord_offer, active } = req.body;
        
        // Βασικός έλεγχος δεδομένων
        if (!name) {
            return res.status(400).json({ 
                success: false, 
                message: 'Το πεδίο όνομα είναι υποχρεωτικό' 
            });
        }
        
        // Έλεγχος αν υπάρχει ήδη canteen με το ίδιο όνομα
        const existingCanteen = await Models.Canteen.findOne({
            where: { name }
        });
        
        if (existingCanteen) {
            return res.status(400).json({ 
                success: false, 
                message: 'Υπάρχει ήδη Κυλικείο με αυτό το όνομα' 
            });
        }
        
        const newCanteen = await Models.Canteen.create({
            name,
            area: area || null,
            principal_id: principal_id || null,
            lease_start: lease_start || null,
            lease_end: lease_end || null,
            revision_number: revision_number || null,
            landlord_offer: landlord_offer || null,
            active: active !== undefined ? active : true
        });
        
        log.info(`Νέο canteen δημιουργήθηκε: ${newCanteen.name} (ID: ${newCanteen.id})`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Το Κυλικείο δημιουργήθηκε επιτυχώς',
            canteen: {
                id: newCanteen.id,
                name: newCanteen.name,
                area: newCanteen.area,
                principal_id: newCanteen.principal_id,
                lease_start: newCanteen.lease_start,
                lease_end: newCanteen.lease_end,
                revision_number: newCanteen.revision_number,
                landlord_offer: newCanteen.landlord_offer,
                active: newCanteen.active
            }
        });
    } catch (error) {
        log.error('Σφάλμα κατά τη δημιουργία canteen:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη δημιουργία του Κυλικείου' 
        });
    }
});

/**
 * PUT /canteens/canteens/:id - Ενημέρωση στοιχείων canteen
 */
canteens.put('/canteens/:id', can('edit:content'), async (req, res) => {
    try {
        const canteenId = parseInt(req.params.id);
        const { name, area, principal_id, lease_start, lease_end, revision_number, landlord_offer, active } = req.body;
        
        const canteen = await Models.Canteen.findByPk(canteenId);
        if (!canteen) {
            return res.status(404).json({ 
                success: false, 
                message: 'Το Κυλικείο δεν βρέθηκε' 
            });
        }
        
        // Έλεγχος αν το νέο όνομα υπάρχει ήδη σε άλλο canteen
        if (name !== canteen.name) {
            const existingCanteen = await Models.Canteen.findOne({
                where: {
                    id: { [Op.ne]: canteenId },
                    name
                }
            });
            
            if (existingCanteen) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Υπάρχει ήδη άλλο Κυλικείο με αυτό το όνομα' 
                });
            }
        }
        
        // Δημιουργία αντικειμένου ενημέρωσης
        const updateData = {
            name: name || canteen.name,
            area: area !== undefined ? area : canteen.area,
            principal_id: principal_id !== undefined ? principal_id : canteen.principal_id,
            lease_start: lease_start !== undefined ? lease_start : canteen.lease_start,
            lease_end: lease_end !== undefined ? lease_end : canteen.lease_end,
            revision_number: revision_number !== undefined ? revision_number : canteen.revision_number,
            landlord_offer: landlord_offer !== undefined ? landlord_offer : canteen.landlord_offer,
            active: active !== undefined ? active : canteen.active
        };
        
        await canteen.update(updateData);
        
        log.info(`Το Canteen ${canteen.name} ενημερώθηκε (ID: ${canteen.id})`);
        
        res.json({ 
            success: true, 
            message: 'Το Κυλικείο ενημερώθηκε επιτυχώς',
            canteen: {
                id: canteen.id,
                name: canteen.name,
                area: canteen.area,
                principal_id: canteen.principal_id,
                lease_start: canteen.lease_start,
                lease_end: canteen.lease_end,
                revision_number: canteen.revision_number,
                landlord_offer: canteen.landlord_offer,
                active: canteen.active
            }
        });
    } catch (error) {
        log.error('Σφάλμα κατά την ενημέρωση canteen:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά την ενημέρωση του Κυλικείου' 
        });
    }
});

/**
 * DELETE /canteens/canteens/:id - Διαγραφή canteen
 */
canteens.delete('/canteens/:id', can('edit:content'), async (req, res) => {
    try {
        const canteenId = parseInt(req.params.id);
        
        const canteen = await Models.Canteen.findByPk(canteenId);
        if (!canteen) {
            return res.status(404).json({ 
                success: false, 
                message: 'Το Κυλικείο δεν βρέθηκε' 
            });
        }
        
        await canteen.destroy();
        
        log.info(`Canteen διαγράφηκε: ${canteen.name} (ID: ${canteen.id})`);
        
        res.json({ 
            success: true, 
            message: 'Το Κυλικείο διαγράφηκε επιτυχώς' 
        });
    } catch (error) {
        log.error('Σφάλμα κατά τη διαγραφή canteen:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη διαγραφή του Κυλικείου' 
        });
    }
});

export default canteens;