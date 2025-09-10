import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const Canteen = db.define('canteen', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: DataTypes.STRING,                  // Όνομα κυλικείου   
        area: DataTypes.SMALLINT,                // Επιφάνεια σε τ.μ.
        lease_start: DataTypes.DATE,             // Έναρξη μίσθωσης
        lease_end: DataTypes.DATE,               // Λήξη μίσθωσης
        revision_number: DataTypes.STRING,       // Αριθμός γνωστοποίησης
        landlord_offer: DataTypes.SMALLINT,      // Οικονομική προσφορά εκμισθωτή 
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },
    {
        tableName: 'canteens',
        timestamps: true
    }
);

export { Canteen };