import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const Canteen = db.define('canteen', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            comment: 'Όνομα κυλικείου ή σχολείου'
        },
        area: {
            type: DataTypes.SMALLINT,
            comment: 'Επιφάνεια σε τ.μ.'
        },
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },
    {
        tableName: 'canteens',
        timestamps: true,
        indexes: [
            { 
                fields: ['name'],
            },
            {
                fields: ['active'],
            }
        ]
    }
);

export { Canteen };