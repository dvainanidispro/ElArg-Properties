import { Router } from 'express';
import Models from '../models/models.js';
import { can } from '../controllers/roles.js';
import log from '../controllers/logger.js';
import { Op } from 'sequelize';
import { getActiveCanteenPeriod } from '../controllers/periods/periods.js';

/**
 * Router for canteens-related routes.
 * @type {Router}
 */
const canteens = Router();




////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////        ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ PRINCIPALS        //////////////////////////

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
            title: 'Διευθυντές Σχολείων'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση διευθυντών: ${error}`);
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
        log.error(`Σφάλμα κατά την εμφάνιση φόρμας νέου principal: ${error}`);
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
            attributes: ['id', 'email', 'name', 'contact', 'role', 'notes', 'active', 'createdAt', 'updatedAt'],
            raw: true
        });
        
        if (!principal) {
            return res.status(404).render('errors/404', { message: 'Ο Διευθυντής δεν βρέθηκε' });
        }
        
        res.render('canteens/edit-principal', { 
            principalDetails: principal,
            user: req.user,
            title: `Διευθυντής: ${principal.name || principal.email}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση principal: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση του διευθυντή' });
    }
});

/**
 * POST /canteens/principals - Δημιουργία νέου principal
 */
canteens.post('/principals', can('edit:content'), async (req, res) => {
    try {
        const { email, name, contact, notes, active } = req.body;
        
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
            email: email.trim(),
            name: name.trim() || email.split('@')[0],
            contact: contact || '',
            notes: notes || '',
            role: 'principal',
            active: (active!==undefined) ? active : true // Default true για νέους principals
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
                notes: newPrincipal.notes,
                role: newPrincipal.role,
                active: newPrincipal.active
            }
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία principal: ${error}`);
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
        const { email, name, contact, notes, active } = req.body;
        
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
            email: email.trim() || principal.email,
            name: name.trim() || principal.name,
            contact: contact,
            notes: notes,
            active: active,
        };
        
        await principal.update(updateData);
        
        log.info(`Ο Διευθυντής ${principal.name} ενημερώθηκε (ID: ${principal.id})`);
        
        res.json({ 
            success: true, 
            message: 'Ο Διευθυντής ενημερώθηκε επιτυχώς',
            principal: {
                id: principal.id,
                email: principal.email,
                name: principal.name,
                contact: principal.contact,
                notes: principal.notes,
                role: principal.role,
                active: principal.active
            }
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση principal: ${error}`);
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
        
        // Έλεγχος αν υπάρχει κάποιο canteen που χρησιμοποιεί αυτόν τον principal
        const canteenUsingPrincipal = await Models.Canteen.findOne({
            where: { principal_id: principalId },
            attributes: ['id', 'name']
        });
        
        if (canteenUsingPrincipal) {
            return res.status(400).json({ 
                success: false, 
                message: `Δεν είναι δυνατή η διαγραφή του Διευθυντή, διότι ανήκει στο σχολείο ${canteenUsingPrincipal.name}.` 
            });
        }
        
        await principal.destroy();
        
        log.info(`Principal διαγράφηκε: ${principal.email} (ID: ${principal.id})`);
        
        res.json({ 
            success: true, 
            message: 'Ο Διευθυντής διαγράφηκε επιτυχώς' 
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη διαγραφή principal: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη διαγραφή του Διευθυντή' 
        });
    }
});




