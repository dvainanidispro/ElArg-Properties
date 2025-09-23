import { Router } from 'express';
import Models from '../models/models.js';
import { can } from '../controllers/roles.js';
import log from '../controllers/logger.js';
import { Op } from 'sequelize';

/**
 * Router for properties-related routes.
 * @type {Router}
 */
const properties = Router();


////////////////////   ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ PARTIES   ////////////////////

/**
 * GET /properties/parties - Εμφάνιση λίστας όλων των parties
 */
properties.get('/parties', can('view:content'), async (req, res) => {
    try {
        const parties = await Models.Party.findAll({
            attributes: ['id', 'name', 'afm', 'email', 'contact', 'createdAt'],
            order: [['createdAt', 'DESC']],
            raw: true
        });
        
        res.render('properties/parties', { 
            parties,
            user: req.user,
            title: 'Συμβαλλόμενοι'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση συμβαλλομένων: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση συμβαλλομένων' });
    }
});

/**
 * GET /properties/parties/new - Φόρμα για νέο party
 */
properties.get('/parties/new', can('edit:content'), async (req, res) => {
    try {
        res.render('properties/edit-party', { 
            partyDetails: null, // null για νέο party ώστε το view να ξέρει
            user: req.user,
            title: 'Νέος Συμβαλλόμενος'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την εμφάνιση φόρμας νέου party: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την εμφάνιση φόρμας' });
    }
});

/**
 * GET /properties/parties/:id - Εμφάνιση στοιχείων συγκεκριμένου party
 */
properties.get('/parties/:id', can('view:content'), async (req, res) => {
    try {
        const partyId = parseInt(req.params.id);
        const party = await Models.Party.findByPk(partyId, {
            attributes: ['id', 'name', 'afm', 'email', 'contact', 'contracts', 'createdAt', 'updatedAt'],
            raw: true
        });
        
        if (!party) {
            return res.status(404).render('errors/404', { message: 'Ο Συμβαλλόμενος δεν βρέθηκε' });
        }
        
        res.render('properties/edit-party', { 
            partyDetails: party,
            user: req.user,
            title: `Συμβαλλόμενος: ${party.name || party.email}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση party: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση του συμβαλλομένου' });
    }
});

/**
 * POST /properties/parties - Δημιουργία νέου party
 */
properties.post('/parties', can('edit:content'), async (req, res) => {
    try {
        const { name, afm, email, contact } = req.body;
        
        // Βασικός έλεγχος δεδομένων
        if (!name && !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Τουλάχιστον ένα από τα πεδία όνομα ή email είναι υποχρεωτικό' 
            });
        }
        
        // Έλεγχος αν υπάρχει ήδη party με το ίδιο AFM ή email
        const whereConditions = [];
        if (afm) whereConditions.push({ afm });
        if (email) whereConditions.push({ email });
        
        if (whereConditions.length > 0) {
            const existingParty = await Models.Party.findOne({
                where: { [Op.or]: whereConditions }
            });
            
            if (existingParty) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Υπάρχει ήδη Συμβαλλόμενος με αυτό το ΑΦΜ ή email' 
                });
            }
        }
        
        const newParty = await Models.Party.create({
            name: name || email.split('@')[0],
            afm: afm || '',
            email: email || '',
            contact: contact || '',
            contracts: []
        });
        
        log.info(`Νέος party δημιουργήθηκε: ${newParty.name} (ID: ${newParty.id})`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Ο Συμβαλλόμενος δημιουργήθηκε επιτυχώς',
            party: {
                id: newParty.id,
                name: newParty.name,
                afm: newParty.afm,
                email: newParty.email,
                contact: newParty.contact,
                contracts: newParty.contracts
            }
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία party: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη δημιουργία του Συμβαλλομένου' 
        });
    }
});

/**
 * PUT /properties/parties/:id - Ενημέρωση στοιχείων party
 */
properties.put('/parties/:id', can('edit:content'), async (req, res) => {
    try {
        const partyId = parseInt(req.params.id);
        const { name, afm, email, contact } = req.body;
        
        const party = await Models.Party.findByPk(partyId);
        if (!party) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ο Συμβαλλόμενος δεν βρέθηκε' 
            });
        }
        
        // Έλεγχος αν το νέο AFM ή email υπάρχει ήδη σε άλλον party
        const whereConditions = [];
        if (afm && afm !== party.afm) whereConditions.push({ afm });
        if (email && email !== party.email) whereConditions.push({ email });
        
        if (whereConditions.length > 0) {
            const existingParty = await Models.Party.findOne({
                where: {
                    id: { [Op.ne]: partyId },
                    [Op.or]: whereConditions
                }
            });
            
            if (existingParty) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Υπάρχει ήδη άλλος Συμβαλλόμενος με αυτό το ΑΦΜ ή email' 
                });
            }
        }
        
        // Δημιουργία αντικειμένου ενημέρωσης
        const updateData = {
            name: name || party.name,
            afm: afm || party.afm,
            email: email || party.email,
            contact: contact || party.contact
        };
        
        await party.update(updateData);
        
        log.info(`Ο Party ${party.name} ενημερώθηκε (ID: ${party.id})`);
        
        res.json({ 
            success: true, 
            message: 'Ο Συμβαλλόμενος ενημερώθηκε επιτυχώς',
            party: {
                id: party.id,
                name: party.name,
                afm: party.afm,
                email: party.email,
                contact: party.contact,
                contracts: party.contracts
            }
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση party: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά την ενημέρωση του Συμβαλλομένου' 
        });
    }
});

/**
 * DELETE /properties/parties/:id - Διαγραφή party
 */
properties.delete('/parties/:id', can('edit:content'), async (req, res) => {
    try {
        const partyId = parseInt(req.params.id);
        
        const party = await Models.Party.findByPk(partyId);
        if (!party) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ο Συμβαλλόμενος δεν βρέθηκε' 
            });
        }
        
        await party.destroy();
        
        log.info(`Party διαγράφηκε: ${party.name} (ID: ${party.id})`);
        
        res.json({ 
            success: true, 
            message: 'Ο Συμβαλλόμενος διαγράφηκε επιτυχώς' 
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη διαγραφή party: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη διαγραφή του Συμβαλλομένου' 
        });
    }
});


////////////////////   ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ PROPERTIES   ////////////////////

/**
 * GET /properties - Εμφάνιση λίστας όλων των properties (redirect)
 */
properties.get('/', can('view:content'), async (req, res) => {
    res.redirect('/properties/properties');
});

/**
 * GET /properties/properties - Εμφάνιση λίστας όλων των properties
 */
properties.get('/properties', can('view:content'), async (req, res) => {
    try {
        const propertiesList = await Models.Property.findAll({
            include: [{
                model: Models.Lease,
                as: 'leases',
                where: {
                    property_type: 'property'
                },
                required: false, // LEFT JOIN για να φέρουμε και properties χωρίς leases
                order: [['lease_end', 'DESC']], // Ταξινόμηση με το μεγαλύτερο lease_end πρώτα
                limit: 1, // Παίρνουμε μόνο το πρώτο (το πιο πρόσφατο)
                include: [{
                    model: Models.Party,
                    as: 'party',
                    attributes: ['id', 'name', 'email']
                }]
            }],
            order: [['id', 'DESC']]
        });
        
        // Μετατροπή των δεδομένων για εύκολη χρήση στο template
        const processedProperties = propertiesList.map(property => {
            const propertyData = property.toJSON();
            const latestLease = propertyData.leases?.[0];
            
            return {
                ...propertyData,
                lease: latestLease || null,
                party: latestLease?.party || null,
            };
        });
        
        res.render('properties/properties', { 
            properties: processedProperties,
            user: req.user,
            title: 'Ακίνητα'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση ακινήτων: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση ακινήτων' });
    }
});

/**
 * GET /properties/properties/new - Φόρμα για νέο property
 */
properties.get('/properties/new', can('edit:content'), async (req, res) => {
    try {
        res.render('properties/edit-property', { 
            propertyDetails: null, // null για νέο property ώστε το view να ξέρει
            user: req.user,
            title: 'Νέο Ακίνητο'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την εμφάνιση φόρμας νέου property: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την εμφάνιση φόρμας' });
    }
});

/**
 * GET /properties/properties/:id - Εμφάνιση στοιχείων συγκεκριμένου property
 */
properties.get('/properties/:id', can('view:content'), async (req, res) => {
    try {
        const propertyId = parseInt(req.params.id);
        const property = await Models.Property.findByPk(propertyId, {
            include: [{
                model: Models.Lease,
                as: 'leases',
                where: {
                    property_type: 'property'
                },
                required: false, // LEFT JOIN για να φέρουμε και properties χωρίς leases
                order: [['lease_end', 'DESC']], // Ταξινόμηση με το μεγαλύτερο lease_end πρώτα
                limit: 1, // Παίρνουμε μόνο το πρώτο (το πιο πρόσφατο)
                include: [{
                    model: Models.Party,
                    as: 'party',
                    attributes: ['id', 'name', 'email']
                }]
            }]
        });
        
        if (!property) {
            return res.status(404).render('errors/404', { message: 'Το Ακίνητο δεν βρέθηκε' });
        }
        
        // Μετατροπή των δεδομένων για εύκολη χρήση στο template
        const propertyData = property.toJSON();
        const latestLease = propertyData.leases?.[0];
        
        const processedProperty = {
            ...propertyData,
            lease: latestLease || null
        };
        
        res.render('properties/edit-property', { 
            propertyDetails: processedProperty,
            user: req.user,
            title: `Ακίνητο: ${property.address || property.kaek || property.id}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση property: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση του ακινήτου' });
    }
});

/**
 * POST /properties/properties - Δημιουργία νέου property
 */
properties.post('/properties', can('edit:content'), async (req, res) => {
    try {
        const { 
            kaek, address, description, area, construction_year, file_server_link,
            asset_type, active 
        } = req.body;
        
        // Βασικός έλεγχος δεδομένων
        if (!address && !kaek) {
            return res.status(400).json({ 
                success: false, 
                message: 'Τουλάχιστον ένα από τα πεδία ΚΑΕΚ ή διεύθυνση είναι υποχρεωτικό' 
            });
        }
        
        // Έλεγχος αν υπάρχει ήδη property με το ίδιο ΚΑΕΚ
        if (kaek) {
            const existingProperty = await Models.Property.findOne({
                where: { kaek }
            });
            
            if (existingProperty) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Υπάρχει ήδη Ακίνητο με αυτό το ΚΑΕΚ' 
                });
            }
        }
        
        const newProperty = await Models.Property.create({
            kaek: kaek || '',
            address: address || '',
            description: description || '',
            area: area ? parseInt(area) : null,
            construction_year: construction_year ? parseInt(construction_year) : null,
            file_server_link: file_server_link || '',
            asset_type: asset_type || 'owned',
            active: active !== undefined ? active : true
        });
        
        log.info(`Νέο property δημιουργήθηκε: ${newProperty.address || newProperty.kaek} (ID: ${newProperty.id})`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Το Ακίνητο δημιουργήθηκε επιτυχώς',
            property: newProperty
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία property: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη δημιουργία του Ακινήτου' 
        });
    }
});

/**
 * PUT /properties/properties/:id - Ενημέρωση στοιχείων property
 */
properties.put('/properties/:id', can('edit:content'), async (req, res) => {
    try {
        const propertyId = parseInt(req.params.id);
        const { 
            kaek, address, description, area, construction_year, file_server_link,
            asset_type, active 
        } = req.body;
        
        const property = await Models.Property.findByPk(propertyId);
        if (!property) {
            return res.status(404).json({ 
                success: false, 
                message: 'Το Ακίνητο δεν βρέθηκε' 
            });
        }
        
        // Έλεγχος αν το νέο ΚΑΕΚ υπάρχει ήδη σε άλλο property
        if (kaek && kaek !== property.kaek) {
            const existingProperty = await Models.Property.findOne({
                where: {
                    id: { [Op.ne]: propertyId },
                    kaek: kaek
                }
            });
            
            if (existingProperty) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Υπάρχει ήδη άλλο Ακίνητο με αυτό το ΚΑΕΚ' 
                });
            }
        }
        
        // Δημιουργία αντικειμένου ενημέρωσης
        const updateData = {
            kaek: kaek || property.kaek,
            address: address || property.address,
            description: description || property.description,
            area: area ? parseInt(area) : property.area,
            construction_year: construction_year ? parseInt(construction_year) : property.construction_year,
            file_server_link: file_server_link || property.file_server_link,
            asset_type: asset_type || property.asset_type,
            active: active !== undefined ? active : property.active
        };
        
        await property.update(updateData);

        log.info(`Το Property ${property.address || property.kaek} ενημερώθηκε (ID: ${property.id})`);

        res.json({ 
            success: true, 
            message: 'Το Ακίνητο ενημερώθηκε επιτυχώς',
            property: property
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση property: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά την ενημέρωση του Ακινήτου' 
        });
    }
});

