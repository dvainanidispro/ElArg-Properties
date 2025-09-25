import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const Submission = db.define('submission',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        period_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        property_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        property_type: {
            type: DataTypes.STRING,
            comment: "'property' ή 'canteen'"
        },
        principal_id: DataTypes.INTEGER,
        rent_offer: DataTypes.DECIMAL(10, 2),
        students: {
            type: DataTypes.INTEGER,
            comment: 'Αριθμός μαθητών σχολείου για την περίοδο'
        },
        working_days: {
            type: DataTypes.INTEGER,
            comment: 'Αριθμός εργάσιμων ημερών για την περίοδο'
        },
        electricity_cost: {
            type: DataTypes.DECIMAL(10, 2),
            comment: 'Κόστος ρεύματος για την περίοδο'
        },
        rent: DataTypes.DECIMAL(10, 2),
    },
    {
        tableName: 'submissions',
        timestamps: true,
        indexes: [
        ],
    },
);



export { Submission };