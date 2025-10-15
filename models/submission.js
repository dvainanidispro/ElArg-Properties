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
        data: {
            type: DataTypes.JSONB,
            comment: 'Array από subperiods/sub-submissions με πεδία: start_date, end_date, students, working_days, electricity_cost',
            allowNull: true
        },
        submittedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'principal_id αν συμπληρώνεται από principal, αλλιώς NULL (συμπληρώνεται από user)'
        },
        rent: DataTypes.DECIMAL(10, 2),
        tax_stamp: DataTypes.DECIMAL(10, 2),
        total: {
            type: DataTypes.VIRTUAL,
            get() {
                const rent = this.getDataValue('rent') || 0;
                const taxStamp = this.getDataValue('tax_stamp') || 0;
                const total = parseFloat(rent) + parseFloat(taxStamp);
                return total.toFixed(2);
            }
        },
    },
    {
        tableName: 'submissions',
        timestamps: true,
        indexes: [
        ],
    },
);



export { Submission };