/**
 * DELETE /properties/properties/:id - Διαγραφή property
 */
properties.delete('/properties/:id', can('edit:content'), async (req, res) => {
    try {
        const propertyId = parseInt(req.params.id);
        
        const property = await Models.Property.findByPk(propertyId);
        if (!property) {
            return res.status(404).json({ 
                success: false, 
                message: 'Το Ακίνητο δεν βρέθηκε' 
            });
        }
        
        await property.destroy();
        
        log.info(`Property διαγράφηκε: ${property.address || property.kaek} (ID: ${property.id})`);
        
        res.json({ 
            success: true, 
            message: 'Το Ακίνητο διαγράφηκε επιτυχώς' 
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη διαγραφή property: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη διαγραφή του Ακινήτου' 
        });
    }
});


////////////////////   ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ LEASES   ////////////////////

/**
 * GET /properties/leases - Εμφάνιση λίστας όλων των leases
 */
properties.get('/leases', can('view:content'), async (req, res) => {
    try {
        const leases = await Models.Lease.findAll({
            where: {
                property_type: 'property'
            },
            include: [
                {
                    model: Models.Property,
                    as: 'property',
                    attributes: ['id', 'kaek', 'address', 'asset_type']
                },
                {
                    model: Models.Party,
                    as: 'party',
                    attributes: ['id', 'name', 'email', 'afm']
                }
            ],
            order: [['id', 'DESC']],
        });
        
        res.render('properties/leases', { 
            leases,
            user: req.user,
            title: 'Μισθώσεις'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση μισθώσεων: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση μισθώσεων' });
    }
});

/**
 * GET /properties/leases/new - Φόρμα για νέο lease
 */
properties.get('/leases/new', can('edit:content'), async (req, res) => {
    try {
        // Ανάκτηση properties και parties για τα dropdowns
        const [propertiesList, parties] = await Promise.all([
            Models.Property.findAll({
                attributes: ['id', 'kaek', 'address', 'asset_type'],
                order: [['kaek', 'ASC']],
                raw: true
            }),
            Models.Party.findAll({
                attributes: ['id', 'name', 'email', 'afm'],
                order: [['name', 'ASC']],
                raw: true
            })
        ]);
        
        res.render('properties/edit-lease', { 
            leaseDetails: null, // null για νέο lease
            properties: propertiesList,
            parties,
            user: req.user,
            title: 'Νέα Μίσθωση'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την εμφάνιση φόρμας νέου lease: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την εμφάνιση φόρμας' });
    }
});

/**
 * GET /properties/leases/:id - Εμφάνιση στοιχείων συγκεκριμένου lease
 */
properties.get('/leases/:id', can('view:content'), async (req, res) => {
    try {
        const leaseId = parseInt(req.params.id);
        const lease = await Models.Lease.findByPk(leaseId, {
            include: [
                {
                    model: Models.Property,
                    as: 'property',
                    attributes: ['id', 'kaek', 'address', 'asset_type']
                },
                {
                    model: Models.Party,
                    as: 'party',
                    attributes: ['id', 'name', 'email', 'afm']
                }
            ]
        });
        
        if (!lease) {
            return res.status(404).render('errors/404', { message: 'Η Μίσθωση δεν βρέθηκε' });
        }
        
        // Ανάκτηση properties και parties για τα dropdowns
        const [propertiesList, parties] = await Promise.all([
            Models.Property.findAll({
                attributes: ['id', 'kaek', 'address', 'asset_type'],
                order: [['kaek', 'ASC']],
                raw: true
            }),
            Models.Party.findAll({
                attributes: ['id', 'name', 'email', 'afm'],
                order: [['name', 'ASC']],
                raw: true
            })
        ]);
        
        res.render('properties/edit-lease', { 
            leaseDetails: lease,
            properties: propertiesList,
            parties,
            user: req.user,
            title: `Μίσθωση: ${lease.property?.kaek || lease.property?.address || lease.id}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση lease: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση της μίσθωσης' });
    }
});

/**
 * POST /properties/leases - Δημιουργία νέου lease
 */
properties.post('/leases', can('edit:content'), async (req, res) => {
    try {
        const { 
            property_id, party_id, lease_direction, lease_start, lease_end, monthly_rent, 
            rent_frequency, rent_adjustment_info, guarantee_letter, active 
        } = req.body;
        // Βασικός έλεγχος δεδομένων
        if (!property_id || !party_id || !lease_direction || !lease_start) {
            return res.status(400).json({ 
                success: false, 
                message: 'Τα πεδία ακίνητο, συμβαλλόμενος, κατεύθυνση και ημερομηνία έναρξης είναι υποχρεωτικά' 
            });
        }
        // Έλεγχος αν υπάρχουν τα property και party
        const [property, party] = await Promise.all([
            Models.Property.findByPk(property_id),
            Models.Party.findByPk(party_id)
        ]);
        if (!property) {
            return res.status(400).json({ 
                success: false, 
                message: 'Το ακίνητο δεν βρέθηκε' 
            });
        }
        if (!party) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ο συμβαλλόμενος δεν βρέθηκε' 
            });
        }
        const newLease = await Models.Lease.create({
            property_id: parseInt(property_id),
            party_id: parseInt(party_id),
            property_type: 'property',
            lease_direction,
            lease_start: lease_start,
            lease_end: lease_end || null,
            monthly_rent: monthly_rent ? parseFloat(monthly_rent) : null,
            rent_frequency: rent_frequency || 'monthly',
            rent_adjustment_info: rent_adjustment_info || '',
            guarantee_letter: guarantee_letter || '',
            active: active !== undefined ? active : true
        });
        log.info(`Νέο lease δημιουργήθηκε: Property ${property_id} - Party ${party_id} (ID: ${newLease.id})`);
        res.status(201).json({ 
            success: true, 
            message: 'Η Μίσθωση δημιουργήθηκε επιτυχώς',
            lease: newLease
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία lease: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη δημιουργία της Μίσθωσης' 
        });
    }
});

/**
 * PUT /properties/leases/:id - Ενημέρωση στοιχείων lease
 */
properties.put('/leases/:id', can('edit:content'), async (req, res) => {
    try {
        const leaseId = parseInt(req.params.id);
        const { 
            property_id, party_id, lease_direction, lease_start, lease_end, monthly_rent, 
            rent_frequency, rent_adjustment_info, guarantee_letter, active 
        } = req.body;
        const lease = await Models.Lease.findByPk(leaseId);
        if (!lease) {
            return res.status(404).json({ 
                success: false, 
                message: 'Η Μίσθωση δεν βρέθηκε' 
            });
        }
        // Έλεγχος αν υπάρχουν τα property και party (αν δόθηκαν νέα)
        if (property_id && property_id !== lease.property_id) {
            const property = await Models.Property.findByPk(property_id);
            if (!property) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Το ακίνητο δεν βρέθηκε' 
                });
            }
        }
        if (party_id && party_id !== lease.party_id) {
            const party = await Models.Party.findByPk(party_id);
            if (!party) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Ο συμβαλλόμενος δεν βρέθηκε' 
                });
            }
        }
        // Δημιουργία αντικειμένου ενημέρωσης
        const updateData = {
            property_id: property_id ? parseInt(property_id) : lease.property_id,
            party_id: party_id ? parseInt(party_id) : lease.party_id,
            lease_direction: lease_direction || lease.lease_direction,
            lease_start: lease_start || lease.lease_start,
            lease_end: lease_end || lease.lease_end,
            monthly_rent: monthly_rent ? parseFloat(monthly_rent) : lease.monthly_rent,
            rent_frequency: rent_frequency || lease.rent_frequency,
            rent_adjustment_info: rent_adjustment_info || lease.rent_adjustment_info,
            guarantee_letter: guarantee_letter || lease.guarantee_letter,
            active: active !== undefined ? active : lease.active
        };
        await lease.update(updateData);
        log.info(`Το Lease ενημερώθηκε: Property ${updateData.property_id} - Party ${updateData.party_id} (ID: ${lease.id})`);
        res.json({ 
            success: true, 
            message: 'Η Μίσθωση ενημερώθηκε επιτυχώς',
            lease: lease
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση lease: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά την ενημέρωση της Μίσθωσης' 
        });
    }
});

/**
 * DELETE /properties/leases/:id - Διαγραφή lease
 */
properties.delete('/leases/:id', can('edit:content'), async (req, res) => {
    try {
        const leaseId = parseInt(req.params.id);
        
        const lease = await Models.Lease.findByPk(leaseId);
        if (!lease) {
            return res.status(404).json({ 
                success: false, 
                message: 'Η Μίσθωση δεν βρέθηκε' 
            });
        }
        
        await lease.destroy();
        
        log.info(`Lease διαγράφηκε: Property ${lease.property_id} - Party ${lease.party_id} (ID: ${lease.id})`);
        
        res.json({ 
            success: true, 
            message: 'Η Μίσθωση διαγράφηκε επιτυχώς' 
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη διαγραφή lease: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη διαγραφή της Μίσθωσης' 
        });
    }
});


////////////////////   AUXILIARY ROUTES ΓΙΑ LEASES   ////////////////////

/**
 * GET /properties/properties/:id/leases - Λίστα leases συγκεκριμένου property
 */
properties.get('/properties/:id/leases', can('view:content'), async (req, res) => {
    try {
        const propertyId = parseInt(req.params.id);
        
        const property = await Models.Property.findByPk(propertyId);
        if (!property) {
            return res.status(404).render('errors/404', { message: 'Το Ακίνητο δεν βρέθηκε' });
        }
        
        const leases = await Models.Lease.findAll({
            where: { property_id: propertyId },
            include: [{
                model: Models.Party,
                as: 'party',
                attributes: ['id', 'name', 'email', 'afm']
            }],
            order: [['lease_start', 'DESC']]
        });
        
        res.render('properties/leases', { 
            leases,
            property,
            user: req.user,
            title: `Μισθώσεις Ακινήτου: ${property.address || property.kaek}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση leases του property: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση μισθώσεων' });
    }
});

/**
 * GET /properties/parties/:id/leases - Λίστα leases συγκεκριμένου party
 */
properties.get('/parties/:id/leases', can('view:content'), async (req, res) => {
    try {
        const partyId = parseInt(req.params.id);
        
        const party = await Models.Party.findByPk(partyId);
        if (!party) {
            return res.status(404).render('errors/404', { message: 'Ο Συμβαλλόμενος δεν βρέθηκε' });
        }
        
        const leases = await Models.Lease.findAll({
            where: { party_id: partyId },
            include: [
                {
                    model: Models.Property,
                    as: 'property',
                    attributes: ['id', 'kaek', 'address', 'asset_type']
                }
            ],
            order: [['lease_start', 'DESC']]
        });
        
        res.render('properties/leases', { 
            leases,
            party,
            user: req.user,
            title: `Μισθώσεις Συμβαλλομένου: ${party.name || party.email}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση leases του party: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση μισθώσεων' });
    }
});



export default properties;