/////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////        ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ CANTEENS        ///////////////////////////

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
            include: [
                { 
                    model: Models.Principal, 
                    as: 'principal',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Models.Lease,
                    as: 'leases',
                    where: {
                        property_type: 'canteen'
                    },
                    required: false, // LEFT JOIN για να φέρουμε και canteens χωρίς leases
                    order: [['lease_end', 'DESC']], // Ταξινόμηση με το μεγαλύτερο lease_end πρώτα
                    limit: 1, // Παίρνουμε μόνο το πρώτο (το πιο πρόσφατο)
                    include: [{
                        model: Models.Party,
                        as: 'party',
                        attributes: ['id', 'name', 'email']
                    }]
                }
            ],
            order: [['id', 'DESC']]
        });
        
        // Μετατροπή των δεδομένων για εύκολη χρήση στο template
        const processedCanteens = canteensList.map(canteen => {
            const canteenData = canteen.toJSON();
            const latestLease = canteenData.leases?.[0];
            
            return {
                ...canteenData,
                lease: latestLease || null,
                party: latestLease?.party || null,
            };
        });
        
        res.render('canteens/canteens', { 
            canteens: processedCanteens,
            user: req.user,
            title: 'Κυλικεία'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση κυλικείων: ${error}`);
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
            order: [['id', 'DESC']],
            raw: true
        });
        
        res.render('canteens/edit-canteen', { 
            canteenDetails: null, // null για νέο canteen ώστε το view να ξέρει
            principals,
            user: req.user,
            title: 'Νέο Κυλικείο'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την εμφάνιση φόρμας νέου canteen: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την εμφάνιση φόρμας' });
    }
});

/**
 * GET /canteens/canteens/:id - Εμφάνιση στοιχείων συγκεκριμένου canteen
 */
canteens.get('/canteens/:id', can('view:content'), async (req, res) => {
    try {
        const canteenId = parseInt(req.params.id);
        const canteen = await Models.Canteen.findByPk(canteenId, {
            include: [{
                model: Models.Lease,
                as: 'leases',
                where: {
                    property_type: 'canteen'
                },
                required: false, // LEFT JOIN για να φέρουμε και canteens χωρίς leases
                order: [['lease_end', 'DESC']], // Ταξινόμηση με το μεγαλύτερο lease_end πρώτα
                limit: 1, // Παίρνουμε μόνο το πρώτο (το πιο πρόσφατο)
                include: [{
                    model: Models.Party,
                    as: 'party',
                    attributes: ['id', 'name', 'email']
                }]
            }]
        });
        
        if (!canteen) {
            return res.status(404).render('errors/404', { message: 'Το Κυλικείο δεν βρέθηκε' });
        }
        
        // Ανάκτηση όλων των principals για το dropdown
        const principals = await Models.Principal.findAll({
            attributes: ['id', 'name', 'email'],
            where: { active: true },
            order: [['id', 'DESC']],
            raw: true
        });
        
        // Μετατροπή των δεδομένων για εύκολη χρήση στο template
        const canteenData = canteen.toJSON();
        const latestLease = canteenData.leases?.[0];
        
        const processedCanteen = {
            ...canteenData,
            lease: latestLease || null
        };
        
        res.render('canteens/edit-canteen', { 
            canteenDetails: processedCanteen,
            principals,
            user: req.user,
            title: `Κυλικείο: ${canteen.name}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση canteen: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση του κυλικείου' });
    }
});

/**
 * POST /canteens/canteens - Δημιουργία νέου canteen
 */
canteens.post('/canteens', can('edit:content'), async (req, res) => {
    try {
        const { name, area, principal_id, active } = req.body;
        
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
            name: name.trim(),
            area: area || null,
            principal_id: principal_id || null,
            active: (active!==undefined) ? active : true
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
                active: newCanteen.active
            }
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία canteen: ${error}`);
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
        const { name, area, principal_id, active } = req.body;
        
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
            name: name.trim() || canteen.name,
            area: area,
            principal_id: principal_id,
            active: active
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
                active: canteen.active
            }
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση canteen: ${error}`);
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
        
        // Έλεγχος αν υπάρχει κάποιο lease που χρησιμοποιεί αυτό το canteen
        const leaseUsingCanteen = await Models.Lease.findOne({
            where: { 
                property_id: canteenId,
                property_type: 'canteen'
            }
        });
        
        if (leaseUsingCanteen) {
            return res.status(400).json({ 
                success: false, 
                message: 'Δεν είναι δυνατή η διαγραφή του Κυλικείου διότι διαθέτει τουλάχιστον μια μίσθωση. Αντί για διαγραφή, κάντε απενεργοποίηση του Κυλικείου.' 
            });
        }
        
        await canteen.destroy();
        
        log.info(`Canteen διαγράφηκε: ${canteen.name} (ID: ${canteen.id})`);
        
        res.json({ 
            success: true, 
            message: 'Το Κυλικείο διαγράφηκε επιτυχώς' 
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη διαγραφή canteen: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη διαγραφή του Κυλικείου' 
        });
    }
});




