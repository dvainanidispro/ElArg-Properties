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


properties.get('/parties', can('view:content'), async (req, res) => {
    res.render('properties/parties');
});

properties.get('/properties', can('view:content'), async (req, res) => {
    res.render('properties/properties');
});



export default properties;