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
                return parseFloat(total.toFixed(2));
            }
        },
        electricity_cost: {
            type: DataTypes.VIRTUAL,
            get() {
                const data = this.getDataValue('data') || [];
                const total = data.reduce((sum, subperiod) => {
                    return sum + (parseFloat(subperiod?.electricity_cost) || 0);
                }, 0);
                return parseFloat(total.toFixed(2));
            }
        },
    },
    {
        tableName: 'submissions',
        timestamps: true,
        indexes: [
            {
                name: 'idx_submissions_period_property',
                fields: ['period_id', 'property_id', 'property_type']
            },
            {
                name: 'idx_submissions_period_property_principal',
                fields: ['period_id', 'property_id', 'property_type', 'principal_id']
            },
            {
                name: 'idx_submissions_period_type',
                fields: ['period_id', 'property_type']
            },
            {
                name: 'idx_submissions_property_type',
                fields: ['property_id', 'property_type']
            }
        ],
    },
);



export { Submission };