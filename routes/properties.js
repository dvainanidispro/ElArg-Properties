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




/////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////        ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ PARTIES        ////////////////////////////

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
            attributes: ['id', 'name', 'afm', 'email', 'contact', 'createdAt', 'updatedAt'],
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
        
        // Έλεγχος αν υπάρχει ήδη party με το ίδιο AFM
        if (afm) {
            const existingParty = await Models.Party.findOne({
                where: { afm }
            });
            
            if (existingParty) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Υπάρχει ήδη Συμβαλλόμενος με αυτό το ΑΦΜ' 
                });
            }
        }
        
        const newParty = await Models.Party.create({
            name: name.trim() || email.split('@')[0],
            afm: afm.trim() || '',
            email: email.trim() || '',
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
        
        // Έλεγχος αν το νέο AFM υπάρχει ήδη σε άλλον party
        if (afm && afm !== party.afm) {
            const existingParty = await Models.Party.findOne({
                where: {
                    id: { [Op.ne]: partyId },
                    afm: afm
                }
            });
            
            if (existingParty) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Υπάρχει ήδη άλλος Συμβαλλόμενος με αυτό το ΑΦΜ' 
                });
            }
        }
        
        // Δημιουργία αντικειμένου ενημέρωσης
        const updateData = {
            name: name.trim() || party.name,
            afm: afm.trim(),
            email: email.trim(),
            contact,
        };
        
        await party.update(updateData);
        
        log.info(`Ο Συμβαλλόμενος ${party.name} ενημερώθηκε (ID: ${party.id})`);
        
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
        
        // Έλεγχος αν υπάρχει κάποιο lease που χρησιμοποιεί αυτό το party
        const leaseUsingParty = await Models.Lease.findOne({
            where: { party_id: partyId },
            attributes: ['id']
        });
        
        if (leaseUsingParty) {
            return res.status(400).json({ 
                success: false, 
                message: `Δεν είναι δυνατή η διαγραφή του συμβαλλόμενου διότι ανήκει στη μίσθωση με id ${leaseUsingParty.id}.` 
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




/////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////        ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ PROPERTIES       ///////////////////////////


/**
 * GET /properties/properties ή /properties/estate - Εμφάνιση λίστας όλων των properties
 */
properties.get(['/','/properties','/estate'], can('view:content'), async (req, res) => {

    // Έλεγχος του path (properties ή estate)
    const isEstate = req.path.endsWith('/estate');

    try {

        // Filters for the query
        const filter = {};
        if (isEstate) {     // Στην οθόνη "Περιουσία" θέλουμε μόνο όσα ανήκουν στο Δήμο. (Εναλλακτικά if req.query.owned)
            filter.ownership_status = { [Op.ne]: 'individual' };
        }
        if (req.query.asset_type) {
            filter.asset_type = req.query.asset_type;
        } else if (req.query.is_part_of_other) {
            filter.is_part_of_other = req.query.is_part_of_other === 'true';    // Μετατροπή string σε boolean
        } 

        // Ανάκτηση των properties με το πιο πρόσφατο lease και party
        const propertiesList = await Models.Property.findAll({
            where: filter,
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

        // Έλεγχος του path για να αποφασίσουμε ποιο template να χρησιμοποιήσουμε
        if (isEstate) {             // Αν path = /properties/estate
            res.render('properties/estate', { 
                properties: processedProperties,
                user: req.user,
                title: 'Περιουσία'
            });
        } else {
            res.render('properties/properties', { 
                properties: processedProperties,
                user: req.user,
                title: 'Ακίνητα'
            });
        }
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
properties.get(['/properties/:id', '/estate/:id'], can('view:content'), async (req, res) => {
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
            kaek, atak, address, department, appartment_number, is_part_of_other, usage, description, 
            area, area_land, area_building, supply_electricity, supply_water, supply_natural_gas, construction_year, permit, file_server_link, ownership_status, ownership_details,
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
            kaek: kaek.trim() || '',
            atak: atak ? atak.trim() : '',
            address: address.trim() || '',
            department: department.trim() || '',
            appartment_number: appartment_number.trim() || '',
            is_part_of_other: (is_part_of_other==='true') || (is_part_of_other===true),
            usage: usage || '',
            description: description || '',
            area: area ? parseFloat(area) : null,
            area_land: area_land ? parseFloat(area_land) : null,
            area_building: area_building.trim() || '',
            supply_electricity: supply_electricity ? supply_electricity.trim() : '',
            supply_water: supply_water ? supply_water.trim() : '',
            supply_natural_gas: supply_natural_gas ? supply_natural_gas.trim() : '',
            construction_year: construction_year ? parseInt(construction_year) : null,
            permit: permit ? permit.trim() : '',
            file_server_link: file_server_link || '',
            ownership_status: ownership_status || '',
            ownership_details: ownership_details || '',
            asset_type: asset_type || 'owned',
            active: (active!==undefined) ? active : true
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
            kaek, atak, address, department, appartment_number, is_part_of_other, usage, description, 
            area, area_land, area_building, supply_electricity, supply_water, supply_natural_gas, construction_year, permit, file_server_link, ownership_status, ownership_details,
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
            kaek: kaek.trim(),
            atak: atak.trim(),
            address: address.trim(),
            department: department.trim(),
            appartment_number: appartment_number.trim(),
            is_part_of_other: (is_part_of_other === 'true') || (is_part_of_other === true),
            usage,
            description,
            area: area ? parseFloat(area) : null,
            area_land: area_land ? parseFloat(area_land) : null,
            area_building: area_building.trim(),
            supply_electricity: supply_electricity ? supply_electricity.trim() : '',
            supply_water: supply_water ? supply_water.trim() : '',
            supply_natural_gas: supply_natural_gas ? supply_natural_gas.trim() : '',
            construction_year: construction_year ? parseInt(construction_year) : null,
            permit,
            file_server_link,
            ownership_status,
            ownership_details,
            asset_type,
            active,
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
        
        // Έλεγχος αν υπάρχει κάποιο lease που χρησιμοποιεί αυτό το property
        const leaseUsingProperty = await Models.Lease.findOne({
            where: { 
                property_id: propertyId,
                property_type: 'property'
            }
        });
        
        if (leaseUsingProperty) {
            return res.status(400).json({ 
                success: false, 
                message: 'Δεν είναι δυνατή η διαγραφή του Ακινήτου διότι διαθέτει τουλάχιστον μια μίσθωση. Αντί για διαγραφή, κάντε απενεργοποίηση του Ακινήτου.' 
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




//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////       ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ LEASES       //////////////////////////////

/**
 * GET /properties/leases - Εμφάνιση λίστας όλων των leases
 */
properties.get('/leases', can('view:content'), async (req, res) => {
    try {
        const filter = {};
        if (req.query.adjustments) {
            filter.rent_adjustment_month = new Date().getMonth() + 1; // Τρέχων μήνας (1-12)
        } else if (req.query.expiring) {
            const expiringSoonMonths = 6;
            const expiringSoonMs = expiringSoonMonths * 30 * 24 * 60 * 60 * 1000; // περίπου 6 μήνες
            filter.lease_end = {
                [Op.lt]: new Date(Date.now() + expiringSoonMs)
            };
        }

        const leases = await Models.Lease.findAll({
            where: {
                ...{    // βασικό φίλτρο
                    property_type: 'property'
                }, 
                ...filter   // επιπλέον φίλτρα με get parameters
            },
            include: [
                {
                    model: Models.Property,
                    as: 'property',
                    attributes: ['id', 'appartment_number', 'address', 'asset_type']
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
                attributes: ['id', 'appartment_number', 'address', 'asset_type'],
                order: [['id', 'DESC']],
                raw: true
            }),
            Models.Party.findAll({
                attributes: ['id', 'name', 'email', 'afm'],
                order: [['id', 'DESC']],
                raw: true
            })
        ]);
        
        res.render('properties/edit-lease', { 
            leaseDetails: null, // null για νέο lease
            properties: propertiesList,
            parties,
            currentYear: new Date().getFullYear(),
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
                    attributes: ['id', 'appartment_number', 'address', 'asset_type', 'file_server_link']
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
                attributes: ['id', 'appartment_number', 'address', 'asset_type'],
                order: [['id', 'DESC']],
                raw: true
            }),
            Models.Party.findAll({
                attributes: ['id', 'name', 'email', 'afm'],
                order: [['id', 'DESC']],
                raw: true
            })
        ]);
        
        res.render('properties/edit-lease', { 
            leaseDetails: lease,
            properties: propertiesList,
            parties,
            currentYear: new Date().getFullYear(),
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
            property_id, party_id, lease_direction, lease_start, lease_end, rent, 
            rent_frequency, number_of_payments, rent_adjustment_month, rent_adjustment_info, 
            last_rent_adjustment_year, guarantee_letter, notes, file_server_link, active 
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
            rent: rent ? parseFloat(rent) : null,
            rent_frequency: rent_frequency || 'monthly',
            number_of_payments: number_of_payments ? parseInt(number_of_payments) : null,
            rent_adjustment_month: rent_adjustment_month ? parseInt(rent_adjustment_month) : null,
            rent_adjustment_info: rent_adjustment_info || '',
            last_rent_adjustment_year: last_rent_adjustment_year ? parseInt(last_rent_adjustment_year) : null,
            guarantee_letter: guarantee_letter || '',
            notes: notes || '',
            file_server_link: file_server_link || '',
            active: (active!==undefined) ? active : true
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
            lease_start, lease_end, rent, 
            rent_frequency, number_of_payments, rent_adjustment_month, rent_adjustment_info, 
            last_rent_adjustment_year, guarantee_letter, notes, file_server_link, active 
        } = req.body;
        
        const lease = await Models.Lease.findByPk(leaseId);
        if (!lease) {
            return res.status(404).json({ 
                success: false, 
                message: 'Η Μίσθωση δεν βρέθηκε' 
            });
        }

        // Δημιουργία του πεδίου last_rent_adjustment_year για τη βάση
        let adjusted_last_rent_adjustment_year = last_rent_adjustment_year; // αρχικά το default, ό,τι ήρθε από τη φόρμα (έτος ή null)
        const currentYear = new Date().getFullYear();
        // Στην περίπτωση που στη βάση είχε παλιότερο έτος και ο χρήστης αφήσει κενό το πεδίο, 
        // να μην ενημερωθεί το πεδίο της βάσης (δηλαδή να μην σβηστεί το παλιότερο έτος στη βάση).
        if (lease.last_rent_adjustment_year < currentYear && !last_rent_adjustment_year) {
            adjusted_last_rent_adjustment_year = undefined;
        }
        
        // Δημιουργία αντικειμένου ενημέρωσης (χωρίς property_id, party_id, lease_direction)
        const updateData = {
            lease_start,
            lease_end,
            rent: rent ? parseFloat(rent) : null,
            rent_frequency,
            number_of_payments: number_of_payments ? parseInt(number_of_payments) : null,
            rent_adjustment_month: rent_adjustment_month ? parseInt(rent_adjustment_month) : null,
            rent_adjustment_info,
            last_rent_adjustment_year: adjusted_last_rent_adjustment_year,
            guarantee_letter,
            notes,
            file_server_link,
            active,
        };
        
        await lease.update(updateData);
        
        log.info(`Το Lease με ID ${lease.id} ενημερώθηκε: Property ${lease.property_id} - Party ${lease.party_id}`);
        
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
                    attributes: ['id', 'appartment_number', 'address', 'asset_type']
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

/**
 * GET /properties/properties/:id/leases/history - Ιστορικό όλων των μισθώσεων συγκεκριμένου property
 */
properties.get('/properties/:id/leases/history', can('view:content'), async (req, res) => {
    try {
        const propertyId = parseInt(req.params.id);
        
        const property = await Models.Property.findByPk(propertyId);
        
        if (!property) {
            return res.status(404).render('errors/404', { message: 'Το Ακίνητο δεν βρέθηκε' });
        }
        
        // Ανάκτηση όλων των μισθώσεων με πλήρη στοιχεία
        const leases = await Models.Lease.findAll({
            where: { 
                property_id: propertyId,
                property_type: 'property'
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
                if (!lease.rent || !lease.lease_start) return sum;
                const startDate = new Date(lease.lease_start);
                const endDate = lease.lease_end ? new Date(lease.lease_end) : new Date();
                const months = Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                return sum + (parseFloat(lease.rent) * months);
            }, 0),
            averageRent: leases.length > 0 ? 
                leases.reduce((sum, lease) => sum + (parseFloat(lease.rent) || 0), 0) / leases.length : 0
        };
        
        res.render('properties/leases-history', { 
            leases,
            property,
            stats,
            user: req.user,
            title: `Ιστορικό Μισθώσεων: ${property.address || property.kaek}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση ιστορικού leases του property: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση ιστορικού μισθώσεων' });
    }
});



export default properties;