import { DataTypes } from 'sequelize';
import { db } from "../config/database.js";

/**
 * Lease model: συσχετίζει properties/canteens με parties (μισθώσεις/εκμισθώσεις)
 * Περιέχει τα στοιχεία μίσθωσης που αφαιρούνται από το Property.
 */
const Lease = db.define('lease', {
	id: {
		type: DataTypes.INTEGER,
		primaryKey: true,
		autoIncrement: true
	},
	// Συσχετίσεις
	property_id: {
		type: DataTypes.INTEGER,
		allowNull: false,
		comment: 'ID του property ή canteen που μισθώνεται',
	},
	party_id: {
		type: DataTypes.INTEGER,
		allowNull: false,
		comment: 'ID του party (μισθωτής ή εκμισθωτής)',
	},
	// Τύπος μισθωμένου αντικειμένου (property ή canteen)
	property_type: {
		type: DataTypes.STRING,
		allowNull: false,
		comment: 'property ή canteen',
	},
	// Κατεύθυνση μίσθωσης από άποψη δήμου
	lease_direction: {
		type: DataTypes.STRING,
		allowNull: false,
		defaultValue: 'incoming',
		comment: 'Κατεύθυνση μίσθωσης από άποψη δήμου - incoming (Μίσθωση - ο δήμος μισθώνει από τρίτους), outgoing (Εκμίσθωση - ο δήμος εκμισθώνει σε τρίτους)',
	},
	// Στοιχεία μίσθωσης
	lease_start: {
		type: DataTypes.DATEONLY,
		comment: 'Ημερομηνία έναρξης μίσθωσης/εκμίσθωσης'
	},
	lease_end: {
		type: DataTypes.DATEONLY,
		comment: 'Ημερομηνία λήξης μίσθωσης/εκμίσθωσης'
	},
	monthly_rent: {
		type: DataTypes.DECIMAL(10, 2),
		comment: 'Μηνιαίο τίμημα (ή τριμηνιαίο ανάλογα την μίσθωση)'
	},
	rent_frequency: {
		type: DataTypes.STRING,
		defaultValue: 'monthly',
		comment: 'Συχνότητα πληρωμής μισθώματος - Επιτρεπόμενες τιμές: monthly (μηνιαία), quarterly (τριμηνιαία)'
	},
	rent_adjustment_info: {
		type: DataTypes.TEXT,
		comment: 'Πληροφορίες αναπροσαρμογής μισθώματος'
	},
	guarantee_letter: {
		type: DataTypes.STRING,
		comment: 'Εγγυητική Επιστολή (για μισθωμένα από δήμο)'
	},
	revision_number: {
		type: DataTypes.STRING,
		comment: 'Αριθμός γνωστοποίησης (canteen)'
	},
	landlord_offer: {
		type: DataTypes.SMALLINT,
		comment: 'Οικονομική προσφορά μισθωτή (canteen)'
	},
	active: {
		type: DataTypes.BOOLEAN,
		defaultValue: true
	}
}, {
	tableName: 'leases',
	timestamps: true,
	indexes: [
		{ fields: ['property_id'] },
		{ fields: ['party_id'] },
		{ fields: ['property_type'] },
		{ fields: ['lease_direction'] },
		{ fields: ['lease_end'] }
	]
});

export { Lease };