////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////         ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ LEASES         ///////////////////////////

/**
 * GET /canteens/leases - Εμφάνιση λίστας όλων των leases για canteens
 */
canteens.get('/leases', can('view:content'), async (req, res) => {
    try {
        const leases = await Models.Lease.findAll({
            where: {
                property_type: 'canteen'
            },
            include: [
                {
                    model: Models.Canteen,
                    as: 'canteen',
                    attributes: ['id', 'name', 'area'],
                    include: [{
                        model: Models.Principal,
                        as: 'principal',
                        attributes: ['id', 'name', 'email']
                    }]
                },
                {
                    model: Models.Party,
                    as: 'party',
                    attributes: ['id', 'name', 'email', 'afm']
                }
            ],
            order: [['id', 'DESC']],
        });
        
        res.render('canteens/leases', { 
            leases,
            user: req.user,
            title: 'Μισθώσεις Κυλικείων'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση μισθώσεων κυλικείων: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση μισθώσεων κυλικείων' });
    }
});

/**
 * GET /canteens/leases/new - Φόρμα για νέο lease
 */
canteens.get('/leases/new', can('edit:content'), async (req, res) => {
    try {
        // Ανάκτηση canteens και parties για τα dropdowns
        const [canteensList, parties] = await Promise.all([
            Models.Canteen.findAll({
                attributes: ['id', 'name', 'area'],
                include: [{
                    model: Models.Principal,
                    as: 'principal',
                    attributes: ['id', 'name', 'email']
                }],
                order: [['id', 'DESC']],
                raw: false
            }),
            Models.Party.findAll({
                attributes: ['id', 'name', 'email', 'afm'],
                order: [['id', 'DESC']],
                raw: true
            })
        ]);
        
        res.render('canteens/edit-lease', { 
            leaseDetails: null, // null για νέο lease
            canteens: canteensList,
            parties,
            user: req.user,
            title: 'Νέα Μίσθωση Κυλικείου'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την εμφάνιση φόρμας νέου lease: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την εμφάνιση φόρμας' });
    }
});

/**
 * GET /canteens/leases/:id - Εμφάνιση στοιχείων συγκεκριμένου lease
 */
canteens.get('/leases/:id', can('view:content'), async (req, res) => {
    try {
        const leaseId = parseInt(req.params.id);
        const lease = await Models.Lease.findByPk(leaseId, {
            include: [
                {
                    model: Models.Canteen,
                    as: 'canteen',
                    attributes: ['id', 'name', 'area'],
                    include: [{
                        model: Models.Principal,
                        as: 'principal',
                        attributes: ['id', 'name', 'email']
                    }]
                },
                {
                    model: Models.Party,
                    as: 'party',
                    attributes: ['id', 'name', 'email', 'afm']
                }
            ]
        });
        
        if (!lease || lease.property_type !== 'canteen') {
            return res.status(404).render('errors/404', { message: 'Η Μίσθωση Κυλικείου δεν βρέθηκε' });
        }
        
        // Ανάκτηση canteens και parties για τα dropdowns
        const [canteensList, parties] = await Promise.all([
            Models.Canteen.findAll({
                attributes: ['id', 'name', 'area'],
                include: [{
                    model: Models.Principal,
                    as: 'principal',
                    attributes: ['id', 'name', 'email']
                }],
                order: [['id', 'DESC']],
                raw: false
            }),
            Models.Party.findAll({
                attributes: ['id', 'name', 'email', 'afm'],
                order: [['id', 'DESC']],
                raw: true
            })
        ]);
        
        res.render('canteens/edit-lease', { 
            leaseDetails: lease,
            canteens: canteensList,
            parties,
            user: req.user,
            title: `Μίσθωση Κυλικείου: ${lease.canteen?.name || lease.id}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση lease: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση της μίσθωσης' });
    }
});

/**
 * POST /canteens/leases - Δημιουργία νέου lease
 */
canteens.post('/leases', can('edit:content'), async (req, res) => {
    try {
        const { 
            canteen_id, party_id, lease_start, lease_end, rent, 
            rent_adjustment_info, guarantee_letter, revision_number, notes, active 
        } = req.body;
        
        // Βασικός έλεγχος δεδομένων
        if (!canteen_id || !party_id || !lease_start) {
            return res.status(400).json({ 
                success: false, 
                message: 'Τα πεδία κυλικείο, συμβαλλόμενος και ημερομηνία έναρξης είναι υποχρεωτικά' 
            });
        }
        
        // Έλεγχος αν υπάρχουν το canteen και party
        const [canteen, party] = await Promise.all([
            Models.Canteen.findByPk(canteen_id),
            Models.Party.findByPk(party_id)
        ]);
        
        if (!canteen) {
            return res.status(400).json({ 
                success: false, 
                message: 'Το κυλικείο δεν βρέθηκε' 
            });
        }
        
        if (!party) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ο συμβαλλόμενος δεν βρέθηκε' 
            });
        }
        
        const newLease = await Models.Lease.create({
            property_id: parseInt(canteen_id),
            party_id: parseInt(party_id),
            property_type: 'canteen',
            lease_direction: 'outgoing', // Τα κυλικεία είναι πάντα εκμισθώσεις
            lease_start: lease_start,
            lease_end: lease_end || null,
            rent: rent ? parseFloat(rent) : null,
            rent_frequency: 'quarterly', // Κυλικεία είναι πάντα τριμηνιαία
            rent_adjustment_info,
            guarantee_letter,
            revision_number,
            notes,
            active: (active!==undefined) ? active : true
        });
        
        log.info(`Νέο lease κυλικείου δημιουργήθηκε: Canteen ${canteen_id} - Party ${party_id} (ID: ${newLease.id})`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Η Μίσθωση Κυλικείου δημιουργήθηκε επιτυχώς',
            lease: newLease
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία lease κυλικείου: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη δημιουργία της Μίσθωσης Κυλικείου' 
        });
    }
});

/**
 * PUT /canteens/leases/:id - Ενημέρωση στοιχείων lease
 */
canteens.put('/leases/:id', can('edit:content'), async (req, res) => {
    try {
        const leaseId = parseInt(req.params.id);
        const { 
            lease_start, lease_end, rent, 
            rent_adjustment_info, guarantee_letter, revision_number, notes, active 
        } = req.body;
        
        const lease = await Models.Lease.findByPk(leaseId);
        if (!lease || lease.property_type !== 'canteen') {
            return res.status(404).json({ 
                success: false, 
                message: 'Η Μίσθωση Κυλικείου δεν βρέθηκε' 
            });
        }
        
        // Δημιουργία αντικειμένου ενημέρωσης (χωρίς canteen_id, party_id, lease_direction)
        const updateData = {
            lease_start: lease_start,
            lease_end: lease_end,
            rent: rent ? parseFloat(rent) : null,
            rent_frequency: 'quarterly', // Κυλικεία είναι πάντα τριμηνιαία
            rent_adjustment_info,
            guarantee_letter,
            revision_number,
            notes,
            active: active
        };
        
        await lease.update(updateData);
        
        log.info(`Το Lease κυλικείου ενημερώθηκε: Canteen ${lease.property_id} - Party ${lease.party_id} (ID: ${lease.id})`);
        
        res.json({ 
            success: true, 
            message: 'Η Μίσθωση Κυλικείου ενημερώθηκε επιτυχώς',
            lease: lease
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση lease κυλικείου: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά την ενημέρωση της Μίσθωσης Κυλικείου' 
        });
    }
});

/**
 * DELETE /canteens/leases/:id - Διαγραφή lease
 */
canteens.delete('/leases/:id', can('edit:content'), async (req, res) => {
    try {
        const leaseId = parseInt(req.params.id);
        
        const lease = await Models.Lease.findByPk(leaseId);
        if (!lease || lease.property_type !== 'canteen') {
            return res.status(404).json({ 
                success: false, 
                message: 'Η Μίσθωση Κυλικείου δεν βρέθηκε' 
            });
        }
        
        await lease.destroy();
        
        log.info(`Lease κυλικείου διαγράφηκε: Canteen ${lease.property_id} - Party ${lease.party_id} (ID: ${lease.id})`);
        
        res.json({ 
            success: true, 
            message: 'Η Μίσθωση Κυλικείου διαγράφηκε επιτυχώς' 
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη διαγραφή lease κυλικείου: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη διαγραφή της Μίσθωσης Κυλικείου' 
        });
    }
});




////////////////////   AUXILIARY ROUTES ΓΙΑ LEASES   ////////////////////

/**
 * GET /canteens/canteens/:id/leases - Λίστα leases συγκεκριμένου canteen
 */
canteens.get('/canteens/:id/leases', can('view:content'), async (req, res) => {
    try {
        const canteenId = parseInt(req.params.id);
        
        const canteen = await Models.Canteen.findByPk(canteenId);
        if (!canteen) {
            return res.status(404).render('errors/404', { message: 'Το Κυλικείο δεν βρέθηκε' });
        }
        
        const leases = await Models.Lease.findAll({
            where: { 
                property_id: canteenId,
                property_type: 'canteen'
            },
            include: [{
                model: Models.Party,
                as: 'party',
                attributes: ['id', 'name', 'email', 'afm']
            }],
            order: [['lease_start', 'DESC']]
        });
        
        res.render('canteens/leases', { 
            leases,
            canteen,
            user: req.user,
            title: `Μισθώσεις Κυλικείου: ${canteen.name}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση leases του canteen: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση μισθώσεων' });
    }
});

/**
 * GET /canteens/canteens/:id/leases/history - Ιστορικό όλων των μισθώσεων συγκεκριμένου canteen
 */
canteens.get('/canteens/:id/leases/history', can('view:content'), async (req, res) => {
    try {
        const canteenId = parseInt(req.params.id);
        
        const canteen = await Models.Canteen.findByPk(canteenId, {
            include: [{
                model: Models.Principal,
                as: 'principal',
                attributes: ['id', 'name', 'email']
            }]
        });
        
        if (!canteen) {
            return res.status(404).render('errors/404', { message: 'Το Κυλικείο δεν βρέθηκε' });
        }
        
        // Ανάκτηση όλων των μισθώσεων με πλήρη στοιχεία
        const leases = await Models.Lease.findAll({
            where: { 
                property_id: canteenId,
                property_type: 'canteen'
            },
            include: [{
                model: Models.Party,
                as: 'party',
                attributes: ['id', 'name', 'email', 'afm', 'contact']
            }],
            order: [['lease_start', 'DESC']]
        });
        
        // Στατιστικά για το ιστορικό
        const stats = {
            totalLeases: leases.length,
            activeLeases: leases.filter(lease => lease.active && (!lease.lease_end || new Date(lease.lease_end) >= new Date())).length,
            expiredLeases: leases.filter(lease => lease.lease_end && new Date(lease.lease_end) < new Date()).length,
            totalRevenue: leases.reduce((sum, lease) => {
                if (lease.rent && lease.lease_start && lease.lease_end) {
                    const start = new Date(lease.lease_start);
                    const end = new Date(lease.lease_end);
                    const months = Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 30));
                    return sum + (parseFloat(lease.rent) * months);
                }
                return sum;
            }, 0),
            averageRent: leases.length > 0 ? 
                leases.reduce((sum, lease) => sum + (parseFloat(lease.rent) || 0), 0) / leases.length : 0
        };
        
        res.render('canteens/leases-history', { 
            leases,
            canteen,
            stats,
            user: req.user,
            title: `Ιστορικό Μισθώσεων: ${canteen.name}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση ιστορικού leases του canteen: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση ιστορικού μισθώσεων' });
    }
});


canteens.get('/pending', can('view:content'), async (req, res) => {
    try {
        const period = await getActiveCanteenPeriod();
        if (period) {
            return res.redirect(`/canteens/periods/${period.id}/submissions?nav=/canteens/pending`);
        } else {
            return res.render('periods/submissions', {
                submissions: [],
                period: null,
                user: req.user,
                title: 'Υποβολές Κυλικείων'
            });
        }
    } catch (error) {
        log.error(`Σφάλμα στο /canteens/pending: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση περιόδου' });
    }
});








// Periods subroute
import periods from './periods.js';
canteens.use('/periods', periods);

// MyCanteens subroute for Principals
import myCanteen from './mycanteen.js';
canteens.use('/mycanteen', myCanteen);


export default canteens;